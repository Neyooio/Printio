import { SessionInfo, ServerStatus, StorageStats } from "../lib/commands";
import SessionCard from "./SessionCard";
import StorageGauge from "./StorageGauge";

interface SidebarProps {
  sessions: SessionInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  serverStatus: ServerStatus | null;
  storageStats: StorageStats | null;
  storageCap: number;
}

export default function Sidebar({
  sessions,
  selectedId,
  onSelect,
  serverStatus,
  storageStats,
  storageCap,
}: SidebarProps) {
  const activeSessions = sessions.filter((s) => s.status === "active");
  const completedSessions = sessions.filter((s) => s.status !== "active");

  return (
    <aside className="w-[340px] flex-shrink-0 h-screen flex flex-col border-r border-white/[0.04] bg-[#0d0d18]/80 backdrop-blur-xl">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6,9 6,2 18,2 18,9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Printio</h1>
            <p className="text-[11px] text-gray-500 -mt-0.5">Print Intake Manager</p>
          </div>
        </div>

        {/* Server status pills */}
        <div className="flex gap-2 mb-4">
          <StatusPill label="DNS" active={serverStatus?.dns_running ?? false} />
          <StatusPill label="Portal" active={serverStatus?.http_running ?? false} />
        </div>

        {/* Storage gauge */}
        {storageStats && (
          <StorageGauge
            usedBytes={storageStats.total_used_bytes}
            capBytes={storageCap}
            fileCount={storageStats.file_count}
            sessionCount={storageStats.active_sessions}
          />
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {activeSessions.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 px-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Active ({activeSessions.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {activeSessions.map((s) => (
                <SessionCard key={s.id} session={s} isSelected={selectedId === s.id} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}

        {completedSessions.length > 0 && (
          <div>
            <div className="px-2 mb-2">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                History ({completedSessions.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {completedSessions.map((s) => (
                <SessionCard key={s.id} session={s} isSelected={selectedId === s.id} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 opacity-40">
            <svg className="w-10 h-10 text-gray-600 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
            <p className="text-xs text-gray-500">No sessions yet</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Waiting for connections...</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.03] text-gray-500 border border-white/[0.04]"}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]" : "bg-gray-600"}`} />
      {label}
    </div>
  );
}