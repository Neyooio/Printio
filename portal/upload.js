/* ═══════════════════════════════════════════════════════════
   Printio — Pipelined Resumable Upload Engine & Gwen AI
   • Client-side PDF page & color preflight analysis
   • Resumable chunked binary streaming (4 MB chunks)
   • Mobile Gwen AI Assistant integration (Zero asterisks, formal tone)
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

    // Shop Pricing Defaults for Client Quotation
    const SHOP_RATES = {
        currency: '₱',
        bw: 2.0,
        color: 5.0,
        photo: 10.0,
        ringBinding: 35.0,
        hardbound: 250.0,
    };

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

    // Gwen Assistant DOM
    const gwenFab = document.getElementById('gwenFab');
    const gwenDrawer = document.getElementById('gwenDrawer');
    const gwenBackdrop = document.getElementById('gwenBackdrop');
    const gwenCloseBtn = document.getElementById('gwenCloseBtn');
    const gwenClearBtn = document.getElementById('gwenClearBtn');
    const gwenChatStream = document.getElementById('gwenChatStream');
    const gwenChatForm = document.getElementById('gwenChatForm');
    const gwenChatInput = document.getElementById('gwenChatInput');
    const gwenChips = document.getElementById('gwenChips');

    // ─── State ───
    let pendingFiles = [];          // Array of File objects
    let preflightResults = new Map(); // Map of fp -> PreflightInfo
    let activeUploads = 0;
    let totalBytes = 0;
    let totalUploaded = 0;
    let isUploading = false;
    let isPaused = false;
    let uploadQueue = [];
    let sessionToken = '';
    let isGwenGenerating = false;
    let gwenHistory = [
        {
            role: 'assistant',
            content: 'Good day. I am Gwen, Printio\'s dedicated AI assistant. I am here to assist you with document inspection, price estimates, and paper or binding recommendations. How may I assist you today?'
        }
    ];

    // ─── Initialize ───
    init();

    function init() {
        sessionToken = getOrCreateSessionToken();
        bindEvents();
        initGwenAssistant();
    }

    function getOrCreateSessionToken() {
        let token = localStorage.getItem('printio_session');
        if (!token) {
            token = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
            localStorage.setItem('printio_session', token);
        }
        return token;
    }

    function generateFingerprint(file) {
        return `${file.name}_${file.size}_${file.lastModified}`;
    }

    function generateFileId(file) {
        const fp = generateFingerprint(file);
        let hash = 0;
        for (let i = 0; i < fp.length; i++) {
            const char = fp.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'file_' + Math.abs(hash).toString(36) + '_' + file.size.toString(36);
    }

    // ─── Event Binding ───

    function bindEvents() {
        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            addFiles(Array.from(e.target.files));
            fileInput.value = '';
        });

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

        uploadBtn.addEventListener('click', startUpload);
        uploadMoreBtn.addEventListener('click', resetUI);

        window.addEventListener('online', onReconnect);
        window.addEventListener('offline', onDisconnect);
    }

    // ─── Preflight & Page/Color Detection ───

    async function analyzeFilePreflight(file) {
        const ext = getExtension(file.name);

        if (ext === 'pdf') {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function (e) {
                    try {
                        const buffer = e.target.result;
                        const bytes = new Uint8Array(buffer);
                        const text = new TextDecoder('latin1').decode(bytes);

                        // 1. Page Count Detection
                        let pageCount = 1;
                        const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
                        if (pageMatches && pageMatches.length > 0) {
                            pageCount = pageMatches.length;
                        } else {
                            const countMatch = text.match(/\/Count\s+(\d+)/);
                            if (countMatch && parseInt(countMatch[1], 10) > 0) {
                                pageCount = parseInt(countMatch[1], 10);
                            }
                        }

                        // 2. Color vs B&W Detection
                        // Color operators in PDF streams: /DeviceRGB, /DeviceCMYK, rg, RG, k, K
                        const hasColorKeywords = /DeviceRGB|DeviceCMYK|\b(rg|RG|k|K)\b/.test(text);
                        let colorCount = 0;
                        let colorPages = [];

                        if (hasColorKeywords) {
                            const parts = text.split(/\/Type\s*\/Page[^s]/);
                            if (parts.length > 1) {
                                for (let i = 1; i < parts.length; i++) {
                                    if (/DeviceRGB|DeviceCMYK|\b(rg|RG|k|K)\b/.test(parts[i])) {
                                        colorPages.push(i);
                                    }
                                }
                            }
                            if (colorPages.length === 0) {
                                colorPages = [1];
                            }
                            colorCount = colorPages.length;
                        }

                        let bwCount = Math.max(0, pageCount - colorCount);
                        let colorMode = 'bw';
                        let colorLabel = `${pageCount} B&W Pages`;

                        if (colorCount === pageCount) {
                            colorMode = 'color';
                            colorLabel = 'Full Color Document';
                        } else if (colorCount > 0) {
                            colorMode = 'mixed';
                            colorLabel = `Mixed: ${colorCount} Color (pgs ${colorPages.join(', ')}), ${bwCount} B&W`;
                        }

                        const cost = (bwCount * SHOP_RATES.bw) + (colorCount * SHOP_RATES.color);

                        resolve({
                            pages: pageCount,
                            colorMode,
                            colorLabel,
                            colorCount,
                            bwCount,
                            colorPages,
                            cost,
                            recommendedBinding: pageCount > 50 ? 'Hardbound Binding' : pageCount > 15 ? 'Spiral Ring Binding' : 'Stapled',
                        });
                    } catch {
                        resolve({
                            pages: 1,
                            colorMode: 'bw',
                            colorLabel: '1 Page B&W',
                            colorCount: 0,
                            bwCount: 1,
                            colorPages: [],
                            cost: SHOP_RATES.bw,
                            recommendedBinding: 'None',
                        });
                    }
                };
                reader.onerror = () => {
                    resolve({
                        pages: 1,
                        colorMode: 'bw',
                        colorLabel: '1 Page B&W',
                        colorCount: 0,
                        bwCount: 1,
                        colorPages: [],
                        cost: SHOP_RATES.bw,
                        recommendedBinding: 'None',
                    });
                };
                // Read up to 8MB of the file to inspect PDF structure
                reader.readAsArrayBuffer(file.slice(0, Math.min(file.size, 8 * 1024 * 1024)));
            });
        }

        if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
            return {
                pages: 1,
                colorMode: 'full',
                colorLabel: 'Full Color Photo',
                colorCount: 1,
                bwCount: 0,
                colorPages: [1],
                cost: SHOP_RATES.photo,
                recommendedBinding: 'Photo Paper Finish',
            };
        }

        if (['docx', 'doc', 'pptx', 'xlsx', 'xls'].includes(ext)) {
            const estimatedPages = Math.max(1, Math.round(file.size / 48000));
            const colorCount = Math.min(estimatedPages, 2);
            const bwCount = Math.max(0, estimatedPages - colorCount);
            return {
                pages: estimatedPages,
                colorMode: 'mixed',
                colorLabel: `Office Document (~${estimatedPages} pgs)`,
                colorCount,
                bwCount,
                colorPages: [1],
                cost: (bwCount * SHOP_RATES.bw) + (colorCount * SHOP_RATES.color),
                recommendedBinding: estimatedPages > 30 ? 'Spiral Binding' : 'Standard',
            };
        }

        return {
            pages: 1,
            colorMode: 'bw',
            colorLabel: 'Standard File',
            colorCount: 0,
            bwCount: 1,
            colorPages: [],
            cost: SHOP_RATES.bw,
            recommendedBinding: 'Standard',
        };
    }

    // ─── File Selection ───

    async function addFiles(files) {
        for (const file of files) {
            const ext = getExtension(file.name);
            if (!ALLOWED_EXTENSIONS.has(ext)) {
                showFileError(file.name, `".${ext}" is not permitted`);
                continue;
            }

            const fp = generateFingerprint(file);
            if (pendingFiles.some(f => generateFingerprint(f) === fp)) {
                continue;
            }

            pendingFiles.push(file);
            renderFileItem(file);

            // Asynchronously run preflight audit and update badges
            analyzeFilePreflight(file).then((preflight) => {
                preflightResults.set(fp, preflight);
                updateFileItemBadges(file, preflight);
            });
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
            <div class="file-row-main">
                <div class="file-icon" style="background:rgba(239,68,68,0.2);color:#ef4444;border-color:rgba(239,68,68,0.4)">!</div>
                <div class="file-info">
                    <div class="file-name">${escapeHtml(name)}</div>
                    <div class="file-meta">${escapeHtml(message)}</div>
                </div>
                <span class="file-status" style="color:#ef4444">Rejected</span>
            </div>
        `;
        fileQueue.appendChild(item);
        setTimeout(() => item.remove(), 4000);
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
            <div class="file-row-main">
                <div class="file-icon ${ext}">${ext}</div>
                <div class="file-info">
                    <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
                    <div class="file-meta">${formatSize(file.size)} • Analyzing...</div>
                </div>
                <span class="file-status queued">Queued</span>
                <button class="file-remove" onclick="this.closest('.file-item').remove(); window.__printio_removeFile('${generateFingerprint(file)}')">&times;</button>
            </div>
            <div class="file-badges" id="badges_${id}">
                <span class="file-chip chip-pages">Inspecting document...</span>
            </div>
        `;
        fileQueue.appendChild(item);
    }

    function updateFileItemBadges(file, preflight) {
        const id = 'fq_' + generateFileId(file);
        const badgesContainer = document.getElementById('badges_' + id);
        if (!badgesContainer) return;

        const colorChipClass =
            preflight.colorMode === 'color' ? 'chip-color-full' :
            preflight.colorMode === 'mixed' ? 'chip-color-mixed' : 'chip-color-bw';

        badgesContainer.innerHTML = `
            <span class="file-chip chip-pages">📄 ${preflight.pages} ${preflight.pages === 1 ? 'Page' : 'Pages'}</span>
            <span class="file-chip ${colorChipClass}">🎨 ${escapeHtml(preflight.colorLabel)}</span>
            <span class="file-chip chip-cost">💰 Est. ${SHOP_RATES.currency}${preflight.cost.toFixed(2)}</span>
        `;

        // Update file meta line
        const item = document.getElementById(id);
        const metaEl = item?.querySelector('.file-meta');
        if (metaEl) {
            metaEl.textContent = `${formatSize(file.size)} • ${preflight.recommendedBinding}`;
        }
    }

    window.__printio_removeFile = function (fp) {
        pendingFiles = pendingFiles.filter(f => generateFingerprint(f) !== fp);
        preflightResults.delete(fp);
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
                                   status === 'complete' ? '✓ Uploaded' :
                                   status === 'error' ? '✗ Error' : 'Queued';
            statusEl.className = 'file-status ' + status;
        }

        const removeBtn = item.querySelector('.file-remove');
        if (removeBtn && status !== 'queued') {
            removeBtn.style.display = 'none';
        }

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
        uploadBtn.querySelector('span').textContent = 'Uploading Documents...';
        statusArea.hidden = false;
        completeMessage.hidden = true;
        dropzone.style.display = 'none';

        totalBytes = pendingFiles.reduce((sum, f) => sum + f.size, 0);
        totalUploaded = 0;

        uploadQueue = [];
        for (const file of pendingFiles) {
            const fileId = generateFileId(file);
            const fingerprint = generateFingerprint(file);
            uploadQueue.push({ file, fileId, fingerprint, uploadedBytes: 0 });
        }

        await Promise.all(uploadQueue.map(entry => initUpload(entry)));

        totalUploaded = uploadQueue.reduce((sum, e) => sum + e.uploadedBytes, 0);
        updateOverallProgress();

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

            if (data.fileId && data.fileId !== entry.fileId) {
                const oldId = entry.fileId;
                entry.fileId = data.fileId;
                const el = document.getElementById('fq_' + oldId);
                if (el) el.id = 'fq_' + data.fileId;
            }

            entry.uploadedBytes = data.uploadedBytes || 0;

            if (data.status === 'complete') {
                entry.uploadedBytes = entry.file.size;
                updateFileProgress(entry.fileId, entry.file.size, entry.file.size, 'complete');
            }

            saveUploadState(entry);
        } catch (err) {
            console.error('Init error for', entry.file.name, err);
            updateFileProgress(entry.fileId, 0, entry.file.size, 'error');
        }
    }

    async function processQueue() {
        const remaining = uploadQueue.filter(
            e => e.uploadedBytes < e.file.size
        );

        if (remaining.length === 0) {
            onAllComplete();
            return;
        }

        const promises = [];
        let idx = 0;

        function next() {
            if (isPaused || idx >= remaining.length) return null;
            const entry = remaining[idx++];
            return uploadFile(entry).then(() => next());
        }

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

                    totalUploaded = uploadQueue.reduce((s, e) => s + e.uploadedBytes, 0);
                    updateFileProgress(fileId, offset, file.size, 'uploading');
                    updateOverallProgress();
                    saveUploadState(entry);

                } catch (err) {
                    console.warn(`Chunk failed (attempt ${attempt + 1}):`, err.message);

                    if (attempt < MAX_RETRIES - 1) {
                        await sleep(RETRY_BASE_DELAY * Math.pow(2, attempt));
                    } else {
                        if (!navigator.onLine) {
                            isPaused = true;
                            startReconnectPolling();
                            return;
                        }
                        updateFileProgress(fileId, offset, file.size, 'error');
                        return;
                    }
                }
            }
        }

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
                updateFileProgress(fileId, offset, file.size, 'error');
            }
        } catch {
            updateFileProgress(fileId, offset, file.size, 'error');
        }
    }

    // ─── Disconnection Recovery ───

    let reconnectTimer = null;

    function onDisconnect() {
        if (!isUploading) return;
        isPaused = true;
        progressText.textContent = 'Reconnecting...';
        startReconnectPolling();
    }

    function onReconnect() {
        if (!isPaused) return;
        stopReconnectPolling();
        resumeUploads();
    }

    function startReconnectPolling() {
        if (reconnectTimer) return;
        reconnectTimer = setInterval(async () => {
            try {
                const resp = await fetch('/api/upload-status?fileId=ping', {
                    signal: AbortSignal.timeout(2000),
                });
                if (resp.ok) {
                    stopReconnectPolling();
                    resumeUploads();
                }
            } catch {}
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

        for (const entry of uploadQueue) {
            if (entry.uploadedBytes >= entry.file.size) continue;
            try {
                const resp = await fetch(`/api/upload-status?fileId=${encodeURIComponent(entry.fileId)}`);
                if (resp.ok) {
                    const data = await resp.json();
                    entry.uploadedBytes = data.uploadedBytes || entry.uploadedBytes;
                }
            } catch {}
        }

        totalUploaded = uploadQueue.reduce((s, e) => s + e.uploadedBytes, 0);
        updateOverallProgress();
        await processQueue();
    }

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
        } catch {}
    }

    function clearUploadState(fileId) {
        try {
            const states = JSON.parse(localStorage.getItem('printio_uploads') || '{}');
            delete states[fileId];
            localStorage.setItem('printio_uploads', JSON.stringify(states));
        } catch {}
    }

    function onAllComplete() {
        isUploading = false;
        const allDone = uploadQueue.every(e => e.uploadedBytes >= e.file.size);
        if (allDone) {
            statusArea.hidden = true;
            completeMessage.hidden = false;
            uploadBtn.style.display = 'none';
        } else {
            uploadBtn.disabled = false;
            uploadBtn.querySelector('span').textContent = 'Retry Upload';
        }
    }

    function resetUI() {
        pendingFiles = [];
        uploadQueue = [];
        preflightResults.clear();
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
        uploadBtn.querySelector('span').textContent = 'Submit Files for Printing';
        overallProgress.style.width = '0%';
        progressText.textContent = '0%';
    }

    // ─── Mobile Gwen AI Assistant Controller ───

    function initGwenAssistant() {
        if (!gwenFab || !gwenDrawer) return;

        // Open Drawer
        gwenFab.addEventListener('click', () => {
            gwenDrawer.classList.add('active');
            gwenChatInput.focus();
        });

        // Close Drawer
        gwenCloseBtn.addEventListener('click', () => gwenDrawer.classList.remove('active'));
        gwenBackdrop.addEventListener('click', () => gwenDrawer.classList.remove('active'));

        // Clear Chat History
        if (gwenClearBtn) {
            gwenClearBtn.addEventListener('click', () => {
                gwenHistory = [
                    {
                        role: 'assistant',
                        content: 'Conversation history cleared. I am prepared for your next question or document inquiry.'
                    }
                ];
                gwenChatStream.innerHTML = `
                    <div class="gwen-msg assistant">Conversation history cleared. I am prepared for your next question or document inquiry.</div>
                `;
            });
        }

        // Suggestion Chips
        gwenChips.querySelectorAll('.gwen-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.dataset.query;
                if (query) {
                    sendGwenMessage(query);
                }
            });
        });

        // Chat Form
        gwenChatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = gwenChatInput.value.trim();
            if (text) {
                sendGwenMessage(text);
                gwenChatInput.value = '';
            }
        });
    }

    function formatCleanText(raw) {
        if (!raw) return '';
        let t = raw.replace(/^(\s*)\*\s+/gm, '$1- ');
        t = t.replace(/^#{1,6}\s+/gm, '');
        t = t.replace(/\*{1,3}/g, '');
        t = t.replace(/`+/g, '');
        return t;
    }

    function appendMessageBubble(role, content) {
        const bubble = document.createElement('div');
        bubble.className = `gwen-msg ${role}`;
        bubble.textContent = formatCleanText(content);
        gwenChatStream.appendChild(bubble);
        gwenChatStream.scrollTop = gwenChatStream.scrollHeight;
        return bubble;
    }

    async function sendGwenMessage(userQuery) {
        if (isGwenGenerating) return;
        isGwenGenerating = true;

        appendMessageBubble('user', userQuery);
        gwenHistory.push({ role: 'user', content: userQuery });

        const assistantBubble = appendMessageBubble('assistant', '');
        const indicator = document.createElement('span');
        indicator.className = 'gwen-typing-indicator';
        assistantBubble.appendChild(indicator);

        // Build contextual file inventory for Gwen
        const fileSummaries = [];
        for (const file of pendingFiles) {
            const fp = generateFingerprint(file);
            const pf = preflightResults.get(fp);
            if (pf) {
                fileSummaries.push(
                    `"${file.name}" (${pf.pages} pages, ${pf.colorLabel}, Est: ${SHOP_RATES.currency}${pf.cost.toFixed(2)})`
                );
            } else {
                fileSummaries.push(`"${file.name}" (${formatSize(file.size)})`);
            }
        }

        const filesContext = fileSummaries.length > 0
            ? `Customer has selected ${fileSummaries.length} document(s): ${fileSummaries.join('; ')}.`
            : 'Customer has not yet selected any documents.';

        const systemPrompt = `You are Gwen, Printio's dedicated and courteous AI assistant for our print shop.
CONVERSATIONAL ETIQUETTE:
- Maintain a polite, articulate, and formal tone at all times.
- Address the customer with courtesy (e.g. "Good day.", "Certainly.", "Here is the estimate for your documents.").
STRICT RULES ON FORMATTING (NO ASTERISKS):
- DO NOT use asterisks (* or **) anywhere in your response under any circumstances.
- Never use asterisks for bolding, italics, or list bullets.
- Use clean capitalized headings (e.g., ESTIMATED COST:, RECOMMENDATIONS:) and standard hyphens (-) for lists.
CURRENT PRINT SHOP PRICING:
- Black & White: ${SHOP_RATES.currency}${SHOP_RATES.bw.toFixed(2)} per page
- Standard Color: ${SHOP_RATES.currency}${SHOP_RATES.color.toFixed(2)} per page
- Full Color Photo: ${SHOP_RATES.currency}${SHOP_RATES.photo.toFixed(2)} per page
- Spiral Ring Binding: ${SHOP_RATES.currency}${SHOP_RATES.ringBinding.toFixed(2)}
- Hardbound Thesis Binding: ${SHOP_RATES.currency}${SHOP_RATES.hardbound.toFixed(2)}
CUSTOMER FILES IN UPLOAD TRAY:
${filesContext}`;

        let fullContent = '';

        try {
            // First try calling Printio Axum backend /api/gwen/chat
            let response = await fetch('/api/gwen/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...gwenHistory
                    ],
                }),
            }).catch(() => null);

            // Fallback for standalone/local developer test: direct Ollama localhost:11434
            if (!response || !response.ok) {
                response = await fetch('http://localhost:11434/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'qwen2.5:1.5b',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...gwenHistory
                        ],
                        stream: true,
                        options: { num_ctx: 2048 },
                    }),
                });
            }

            if (!response.ok) {
                throw new Error('Could not reach Gwen engine.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(l => l.trim().length > 0);

                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.message && parsed.message.content) {
                            fullContent += parsed.message.content;
                            assistantBubble.textContent = formatCleanText(fullContent);
                            assistantBubble.appendChild(indicator);
                            gwenChatStream.scrollTop = gwenChatStream.scrollHeight;
                        }
                    } catch {}
                }
            }

            indicator.remove();
            gwenHistory.push({ role: 'assistant', content: fullContent });

        } catch (err) {
            indicator.remove();
            // Provide a graceful offline assistant quotation based on client preflight
            const totalDocs = pendingFiles.length;
            let grandCost = 0;
            let totalPages = 0;
            preflightResults.forEach(pf => {
                grandCost += pf.cost;
                totalPages += pf.pages;
            });

            const fallbackReply = totalDocs > 0
                ? `Good day. I have reviewed your ${totalDocs} document(s) (${totalPages} total pages).
PRELIMINARY ESTIMATE:
- Estimated Total Printing Cost: ${SHOP_RATES.currency}${grandCost.toFixed(2)}
- Standard Turnaround: Ready immediately once sent to our queue.
- Recommended Binding: ${totalPages > 30 ? 'Spiral Binding available for ₱35.00' : 'Stapled or loose copies'}.

Please tap "Submit Files for Printing" whenever you are ready, or ask counter staff if you have any questions.`
                : `Good day. Our standard shop rates are ${SHOP_RATES.currency}${SHOP_RATES.bw.toFixed(2)} per B&W page and ${SHOP_RATES.currency}${SHOP_RATES.color.toFixed(2)} per color page. Please select your documents above and I will be delighted to provide a complete quotation.`;

            assistantBubble.textContent = formatCleanText(fallbackReply);
            gwenHistory.push({ role: 'assistant', content: fallbackReply });
        } finally {
            isGwenGenerating = false;
        }
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
