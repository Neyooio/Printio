import { formatBytes, formatRelativeTime, getFileIconClass, getFileExtLabel, escapeHtml } from '../components/utils';

declare const window: Window & {
  printio: {
    getActiveSessions: () => Promise<any[]>;
    getRecentFiles: (limit?: number) => Promise<any[]>;
    getStorageStats: () => Promise<any>;
    getActiveUploads: () => Promise<any[]>;
    getSystemStatus: () => Promise<any>;
    openFile: (id: string) => Promise<any>;
    revealFile: (id: string) => Promise<any>;
  };
};

/**
 * Renders the Dashboard page — hero style with glassmorphism cards.
 */
export async function renderDashboard(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="page-header fade-in">
      <h2>Manage Your<br/><span class="accent">Print Queue</span></h2>
      <p>Monitor sessions, uploads, and system status in real-time</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card coral fade-in fade-in-delay-1">
        <div class="stat-icon coral">📱</div>
        <div class="stat-label">Active Sessions</div>
        <div class="stat-value" id="statSessions">0</div>
        <div class="stat-sub">Connected devices</div>
      </div>
      <div class="stat-card green fade-in fade-in-delay-2">
        <div class="stat-icon green">📄</div>
        <div class="stat-label">Files Today</div>
        <div class="stat-value" id="statFilesToday">0</div>
        <div class="stat-sub">Uploaded today</div>
      </div>
      <div class="stat-card fade-in fade-in-delay-3">
        <div class="stat-icon purple">💾</div>
        <div class="stat-label">Storage Used</div>
        <div class="stat-value" id="statStorageUsed">0 B</div>
        <div class="stat-sub" id="statStorageSub">of 10 GB quota</div>
      </div>
      <div class="stat-card fade-in fade-in-delay-4">
        <div class="stat-icon blue">📊</div>
        <div class="stat-label">Total Uploaded</div>
        <div class="stat-value" id="statTotalUploaded">0 B</div>
        <div class="stat-sub">All time</div>
      </div>
    </div>

    <div class="section float-in" id="activeUploadsSection" style="display:none;">
      <div class="section-header">
        <span class="section-title">⬆️ Active Uploads</span>
      </div>
      <div id="activeUploadsList"></div>
    </div>

    <div class="section float-in">
      <div class="section-header">
        <span class="section-title">📱 Active Sessions</span>
      </div>
      <div class="sessions-grid" id="sessionsList"></div>
    </div>

    <div class="section float-in">
      <div class="section-header">
        <span class="section-title">📄 Recent Files</span>
        <span class="section-action" data-nav="files">View all →</span>
      </div>
      <div class="file-list" id="recentFilesList"></div>
    </div>
  `;

  await refreshDashboard();
}

export async function refreshDashboard(): Promise<void> {
  try {
    const [sessions, files, storageStats, activeUploads] = await Promise.all([
      window.printio.getActiveSessions(),
      window.printio.getRecentFiles(10),
      window.printio.getStorageStats(),
      window.printio.getActiveUploads(),
    ]);

    // Stats
    const statSessions = document.getElementById('statSessions');
    if (statSessions) statSessions.textContent = String(sessions.length);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayFiles = files.filter((f: any) => f.created_at >= todayStart.getTime());
    const statFilesToday = document.getElementById('statFilesToday');
    if (statFilesToday) statFilesToday.textContent = String(todayFiles.length);

    const statStorageUsed = document.getElementById('statStorageUsed');
    if (statStorageUsed) statStorageUsed.textContent = formatBytes(storageStats.usedBytes);

    const statStorageSub = document.getElementById('statStorageSub');
    if (statStorageSub) statStorageSub.textContent = `of ${formatBytes(storageStats.quotaBytes)} quota`;

    const totalBytes = sessions.reduce((sum: number, s: any) => sum + (s.total_bytes_uploaded || 0), 0);
    const statTotalUploaded = document.getElementById('statTotalUploaded');
    if (statTotalUploaded) statTotalUploaded.textContent = formatBytes(totalBytes);

    // Active uploads
    const uploadSection = document.getElementById('activeUploadsSection');
    const uploadList = document.getElementById('activeUploadsList');
    if (uploadSection && uploadList) {
      if (activeUploads.length > 0) {
        uploadSection.style.display = 'block';
        uploadList.innerHTML = activeUploads.map((u: any) => `
          <div class="upload-card">
            <div class="upload-card-top">
              <span class="upload-file-name">${escapeHtml(u.original_name)}</span>
              <span class="upload-pct">${u.file_size > 0 ? Math.round((u.uploaded_bytes / u.file_size) * 100) : 0}%</span>
            </div>
            <div class="upload-progress-track">
              <div class="upload-progress-fill" style="width: ${u.file_size > 0 ? (u.uploaded_bytes / u.file_size) * 100 : 0}%"></div>
            </div>
            <div class="upload-meta">
              <span>${formatBytes(u.uploaded_bytes)} / ${formatBytes(u.file_size)}</span>
              <span>Session: ${u.session_id.substring(0, 8)}…</span>
            </div>
          </div>
        `).join('');
      } else {
        uploadSection.style.display = 'none';
      }
    }

    // Sessions
    const sessionsList = document.getElementById('sessionsList');
    if (sessionsList) {
      if (sessions.length === 0) {
        sessionsList.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-icon">📱</div>
            <div class="empty-title">No active sessions</div>
            <div class="empty-desc">Waiting for customers to connect to the hotspot</div>
          </div>
        `;
      } else {
        sessionsList.innerHTML = sessions.map((s: any) => `
          <div class="session-card slide-in">
            <div class="session-avatar">📱</div>
            <div class="session-info">
              <div class="session-ip">${escapeHtml(s.device_ip)}</div>
              <div class="session-detail">${formatRelativeTime(s.last_active)}</div>
            </div>
            <div class="session-bytes">${formatBytes(s.total_bytes_uploaded)}</div>
          </div>
        `).join('');
      }
    }

    // Recent files
    const filesList = document.getElementById('recentFilesList');
    if (filesList) {
      if (files.length === 0) {
        filesList.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📄</div>
            <div class="empty-title">No files yet</div>
            <div class="empty-desc">Uploaded files will appear here</div>
          </div>
        `;
      } else {
        filesList.innerHTML = files.map((f: any) => `
          <div class="file-card slide-in" data-id="${escapeHtml(f.id)}">
            <div class="file-icon ${getFileIconClass(f.original_name)}">
              ${getFileExtLabel(f.original_name)}
            </div>
            <div class="file-info">
              <div class="file-name">${escapeHtml(f.original_name)}</div>
              <div class="file-meta">${formatBytes(f.file_size)} · ${formatRelativeTime(f.created_at)}</div>
            </div>
            <div class="file-actions">
              <button class="file-action-btn" data-action="open" data-id="${escapeHtml(f.id)}" title="Open in App">📂</button>
              <button class="file-action-btn" data-action="reveal" data-id="${escapeHtml(f.id)}" title="Show in Explorer">📁</button>
            </div>
          </div>
        `).join('');

        filesList.querySelectorAll('.file-action-btn').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const action = (btn as HTMLElement).dataset.action;
            const id = (btn as HTMLElement).dataset.id!;
            if (action === 'open') await window.printio.openFile(id);
            if (action === 'reveal') await window.printio.revealFile(id);
          });
        });
      }
    }
  } catch (err) {
    console.error('Dashboard refresh failed:', err);
  }
}
