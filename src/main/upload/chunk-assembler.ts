import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { completeUpload, insertFile, addSessionBytes } from '../database/queries';
import { MIME_MAP } from '../constants';
import { getStoragePath } from '../storage/storage-manager';

/**
 * Assembles a completed upload from its temp chunk file into the final storage location.
 * Verifies byte count, generates the permanent path, and updates the database.
 */
export async function assembleUpload(
  uploadId: string,
  sessionId: string,
  originalName: string,
  sanitizedName: string,
  fileSize: number,
  tempFilePath: string,
): Promise<string> {
  // Verify the temp file has the correct size
  const stats = fs.statSync(tempFilePath);
  if (stats.size !== fileSize) {
    throw new Error(
      `Size mismatch: expected ${fileSize} bytes, got ${stats.size} bytes`
    );
  }

  // Build the permanent storage path
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const ext = path.extname(sanitizedName);
  const fileUuid = uuidv4();
  const storedName = `${fileUuid}${ext}`;

  const storagePath = getStoragePath();
  const destDir = path.join(storagePath, dateStr, sessionId);
  fs.mkdirSync(destDir, { recursive: true });

  const destPath = path.join(destDir, storedName);

  // Move from temp to permanent storage
  fs.renameSync(tempFilePath, destPath);

  // Update database
  const mimeType = MIME_MAP[ext.toLowerCase()] || 'application/octet-stream';
  const fileId = uuidv4();

  completeUpload(uploadId, destPath);
  insertFile(fileId, uploadId, sessionId, originalName, storedName, destPath, fileSize, mimeType);
  addSessionBytes(sessionId, fileSize);

  console.log(`[Upload] Assembled: ${originalName} → ${destPath} (${fileSize} bytes)`);

  return destPath;
}

/**
 * Returns the path for a temp chunk file during upload.
 */
export function getTempChunkPath(tempDir: string, uploadId: string): string {
  return path.join(tempDir, `${uploadId}.part`);
}
