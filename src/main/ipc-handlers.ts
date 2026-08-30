import { ipcMain, dialog, BrowserWindow } from 'electron';
import {
  getActiveSessions,
  getRecentFiles,
  getActiveUploads,
  searchFiles,
} from './database/queries';
import { openDocumentById, showDocumentInFolderById, deleteDocument } from './storage/file-handler';
import {
  getStoragePath,
  setStoragePath,
  getDiskQuota,
  setDiskQuota,
  getStorageStats,
  getSystemDiskFree,
} from './storage/storage-manager';
import { isDnsRunning } from './network/dns-server';
import { isHttpRunning } from './network/http-server';
import { getNetworkInfo, detectGatewayIp } from './network/network-utils';
import { getUploadProgressEmitter } from './upload/upload-events';

let mainWindow: BrowserWindow | null = null;

/**
 * Registers all IPC handlers and binds upload event forwarding.
 */
export function registerIpcHandlers(win: BrowserWindow): void {
  mainWindow = win;

  // ── Dashboard Data ────────────────────────────────────────
  ipcMain.handle('printio:get-active-sessions', () => {
    return getActiveSessions();
  });

  ipcMain.handle('printio:get-recent-files', (_event, limit?: number) => {
    return getRecentFiles(limit);
  });

  ipcMain.handle('printio:get-system-status', () => {
    return {
      dnsRunning: isDnsRunning(),
      httpRunning: isHttpRunning(),
      gatewayIp: detectGatewayIp(),
      diskFree: getSystemDiskFree(),
    };
  });

  ipcMain.handle('printio:get-storage-stats', () => {
    return getStorageStats();
  });

  ipcMain.handle('printio:get-active-uploads', () => {
    return getActiveUploads();
  });

  // ── File Actions ──────────────────────────────────────────
  ipcMain.handle('printio:open-file', async (_event, fileId: string) => {
    try {
      await openDocumentById(fileId);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('printio:reveal-file', (_event, fileId: string) => {
    try {
      showDocumentInFolderById(fileId);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('printio:delete-file', async (_event, fileId: string) => {
    try {
      await deleteDocument(fileId);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('printio:search-files', (_event, query: string) => {
    return searchFiles(query);
  });

  // ── Settings ──────────────────────────────────────────────
  ipcMain.handle('printio:get-settings', () => {
    return {
      storagePath: getStoragePath(),
      diskQuota: getDiskQuota(),
      gatewayIp: detectGatewayIp(),
    };
  });

  ipcMain.handle('printio:update-settings', (_event, settings: Record<string, unknown>) => {
    if (typeof settings.storagePath === 'string') {
      setStoragePath(settings.storagePath);
    }
    if (typeof settings.diskQuota === 'number') {
      setDiskQuota(settings.diskQuota);
    }
    return { success: true };
  });

  ipcMain.handle('printio:select-storage-folder', async () => {
    if (!mainWindow) return { cancelled: true };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Storage Folder',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: getStoragePath(),
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { cancelled: true };
    }
    const newPath = result.filePaths[0];
    setStoragePath(newPath);
    return { cancelled: false, path: newPath };
  });

  ipcMain.handle('printio:get-network-info', () => {
    return getNetworkInfo();
  });

  // ── Upload Event Forwarding ───────────────────────────────
  const emitter = getUploadProgressEmitter();

  emitter.on('progress', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('printio:upload-progress', data);
    }
  });

  emitter.on('complete', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('printio:upload-complete', data);
    }
  });
}
