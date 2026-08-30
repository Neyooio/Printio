import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabasePath } from '../constants';

let db: SqlJsDatabase | null = null;
let dbPath: string = '';

/**
 * Initializes the sql.js database.
 * Must be called once at startup before any queries.
 */
export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();
  dbPath = getDatabasePath();

  // Ensure directory exists
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  // Load existing database or create a new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  console.log(`[Database] Initialized at: ${dbPath}`);
}

/**
 * Returns the singleton sql.js database instance.
 * Throws if initDatabase() has not been called.
 */
export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Persists the in-memory database to disk.
 * sql.js operates in-memory; we must explicitly save to disk.
 */
export function saveDatabase(): void {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

/**
 * Closes the database connection gracefully.
 * Saves to disk before closing.
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    console.log('[Database] Closed');
  }
}

/**
 * Auto-save interval handle.
 */
let autoSaveInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Starts auto-saving the database every N milliseconds.
 */
export function startAutoSave(intervalMs = 10000): void {
  if (autoSaveInterval) clearInterval(autoSaveInterval);
  autoSaveInterval = setInterval(() => {
    saveDatabase();
  }, intervalMs);
}

/**
 * Stops auto-saving.
 */
export function stopAutoSave(): void {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}
