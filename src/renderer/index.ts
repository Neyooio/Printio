import './styles/main.css';
import { renderSidebar, updateSidebarStatus } from './components/sidebar';
import { renderStatusBar, updateStatusBar } from './components/status-bar';
import { renderDashboard, refreshDashboard } from './pages/dashboard';
import { renderFilesPage } from './pages/files';
import { renderSettingsPage } from './pages/settings';
import { formatBytes } from './components/utils';

declare const window: Window & {
  printio: {
    getActiveSessions: () => Promise<any[]>;
    getSystemStatus: () => Promise<any>;
    getStorageStats: () => Promise<any>;
    onUploadProgress: (cb: (data: any) => void) => () => void;
    onUploadComplete: (cb: (data: any) => void) => () => void;
  };
};

let currentPage = 'dashboard';

/**
 * Initialize the application.
 */
async function init(): Promise<void> {
  const sidebar = document.getElementById('sidebar')!;
  const mainContent = document.getElementById('mainContent')!;
  const statusBar = document.getElementById('statusBar')!;

  // Render structural components
  renderSidebar(sidebar, currentPage, navigateTo);
  renderStatusBar(statusBar);

  // Initial page render
  await navigateTo('dashboard');

  // Start periodic refresh
  setInterval(refreshStatusData, 5000);

  // Subscribe to real-time events
  window.printio.onUploadProgress(() => {
    if (currentPage === 'dashboard') {
      refreshDashboard();
    }
  });

  window.printio.onUploadComplete(() => {
    if (currentPage === 'dashboard') {
      refreshDashboard();
    }
    refreshStatusData();
  });

  // Initial status update
  await refreshStatusData();
}

/**
 * Navigate to a page.
 */
async function navigateTo(page: string): Promise<void> {
  currentPage = page;
  const mainContent = document.getElementById('mainContent')!;
  const sidebar = document.getElementById('sidebar')!;

  // Re-render sidebar with new active state
  renderSidebar(sidebar, currentPage, navigateTo);

  // Render the page
  switch (page) {
    case 'dashboard':
      await renderDashboard(mainContent);
      break;
    case 'files':
      await renderFilesPage(mainContent);
      break;
    case 'settings':
      await renderSettingsPage(mainContent);
      break;
    default:
      await renderDashboard(mainContent);
  }
}

/**
 * Refreshes status bar and sidebar server indicators.
 */
async function refreshStatusData(): Promise<void> {
  try {
    const [status, sessions, storage] = await Promise.all([
      window.printio.getSystemStatus(),
      window.printio.getActiveSessions(),
      window.printio.getStorageStats(),
    ]);

    updateSidebarStatus(status.dnsRunning, status.httpRunning);

    updateStatusBar({
      gatewayIp: status.gatewayIp,
      storageUsed: formatBytes(storage.usedBytes),
      storageTotal: formatBytes(storage.quotaBytes),
      activeSessions: sessions.length,
    });
  } catch (err) {
    console.error('Status refresh failed:', err);
  }
}

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', init);
