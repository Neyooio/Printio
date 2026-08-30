import fs from 'node:fs';
import { shell } from 'electron';
import { getFileById, deleteFileRecord } from '../database/queries';

/**
 * Opens a document in its default application (e.g. Microsoft Word, Adobe Reader).
 */
export async function openDocumentInDefaultApp(filePath: string): Promise<void> {
  const error = await shell.openPath(filePath);
  if (error) {
    throw new Error(`Failed to open file: ${error}`);
  }
}

/**
 * Opens a document by its database file ID.
 */
export async function openDocumentById(fileId: string): Promise<void> {
  const file = getFileById(fileId);
  if (!file) {
    throw new Error(`File not found: ${fileId}`);
  }
  await openDocumentInDefaultApp(file.stored_path);
}

/**
 * Reveals a document inside Windows File Explorer.
 */
export function showDocumentInFolder(filePath: string): void {
  shell.showItemInFolder(filePath);
}

/**
 * Reveals a document by its database file ID.
 */
export function showDocumentInFolderById(fileId: string): void {
  const file = getFileById(fileId);
  if (!file) {
    throw new Error(`File not found: ${fileId}`);
  }
  showDocumentInFolder(file.stored_path);
}

/**
 * Deletes a file from both disk and database.
 */
export async function deleteDocument(fileId: string): Promise<void> {
  const file = getFileById(fileId);
  if (!file) {
    throw new Error(`File not found: ${fileId}`);
  }

  // Delete from disk
  try {
    if (fs.existsSync(file.stored_path)) {
      fs.unlinkSync(file.stored_path);
    }
  } catch (err) {
    console.error(`[FileHandler] Failed to delete file from disk: ${file.stored_path}`, err);
  }

  // Delete from database
  deleteFileRecord(fileId);
  console.log(`[FileHandler] Deleted: ${file.original_name} (${fileId})`);
}
