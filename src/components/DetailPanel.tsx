import { SessionInfo, UploadInfo, formatTimeAgo, formatBytes } from "../lib/commands";
import FileRow from "./FileRow";

interface DetailPanelProps {
  session: SessionInfo | null;
  files: UploadInfo[];
  onOpenFile: (path: string) => void;
  onOpenWord: (path: string) => void;
  onOpenExplorer: (path: string) => void;
  onMarkComplete: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export default function DetailPanel({
  session,
  files,
  onOpenFile,
  onOpenWord,
  onOpenExplorer,
  onMarkComplete,
  onDeleteSession,
}: DetailPanelProps) {
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center opacity-30">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <p className="text-sm text-gray-500">Select a session to view files</p>
        </div>
      </div>
    );
  }

  const completedFiles = files.filter((f) => f.status === "complete");
  const activeFiles = files.filter((f) => f.status === "uploading");
  const failedFiles = files.filter((f) => f.status === "failed");
  const totalSize = files.reduce((acc, f) => acc + f.file_size, 0);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
                {session.ip_address.split(".").pop()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{session.ip_address}</h2>
                <p className="text-xs text-gray-500">Active {formatTimeAgo(session.last_activity)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats pills */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.04]">
              <span className="text-xs text-gray-400">{files.length} files</span>
              <span className="text-gray-600">·</span>
              <span className="text-xs text-gray-400">{formatBytes(totalSize)}</span>
            </div>

            {/* Action buttons */}
            {completedFiles.length > 0 && completedFiles[0].file_path && (
              <button
                onClick={() => {
                  const dir = completedFiles[0].file_path!.replace(/[^\\\/]+$/, "");
                  onOpenExplorer(dir);
                }}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] text-gray-400 hover:text-gray-200 transition-all"
                title="Open folder"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
              </button>
            )}

            {session.status === "active" && (
              <button
                onClick={() => onMarkComplete(session.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-medium transition-all"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                Mark Printed
              </button>
            )}

            <button
              onClick={() => onDeleteSession(session.id)}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-red-500/10 border border-white/[0.04] hover:border-red-500/20 text-gray-500 hover:text-red-400 transition-all"
              title="Delete session"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
        {activeFiles.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Uploading ({activeFiles.length})</span>
            </div>
            <div className="space-y-1">
              {activeFiles.map((f) => (
                <FileRow key={f.file_id} file={f} onOpen={onOpenFile} onOpenWord={onOpenWord} />
              ))}
            </div>
          </div>
        )}

        {completedFiles.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Ready ({completedFiles.length})</span>
            </div>
            <div className="space-y-1">
              {completedFiles.map((f) => (
                <FileRow key={f.file_id} file={f} onOpen={onOpenFile} onOpenWord={onOpenWord} />
              ))}
            </div>
          </div>
        )}

        {failedFiles.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Failed ({failedFiles.length})</span>
            </div>
            <div className="space-y-1">
              {failedFiles.map((f) => (
                <FileRow key={f.file_id} file={f} onOpen={onOpenFile} onOpenWord={onOpenWord} />
              ))}
            </div>
          </div>
        )}

        {files.length === 0 && (
          <div className="flex flex-col items-center justify-center h-60 opacity-30">
            <svg className="w-12 h-12 text-gray-600 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13,2 13,9 20,9"/></svg>
            <p className="text-xs text-gray-500">No files uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}