/* ═══════════════════════════════════════════════════════════
   Printio — Pipelined Resumable Upload Engine
   
   Architecture:
   • 4 MB chunks with 2 concurrent HTTP streams
   • Fingerprint: ${name}_${size}_${lastModified}
   • Resume via GET /api/upload-status → committed byte offset
   • Raw binary payloads (application/octet-stream)
   • IndexedDB persistence for cross-session retainment
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ─── Configuration ───
    const CHUNK_SIZE = 4 * 1024 * 1024;        // 4 MB chunks
    const MAX_CONCURRENT = 2;                   // 2 parallel uploads
    const MAX_RETRIES = 3;                      // Retry failed chunks
    const RETRY_BASE_DELAY = 1000;              // 1s base for exponential backoff
    const RECONNECT_POLL_MS = 2000;             // 2s reconnection polling
    const ALLOWED_EXTENSIONS = new Set([
        'pdf', 'docx', 'doc', 'xlsx', 'pptx', 'jpg', 'jpeg', 'png'
    ]);

    // ─── DOM References ───
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const fileQueue = document.getElementById('fileQueue');
    const uploadBtn = document.getElementById('uploadBtn');
    const statusArea = document.getElementById('statusArea');
    const overallProgress = document.getElementById('overallProgress');
    const progressText = document.getElementById('progressText');
    const completeMessage = document.getElementById('completeMessage');
    const uploadMoreBtn = document.getElementById('uploadMoreBtn');

    // ─── State ───
    let pendingFiles = [];          // Files selected but not yet uploaded
    let activeUploads = 0;          // Currently streaming count
    let totalBytes = 0;             // Sum of all file sizes
    let totalUploaded = 0;          // Sum of all uploaded bytes
    let isUploading = false;
    let isPaused = false;           // Paused due to disconnection
    let uploadQueue = [];           // Queue of { file, fileId, fingerprint, uploadedBytes }
    let sessionToken = '';          // Persistent session identifier

    // ─── Initialize ───
    init();

    function init() {
        sessionToken = getOrCreateSessionToken();
        bindEvents();
    }

    // ─── Session Token (IndexedDB fallback to localStorage) ───

    function getOrCreateSessionToken() {
        let token = localStorage.getItem('printio_session');
        if (!token) {
            token = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
            localStorage.setItem('printio_session', token);
        }
        return token;
    }

    // ─── File Fingerprinting ───

    function generateFingerprint(file) {
        return `${file.name}_${file.size}_${file.lastModified}`;
    }

    // ─── File ID Generation ───

    function generateFileId(file) {
        // Deterministic ID from fingerprint for resume across page reloads
        const fp = generateFingerprint(file);
        let hash = 0;
        for (let i = 0; i < fp.length; i++) {
            const char = fp.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return 'file_' + Math.abs(hash).toString(36) + '_' + file.size.toString(36);
    }

    // ─── Event Binding ───

    function bindEvents() {
        // Click to select files
        dropzone.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => {
            addFiles(Array.from(e.target.files));
            fileInput.value = '';
        });

        // Drag and drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-over');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            addFiles(Array.from(e.dataTransfer.files));
        });

        // Upload button
        uploadBtn.addEventListener('click', startUpload);

        // Upload more button
        uploadMoreBtn.addEventListener('click', resetUI);

        // Online/offline detection for reconnection
        window.addEventListener('online', onReconnect);
        window.addEventListener('offline', onDisconnect);
    }

    // ─── File Selection ───

    function addFiles(files) {
        for (const file of files) {
            const ext = getExtension(file.name);
            if (!ALLOWED_EXTENSIONS.has(ext)) {
                showFileError(file.name, `".${ext}" is not allowed`);
                continue;
            }

            // Deduplicate by fingerprint
            const fp = generateFingerprint(file);
            if (pendingFiles.some(f => generateFingerprint(f) === fp)) {
                continue;
            }

            pendingFiles.push(file);
            renderFileItem(file);
        }

        uploadBtn.disabled = pendingFiles.length === 0;
    }

    function getExtension(filename) {
        return (filename.split('.').pop() || '').toLowerCase();
    }

    function showFileError(name, message) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <div class="file-icon" style="background:#ef4444">!</div>
            <div class="file-info">
                <div class="file-name">${escapeHtml(name)}</div>
                <div class="file-meta">${escapeHtml(message)}</div>
            </div>
            <span class="file-status error">Rejected</span>
        `;
        fileQueue.appendChild(item);
        setTimeout(() => item.remove(), 3000);
    }

    // ─── UI Rendering ───

    function renderFileItem(file) {
        const ext = getExtension(file.name);
        const id = 'fq_' + generateFileId(file);

        const item = document.createElement('div');
        item.className = 'file-item';
        item.id = id;
        item.innerHTML = `
            <div class="file-progress-bg" style="width: 0%"></div>
            <div class="file-icon ${ext}">${ext}</div>
            <div class="file-info">
                <div class="file-name">${escapeHtml(file.name)}</div>
                <div class="file-meta">${formatSize(file.size)}</div>
            </div>
            <span class="file-status queued">Queued</span>
            <button class="file-remove" onclick="this.closest('.file-item').remove(); window.__printio_removeFile('${generateFingerprint(file)}')">&times;</button>
        `;
        fileQueue.appendChild(item);
    }

    // Expose remove function globally for inline onclick
    window.__printio_removeFile = function (fp) {
        pendingFiles = pendingFiles.filter(f => generateFingerprint(f) !== fp);
        uploadBtn.disabled = pendingFiles.length === 0;
    };

    function updateFileProgress(fileId, uploadedBytes, totalSize, status) {
        const item = document.getElementById('fq_' + fileId);
        if (!item) return;

        const pct = totalSize > 0 ? Math.round((uploadedBytes / totalSize) * 100) : 0;

        const progressBg = item.querySelector('.file-progress-bg');
        if (progressBg) progressBg.style.width = pct + '%';

        const statusEl = item.querySelector('.file-status');
        if (statusEl) {
            statusEl.textContent = status === 'uploading' ? pct + '%' :
                                   status === 'complete' ? '✓ Done' :
                                   status === 'error' ? '✗ Error' : 'Queued';
            statusEl.className = 'file-status ' + status;
        }

        const removeBtn = item.querySelector('.file-remove');
        if (removeBtn && status !== 'queued') {
            removeBtn.style.display = 'none';
        }

        // Update file meta to show transfer speed info
        const metaEl = item.querySelector('.file-meta');
        if (metaEl && status === 'uploading') {
            metaEl.textContent = `${formatSize(uploadedBytes)} / ${formatSize(totalSize)}`;
        }
    }

    function updateOverallProgress() {
        if (totalBytes === 0) return;
        const pct = Math.round((totalUploaded / totalBytes) * 100);
        overallProgress.style.width = pct + '%';
        progressText.textContent = pct + '%';
    }

    // ─── Upload Pipeline ───

    async function startUpload() {
        if (pendingFiles.length === 0) return;

        isUploading = true;
        isPaused = false;
        uploadBtn.disabled = true;
        uploadBtn.querySelector('span').textContent = 'Uploading...';
        statusArea.hidden = false;
        completeMessage.hidden = true;
        dropzone.style.display = 'none';

        // Calculate totals
        totalBytes = pendingFiles.reduce((sum, f) => sum + f.size, 0);
        totalUploaded = 0;

        // Build upload queue
        uploadQueue = [];
        for (const file of pendingFiles) {
            const fileId = generateFileId(file);
            const fingerprint = generateFingerprint(file);
            uploadQueue.push({ file, fileId, fingerprint, uploadedBytes: 0 });
        }

        // Initialize all uploads on the server (get resume offsets)
        await Promise.all(uploadQueue.map(entry => initUpload(entry)));

        // Recalculate total uploaded from resume offsets
        totalUploaded = uploadQueue.reduce((sum, e) => sum + e.uploadedBytes, 0);
        updateOverallProgress();

        // Start the pipelined queue processor
        await processQueue();
    }

    async function initUpload(entry) {
        try {
            const resp = await fetch('/api/upload-init', {
                method: 'POST',
                headers: {
                    'X-File-Id': entry.fileId,
                    'X-File-Name': entry.file.name,
                    'X-Total-Size': entry.file.size.toString(),
                    'X-Fingerprint': entry.fingerprint,
                    'X-Customer-Session': sessionToken,
                    'Content-Type': 'application/octet-stream',
                },
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({ error: 'Init failed' }));
                throw new Error(err.error || 'Upload init failed');
            }

            const data = await resp.json();

            // Server may return a different fileId (from a previous session)
            if (data.fileId && data.fileId !== entry.fileId) {
                const oldId = entry.fileId;
                entry.fileId = data.fileId;
                // Update DOM element ID
                const el = document.getElementById('fq_' + oldId);
                if (el) el.id = 'fq_' + data.fileId;
            }

            entry.uploadedBytes = data.uploadedBytes || 0;

            if (data.status === 'complete') {
                entry.uploadedBytes = entry.file.size;
                updateFileProgress(entry.fileId, entry.file.size, entry.file.size, 'complete');
            }

            // Persist state for resume
            saveUploadState(entry);
        } catch (err) {
            console.error('Init error for', entry.file.name, err);
            updateFileProgress(entry.fileId, 0, entry.file.size, 'error');
        }
    }

    async function processQueue() {
        // Filter to incomplete uploads
        const remaining = uploadQueue.filter(
            e => e.uploadedBytes < e.file.size
        );

        if (remaining.length === 0) {
            onAllComplete();
            return;
        }

        // Process with concurrency limit
        const promises = [];
        let idx = 0;

        function next() {
            if (isPaused || idx >= remaining.length) return null;
            const entry = remaining[idx++];
            return uploadFile(entry).then(() => next());
        }

        // Start MAX_CONCURRENT workers
        for (let i = 0; i < Math.min(MAX_CONCURRENT, remaining.length); i++) {
            promises.push(next());
        }

        await Promise.all(promises);

        if (!isPaused) {
            onAllComplete();
        }
    }

    async function uploadFile(entry) {
        const { file, fileId } = entry;
        let offset = entry.uploadedBytes;

        updateFileProgress(fileId, offset, file.size, 'uploading');

        while (offset < file.size) {
            if (isPaused) return;

            const end = Math.min(offset + CHUNK_SIZE, file.size);
            const chunk = file.slice(offset, end);

            let success = false;
            for (let attempt = 0; attempt < MAX_RETRIES && !success; attempt++) {
                try {
                    const resp = await fetch('/api/upload-chunk', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'X-File-Id': fileId,
                            'X-Start-Byte': offset.toString(),
                            'X-Total-Size': file.size.toString(),
                            'X-Customer-Session': sessionToken,
                        },
                        body: chunk,
                    });

                    if (!resp.ok) {
                        const err = await resp.json().catch(() => ({}));
                        throw new Error(err.error || `HTTP ${resp.status}`);
                    }

                    const data = await resp.json();
                    offset = data.uploadedBytes;
                    entry.uploadedBytes = offset;
                    success = true;

                    // Update progress
                    totalUploaded = uploadQueue.reduce((s, e) => s + e.uploadedBytes, 0);
                    updateFileProgress(fileId, offset, file.size, 'uploading');
                    updateOverallProgress();
                    saveUploadState(entry);

                } catch (err) {
                    console.warn(`Chunk failed (attempt ${attempt + 1}):`, err.message);

                    if (attempt < MAX_RETRIES - 1) {
                        // Exponential backoff
                        await sleep(RETRY_BASE_DELAY * Math.pow(2, attempt));
                    } else {
                        // Max retries exceeded — check if we're offline
                        if (!navigator.onLine) {
                            isPaused = true;
                            console.log('Network lost, pausing uploads');
                            startReconnectPolling();
                            return;
                        }
                        // Permanent failure for this chunk
                        updateFileProgress(fileId, offset, file.size, 'error');
                        return;
                    }
                }
            }
        }

        // File upload complete — finalize
        try {
            const resp = await fetch('/api/upload-complete', {
                method: 'POST',
                headers: {
                    'X-File-Id': fileId,
                    'X-Customer-Session': sessionToken,
                },
            });

            if (resp.ok) {
                updateFileProgress(fileId, file.size, file.size, 'complete');
                clearUploadState(fileId);
            } else {
                const err = await resp.json().catch(() => ({}));
                console.error('Finalize failed:', err.error);
                updateFileProgress(fileId, offset, file.size, 'error');
            }
        } catch (err) {
            console.error('Finalize error:', err);
            updateFileProgress(fileId, offset, file.size, 'error');
        }
    }

    // ─── Disconnection Recovery ───

    let reconnectTimer = null;

    function onDisconnect() {
        if (!isUploading) return;
        isPaused = true;
        console.log('Disconnected from network');
        progressText.textContent = 'Reconnecting...';
        startReconnectPolling();
    }

    function onReconnect() {
        if (!isPaused) return;
        console.log('Network reconnected, resuming...');
        stopReconnectPolling();
        resumeUploads();
    }

    function startReconnectPolling() {
        if (reconnectTimer) return;
        reconnectTimer = setInterval(async () => {
            try {
                // Ping the server to check connectivity
                const resp = await fetch('/api/upload-status?fileId=ping', {
                    signal: AbortSignal.timeout(2000),
                });
                if (resp.ok) {
                    stopReconnectPolling();
                    resumeUploads();
                }
            } catch {
                // Still disconnected
            }
        }, RECONNECT_POLL_MS);
    }

    function stopReconnectPolling() {
        if (reconnectTimer) {
            clearInterval(reconnectTimer);
            reconnectTimer = null;
        }
    }

    async function resumeUploads() {
        isPaused = false;
        progressText.textContent = 'Resuming...';

        // Re-query server for committed byte offsets
        for (const entry of uploadQueue) {
            if (entry.uploadedBytes >= entry.file.size) continue;

            try {
                const resp = await fetch(`/api/upload-status?fileId=${encodeURIComponent(entry.fileId)}`);
                if (resp.ok) {
                    const data = await resp.json();
                    entry.uploadedBytes = data.uploadedBytes || entry.uploadedBytes;
                }
            } catch {
                // Use last known offset
            }
        }

        // Recalculate total
        totalUploaded = uploadQueue.reduce((s, e) => s + e.uploadedBytes, 0);
        updateOverallProgress();

        // Resume the queue
        await processQueue();
    }

    // ─── State Persistence (localStorage) ───

    function saveUploadState(entry) {
        try {
            const states = JSON.parse(localStorage.getItem('printio_uploads') || '{}');
            states[entry.fileId] = {
                fingerprint: entry.fingerprint,
                uploadedBytes: entry.uploadedBytes,
                fileName: entry.file.name,
                fileSize: entry.file.size,
            };
            localStorage.setItem('printio_uploads', JSON.stringify(states));
        } catch { /* quota exceeded, ignore */ }
    }

    function clearUploadState(fileId) {
        try {
            const states = JSON.parse(localStorage.getItem('printio_uploads') || '{}');
            delete states[fileId];
            localStorage.setItem('printio_uploads', JSON.stringify(states));
        } catch { /* ignore */ }
    }

    // ─── Completion ───

    function onAllComplete() {
        isUploading = false;

        const allDone = uploadQueue.every(e => e.uploadedBytes >= e.file.size);
        if (allDone) {
            statusArea.hidden = true;
            completeMessage.hidden = false;
            uploadBtn.style.display = 'none';
        } else {
            // Some files failed — allow retry
            uploadBtn.disabled = false;
            uploadBtn.querySelector('span').textContent = 'Retry Failed';
        }
    }

    function resetUI() {
        pendingFiles = [];
        uploadQueue = [];
        totalBytes = 0;
        totalUploaded = 0;
        isUploading = false;
        isPaused = false;

        fileQueue.innerHTML = '';
        statusArea.hidden = true;
        completeMessage.hidden = true;
        dropzone.style.display = '';
        uploadBtn.style.display = '';
        uploadBtn.disabled = true;
        uploadBtn.querySelector('span').textContent = 'Upload Files';
        overallProgress.style.width = '0%';
        progressText.textContent = '0%';
    }

    // ─── Utilities ───

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
        return (bytes / 1073741824).toFixed(2) + ' GB';
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
})();
