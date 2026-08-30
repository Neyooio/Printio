import { getDatabase, saveDatabase } from './db';

/**
 * Runs all database schema migrations.
 * Uses IF NOT EXISTS for idempotent re-runs.
 */
export function runMigrations(): void {
  const db = getDatabase();

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      device_ip TEXT NOT NULL,
      user_agent TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      last_active INTEGER NOT NULL,
      total_bytes_uploaded INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      file_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      sanitized_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      uploaded_bytes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'uploading',
      storage_path TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      UNIQUE(session_id, file_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      upload_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_uploads_session ON uploads(session_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_uploads_file_id ON uploads(session_id, file_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_files_session ON files(session_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at)');

  saveDatabase();
  console.log('[Database] Migrations complete');
}
