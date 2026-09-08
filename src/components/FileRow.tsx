import { UploadInfo, formatBytes, getFileColor } from "../lib/commands";

interface FileRowProps {
  file: UploadInfo;
  onOpen: (path: string) => void;
  onOpenWord: (path: string) => void;
}

export default function FileRow({ file, onOpen, onOpenWord }: FileRowProps) {
  const ext = file.file_type.split("/").pop()?.toLowerCase() || "";
  const progress = file.file_size > 0 ? (file.uploaded_bytes / file.file_size) * 100 : 0;
  const isComplete = file.status === "complete";
  const isFailed = file.status === "failed";
  const isWord = ["docx", "doc"].includes(ext);
  const gradientClass = getFileColor(ext);

  return (
    <div className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-200">
      {/* File type icon */}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center flex-shrink-0 shadow-lg`}>
        <span className="text-xs font-bold text-white uppercase">{ext.slice(0, 4)}</span>
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate">{file.original_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{formatBytes(file.file_size)}</span>
          {!isComplete && !isFailed && (
            <>
              <span className="text-xs text-gray-600">•</span>
              <div className="flex-1 max-w-[80px] h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-indigo-400">{Math.round(progress)}%</span>
            </>
          )}
          {isFailed && <span className="text-xs text-red-400">Failed</span>}
        </div>
      </div>

      {/* Status badge */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isComplete ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : isFailed ? "bg-red-400" : "bg-amber-400 animate-pulse"}`} />

      {/* Actions */}
      {isComplete && file.file_path && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {isWord && (
            <button onClick={() => onOpenWord(file.file_path!)} className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors" title="Open in Word">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </button>
          )}
          <button onClick={() => onOpen(file.file_path!)} className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-gray-200 transition-colors" title="Open file">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}