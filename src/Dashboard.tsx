import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Sparkles,
  FileText,
  Search,
  Plus,
  HardDrive,
  Laptop,
  Smartphone,
  CheckCircle2,
  FolderOpen,
  Copy,
  RotateCw,
  Trash2,
  Check,
  MonitorSmartphone,
  Printer,
  LayoutDashboard,
  History,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileType,
  FileSpreadsheet,
  Presentation,
  FileImage,
  FileArchive,
  File,
} from "lucide-react";
import {
  getFileTypeConfig,
  getStatusBadgeConfig,
  isAllowedFile,
  ALLOWED_EXTENSIONS,
} from "./lib/fileTypeHelper";
import {
  commands,
  mockSessions,
  mockFiles,
  SessionInfo,
  UploadInfo,
  StorageStats,
  formatBytes,
} from "./lib/commands";
import DeviceManagerView from "./components/views/DeviceManagerView";
import PrintQueueView from "./components/views/PrintQueueView";
import AuditHistoryView from "./components/views/AuditHistoryView";
import NetworkSettingsView from "./components/views/NetworkSettingsView";
import AiCopilotDrawer from "./components/ai/AiCopilotDrawer";

import { getFileIcon } from "./lib/fileTypeHelper";
export { getFileIcon };

export default function PrintioDashboard() {
  const [activeTab, setActiveTab] = useState(2);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [activeClickedFile, setActiveClickedFile] = useState<UploadInfo | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>("sess-laptop");
  const [files, setFiles] = useState<UploadInfo[]>(mockFiles["sess-laptop"] || []);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [storageCap, setStorageCap] = useState<number>(10 * 1024 * 1024 * 1024);
  const [serverRunning, setServerRunning] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const pollRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ResizeObserver for Center Inverted L-Shape Container
  const containerRef = useRef<HTMLDivElement>(null);
  const [centerSize, setCenterSize] = useState({ width: 680, height: 620 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 100 && clientHeight > 100) {
          setCenterSize({ width: clientWidth, height: clientHeight });
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver(() => updateSize());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Fetch sessions
  const refreshSessions = useCallback(async () => {
    try {
      const s = await commands.getSessions();
      setSessions(s);
      if (!selectedId && s.length > 0) {
        const laptop =
          s.find((x) => x.id === "sess-laptop") ||
          s.find((x) => x.status === "active");
        setSelectedId(laptop?.id ?? s[0].id);
      }
    } catch (e) {
      console.error("Failed to fetch sessions:", e);
    }
  }, [selectedId]);

  // Fetch files for selected session
  const refreshFiles = useCallback(
    async (sid?: string) => {
      const idToFetch = sid || selectedId;
      if (!idToFetch) return;
      try {
        let f = await commands.getSessionFiles(idToFetch);
        if ((!f || f.length === 0) && mockFiles[idToFetch]) {
          f = mockFiles[idToFetch];
        }
        setFiles(f || []);
        setSelectedFileIndex((prev) =>
          f && f.length > 0 && prev >= f.length ? 0 : prev
        );
      } catch (e) {
        console.error("Failed to fetch files:", e);
        if (mockFiles[idToFetch]) {
          setFiles(mockFiles[idToFetch]);
        }
      }
    },
    [selectedId]
  );

  const handleSelectSession = (id: string) => {
    setSelectedId(id);
    setSelectedFileIndex(0);
    if (mockFiles[id] && mockFiles[id].length > 0) {
      setFiles(mockFiles[id]);
    }
    refreshFiles(id);
  };

  // Fetch storage stats
  const refreshStatus = useCallback(async () => {
    try {
      const [stats, cap] = await Promise.all([
        commands.getStorageStats(),
        commands.getStorageCap(),
      ]);
      setStorageStats(stats);
      setStorageCap(cap);
    } catch (e) {
      console.error("Failed to fetch status:", e);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
    refreshStatus();
  }, [refreshSessions, refreshStatus]);

  useEffect(() => {
    pollRef.current = window.setInterval(() => {
      refreshSessions();
      refreshFiles();
      refreshStatus();
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshSessions, refreshFiles, refreshStatus]);

  useEffect(() => {
    if (selectedId) {
      if (mockFiles[selectedId] && mockFiles[selectedId].length > 0) {
        setFiles(mockFiles[selectedId]);
      }
      refreshFiles(selectedId);
      setSelectedFileIndex(0);
    } else {
      setFiles([]);
    }
  }, [selectedId]);

  const activeSessions = useMemo(() => {
    const list = sessions.filter((s) => s.status === "active");
    if (list.length === 0) {
      return mockSessions.filter((s) => s.status === "active");
    }
    const ids = new Set(list.map((s) => s.id));
    const combined = [...list];
    mockSessions.forEach((m) => {
      if (m.status === "active" && !ids.has(m.id)) {
        combined.push(m);
      }
    });
    return combined;
  }, [sessions]);

  const selectedSession =
    sessions.find((s) => s.id === selectedId) ||
    mockSessions.find((s) => s.id === selectedId) ||
    activeSessions[0] ||
    mockSessions[0];

  const rawSessionFiles =
    files.length > 0
      ? files
      : (selectedId && mockFiles[selectedId]) ||
        mockFiles[selectedSession?.id || ""] ||
        mockFiles["sess-laptop"] ||
        [];

  // Strict whitelist enforcement on inspection list: only allowed documents and images
  const sessionFiles = useMemo(() => {
    return rawSessionFiles.filter((f) =>
      isAllowedFile(f.original_name || f.name || "")
    );
  }, [rawSessionFiles]);

  const currentFile =
    sessionFiles[selectedFileIndex] || sessionFiles[0] || null;

  const fileName =
    currentFile?.original_name ||
    (selectedSession?.device_type === "phone"
      ? "Conference_Poster_Print.pdf"
      : "Thesis_Draft.pdf");
  const safeName =
    currentFile?.safe_name ||
    (selectedSession?.device_type === "phone"
      ? "conference_poster_print.pdf"
      : "thesis_draft.pdf");
  const pages =
    currentFile?.pages || (selectedSession?.device_type === "phone" ? 1 : 34);
  const fileSizeStr = currentFile
    ? formatBytes(currentFile.file_size)
    : selectedSession?.device_type === "phone"
    ? "12.4 MB"
    : "22.4 MB";
  const filePath =
    currentFile?.file_path ||
    `C:\\PrintioData\\sessions\\${selectedSession?.ip_address || "192.168.137.112"}\\${fileName}`;
  const deviceLabel =
    selectedSession?.device_name ||
    (selectedSession?.device_type === "laptop"
      ? "User #12 · Laptop"
      : selectedSession?.id === "sess-iphone"
      ? "iPhone"
      : "Android");
  const sessionId = selectedSession?.id || selectedId || "sess-laptop";

  const currentFileTypeConfig = useMemo(
    () => getFileTypeConfig(currentFile?.original_name || fileName),
    [currentFile, fileName]
  );
  const currentStatusBadge = useMemo(
    () => getStatusBadgeConfig(currentFile?.status || "ready"),
    [currentFile]
  );
  const CurrentFileIcon = currentFileTypeConfig.icon;

  const displayedFiles = useMemo(() => {
    if (!searchQuery.trim()) return sessionFiles;
    const q = searchQuery.toLowerCase().trim();
    return sessionFiles.filter((f) =>
      f.original_name.toLowerCase().includes(q)
    );
  }, [sessionFiles, searchQuery]);

  const handleSelectFileInGrid = (file: UploadInfo, index: number) => {
    const originalIdx = sessionFiles.findIndex(
      (f) => (f.id && f.id === file.id) || f.file_id === file.file_id
    );
    if (originalIdx !== -1) {
      setSelectedFileIndex(originalIdx);
    } else {
      setSelectedFileIndex(index);
    }
    setActiveClickedFile(file);
    setIsCopilotOpen(true);
  };

  // Actions
  const handleOpenFile = async (path: string) => {
    try {
      await commands.openInDefault(path);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenWord = async (path: string) => {
    try {
      await commands.openInWord(path);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShowInFolder = async (path: string) => {
    try {
      await commands.openInExplorer(path);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyPath = async (path: string) => {
    try {
      await commands.copyPath(path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkDone = async (sId: string) => {
    try {
      await commands.markJobComplete(sId);
      await refreshSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFile = async (sId: string, fileId: string) => {
    try {
      await commands.deleteFile(sId, fileId);
      await refreshFiles();
      await refreshSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResumeVerify = async (fileId: string) => {
    console.log("[Verify / Resume] Verifying integrity for file:", fileId);
  };

  const handleClearAllCompleted = async () => {
    try {
      await commands.clearAllCompleted();
      await refreshSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleKickUser = async (sessionId: string) => {
    try {
      await commands.deleteSession(sessionId);
      await refreshSessions();
      if (selectedId === sessionId) {
        setSelectedId(null);
      }
    } catch (e) {
      console.error("Failed to kick/disconnect user:", e);
    }
  };

  const handleToggleServer = () => {
    setServerRunning((prev) => !prev);
  };

  const handleProcessIncomingFiles = (incomingList: File[]) => {
    const validUploads: UploadInfo[] = [];
    const rejectedNames: string[] = [];

    incomingList.forEach((f, i) => {
      if (!isAllowedFile(f.name)) {
        rejectedNames.push(f.name);
        return;
      }
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      const uploadItem: UploadInfo = {
        id: `f-manual-${Date.now()}-${i}`,
        file_id: `file-manual-${Date.now()}-${i}`,
        name: f.name,
        original_name: f.name,
        safe_name: f.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_"),
        file_type: f.type || `application/${ext}`,
        file_size: f.size,
        uploaded_bytes: f.size,
        file_path: `C:\\PrintioData\\sessions\\${selectedSession?.ip_address || "192.168.137.112"}\\${f.name}`,
        fingerprint: `hash-manual-${Date.now()}-${i}`,
        status: "complete",
        pages: ext === "pdf" ? 1 : undefined,
        created_at: new Date().toISOString().replace("Z", ""),
        completed_at: new Date().toISOString().replace("Z", ""),
      };
      validUploads.push(uploadItem);
    });

    if (rejectedNames.length > 0) {
      console.warn(
        `[Security Whitelist] Rejected non-printable files: ${rejectedNames.join(", ")}. Only .pdf, .docx, .doc, .xlsx, .pptx, .jpg, .jpeg, .png are allowed.`
      );
    }

    if (validUploads.length > 0) {
      setFiles((prev) => [...validUploads, ...prev]);
      setSelectedFileIndex(0);
    }
  };

  const handleManualAdd = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    handleProcessIncomingFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    handleProcessIncomingFiles(Array.from(e.dataTransfer.files));
  };

  const usedBytes =
    storageStats?.total_used_bytes || 1.2 * 1024 * 1024 * 1024;
  const usagePct = Math.min((usedBytes / storageCap) * 100, 100);

  // Inverted L-Shape Geometry Calculation
  const W = centerSize.width;
  const H = centerSize.height;
  const Whub = 340;
  const Hhub = 190;
  const gap = 14;

  const xCut = Math.max(180, W - Whub - gap);
  const yCut = Math.max(200, H - Hhub - gap);

  const R = 28; // Outer corner radius
  const Rin = 24; // Inner concave corner radius

  const pathD = `
    M ${R} 1
    L ${W - R} 1
    A ${R} ${R} 0 0 1 ${W - 1} ${R}
    L ${W - 1} ${yCut - 24}
    A 24 24 0 0 1 ${W - 25} ${yCut}
    L ${xCut + Rin} ${yCut}
    A ${Rin} ${Rin} 0 0 0 ${xCut} ${yCut + Rin}
    L ${xCut} ${H - 1 - R}
    A ${R} ${R} 0 0 1 ${xCut - R} ${H - 1}
    L ${R} ${H - 1}
    A ${R} ${R} 0 0 1 1 ${H - 1 - R}
    L 1 ${R}
    A ${R} ${R} 0 0 1 ${R} 1
    Z
  `.replace(/\s+/g, " ");

  const navTabs = [
    {
      index: 0,
      title: "Dot 1 · User Manager",
      icon: MonitorSmartphone,
      isMiddle: false,
    },
    {
      index: 1,
      title: "Dot 2 · Incoming Print Queue",
      icon: Printer,
      isMiddle: false,
    },
    {
      index: 2,
      title: "Dot 3 (Active) · Main Dashboard",
      icon: LayoutDashboard,
      isMiddle: true, // Middle one is bigger than the rest
    },
    {
      index: 3,
      title: "Dot 4 · Print History & Audit Log",
      icon: History,
      isMiddle: false,
    },
    {
      index: 4,
      title: "Dot 5 · Network & System Settings",
      icon: Settings2,
      isMiddle: false,
    },
  ];

  return (
    <div className="flex h-screen w-screen select-none items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2a2d35] via-[#16171b] to-[#0d0e11] p-3 font-sans text-zinc-200 antialiased overflow-hidden">
      {/* Locked Framework to Match Target Concept Proportions */}
      <div className="flex h-full w-full max-w-[1160px] max-h-[740px] gap-3.5 overflow-hidden">
        {/* ========================================================= */}
        {/* 1. LEFT NAVIGATION RAIL                                   */}
        {/* ========================================================= */}
        <aside className="flex w-16 shrink-0 flex-col items-center justify-between py-2 select-none h-full">
          {/* Top Brand Icon: Official Printio Logo Emblem (Click toggles Printio Copilot) */}
          <button
            onClick={() => setIsCopilotOpen((prev) => !prev)}
            className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer active:scale-95 ${
              isCopilotOpen
                ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400/60 shadow-[0_0_20px_rgba(74,222,128,0.4)] ring-2 ring-emerald-500/30 scale-105"
                : "bg-gradient-to-b from-[#131916] to-[#070a08] backdrop-blur-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:scale-105"
            }`}
            title="Printio • AI Assistant & Controls"
            aria-label="Printio • AI Assistant & Controls"
          >
            {/* Official Printio 8-Radial Aperture Emblem */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              className={`h-5 w-5 transition-colors drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] ${
                isCopilotOpen ? "text-emerald-300" : "text-emerald-400"
              }`}
            >
              <path d="M12 3.5v2.8m0 11.4v2.8m8.5-8.5h-2.8m-11.4 0H3.5m14.5-6l-2 2m-8 8l-2 2m12 0l-2-2m-8-8l-2-2" />
            </svg>
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
          </button>

          {/* Elongated Center Navigation Pill */}
          <div className="flex flex-col items-center gap-4 rounded-full bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] px-2 py-7 my-auto">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.index;
              const isMiddle = tab.isMiddle;

              if (isMiddle) {
                // Middle Dashboard icon: noticeably bigger than the others
                return (
                  <button
                    key={tab.index}
                    onClick={() => setActiveTab(tab.index)}
                    className={`relative flex items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "w-11 h-11 bg-emerald-400 text-zinc-950 shadow-[0_0_15px_rgba(74,222,128,0.3)] ring-4 ring-emerald-500/20 scale-110 font-bold"
                        : "w-11 h-11 bg-black/40 text-zinc-400 hover:text-white hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner hover:scale-105"
                    }`}
                    title={tab.title}
                    aria-label={tab.title}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </button>
                );
              }

              // Consistent non-middle icons
              return (
                <button
                  key={tab.index}
                  onClick={() => setActiveTab(tab.index)}
                  className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-emerald-400 text-zinc-950 shadow-[0_0_15px_rgba(74,222,128,0.3)] ring-4 ring-emerald-500/20 scale-105"
                      : "bg-black/30 text-zinc-400 hover:text-zinc-200 hover:bg-black/50 border border-white/5 border-t-black/60 shadow-inner hover:scale-105"
                  }`}
                  title={tab.title}
                  aria-label={tab.title}
                >
                  <Icon className="w-4 h-4 stroke-[1.8]" />
                </button>
              );
            })}
          </div>

          {/* Bottom Hardware Storage Indicator */}
          <div
            onClick={handleToggleServer}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            title={
              serverRunning ? "Captive Portal Active" : "Captive Portal Paused"
            }
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                serverRunning
                  ? "bg-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]"
                  : "bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
              }`}
            />
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
              <HardDrive className="h-3.5 w-3.5" />
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* 2. CENTER & RIGHT WORKSPACE                               */}
        {/* ========================================================= */}
        {activeTab === 2 ? (
          <>
            {/* ========================================================= */}
            {/* 2. CENTER WORKSPACE: Inverted L-Shape Bento Container     */}
            {/* ========================================================= */}
            <main
              ref={containerRef}
              className="relative flex-1 h-full min-w-0 overflow-hidden select-none"
            >
              {/* Continuous Inverted L-Shape Vector Background & Border */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
                width={W}
                height={H}
              >
                <defs>
                  <linearGradient id="bento-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#282b33" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#14151a" stopOpacity="0.95" />
                  </linearGradient>
                  <filter id="bento-shadow" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="0" dy="8" stdDeviation="15" floodColor="#000000" floodOpacity="0.4" />
                  </filter>
                </defs>
                <path
                  d={pathD}
                  fill="url(#bento-grad)"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  filter="url(#bento-shadow)"
                />
              </svg>

              {/* Top Half (Spanning full width of the center column) */}
              <div
                style={{ height: `${yCut}px` }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`absolute inset-x-0 top-0 p-6 flex flex-col z-10 overflow-hidden pointer-events-auto select-none transition-colors ${
                  isDragOver ? "bg-emerald-500/5 ring-1 ring-inset ring-emerald-400/30" : ""
                }`}
              >
                {/* Header: "Active Document Inspection" on left, IP on right */}
                <div className="flex items-center justify-between pb-2 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold tracking-wide text-zinc-300">
                      Active Document Inspection
                    </span>
                    <button
                      onClick={() => {
                        if (currentFile) setActiveClickedFile(currentFile);
                        setIsCopilotOpen(true);
                      }}
                      className="flex items-center gap-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.15)] transition cursor-pointer active:scale-95"
                      title="Open Gwen for document preflight audit"
                    >
                      <Sparkles className="h-2.5 w-2.5" /> AI Preflight
                    </button>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400 bg-black/40 border border-white/5 border-t-black/60 shadow-inner rounded-full px-2.5 py-0.5">
                    {selectedSession?.ip_address || "192.168.137.112"}
                  </span>
                </div>

                {/* Document Grid Layout (Top-Left Aligned) */}
                <div
                  style={{ scrollbarWidth: "thin" }}
                  className="flex-1 flex flex-wrap items-start gap-6 p-6 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-700/40"
                >
                  {displayedFiles.length > 0 ? (
                    displayedFiles.map((rawFile, idx) => {
                      const file = {
                        ...rawFile,
                        name: rawFile.name || rawFile.original_name,
                      };
                      const isSelected =
                        (currentFile &&
                          (currentFile.id === file.id ||
                            currentFile.file_id === file.file_id)) ||
                        (!currentFile && idx === 0);

                      return (
                        <div
                          key={file.id || file.file_id || idx}
                          onClick={() => handleSelectFileInGrid(file, idx)}
                          onDoubleClick={() =>
                            file.file_path && handleOpenFile(file.file_path)
                          }
                          className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col items-center select-none ${
                            isSelected
                              ? "bg-zinc-800/80 border-white/10 ring-1 ring-emerald-400/50 shadow-[0_0_15px_rgba(74,222,128,0.15)]"
                              : "border-transparent hover:bg-zinc-800/40 hover:border-white/5"
                          }`}
                        >
                          <img
                            src={getFileIcon(file.name)}
                            alt={file.name}
                            className="w-16 h-20 object-contain select-none pointer-events-none drop-shadow-md"
                          />
                          <span className="text-xs text-zinc-300 font-medium text-center mt-2 max-w-[84px] break-words leading-tight">
                            {file.name}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-40 text-zinc-500 gap-2">
                      <File className="h-8 w-8 text-zinc-600 stroke-1" />
                      <span className="text-xs">No files matching "{searchQuery}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom-Left Bay: Capsule Search Bar with + Button */}
              <div
                style={{
                  position: "absolute",
                  left: "20px",
                  bottom: "16px",
                  width: `${xCut - 36}px`,
                  height: "40px",
                }}
                className="flex items-center gap-2.5 rounded-full bg-black/40 border border-white/5 border-t-black/60 shadow-inner px-3.5 z-20 backdrop-blur-md"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  multiple
                  accept=".pdf,.docx,.doc,.xlsx,.pptx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg"
                  className="hidden"
                  style={{ display: "none" }}
                />
                <button
                  onClick={handleManualAdd}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-white/10 shadow-sm transition cursor-pointer active:scale-95"
                  title="Add file manually"
                  aria-label="Add file"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
                />
              </div>

              {/* Bottom-Right Bay: Tightly Docked 6-Action Quick Hub */}
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: `${Whub}px`,
                  height: `${Hhub}px`,
                }}
                className="rounded-[24px] bg-gradient-to-b from-zinc-800/70 to-zinc-900/90 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-3.5 flex flex-col justify-between z-20 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="rounded-full bg-black/50 border border-white/5 border-t-black/60 px-2.5 py-1 text-[11px] text-zinc-300 font-medium truncate max-w-[180px] shadow-inner"
                    title={safeName}
                  >
                    {safeName}
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400 font-mono bg-black/40 px-2 py-0.5 rounded-full border border-white/5 border-t-black/60 shadow-inner whitespace-nowrap">
                    {pages} pg · {fileSizeStr}
                  </span>
                </div>

                {/* 2x3 Action Grid */}
                <div className="grid grid-cols-2 gap-2 flex-1">
                  {/* Dynamic Action Button based on File Type */}
                  <button
                    onClick={() => {
                      if (!filePath) return;
                      if (
                        currentFileTypeConfig.extension === "doc" ||
                        currentFileTypeConfig.extension === "docx"
                      ) {
                        handleOpenWord(filePath);
                      } else {
                        handleOpenFile(filePath);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner py-2 px-2 text-[11px] font-medium transition cursor-pointer active:scale-95 shadow-sm truncate"
                    title={currentFileTypeConfig.viewerActionLabel}
                  >
                    <CurrentFileIcon
                      className={`h-3.5 w-3.5 ${currentFileTypeConfig.textColor} shrink-0`}
                    />
                    <span className="truncate">
                      {currentFileTypeConfig.viewerActionLabel}
                    </span>
                  </button>

                  <button
                    onClick={() => filePath && handleShowInFolder(filePath)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner py-2 px-2 text-[11px] font-medium transition cursor-pointer active:scale-95 shadow-sm truncate"
                  >
                    <FolderOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Show in Folder</span>
                  </button>

                  <button
                    onClick={() => handleMarkDone(sessionId)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 py-2 px-2 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 shadow-[0_0_15px_rgba(74,222,128,0.15)] transition cursor-pointer active:scale-95 shadow-sm truncate"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Mark Done</span>
                  </button>

                  <button
                    onClick={() => filePath && handleCopyPath(filePath)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner py-2 px-2 text-[11px] font-medium transition cursor-pointer active:scale-95 shadow-sm truncate"
                  >
                    <Copy className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">
                      {copied ? "Copied!" : "Copy Path"}
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      currentFile && handleResumeVerify(currentFile.file_id)
                    }
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner py-2 px-2 text-[11px] font-medium transition cursor-pointer active:scale-95 shadow-sm truncate"
                  >
                    <RotateCw className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">Rename / Verify</span>
                  </button>

                  <button
                    onClick={() =>
                      currentFile &&
                      handleDeleteFile(sessionId, currentFile.file_id)
                    }
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 py-2 px-2 text-[11px] font-medium text-red-400 hover:text-red-300 transition cursor-pointer active:scale-95 shadow-sm truncate"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <span className="truncate">Delete</span>
                  </button>
                </div>
              </div>
            </main>

            {/* ========================================================= */}
            {/* 3. RIGHT SIDEBAR                                          */}
            {/* ========================================================= */}
            <aside className="flex w-64 shrink-0 flex-col gap-3.5">
              {/* Active Customer Queue */}
              <div className="flex-1 flex flex-col justify-between rounded-[28px] bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wide text-zinc-300">
                    Active Customer Queue
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full border border-white/5 border-t-black/60 shadow-inner">
                    {activeSessions.length} Device{activeSessions.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex flex-col gap-2 my-auto">
                  {activeSessions.map((session: SessionInfo) => {
                    const isSelected =
                      selectedId === session.id ||
                      (!selectedId && session.id === "sess-laptop");
                    const isLaptop = session.device_type === "laptop";
                    const Icon = isLaptop ? Laptop : Smartphone;
                    const isAmber = session.is_pulsing;

                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`flex items-center justify-between rounded-xl p-2.5 cursor-pointer transition-all active:scale-98 ${
                          isSelected
                            ? "bg-zinc-200 text-zinc-900 shadow-md"
                            : "bg-black/30 border border-white/5 border-t-black/60 shadow-inner hover:bg-black/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            className={`h-4 w-4 ${
                              isSelected
                                ? "text-zinc-900"
                                : isAmber
                                ? "text-amber-400"
                                : "text-zinc-400"
                            }`}
                          />
                          <div>
                            <p
                              className={`text-[11px] font-bold ${
                                isSelected
                                  ? "text-zinc-900"
                                  : "text-zinc-200"
                              }`}
                            >
                              {session.device_name ||
                                (isLaptop ? "Laptop" : "Phone")}
                            </p>
                            <p
                              className={`text-[9px] ${
                                isSelected
                                  ? "text-zinc-600 font-medium"
                                  : isAmber
                                  ? "text-amber-400 font-medium"
                                  : "text-zinc-500"
                              }`}
                            >
                              {isAmber ? "Pulsing amber" : "(Connected)"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isSelected
                              ? "bg-zinc-700"
                              : isAmber
                              ? "bg-amber-400 ring-4 ring-amber-500/20 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                              : "bg-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Completed Print Jobs with Visual Paper Stack */}
              <div className="flex-1 flex flex-col justify-between rounded-[28px] bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-4">
                <span className="text-xs font-semibold tracking-wide text-zinc-300">
                  Completed Print Jobs
                </span>

                <div className="relative mx-auto my-auto flex h-24 w-36 items-center justify-center">
                  <div className="absolute h-16 w-24 rounded-xl bg-gradient-to-b from-zinc-700/30 to-zinc-800/30 border border-white/5 -rotate-12 translate-y-1 pointer-events-none shadow-md" />
                  <div className="absolute h-16 w-24 rounded-xl bg-gradient-to-b from-zinc-700/50 to-zinc-800/50 border border-white/10 -rotate-6 pointer-events-none shadow-md" />
                  <div className="absolute h-16 w-24 rounded-xl bg-gradient-to-b from-zinc-600/90 to-zinc-700/90 border border-white/15 flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
                    <Check className="h-4 w-4 text-emerald-400 stroke-[2.5] drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]" />
                  </div>
                </div>

                <button
                  onClick={handleClearAllCompleted}
                  className="text-center text-[10px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer active:scale-95 py-0.5 font-medium"
                >
                  Clear All Completed Sessions
                </button>
              </div>
            </aside>
          </>
        ) : (
          <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
            {activeTab === 0 && (
              <DeviceManagerView
                sessions={sessions}
                onKick={handleKickUser}
                onBlock={handleKickUser}
                onDisconnect={handleKickUser}
              />
            )}
            {activeTab === 1 && <PrintQueueView />}
            {activeTab === 3 && <AuditHistoryView />}
            {activeTab === 4 && (
              <NetworkSettingsView
                serverRunning={serverRunning}
                onToggleServer={handleToggleServer}
                storageCap={storageCap}
              />
            )}
          </div>
        )}
      </div>

      {/* AI Copilot Slide-over Drawer */}
      <AiCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        activeSelectedFile={activeClickedFile}
        onClearSelectedFile={() => setActiveClickedFile(null)}
        shopContext={{
          activeSessionName: selectedSession?.device_name || deviceLabel,
          activeSessionDevice: selectedSession?.device_type,
          activeSessionIp: selectedSession?.ip_address,
          currentFileName: fileName,
          currentFilePages: pages,
          currentFileSize: fileSizeStr,
          queueCount: sessions.filter((s) => s.status === "active").length,
          completedJobsCount: sessions.filter((s) => s.status === "completed").length,
          pricingRates: (() => {
            try {
              const saved = localStorage.getItem("printio_pricing_rates");
              if (saved) return JSON.parse(saved);
            } catch {}
            return {
              currency: "₱",
              bwPerPage: 2.0,
              colorPerPage: 5.0,
              colorFullPhoto: 10.0,
              legalSurcharge: 1.0,
              laminationId: 15.0,
              laminationA4: 30.0,
              laminationLegal: 40.0,
              ringBinding: 35.0,
              hardboundBinding: 250.0,
              scanPerPage: 5.0,
              minJobFee: 5.0,
            };
          })(),
        }}
      />
    </div>
  );
}
