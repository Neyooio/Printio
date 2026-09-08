import React, { useState } from "react";
import {
  FileText,
  FolderOpen,
  CheckCircle2,
  Copy,
  RotateCw,
  Trash2,
} from "lucide-react";
import { UploadInfo, SessionInfo, formatBytes } from "../lib/commands";

interface DocumentControlBentoProps {
  session: SessionInfo | null;
  file: UploadInfo | null;
  onOpenWord: (path: string) => void;
  onShowInFolder: (path: string) => void;
  onMarkDone: (sessionId: string) => void;
  onCopyPath: (path: string) => void;
  onResumeVerify: (fileId: string) => void;
  onDelete: (sessionId: string, fileId: string) => void;
  usedBytes?: number;
  totalCapBytes?: number;
}

export default function DocumentControlBento({
  session,
  file,
  onOpenWord,
  onShowInFolder,
  onMarkDone,
  onCopyPath,
  onResumeVerify,
  onDelete,
  usedBytes = 1.2 * 1024 * 1024 * 1024,
  totalCapBytes = 10 * 1024 * 1024 * 1024,
}: DocumentControlBentoProps) {
  const [copied, setCopied] = useState(false);

  const safeName = file?.safe_name || "thesis_draft.pdf";
  const pages = file?.pages || 34;
  const fileSizeStr = file ? formatBytes(file.file_size) : "22.4MB";
  const filePath =
    file?.file_path || "C:\\PrintioData\\sessions\\192.168.137.112\\Thesis_Draft.pdf";
  const sessionId = session?.id || "sess-laptop";
  const fileId = file?.file_id || "file-thesis-01";

  const handleCopy = () => {
    onCopyPath(filePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const usagePct = Math.min((usedBytes / totalCapBytes) * 100, 100);

  return (
    <div className="col-span-7 flex flex-col justify-between rounded-[24px] bg-zinc-800/40 border border-zinc-700/40 p-3.5 shadow-xl select-none">
      {/* Header Pill */}
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-zinc-900/80 border border-zinc-700/40 px-2.5 py-0.5 text-[10px] text-zinc-300 font-mono">
          {safeName}
        </span>
        <span className="text-[10px] text-zinc-400 font-medium">
          {pages} pgss. {fileSizeStr}
        </span>
      </div>

      {/* 2x3 Grid */}
      <div className="grid grid-cols-2 gap-1.5 my-2">
        <button
          onClick={() => onOpenWord(filePath)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-700/40 border border-zinc-600/30 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700/70 transition active:scale-95"
        >
          <FileText className="h-3 w-3 text-blue-400" /> Open in Word
        </button>
        <button
          onClick={() => onShowInFolder(filePath)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-700/40 border border-zinc-600/30 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700/70 transition active:scale-95"
        >
          <FolderOpen className="h-3 w-3 text-amber-400" /> Show in Folder
        </button>
        <button
          onClick={() => onMarkDone(sessionId)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition active:scale-95"
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Mark Done
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-700/40 border border-zinc-600/30 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700/70 transition active:scale-95"
        >
          <Copy className="h-3 w-3 text-zinc-400" /> {copied ? "Copied!" : "Copy Path"}
        </button>
        <button
          onClick={() => onResumeVerify(fileId)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-700/40 border border-zinc-600/30 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700/70 transition active:scale-95"
        >
          <RotateCw className="h-3 w-3 text-sky-400" /> Resume / Verify
        </button>
        <button
          onClick={() => onDelete(sessionId, fileId)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-500/20 transition active:scale-95"
        >
          <Trash2 className="h-3 w-3 text-red-400" /> Delete
        </button>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-700/30">
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
  );
}
