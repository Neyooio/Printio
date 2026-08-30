import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';

import { initDatabase, closeDatabase, stopAutoSave, startAutoSave } from './database/db';
import { runMigrations } from './database/migrations';
import { detectGatewayIp } from './network/network-utils';
import { startDnsServer, stopDnsServer } from './network/dns-server';
import { startHttpServer, stopHttpServer } from './network/http-server';
import { initStorage, loadSavedSettings } from './storage/storage-manager';
import { createMainWindow } from './window';
import { registerIpcHandlers } from './ipc-handlers';
import { getTempUploadPath } from './constants';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let gatewayIp = '192.168.137.1';

/**
 * Main boot sequence.
 */
async function boot(): Promise<void> {
  console.log('[Printio] Starting boot sequence...');

  // 1. Initialize database
  console.log('[Boot] Initializing database...');
  await initDatabase();
  runMigrations();
  startAutoSave(10000); // Save DB to disk every 10 seconds

  // 2. Load saved settings
  loadSavedSettings();

  // 3. Initialize storage
  initStorage();

  // 4. Ensure temp upload directory exists
  const tempDir = getTempUploadPath();
  fs.mkdirSync(tempDir, { recursive: true });

  // 5. Detect gateway IP
  gatewayIp = detectGatewayIp();
  console.log(`[Boot] Gateway IP: ${gatewayIp}`);

  // 6. Load the portal HTML for serving
  const portalHtmlPath = path.join(__dirname, '..', '..', 'src', 'portal', 'index.html');
  let portalHtml: string;
  try {
    // In development, read from source
    portalHtml = fs.readFileSync(portalHtmlPath, 'utf-8');
  } catch {
    // In production, try from resources
    const prodPath = path.join(process.resourcesPath || __dirname, 'portal', 'index.html');
    try {
      portalHtml = fs.readFileSync(prodPath, 'utf-8');
    } catch {
      // Fallback: try relative to __dirname
      const fallbackPath = path.join(__dirname, 'portal', 'index.html');
      try {
        portalHtml = fs.readFileSync(fallbackPath, 'utf-8');
      } catch {
        console.error('[Boot] Could not find portal HTML file');
        portalHtml = '<html><body><h1>Printio Portal</h1><p>Portal file not found.</p></body></html>';
      }
    }
  }

  // 7. Start DNS server
  try {
    await startDnsServer(gatewayIp);
  } catch (err) {
    console.error('[Boot] DNS server failed to start:', err);
    console.warn('[Boot] Port 53 may be in use. Captive portal auto-detection will not work.');
    console.warn('[Boot] Customers can navigate manually to http://' + gatewayIp);
  }

  // 8. Start HTTP server
  try {
    await startHttpServer(gatewayIp, portalHtml);
  } catch (err) {
    console.error('[Boot] HTTP server failed to start:', err);
    console.error('[Boot] Port 80 may be in use by another application.');
    // Show error dialog
    const { dialog } = await import('electron');
    dialog.showErrorBox(
      'Printio — Startup Error',
      'Could not start the HTTP server on port 80.\n\n' +
      'Another application may be using this port.\n' +
      'Please close any web servers (IIS, Apache, Skype) and restart Printio.'
    );
  }

  // 9. Create main window
  const mainWindow = createMainWindow();

  // 10. Register IPC handlers
  registerIpcHandlers(mainWindow);

  console.log('[Printio] Boot sequence complete ✓');
  console.log(`[Printio] Portal available at http://${gatewayIp}/`);
}

// ── App Lifecycle ───────────────────────────────────────────────

app.on('ready', boot);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const mainWindow = createMainWindow();
    registerIpcHandlers(mainWindow);
  }
});

app.on('before-quit', async () => {
  console.log('[Printio] Shutting down...');

  try {
    await stopDnsServer();
  } catch (err) {
    console.error('[Shutdown] DNS server:', err);
  }

  try {
    await stopHttpServer();
  } catch (err) {
    console.error('[Shutdown] HTTP server:', err);
  }

  stopAutoSave();
  closeDatabase();
  console.log('[Printio] Shutdown complete');
});
