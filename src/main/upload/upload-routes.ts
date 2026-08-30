import fs from 'node:fs';
import path from 'node:path';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import {
  getUploadByFileId,
  createUpload,
  updateUploadedBytes,
  getSession,
  getFilesBySession,
} from '../database/queries';
import { validateFileExtension, validateFileSize, validateSessionQuota, sanitizeFileName } from './file-validator';
import { assembleUpload, getTempChunkPath } from './chunk-assembler';
import { getTempUploadPath } from '../constants';
import { getUploadProgressEmitter } from './upload-events';

/**
 * Registers the resumable upload API routes on the Fastify instance.
 */
export function registerUploadRoutes(fastify: FastifyInstance): void {
  const tempDir = getTempUploadPath();
  fs.mkdirSync(tempDir, { recursive: true });

  // ── GET /api/upload-status ──────────────────────────────────
  // Client checks how many bytes have been received for a given fileId.
  fastify.get<{
    Querystring: { fileId: string };
  }>('/api/upload-status', async (request, reply) => {
    const { fileId } = request.query;
    const sessionId = extractSessionId(request);

    if (!sessionId || !fileId) {
      return reply.status(400).send({ error: 'Missing fileId or session' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const upload = getUploadByFileId(sessionId, fileId);
    const uploadedBytes = upload?.uploaded_bytes ?? 0;

    return { uploadedBytes };
  });

  // ── POST /api/upload-chunk ──────────────────────────────────
  // Client sends binary chunk data with metadata in headers.
  fastify.post('/api/upload-chunk', {
    config: {
      rawBody: true,
    },
  }, async (request, reply) => {
    const fileId = request.headers['x-file-id'] as string;
    const startByte = parseInt(request.headers['x-start-byte'] as string, 10);
    const sessionId = request.headers['x-customer-session'] as string;
    const fileName = request.headers['x-file-name'] as string;
    const fileSize = parseInt(request.headers['x-file-size'] as string, 10);

    // Validate required headers
    if (!fileId || isNaN(startByte) || !sessionId || !fileName || isNaN(fileSize)) {
      return reply.status(400).send({
        error: 'Missing required headers: X-File-Id, X-Start-Byte, X-Customer-Session, X-File-Name, X-File-Size',
      });
    }

    // Validate session
    const session = getSession(sessionId);
    if (!session) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    // Validate file extension
    const extError = validateFileExtension(fileName);
    if (extError) {
      return reply.status(403).send({ error: extError });
    }

    // Validate file size
    const sizeError = validateFileSize(fileSize);
    if (sizeError) {
      return reply.status(413).send({ error: sizeError });
    }

    // Check session quota
    const quotaError = validateSessionQuota(sessionId, fileSize);
    if (quotaError) {
      return reply.status(413).send({ error: quotaError });
    }

    // Sanitize file name
    const sanitizedName = sanitizeFileName(fileName);

    // Get or create upload record
    let upload = getUploadByFileId(sessionId, fileId);
    if (!upload) {
      const uploadId = uuidv4();
      createUpload(uploadId, sessionId, fileId, fileName, sanitizedName, fileSize);
      upload = getUploadByFileId(sessionId, fileId)!;
    }

    // Get the raw body as a Buffer
    const body = request.body as Buffer;
    if (!body || body.length === 0) {
      return reply.status(400).send({ error: 'Empty chunk body' });
    }

    // Write chunk to temp file at the correct byte offset
    const tempPath = getTempChunkPath(tempDir, upload.id);
    const fd = fs.openSync(tempPath, fs.existsSync(tempPath) ? 'r+' : 'w');
    try {
      fs.writeSync(fd, body, 0, body.length, startByte);
    } finally {
      fs.closeSync(fd);
    }

    // Update uploaded bytes
    const newUploadedBytes = startByte + body.length;
    updateUploadedBytes(upload.id, newUploadedBytes);

    // Emit progress event for the operator UI
    const emitter = getUploadProgressEmitter();
    emitter.emit('progress', {
      uploadId: upload.id,
      sessionId,
      fileName: upload.original_name,
      uploadedBytes: newUploadedBytes,
      totalBytes: fileSize,
    });

    // Check if upload is complete
    if (newUploadedBytes >= fileSize) {
      try {
        const finalPath = await assembleUpload(
          upload.id,
          sessionId,
          fileName,
          sanitizedName,
          fileSize,
          tempPath,
        );

        emitter.emit('complete', {
          uploadId: upload.id,
          sessionId,
          fileName: upload.original_name,
          filePath: finalPath,
          fileSize,
        });

        return {
          status: 'complete',
          uploadedBytes: newUploadedBytes,
          filePath: finalPath,
        };
      } catch (err) {
        console.error('[Upload] Assembly failed:', err);
        return reply.status(500).send({ error: 'Failed to assemble file' });
      }
    }

    return {
      status: 'uploading',
      uploadedBytes: newUploadedBytes,
    };
  });

  // ── GET /api/session-files ──────────────────────────────────
  // Client can view their own uploaded files.
  fastify.get('/api/session-files', async (request, reply) => {
    const sessionId = extractSessionId(request);
    if (!sessionId) {
      return reply.status(400).send({ error: 'Missing session' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const files = getFilesBySession(sessionId);
    return {
      files: files.map((f) => ({
        name: f.original_name,
        size: f.file_size,
        type: f.mime_type,
        uploadedAt: f.created_at,
      })),
    };
  });
}

/**
 * Extracts the session ID from request headers or cookies.
 */
function extractSessionId(request: { headers: Record<string, string | string[] | undefined> }): string | null {
  // Check header first
  const headerSession = request.headers['x-customer-session'];
  if (typeof headerSession === 'string' && headerSession) {
    return headerSession;
  }

  // Check cookie
  const cookieHeader = request.headers['cookie'];
  if (typeof cookieHeader === 'string') {
    const match = cookieHeader.match(/printio_session=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}
