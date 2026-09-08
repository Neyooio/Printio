import React from "react";
import { FileText, Laptop } from "lucide-react";
import { UploadInfo, SessionInfo, formatBytes } from "../lib/commands";

interface ActiveDocumentInspectionProps {
  session?: SessionInfo | null;
  files?: UploadInfo[];
  selectedFileIndex?: number;
  onSelectFileIndex?: (index: number) => void;
  onOpenFile?: (path: string) => void;
}

export default function ActiveDocumentInspection({
  session,
  files = [],
  selectedFileIndex = 0,
  onSelectFileIndex,
  onOpenFile,
}: ActiveDocumentInspectionProps) {
  const currentFile = files[selectedFileIndex] || files[0] || null;
  const deviceLabel =
    session?.device_name || session?.ip_address || "User #12 · Laptop";

  const fileName = currentFile?.original_name || "Thesis_Draft.pdf";
  const pages = currentFile?.pages || 34;
  const fileSizeStr = currentFile ? formatBytes(currentFile.file_size) : "22.4MB";
  const filePath =
    currentFile?.file_path || "C:\\PrintioData\\sessions\\Thesis_Draft.pdf";

  return (
    <div className="col-span-12 relative flex flex-col justify-between rounded-[28px] bg-zinc-800/30 border border-zinc-700/30 p-6 overflow-hidden select-none h-full min-h-[280px]">
      <span className="text-xs font-semibold tracking-wide text-zinc-300">
        Active Document Inspection
      </span>

      {/* Centered Layered Document Stack */}
      <div className="relative mx-auto my-auto flex items-center justify-center">
        {/* Background Fanned Cards */}
        <div className="absolute h-48 w-72 rounded-2xl bg-zinc-700/20 border border-zinc-600/20 rotate-3 translate-x-2 translate-y-1 shadow-md pointer-events-none" />
        <div className="absolute h-48 w-72 rounded-2xl bg-zinc-700/30 border border-zinc-600/30 -rotate-2 -translate-x-1 shadow-lg pointer-events-none" />

        {/* Front Active Document Card */}
        <div
          onClick={() => filePath && onOpenFile?.(filePath)}
          className="relative flex h-48 w-72 flex-col justify-between rounded-2xl bg-zinc-700/70 border border-zinc-500/40 p-5 shadow-2xl backdrop-blur-md cursor-pointer hover:border-zinc-400/60 transition-all duration-200 group"
        >
          {/* Left Docked Notch */}
          <div className="absolute -left-7 top-8 flex items-center gap-1.5 rounded-l-md bg-zinc-200 px-2 py-1 text-[10px] font-bold text-zinc-900 shadow-md [writing-mode:vertical-rl] rotate-180 pointer-events-none">
            <Laptop className="h-3 w-3 inline rotate-90" />
            {deviceLabel}
          </div>

          <div className="flex items-start justify-between">
            <FileText className="h-8 w-8 text-zinc-200 group-hover:scale-105 transition-transform" />
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
              READY
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-emerald-200 transition-colors">
              {fileName}
            </h3>
            <p className="text-[11px] text-zinc-300">
              {pages} pages · {fileSizeStr}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
