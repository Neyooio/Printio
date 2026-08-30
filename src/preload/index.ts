import { contextBridge, ipcRenderer } from 'electron';

/**
 * Printio Preload Bridge
 * Exposes a safe, typed API to the renderer process via contextBridge.
 */
contextBridge.exposeInMainWorld('printio', {
  // ── Dashboard Data ──
  getActiveSessions: () => ipcRenderer.invoke('printio:get-active-sessions'),
  getRecentFiles: (limit?: number) => ipcRenderer.invoke('printio:get-recent-files', limit),
  getSystemStatus: () => ipcRenderer.invoke('printio:get-system-status'),
  getStorageStats: () => ipcRenderer.invoke('printio:get-storage-stats'),
  getActiveUploads: () => ipcRenderer.invoke('printio:get-active-uploads'),

  // ── File Actions ──
  openFile: (fileId: string) => ipcRenderer.invoke('printio:open-file', fileId),
  revealFile: (fileId: string) => ipcRenderer.invoke('printio:reveal-file', fileId),
  deleteFile: (fileId: string) => ipcRenderer.invoke('printio:delete-file', fileId),
  searchFiles: (query: string) => ipcRenderer.invoke('printio:search-files', query),

  // ── Settings ──
  getSettings: () => ipcRenderer.invoke('printio:get-settings'),
  updateSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('printio:update-settings', settings),
  selectStorageFolder: () => ipcRenderer.invoke('printio:select-storage-folder'),
  getNetworkInfo: () => ipcRenderer.invoke('printio:get-network-info'),

  // ── Real-time Events ──
  onUploadProgress: (callback: (data: unknown) => void) => {
    const handler = (_event: unknown, data: unknown) => callback(data);
    ipcRenderer.on('printio:upload-progress', handler);
    return () => ipcRenderer.removeListener('printio:upload-progress', handler);
  },
  onUploadComplete: (callback: (data: unknown) => void) => {
    const handler = (_event: unknown, data: unknown) => callback(data);
    ipcRenderer.on('printio:upload-complete', handler);
    return () => ipcRenderer.removeListener('printio:upload-complete', handler);
  },
  onSessionUpdate: (callback: (data: unknown) => void) => {
    const handler = (_event: unknown, data: unknown) => callback(data);
    ipcRenderer.on('printio:session-update', handler);
    return () => ipcRenderer.removeListener('printio:session-update', handler);
  },
});
