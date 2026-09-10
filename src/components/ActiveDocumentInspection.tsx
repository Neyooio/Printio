import React from "react";
import { UploadInfo, SessionInfo } from "../lib/commands";
import { getFileTypeConfig } from "../lib/fileTypeHelper";

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

  return (
    <div className="col-span-12 relative flex flex-col rounded-[28px] bg-[#1a1c21] border border-zinc-800/80 p-6 overflow-hidden select-none h-full min-h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 shrink-0">
        <span className="text-xs font-semibold tracking-wide text-zinc-300">
          Active Document Inspection
        </span>
        <span className="font-mono text-[10px] text-zinc-400 bg-zinc-800/50 border border-zinc-700/30 rounded-full px-2.5 py-0.5">
          {session?.ip_address || "192.168.137.112"}
        </span>
      </div>

      {/* Top-Left Aligned Document Grid */}
      <div
        style={{ scrollbarWidth: "thin" }}
        className="flex-1 flex items-start gap-8 p-6 overflow-y-auto overflow-x-hidden flex-wrap scrollbar-thin scrollbar-thumb-zinc-700/40"
      >
        {files.length > 0 ? (
          files.map((file, idx) => {
            const cfg = getFileTypeConfig(file.original_name);
            const isSelected =
              (currentFile &&
                (currentFile.id === file.id ||
                  currentFile.file_id === file.file_id)) ||
              (!currentFile && idx === 0);

            return (
              <div
                key={file.id || file.file_id || idx}
                onClick={() => onSelectFileIndex?.(idx)}
                onDoubleClick={() =>
                  file.file_path && onOpenFile?.(file.file_path)
                }
                className="flex flex-col items-center cursor-pointer group"
              >
                {/* Document Icon Card: White rounded sheet with top-right dog-ear fold */}
                <div
                  className={`relative bg-white rounded-2xl w-24 h-32 flex flex-col items-center justify-center shadow-md transition-all duration-150 overflow-hidden ${
                    isSelected
                      ? "ring-2 ring-emerald-400/90 shadow-[0_0_18px_rgba(52,211,153,0.35)] scale-102"
                      : "hover:scale-102 hover:shadow-lg"
                  }`}
                >
                  {/* Top-Right Dog-Ear Fold */}
                  <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none">
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[22px] border-t-[#1a1c21] border-l-[22px] border-l-transparent" />
                    <div className="absolute top-0 right-0 w-4 h-4 bg-zinc-200/90 border-b border-l border-zinc-300 rounded-bl-[4px] shadow-sm" />
                  </div>

                  {/* Centered Red Adobe / PDF Vector Symbol or Type Icon */}
                  {cfg.extension === "pdf" ? (
                    <svg
                      viewBox="0 0 256 256"
                      className="w-9 h-9 text-[#eb1000] fill-current group-hover:scale-105 transition-transform"
                    >
                      <path d="M149.2 114.7c-5.8-12.7-14-35.3-17.8-51.4 8.4-16.1 14-34.9 15.3-50.1.2-1.9.2-3.5-.2-4.9-1.1-3.3-4.4-5.2-7.9-5.2h-.3c-4.9 0-9.8 3-13.9 8.7-8.4 12-14.4 32.2-16.6 54.3-13.1 30.6-32 66.4-48.3 89.3-19.7 10.6-40.1 24.6-53 39.6-6 7.1-9.3 14.5-9.6 21.8 0 3.3.8 6.5 2.5 9.6 3.8 6.8 11.2 10.6 19.6 10.6 11.7 0 26.8-7.1 44.5-21 38-12 81.4-21 116.3-26.2 18.5 15.6 36.9 24.8 50.8 24.8 4.6 0 8.7-1.1 11.7-3.3 5.2-3.8 7.9-10.1 7.1-16.6-1.4-9.8-12.3-23.2-34.4-38.8l-10.7 12.8zm-24-53.5c4.9 12.8 13.4 29.2 19.7 39.6-12.8 1.9-27.8 4.9-43.4 8.7 7.1-18.3 15.6-35.2 23.7-48.3zM51.3 227.1c-2.2-2.5-3.5-5.5-3.5-8.5 0-4.6 2.7-9.8 7.4-15 10.1-11.2 25.7-22.1 41-30.3-18.3 22.7-33 42.6-44.9 53.8zm180.5-14.5c-.5 2.2-1.9 4.1-4.1 5.5-2.7 1.9-6.3 2.7-10.4 2.7-10.6 0-25.1-7.9-40.7-20.5 15 2.5 26.8 6 35.5 10.6 13.1 7.1 18.3 13.6 19.7 18.1v.1z" />
                    </svg>
                  ) : (
                    <cfg.icon
                      className={`w-8 h-8 ${cfg.textColor} stroke-[1.8] group-hover:scale-105 transition-transform`}
                    />
                  )}

                  {/* Bold uppercase label directly beneath icon: "PDF" */}
                  <span className="text-zinc-900 font-bold text-xs tracking-wider mt-1.5 select-none">
                    {cfg.typeLabel}
                  </span>
                </div>

                {/* Filename Label centered directly under card */}
                <span className="text-xs text-zinc-300 font-medium text-center mt-2 max-w-[100px] break-words leading-tight select-none group-hover:text-white transition-colors">
                  {file.original_name}
                </span>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center w-full h-40 text-zinc-500 text-xs">
            No active documents in session
          </div>
        )}
      </div>
    </div>
  );
}
