import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import {
  commands,
  SessionInfo,
  UploadInfo,
  StorageStats,
  formatBytes,
} from "./lib/commands";
import DeviceManagerView from "./components/views/DeviceManagerView";
import PrintQueueView from "./components/views/PrintQueueView";
import AuditHistoryView from "./components/views/AuditHistoryView";
import NetworkSettingsView from "./components/views/NetworkSettingsView";

export default function PrintioDashboard() {
  const [activeTab, setActiveTab] = useState(2);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>("sess-laptop");
  const [files, setFiles] = useState<UploadInfo[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [storageCap, setStorageCap] = useState<number>(10 * 1024 * 1024 * 1024);
  const [serverRunning, setServerRunning] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const pollRef = useRef<number | null>(null);

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
  const refreshFiles = useCallback(async () => {
    if (!selectedId) return;
    try {
      const f = await commands.getSessionFiles(selectedId);
      setFiles(f);
      if (selectedFileIndex >= f.length) {
        setSelectedFileIndex(0);
      }
    } catch (e) {
      console.error("Failed to fetch files:", e);
    }
  }, [selectedId, selectedFileIndex]);

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
      refreshFiles();
      setSelectedFileIndex(0);
    } else {
      setFiles([]);
    }
  }, [selectedId, refreshFiles]);

  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;
  const currentFile = files[selectedFileIndex] || files[0] || null;

  const fileName = currentFile?.original_name || "Thesis_Draft.pdf";
  const safeName = currentFile?.safe_name || "thesis_draft.pdf";
  const pages = currentFile?.pages || 34;
  const fileSizeStr = currentFile
    ? formatBytes(currentFile.file_size)
    : "22.4 MB";
  const filePath =
    currentFile?.file_path ||
    "C:\\PrintioData\\sessions\\192.168.137.112\\Thesis_Draft.pdf";
  const deviceLabel =
    selectedSession?.device_name ||
    selectedSession?.ip_address ||
    "User #12 · Laptop";
  const sessionId = selectedSession?.id || "sess-laptop";

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

  const handleToggleServer = () => {
    setServerRunning((prev) => !prev);
  };

  const handleManualAdd = () => {
    console.log("[Manual Add] Add file dialog triggered");
  };

  const usedBytes =
    storageStats?.total_used_bytes || 1.2 * 1024 * 1024 * 1024;
  const usagePct = Math.min((usedBytes / storageCap) * 100, 100);

  // Inverted L-Shape Geometry Calculation
  const W = centerSize.width;
  const H = centerSize.height;
  const Whub = 340;
  const Hhub = 162;
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
      title: "Dot 1 · Session & Device Manager",
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
    <div className="flex h-screen w-screen select-none items-center justify-center bg-[#0d0e11] p-3 font-sans text-zinc-200 antialiased overflow-hidden">
      {/* Locked Framework to Match Target Concept Proportions */}
      <div className="flex h-full w-full max-w-[1160px] max-h-[740px] gap-3.5 overflow-hidden">
        {/* ========================================================= */}
        {/* 1. LEFT NAVIGATION RAIL                                   */}
        {/* ========================================================= */}
        <aside className="flex w-16 shrink-0 flex-col items-center justify-between py-2 select-none h-full">
          {/* Top Brand Icon */}
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e2025] border border-zinc-700/40 shadow-inner">
            <Sparkles className="h-5 w-5 text-zinc-300" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[#121316] shadow-[0_0_6px_#10b981]" />
          </div>

          {/* Elongated Center Navigation Pill */}
          <div className="flex flex-col items-center gap-4 rounded-full bg-[#181920] border border-zinc-700/60 px-2 py-7 shadow-2xl my-auto">
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
                        ? "w-11 h-11 bg-emerald-400 text-zinc-950 shadow-[0_0_22px_rgba(16,185,129,0.85)] ring-4 ring-emerald-500/25 scale-110 font-bold"
                        : "w-11 h-11 bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700/90 border border-zinc-600/50 hover:scale-105"
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
                      ? "bg-emerald-400 text-zinc-950 ring-4 ring-emerald-500/20 shadow-[0_0_12px_#10b981] scale-105"
                      : "bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 border border-zinc-700/30 hover:scale-105"
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
                serverRunning ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
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
                <path
                  d={pathD}
                  fill="#1a1c21"
                  stroke="rgba(63, 63, 70, 0.8)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Top Half (Spanning full width of the center column) */}
              <div
                style={{ height: `${yCut}px` }}
                className="absolute inset-x-0 top-0 p-6 flex flex-col justify-between z-10 pointer-events-none"
              >
                {/* Top Header */}
                <div className="flex items-center justify-between pointer-events-auto">
                  <span className="text-xs font-semibold tracking-wide text-zinc-300">
                    Active Document Inspection
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {selectedSession?.ip_address || "192.168.137.112"}
                  </span>
                </div>

                {/* Centered Fanned Document Stack */}
                <div className="relative mx-auto my-auto flex h-60 w-96 items-center justify-center pointer-events-auto">
                  {/* Back Card */}
                  <div className="absolute h-52 w-84 rounded-2xl bg-zinc-700/20 border border-zinc-600/20 rotate-3 translate-x-3 translate-y-2 shadow-md pointer-events-none" />
                  {/* Middle Card */}
                  <div className="absolute h-52 w-84 rounded-2xl bg-zinc-700/30 border border-zinc-600/30 -rotate-2 -translate-x-2 shadow-lg pointer-events-none" />

                  {/* Front Main Document Card */}
                  <div
                    onClick={() => filePath && handleOpenFile(filePath)}
                    className="relative flex h-52 w-84 flex-col justify-between rounded-2xl bg-[#26282f] border border-zinc-500/40 p-5 shadow-2xl backdrop-blur-md cursor-pointer hover:border-zinc-400/50 transition group"
                  >
                    {/* Properly Oriented User Ribbon Tab on left exterior edge */}
                    <div className="absolute -left-6 top-7 flex items-center gap-1.5 rounded-l-md bg-zinc-200 px-1.5 py-1 text-[9px] font-bold text-zinc-900 shadow-md [writing-mode:vertical-rl] rotate-180 pointer-events-none">
                      <Laptop className="h-2.5 w-2.5 inline rotate-90" />
                      {deviceLabel}
                    </div>

                    <div className="flex items-start justify-between">
                      <FileText className="h-10 w-10 text-zinc-300 stroke-[1.5] group-hover:scale-105 transition-transform" />
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                        READY
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-emerald-300 transition-colors">
                        {fileName}
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        {pages} pages · {fileSizeStr}
                      </p>
                    </div>
                  </div>
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
                className="flex items-center gap-2.5 rounded-full bg-[#1e2025] border border-zinc-700/50 px-3.5 shadow-inner z-20"
              >
                <button
                  onClick={handleManualAdd}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition cursor-pointer active:scale-95"
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
                className="rounded-[24px] bg-[#1a1c21] border border-zinc-800/80 p-3.5 shadow-xl flex flex-col justify-between z-20"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="rounded-full bg-[#121316] border border-zinc-700/50 px-2.5 py-0.5 text-[10px] text-zinc-300 font-medium truncate max-w-[170px]">
                    {safeName}
                  </span>
                  <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                    {pages} pgss. {fileSizeStr}
                  </span>
                </div>

                {/* 2x3 Action Grid */}
                <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                  <button
                    onClick={() => filePath && handleOpenWord(filePath)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/40 py-1.5 text-[10px] font-medium hover:bg-zinc-700 transition cursor-pointer active:scale-95"
                  >
                    <FileText className="h-3 w-3 text-blue-400" /> Open in Word
                  </button>
                  <button
                    onClick={() => filePath && handleShowInFolder(filePath)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/40 py-1.5 text-[10px] font-medium hover:bg-zinc-700 transition cursor-pointer active:scale-95"
                  >
                    <FolderOpen className="h-3 w-3 text-amber-400" /> Show in
                    Folder
                  </button>
                  <button
                    onClick={() => handleMarkDone(sessionId)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 py-1.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Mark
                    Done
                  </button>
                  <button
                    onClick={() => filePath && handleCopyPath(filePath)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/40 py-1.5 text-[10px] font-medium hover:bg-zinc-700 transition cursor-pointer active:scale-95"
                  >
                    <Copy className="h-3 w-3 text-zinc-400" />{" "}
                    {copied ? "Copied!" : "Copy Path"}
                  </button>
                  <button
                    onClick={() =>
                      currentFile && handleResumeVerify(currentFile.file_id)
                    }
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/40 py-1.5 text-[10px] font-medium hover:bg-zinc-700 transition cursor-pointer active:scale-95"
                  >
                    <RotateCw className="h-3 w-3 text-sky-400" /> Resume /
                    Verify
                  </button>
                  <button
                    onClick={() =>
                      currentFile &&
                      handleDeleteFile(sessionId, currentFile.file_id)
                    }
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 py-1.5 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition cursor-pointer active:scale-95"
                  >
                    <Trash2 className="h-3 w-3 text-red-400" /> Delete
                  </button>
                </div>

                {/* Storage Meter */}
                <div className="flex items-center justify-between gap-2 border-t border-zinc-800 pt-1.5">
                  <div className="h-1 flex-1 rounded-full bg-zinc-950 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"
                      style={{ width: `${Math.max(usagePct, 15)}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 whitespace-nowrap">
                    1.2 GB / 10 GB
                  </span>
                </div>
              </div>
            </main>

            {/* ========================================================= */}
            {/* 3. RIGHT SIDEBAR                                          */}
            {/* ========================================================= */}
            <aside className="flex w-64 shrink-0 flex-col gap-3.5">
              {/* Active Customer Queue */}
              <div className="flex-1 flex flex-col justify-between rounded-[28px] bg-[#1a1c21] border border-zinc-800/80 p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wide text-zinc-300">
                    Active Customer Queue
                  </span>
                  <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/40">
                    3 Devices
                  </span>
                </div>

                <div className="flex flex-col gap-2 my-auto">
                  {/* iPhone */}
                  <div
                    onClick={() => setSelectedId("sess-iphone")}
                    className={`flex items-center justify-between rounded-xl p-2.5 cursor-pointer transition-all active:scale-98 ${
                      selectedId === "sess-iphone"
                        ? "bg-zinc-200 text-zinc-900 shadow-md"
                        : "bg-zinc-800/40 border border-zinc-700/30 hover:bg-zinc-700/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone
                        className={`h-4 w-4 ${
                          selectedId === "sess-iphone"
                            ? "text-zinc-900"
                            : "text-zinc-400"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-[11px] font-medium ${
                            selectedId === "sess-iphone"
                              ? "text-zinc-900 font-bold"
                              : "text-zinc-200"
                          }`}
                        >
                          iPhone
                        </p>
                        <p
                          className={`text-[9px] ${
                            selectedId === "sess-iphone"
                              ? "text-zinc-600"
                              : "text-zinc-500"
                          }`}
                        >
                          (Connected)
                        </p>
                      </div>
                    </div>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        selectedId === "sess-iphone"
                          ? "bg-zinc-700"
                          : "bg-emerald-400 shadow-[0_0_6px_#10b981]"
                      }`}
                    />
                  </div>

                  {/* Android */}
                  <div
                    onClick={() => setSelectedId("sess-android")}
                    className={`flex items-center justify-between rounded-xl p-2.5 cursor-pointer transition-all active:scale-98 ${
                      selectedId === "sess-android"
                        ? "bg-zinc-200 text-zinc-900 shadow-md"
                        : "bg-zinc-800/40 border border-zinc-700/30 hover:bg-zinc-700/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone
                        className={`h-4 w-4 ${
                          selectedId === "sess-android"
                            ? "text-zinc-900"
                            : "text-amber-400"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-[11px] font-medium ${
                            selectedId === "sess-android"
                              ? "text-zinc-900 font-bold"
                              : "text-zinc-200"
                          }`}
                        >
                          Android
                        </p>
                        <p
                          className={`text-[9px] ${
                            selectedId === "sess-android"
                              ? "text-zinc-600 font-medium"
                              : "text-amber-400 font-medium"
                          }`}
                        >
                          Pulsing amber
                        </p>
                      </div>
                    </div>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        selectedId === "sess-android"
                          ? "bg-zinc-700"
                          : "bg-amber-400 ring-4 ring-amber-500/20 animate-pulse shadow-[0_0_8px_#f59e0b]"
                      }`}
                    />
                  </div>

                  {/* User #12 · Laptop */}
                  <div
                    onClick={() => setSelectedId("sess-laptop")}
                    className={`flex items-center justify-between rounded-xl p-2.5 cursor-pointer transition-all active:scale-98 ${
                      selectedId === "sess-laptop" || !selectedId
                        ? "bg-zinc-200 text-zinc-900 shadow-md"
                        : "bg-zinc-800/40 border border-zinc-700/30 hover:bg-zinc-700/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Laptop
                        className={`h-4 w-4 ${
                          selectedId === "sess-laptop" || !selectedId
                            ? "text-zinc-900"
                            : "text-zinc-400"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-[11px] font-bold ${
                            selectedId === "sess-laptop" || !selectedId
                              ? "text-zinc-900"
                              : "text-zinc-200"
                          }`}
                        >
                          User #12 · Laptop
                        </p>
                        <p
                          className={`text-[9px] ${
                            selectedId === "sess-laptop" || !selectedId
                              ? "text-zinc-600 font-medium"
                              : "text-zinc-500"
                          }`}
                        >
                          (Connected)
                        </p>
                      </div>
                    </div>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        selectedId === "sess-laptop" || !selectedId
                          ? "bg-zinc-700"
                          : "bg-emerald-400 shadow-[0_0_6px_#10b981]"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Completed Print Jobs with Visual Paper Stack */}
              <div className="flex-1 flex flex-col justify-between rounded-[28px] bg-[#1a1c21] border border-zinc-800/80 p-4 shadow-xl">
                <span className="text-xs font-semibold tracking-wide text-zinc-300">
                  Completed Print Jobs
                </span>

                <div className="relative mx-auto my-auto flex h-24 w-36 items-center justify-center">
                  <div className="absolute h-16 w-24 rounded-xl bg-zinc-700/20 border border-zinc-600/20 -rotate-12 translate-y-1 pointer-events-none" />
                  <div className="absolute h-16 w-24 rounded-xl bg-zinc-700/40 border border-zinc-600/30 -rotate-6 pointer-events-none shadow-md" />
                  <div className="absolute h-16 w-24 rounded-xl bg-zinc-600/80 border border-zinc-400/40 flex items-center justify-center shadow-lg">
                    <Check className="h-4 w-4 text-emerald-400 stroke-[2.5]" />
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
          <div className="flex-1 min-w-0 h-full overflow-hidden">
            {activeTab === 0 && (
              <DeviceManagerView
                sessions={sessions}
                onKick={(id) => console.log("Kick session:", id)}
                onBatchPrint={(id) => console.log("Batch print session:", id)}
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
    </div>
  );
}
