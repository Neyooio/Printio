/**
 * Renders the bottom status bar.
 */
export function renderStatusBar(container: HTMLElement): void {
  container.innerHTML = `
    <div class="status-bar-left">
      <div class="status-bar-item">
        <span id="statusBarGateway">Gateway: detecting...</span>
      </div>
      <div class="status-bar-item">
        <span id="statusBarStorage">Storage: —</span>
      </div>
    </div>
    <div class="status-bar-right">
      <div class="status-bar-item">
        <span id="statusBarSessions">0 active sessions</span>
      </div>
      <div class="status-bar-item">
        <span id="statusBarTime"></span>
      </div>
    </div>
  `;

  // Update time every second
  updateTime();
  setInterval(updateTime, 1000);
}

function updateTime(): void {
  const el = document.getElementById('statusBarTime');
  if (el) {
    el.textContent = new Date().toLocaleTimeString();
  }
}

/**
 * Updates status bar data.
 */
export function updateStatusBar(data: {
  gatewayIp?: string;
  storageUsed?: string;
  storageTotal?: string;
  activeSessions?: number;
}): void {
  if (data.gatewayIp) {
    const el = document.getElementById('statusBarGateway');
    if (el) el.textContent = `Gateway: ${data.gatewayIp}`;
  }
  if (data.storageUsed && data.storageTotal) {
    const el = document.getElementById('statusBarStorage');
    if (el) el.textContent = `Storage: ${data.storageUsed} / ${data.storageTotal}`;
  }
  if (data.activeSessions !== undefined) {
    const el = document.getElementById('statusBarSessions');
    if (el) el.textContent = `${data.activeSessions} active session${data.activeSessions !== 1 ? 's' : ''}`;
  }
}
