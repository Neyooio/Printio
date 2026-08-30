import path from 'node:path';
import { app } from 'electron';

// ── Network Ports ──────────────────────────────────────────────────
export const DNS_PORT = 53;
export const HTTP_PORT = 80;
export const DNS_BIND_ADDRESS = '0.0.0.0';
export const HTTP_BIND_ADDRESS = '0.0.0.0';

// ── Default Gateway Subnet ────────────────────────────────────────
export const ICS_SUBNET_PREFIX = '192.168.137';
export const DEFAULT_GATEWAY_IP = '192.168.137.1';

// ── Upload Limits ─────────────────────────────────────────────────
export const MAX_CHUNK_SIZE = 2 * 1024 * 1024;        // 2 MB per chunk
export const MAX_FILE_SIZE = 100 * 1024 * 1024;        // 100 MB per file
export const MAX_SESSION_SIZE = 500 * 1024 * 1024;     // 500 MB per session
export const DEFAULT_DISK_QUOTA = 10 * 1024 * 1024 * 1024; // 10 GB total
export const CHUNK_SIZE = 1 * 1024 * 1024;             // 1 MB recommended chunk

// ── File Type Whitelist / Blocklist ───────────────────────────────
export const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.docx', '.doc', '.xlsx', '.pptx',
  '.jpg', '.jpeg', '.png',
]);

export const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.msi', '.ps1',
  '.vbs', '.js', '.scr', '.docm', '.xlsm',
]);

export const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

// ── Session Settings ──────────────────────────────────────────────
export const SESSION_EXPIRY_HOURS = 24;
export const SESSION_COOKIE_NAME = 'printio_session';

// ── Storage Paths (resolved at runtime) ───────────────────────────
export function getDefaultStoragePath(): string {
  return path.join(app.getPath('documents'), 'Printio', 'storage');
}

export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), 'printio.db');
}

export function getTempUploadPath(): string {
  return path.join(app.getPath('userData'), 'temp_uploads');
}

// ── Application Info ──────────────────────────────────────────────
export const APP_NAME = 'Printio';
export const APP_VERSION = '1.0.0';
