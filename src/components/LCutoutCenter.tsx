import React, { useRef, useState, useEffect } from "react";
import {
  FileText,
  Search,
  Plus,
  Laptop,
  FolderOpen,
  CheckCircle2,
  Copy,
  RotateCw,
  Trash2,
} from "lucide-react";
import { UploadInfo, SessionInfo, formatBytes } from "../lib/commands";

interface LCutoutCenterProps {
  session: SessionInfo | null;
  files: UploadInfo[];
  selectedFileIndex: number;
  onSelectFileIndex: (index: number) => void;
  onOpenFile: (path: string) => void;
  onOpenWord: (path: string) => void;
  onShowInFolder: (path: string) => void;
  onMarkDone: (sessionId: string) => void;
  onCopyPath: (path: string) => void;
  onResumeVerify: (fileId: string) => void;
  onDelete: (sessionId: string, fileId: string) => void;
  onManualAdd: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  copied: boolean;
  usedBytes: number;
  totalCapBytes: number;
}

export default function LCutoutCenter({
  session,
  files,
  selectedFileIndex,
  onOpenFile,
  onOpenWord,
  onShowInFolder,
  onMarkDone,
  onCopyPath,
  onResumeVerify,
  onDelete,
  onManualAdd,
  searchQuery,
  onSearchChange,
  copied,
  usedBytes,
  totalCapBytes,
}: LCutoutCenterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 560, height: 580 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 50 && height > 50) {
          setSize({ width, height });
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const currentFile = files[selectedFileIndex] || files[0] || null;
  const fileName = currentFile?.original_name || "Thesis_Draft.pdf";
  const safeName = currentFile?.safe_name || "thesis_draft.pdf";
  const pages = currentFile?.pages || 34;
  const fileSizeStr = currentFile ? formatBytes(currentFile.file_size) : "22.4MB";
  const filePath =
    currentFile?.file_path ||
    "C:\\PrintioData\\sessions\\192.168.137.112\\Thesis_Draft.pdf";
  const deviceLabel =
    session?.device_name || session?.ip_address || "User #12 · Laptop";
  const sessionId = session?.id || "sess-laptop";

  const W = size.width;
  const H = size.height;

  // Geometry dimensions
  const Whub = Math.min(310, Math.max(260, W * 0.54));
  const Hhub = 168;
  const gap = 12;
  const Hsearch = 38;

  // Exact step positions:
  // Right side ends above Action Hub
  const yRightBottom = Math.max(160, H - Hhub - gap);
  // Left side ends just above the Search Capsule
  const yLeftBottom = Math.max(yRightBottom + 50, H - Hsearch - gap - 4);
  // Horizontal cut-line between left and right
  const xStep = Math.max(160, W - Whub - gap);

  const R = 28; // Outer corner radius
  const Rin = 24; // Inner concave corner radius

  // Continuous L-shaped vector path with rounded corners & concave inner curve
  const pathD = `
    M ${R} 1
    L ${W - R} 1
    A ${R} ${R} 0 0 1 ${W - 1} ${R}
    L ${W - 1} ${yRightBottom - R}
    A ${R} ${R} 0 0 1 ${W - R} ${yRightBottom}
    L ${xStep + Rin} ${yRightBottom}
    A ${Rin} ${Rin} 0 0 0 ${xStep} ${yRightBottom + Rin}
    L ${xStep} ${yLeftBottom - R}
    A ${R} ${R} 0 0 1 ${xStep - R} ${yLeftBottom}
    L ${R} ${yLeftBottom}
    A ${R} ${R} 0 0 1 1 ${yLeftBottom - R}
    L 1 ${R}
    A ${R} ${R} 0 0 1 ${R} 1
    Z
  `.replace(/\s+/g, " ");

  const usagePct = Math.min((usedBytes / totalCapBytes) * 100, 100);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full min-h-0 select-none overflow-hidden"
    >
      {/* 1. CONTINUOUS L-SHAPED VECTOR BORDER & BACKGROUND SURFACE */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
        width={W}
        height={H}
      >
        <defs>
          <linearGradient id="lCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22242c" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#1a1c22" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#15161b" stopOpacity="0.35" />
          </linearGradient>
          <filter id="lShadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="8" stdDeviation="16" floodOpacity="0.35" />
          </filter>
        </defs>

        <path
          d={pathD}
          fill="url(#lCardGrad)"
          stroke="#2f323c"
          strokeWidth="1.5"
          strokeLinejoin="round"
          filter="url(#lShadow)"
        />
      </svg>

      {/* 2. TOP INSPECTION CONTENT (Sitting cleanly inside the upper L surface) */}
      <div
        style={{ height: `${yRightBottom}px` }}
        className="absolute inset-x-0 top-0 p-5 flex flex-col justify-between z-10 pointer-events-none"
      >
        <span className="text-xs font-semibold tracking-wide text-zinc-300 pointer-events-auto">
          Active Document Inspection
        </span>

        {/* Centered Layered Stack */}
        <div className="relative mx-auto my-auto flex items-center justify-center pointer-events-auto">
          {/* Fanned Card Back 1 */}
          <div className="absolute h-40 w-64 rounded-2xl bg-zinc-700/20 border border-zinc-600/20 rotate-3 translate-x-2 translate-y-1 shadow-md pointer-events-none" />
          {/* Fanned Card Back 2 */}
          <div className="absolute h-40 w-64 rounded-2xl bg-zinc-700/30 border border-zinc-600/30 -rotate-2 -translate-x-1 shadow-lg pointer-events-none" />

          {/* Front Card */}
          <div
            onClick={() => filePath && onOpenFile(filePath)}
            className="relative flex h-40 w-64 flex-col justify-between rounded-2xl bg-zinc-700/80 border border-zinc-500/40 p-4 shadow-2xl backdrop-blur-md cursor-pointer hover:border-zinc-400/60 transition-all duration-200 group"
          >
            {/* Left Docked Notch Badge */}
            <div className="absolute -left-6 top-6 flex items-center gap-1 rounded-l-md bg-zinc-200 px-1.5 py-1 text-[9px] font-bold text-zinc-900 shadow-md [writing-mode:vertical-rl] rotate-180 pointer-events-none">
              <Laptop className="h-2.5 w-2.5 inline rotate-90" />
              {deviceLabel}
            </div>

            <div className="flex items-start justify-between">
              <FileText className="h-8 w-8 text-zinc-200 stroke-[1.5] group-hover:scale-105 transition-transform" />
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                READY
              </span>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-zinc-100 truncate group-hover:text-emerald-200 transition-colors">
                {fileName}
              </h3>
              <p className="text-[10px] text-zinc-300">
                {pages} pages · {fileSizeStr}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM-LEFT DOCKED SEARCH CAPSULE (Aligned at bottom) */}
      <div
        style={{
          position: "absolute",
          left: "4px",
          bottom: "2px",
          width: `${xStep - 12}px`,
          height: `${Hsearch}px`,
        }}
        className="flex items-center gap-2 rounded-full bg-zinc-800/60 border border-zinc-700/40 px-3 py-1.5 shadow-inner z-20"
      >
        <button
          onClick={onManualAdd}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-zinc-200 hover:bg-zinc-600 active:scale-95 transition-all shadow"
          title="Add Manual File"
          aria-label="Add File"
        >
          <Plus className="h-3 w-3" />
        </button>
        <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search files..."
          className="w-full bg-transparent text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none"
        />
      </div>

      {/* 4. BOTTOM-RIGHT QUICK ACTION HUB (Sitting in the dedicated cut-out bay) */}
      <div
        style={{
          position: "absolute",
          right: "1px",
          bottom: "2px",
          width: `${Whub}px`,
          height: `${Hhub}px`,
        }}
        className="flex flex-col justify-between rounded-[22px] bg-zinc-800/40 border border-zinc-700/40 p-3 shadow-xl z-20"
      >
        {/* Header Pill */}
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-zinc-900/80 border border-zinc-700/40 px-2.5 py-0.5 text-[10px] text-zinc-300 font-mono truncate max-w-[140px]">
            {safeName}
          </span>
          <span className="text-[10px] text-zinc-400 whitespace-nowrap">
            {pages} pgss. {fileSizeStr}
          </span>
        </div>

        {/* 2x3 Action Grid */}
        <div className="grid grid-cols-2 gap-1.5 my-1.5">
          <button
            onClick={() => filePath && onOpenWord(filePath)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-700/40 border border-zinc-600/30 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-700/70 transition active:scale-95"
          >
            <FileText className="h-3 w-3 text-blue-400" /> Open in Word
          </button>
          <button
            onClick={() => filePath && onShowInFolder(filePath)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-700/40 border border-zinc-600/30 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-700/70 transition active:scale-95"
          >
            <FolderOpen className="h-3 w-3 text-amber-400" /> Show in Folder
          </button>
          <button
            onClick={() => onMarkDone(sessionId)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 py-1 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition active:scale-95"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Mark Done
          </button>
          <button
            onClick={() => filePath && onCopyPath(filePath)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-700/40 border border-zinc-600/30 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-700/70 transition active:scale-95"
          >
            <Copy className="h-3 w-3 text-zinc-400" />{" "}
            {copied ? "Copied!" : "Copy Path"}
          </button>
          <button
            onClick={() =>
              currentFile && onResumeVerify(currentFile.file_id)
            }
            className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-700/40 border border-zinc-600/30 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-700/70 transition active:scale-95"
          >
            <RotateCw className="h-3 w-3 text-sky-400" /> Resume / Verify
          </button>
          <button
            onClick={() =>
              currentFile && onDelete(sessionId, currentFile.file_id)
            }
            className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition active:scale-95"
          >
            <Trash2 className="h-3 w-3 text-red-400" /> Delete
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between gap-2 border-t border-zinc-700/30 pt-1">
          <div className="h-1 flex-1 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"
              style={{ width: `${Math.max(usagePct, 12)}%` }}
            />
          </div>
          <span className="text-[9px] text-zinc-400 whitespace-nowrap font-mono">
            1.2 GB / 10 GB
          </span>
        </div>
      </div>
    </div>
  );
}
