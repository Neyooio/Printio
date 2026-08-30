import { formatBytes, escapeHtml } from '../components/utils';

declare const window: Window & {
  printio: {
    getSettings: () => Promise<any>;
    updateSettings: (s: Record<string, unknown>) => Promise<any>;
    selectStorageFolder: () => Promise<any>;
    getStorageStats: () => Promise<any>;
    getNetworkInfo: () => Promise<any[]>;
    getSystemStatus: () => Promise<any>;
  };
};

/**
 * Renders the Settings page — glass card groups.
 */
export async function renderSettingsPage(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="page-header fade-in">
      <h2>App <span class="accent">Settings</span></h2>
      <p>Configure storage, network, and system preferences</p>
    </div>

    <div class="settings-group fade-in fade-in-delay-1">
      <div class="settings-group-title">📂 Storage</div>
      <div class="setting-row">
        <div>
          <div class="setting-label">Storage Location</div>
          <div class="setting-desc" id="settingStoragePath">Loading...</div>
        </div>
        <button class="btn" id="btnChangeStorage">Change</button>
      </div>
      <div class="setting-row">
        <div style="width:100%;">
          <div class="setting-label">Disk Usage</div>
          <div class="storage-gauge">
            <div class="gauge-track">
              <div class="gauge-fill" id="storageGaugeFill" style="width: 0%"></div>
            </div>
            <div class="gauge-labels">
              <span id="storageGaugeUsed">—</span>
              <span id="storageGaugeTotal">—</span>
            </div>
          </div>
        </div>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-label">Disk Quota</div>
          <div class="setting-desc">Maximum total storage for uploaded files</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="range" id="quotaSlider" min="1" max="50" value="10" style="width:130px;">
          <span class="setting-value" id="quotaValue">10 GB</span>
        </div>
      </div>
    </div>

    <div class="settings-group fade-in fade-in-delay-2">
      <div class="settings-group-title">🌐 Network</div>
      <div class="setting-row">
        <div>
          <div class="setting-label">Gateway IP</div>
          <div class="setting-desc">Auto-detected from hotspot adapter</div>
        </div>
        <span class="setting-value" id="settingGatewayIp">—</span>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-label">DNS Server</div>
          <div class="setting-desc">Port 53 UDP interceptor</div>
        </div>
        <span class="setting-value" id="settingDnsStatus">—</span>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-label">HTTP Server</div>
          <div class="setting-desc">Port 80 Fastify</div>
        </div>
        <span class="setting-value" id="settingHttpStatus">—</span>
      </div>
    </div>

    <div class="settings-group fade-in fade-in-delay-3">
      <div class="settings-group-title">📡 Network Interfaces</div>
      <div id="networkInterfaces">
        <div class="setting-row"><span class="setting-label" style="color:var(--text-tertiary)">Detecting...</span></div>
      </div>
    </div>

    <div class="settings-group fade-in fade-in-delay-4">
      <div class="settings-group-title">ℹ️ About</div>
      <div class="setting-row">
        <div>
          <div class="setting-label">Printio</div>
          <div class="setting-desc">Offline-first file intake for print shops</div>
        </div>
        <span class="setting-value">v1.0.0</span>
      </div>
    </div>
  `;

  // Bind change storage button
  document.getElementById('btnChangeStorage')?.addEventListener('click', async () => {
    const result = await window.printio.selectStorageFolder();
    if (!result.cancelled) {
      const pathEl = document.getElementById('settingStoragePath');
      if (pathEl) pathEl.textContent = result.path;
    }
  });

  // Bind quota slider
  const quotaSlider = document.getElementById('quotaSlider') as HTMLInputElement;
  const quotaValue = document.getElementById('quotaValue');
  quotaSlider?.addEventListener('input', () => {
    const gb = parseInt(quotaSlider.value, 10);
    if (quotaValue) quotaValue.textContent = `${gb} GB`;
  });
  quotaSlider?.addEventListener('change', async () => {
    const gb = parseInt(quotaSlider.value, 10);
    await window.printio.updateSettings({ diskQuota: gb * 1024 * 1024 * 1024 });
  });

  await loadSettings();
}

async function loadSettings(): Promise<void> {
  try {
    const [settings, storageStats, systemStatus, networkInfo] = await Promise.all([
      window.printio.getSettings(),
      window.printio.getStorageStats(),
      window.printio.getSystemStatus(),
      window.printio.getNetworkInfo(),
    ]);

    // Storage path
    const pathEl = document.getElementById('settingStoragePath');
    if (pathEl) pathEl.textContent = settings.storagePath;

    // Storage gauge
    const gaugeFill = document.getElementById('storageGaugeFill') as HTMLElement;
    const gaugeUsed = document.getElementById('storageGaugeUsed');
    const gaugeTotal = document.getElementById('storageGaugeTotal');
    if (gaugeFill) {
      const pct = storageStats.percentUsed;
      gaugeFill.style.width = `${pct}%`;
      gaugeFill.className = `gauge-fill${pct > 80 ? ' danger' : pct > 60 ? ' warning' : ''}`;
    }
    if (gaugeUsed) gaugeUsed.textContent = formatBytes(storageStats.usedBytes);
    if (gaugeTotal) gaugeTotal.textContent = formatBytes(storageStats.quotaBytes);

    // Quota slider
    const quotaSliderEl = document.getElementById('quotaSlider') as HTMLInputElement | null;
    const quotaValueEl = document.getElementById('quotaValue');
    if (quotaSliderEl && settings.diskQuota) {
      const gb = Math.round(settings.diskQuota / (1024 * 1024 * 1024));
      quotaSliderEl.value = String(gb);
      if (quotaValueEl) quotaValueEl.textContent = `${gb} GB`;
    }

    // Network
    const gatewayEl = document.getElementById('settingGatewayIp');
    if (gatewayEl) gatewayEl.textContent = systemStatus.gatewayIp;

    const dnsEl = document.getElementById('settingDnsStatus');
    if (dnsEl) {
      dnsEl.textContent = systemStatus.dnsRunning ? '● Running' : '○ Stopped';
      dnsEl.style.color = systemStatus.dnsRunning ? 'var(--success)' : 'var(--error)';
    }

    const httpEl = document.getElementById('settingHttpStatus');
    if (httpEl) {
      httpEl.textContent = systemStatus.httpRunning ? '● Running' : '○ Stopped';
      httpEl.style.color = systemStatus.httpRunning ? 'var(--success)' : 'var(--error)';
    }

    // Network interfaces
    const interfacesEl = document.getElementById('networkInterfaces');
    if (interfacesEl) {
      if (networkInfo.length === 0) {
        interfacesEl.innerHTML = '<div class="setting-row"><span class="setting-label" style="color:var(--text-tertiary)">No interfaces detected</span></div>';
      } else {
        interfacesEl.innerHTML = networkInfo.map((iface: any) => `
          <div class="setting-row">
            <div>
              <div class="setting-label">${escapeHtml(iface.name)}</div>
              <div class="setting-desc">MAC: ${escapeHtml(iface.mac)}</div>
            </div>
            <span class="setting-value">${escapeHtml(iface.address)}</span>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}
