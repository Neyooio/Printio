import { formatBytes, formatRelativeTime, getFileIconClass, getFileExtLabel, escapeHtml } from '../components/utils';

declare const window: Window & {
  printio: {
    getRecentFiles: (limit?: number) => Promise<any[]>;
    searchFiles: (query: string) => Promise<any[]>;
    openFile: (id: string) => Promise<any>;
    revealFile: (id: string) => Promise<any>;
    deleteFile: (id: string) => Promise<any>;
  };
};

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Renders the Files page — glass search bar + grouped file browser.
 */
export async function renderFilesPage(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="page-header fade-in">
      <h2>Your <span class="accent">Files</span></h2>
      <p>Browse and manage all uploaded documents</p>
    </div>

    <div class="search-bar fade-in fade-in-delay-1">
      <span class="search-icon">🔍</span>
      <input type="text" id="fileSearch" placeholder="Search files by name..." autocomplete="off" />
    </div>

    <div class="file-list fade-in fade-in-delay-2" id="filesContainer"></div>
  `;

  const searchInput = document.getElementById('fileSearch') as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = searchInput.value.trim();
      if (query) {
        loadSearchResults(query);
      } else {
        loadAllFiles();
      }
    }, 300);
  });

  await loadAllFiles();
}

async function loadAllFiles(): Promise<void> {
  try {
    const files = await window.printio.getRecentFiles(200);
    renderFileList(files);
  } catch (err) {
    console.error('Failed to load files:', err);
  }
}

async function loadSearchResults(query: string): Promise<void> {
  try {
    const files = await window.printio.searchFiles(query);
    renderFileList(files);
  } catch (err) {
    console.error('Search failed:', err);
  }
}

function renderFileList(files: any[]): void {
  const container = document.getElementById('filesContainer');
  if (!container) return;

  if (files.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">No files found</div>
        <div class="empty-desc">Try a different search or wait for customer uploads</div>
      </div>
    `;
    return;
  }

  // Group by date
  const groups = new Map<string, any[]>();
  for (const file of files) {
    const dateKey = new Date(file.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(file);
  }

  let html = '';
  for (const [date, groupFiles] of groups) {
    html += `
      <div class="section">
        <div class="section-header">
          <span class="section-title">${escapeHtml(date)}</span>
          <span class="section-action">${groupFiles.length} file${groupFiles.length > 1 ? 's' : ''}</span>
        </div>
    `;

    for (const f of groupFiles) {
      html += `
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
            <button class="file-action-btn danger" data-action="delete" data-id="${escapeHtml(f.id)}" title="Delete">🗑️</button>
          </div>
        </div>
      `;
    }

    html += '</div>';
  }

  container.innerHTML = html;

  // Bind actions
  container.querySelectorAll('.file-action-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = (btn as HTMLElement).dataset.action;
      const id = (btn as HTMLElement).dataset.id!;

      if (action === 'open') {
        await window.printio.openFile(id);
      } else if (action === 'reveal') {
        await window.printio.revealFile(id);
      } else if (action === 'delete') {
        const card = (btn as HTMLElement).closest('.file-card') as HTMLElement;
        const fileName = card.querySelector('.file-name')?.textContent || 'this file';
        if (confirm(`Delete "${fileName}"? This cannot be undone.`)) {
          const result = await window.printio.deleteFile(id);
          if (result.success) {
            card.style.opacity = '0';
            card.style.transform = 'translateX(20px)';
            card.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            setTimeout(() => card.remove(), 300);
          }
        }
      }
    });
  });
}
