import { getDatabase, saveDatabase } from './db';

// ── Session Queries ───────────────────────────────────────────────

export function createSession(id: string, deviceIp: string, userAgent: string): void {
  const db = getDatabase();
  const now = Date.now();
  db.run(
    'INSERT INTO sessions (id, device_ip, user_agent, created_at, last_active) VALUES (?, ?, ?, ?, ?)',
    [id, deviceIp, userAgent, now, now]
  );
  saveDatabase();
}

export function getSession(id: string): SessionRow | undefined {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as SessionRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function touchSession(id: string): void {
  const db = getDatabase();
  db.run('UPDATE sessions SET last_active = ? WHERE id = ?', [Date.now(), id]);
}

export function addSessionBytes(id: string, bytes: number): void {
  const db = getDatabase();
  db.run(
    'UPDATE sessions SET total_bytes_uploaded = total_bytes_uploaded + ?, last_active = ? WHERE id = ?',
    [bytes, Date.now(), id]
  );
  saveDatabase();
}

export function getActiveSessions(): SessionRow[] {
  const db = getDatabase();
  const results: SessionRow[] = [];
  const stmt = db.prepare('SELECT * FROM sessions ORDER BY last_active DESC');
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as SessionRow);
  }
  stmt.free();
  return results;
}

export function getSessionTotalBytes(sessionId: string): number {
  const db = getDatabase();
  const stmt = db.prepare('SELECT total_bytes_uploaded FROM sessions WHERE id = ?');
  stmt.bind([sessionId]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as { total_bytes_uploaded: number };
    stmt.free();
    return row.total_bytes_uploaded ?? 0;
  }
  stmt.free();
  return 0;
}

// ── Upload Queries ────────────────────────────────────────────────

export function createUpload(
  id: string,
  sessionId: string,
  fileId: string,
  originalName: string,
  sanitizedName: string,
  fileSize: number,
): void {
  const db = getDatabase();
  db.run(
    `INSERT OR IGNORE INTO uploads (id, session_id, file_id, original_name, sanitized_name, file_size, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, sessionId, fileId, originalName, sanitizedName, fileSize, Date.now()]
  );
  saveDatabase();
}

export function getUploadByFileId(sessionId: string, fileId: string): UploadRow | undefined {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM uploads WHERE session_id = ? AND file_id = ?');
  stmt.bind([sessionId, fileId]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as UploadRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function getUploadById(id: string): UploadRow | undefined {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM uploads WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as UploadRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function updateUploadedBytes(uploadId: string, uploadedBytes: number): void {
  const db = getDatabase();
  db.run('UPDATE uploads SET uploaded_bytes = ? WHERE id = ?', [uploadedBytes, uploadId]);
}

export function completeUpload(uploadId: string, storagePath: string): void {
  const db = getDatabase();
  db.run(
    "UPDATE uploads SET status = 'complete', storage_path = ?, completed_at = ? WHERE id = ?",
    [storagePath, Date.now(), uploadId]
  );
  saveDatabase();
}

export function failUpload(uploadId: string): void {
  const db = getDatabase();
  db.run("UPDATE uploads SET status = 'failed' WHERE id = ?", [uploadId]);
  saveDatabase();
}

export function getActiveUploads(): UploadRow[] {
  const db = getDatabase();
  const results: UploadRow[] = [];
  const stmt = db.prepare("SELECT * FROM uploads WHERE status = 'uploading' ORDER BY created_at DESC");
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as UploadRow);
  }
  stmt.free();
  return results;
}

// ── File Queries ──────────────────────────────────────────────────

export function insertFile(
  id: string,
  uploadId: string,
  sessionId: string,
  originalName: string,
  storedName: string,
  storedPath: string,
  fileSize: number,
  mimeType: string,
): void {
  const db = getDatabase();
  db.run(
    `INSERT INTO files (id, upload_id, session_id, original_name, stored_name, stored_path, file_size, mime_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, uploadId, sessionId, originalName, storedName, storedPath, fileSize, mimeType, Date.now()]
  );
  saveDatabase();
}

export function getRecentFiles(limit = 50): FileRow[] {
  const db = getDatabase();
  const results: FileRow[] = [];
  const stmt = db.prepare('SELECT * FROM files ORDER BY created_at DESC LIMIT ?');
  stmt.bind([limit]);
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as FileRow);
  }
  stmt.free();
  return results;
}

export function getFilesBySession(sessionId: string): FileRow[] {
  const db = getDatabase();
  const results: FileRow[] = [];
  const stmt = db.prepare('SELECT * FROM files WHERE session_id = ? ORDER BY created_at DESC');
  stmt.bind([sessionId]);
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as FileRow);
  }
  stmt.free();
  return results;
}

export function getFileById(id: string): FileRow | undefined {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as FileRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function deleteFileRecord(id: string): void {
  const db = getDatabase();
  db.run('DELETE FROM files WHERE id = ?', [id]);
  saveDatabase();
}

export function getTotalStorageUsed(): number {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM files');
  if (stmt.step()) {
    const row = stmt.getAsObject() as { total: number };
    stmt.free();
    return row.total;
  }
  stmt.free();
  return 0;
}

export function getFilesByDate(dateStr: string): FileRow[] {
  const db = getDatabase();
  const startOfDay = new Date(dateStr).getTime();
  const endOfDay = startOfDay + 86400000;
  const results: FileRow[] = [];
  const stmt = db.prepare('SELECT * FROM files WHERE created_at >= ? AND created_at < ? ORDER BY created_at DESC');
  stmt.bind([startOfDay, endOfDay]);
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as FileRow);
  }
  stmt.free();
  return results;
}

export function searchFiles(query: string): FileRow[] {
  const db = getDatabase();
  const results: FileRow[] = [];
  const stmt = db.prepare("SELECT * FROM files WHERE original_name LIKE ? ORDER BY created_at DESC");
  stmt.bind([`%${query}%`]);
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as FileRow);
  }
  stmt.free();
  return results;
}

// ── Type Definitions ──────────────────────────────────────────────

export interface SessionRow {
  id: string;
  device_ip: string;
  user_agent: string;
  created_at: number;
  last_active: number;
  total_bytes_uploaded: number;
}

export interface UploadRow {
  id: string;
  session_id: string;
  file_id: string;
  original_name: string;
  sanitized_name: string;
  file_size: number;
  uploaded_bytes: number;
  status: 'uploading' | 'complete' | 'failed';
  storage_path: string | null;
  created_at: number;
  completed_at: number | null;
}

export interface FileRow {
  id: string;
  upload_id: string;
  session_id: string;
  original_name: string;
  stored_name: string;
  stored_path: string;
  file_size: number;
  mime_type: string;
  created_at: number;
}
