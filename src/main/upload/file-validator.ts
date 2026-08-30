import path from 'node:path';
import { ALLOWED_EXTENSIONS, BLOCKED_EXTENSIONS, MAX_FILE_SIZE, MAX_SESSION_SIZE } from '../constants';
import { getSessionTotalBytes } from '../database/queries';

/**
 * Validates the file extension against the whitelist/blocklist.
 * Returns null if valid, error message string if invalid.
 */
export function validateFileExtension(fileName: string): string | null {
  const ext = path.extname(fileName).toLowerCase();

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return `File type "${ext}" is blocked for security reasons.`;
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `File type "${ext}" is not allowed. Accepted types: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`;
  }

  return null;
}

/**
 * Validates file size against per-file limit.
 */
export function validateFileSize(fileSize: number): string | null {
  if (fileSize <= 0) {
    return 'File size must be greater than zero.';
  }
  if (fileSize > MAX_FILE_SIZE) {
    const maxMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
    return `File exceeds the ${maxMB} MB limit.`;
  }
  return null;
}

/**
 * Validates session upload quota.
 */
export function validateSessionQuota(sessionId: string, incomingFileSize: number): string | null {
  const currentBytes = getSessionTotalBytes(sessionId);
  if (currentBytes + incomingFileSize > MAX_SESSION_SIZE) {
    const maxMB = Math.round(MAX_SESSION_SIZE / (1024 * 1024));
    const usedMB = Math.round(currentBytes / (1024 * 1024));
    return `Session upload limit of ${maxMB} MB reached (${usedMB} MB used). Cannot accept more files.`;
  }
  return null;
}

/**
 * Sanitizes a file name for safe storage.
 * Strips path traversal, control characters, and normalizes spaces.
 */
export function sanitizeFileName(rawName: string): string {
  // Extract just the basename (no directory traversal)
  let name = path.basename(rawName);

  // Remove any null bytes, control characters, and path separators
  name = name.replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, '');

  // Collapse multiple spaces/dots
  name = name.replace(/\s+/g, '_').replace(/\.{2,}/g, '.');

  // Ensure we have something left
  if (!name || name === '.' || name === '..') {
    name = 'unnamed_file';
  }

  // Truncate very long names (keep extension)
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  if (base.length > 100) {
    name = base.substring(0, 100) + ext;
  }

  return name;
}
