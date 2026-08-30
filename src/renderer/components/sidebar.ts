/**
 * Renders the sidebar navigation — glassmorphism style.
 */
export function renderSidebar(container: HTMLElement, activePage: string, onNavigate: (page: string) => void): void {
  container.innerHTML = `
    <div class="sidebar-brand">
      <h1>Print<span>io</span></h1>
      <p>File Manager</p>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" data-page="dashboard">
        <span class="nav-icon">📊</span>
        <span class="nav-label">Dashboard</span>
      </div>
      <div class="nav-item ${activePage === 'files' ? 'active' : ''}" data-page="files">
        <span class="nav-icon">📁</span>
        <span class="nav-label">Files</span>
      </div>
      <div class="nav-item ${activePage === 'settings' ? 'active' : ''}" data-page="settings">
        <span class="nav-icon">⚙️</span>
        <span class="nav-label">Settings</span>
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="server-status" id="sidebarStatus">
        <div class="server-status-item">
          <div class="status-indicator offline" id="dnsStatus"></div>
          <span>DNS Server</span>
        </div>
        <div class="server-status-item">
          <div class="status-indicator offline" id="httpStatus"></div>
          <span>HTTP Server</span>
        </div>
      </div>
    </div>
  `;

  // Bind navigation
  container.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      const page = (item as HTMLElement).dataset.page!;
      onNavigate(page);
    });
  });
}

/**
 * Updates the sidebar server status indicators.
 */
export function updateSidebarStatus(dnsRunning: boolean, httpRunning: boolean): void {
  const dnsEl = document.getElementById('dnsStatus');
  const httpEl = document.getElementById('httpStatus');
  if (dnsEl) {
    dnsEl.className = `status-indicator ${dnsRunning ? 'online' : 'offline'}`;
  }
  if (httpEl) {
    httpEl.className = `status-indicator ${httpRunning ? 'online' : 'offline'}`;
  }
}
