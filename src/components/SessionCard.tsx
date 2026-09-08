import { SessionInfo, formatTimeAgo } from "../lib/commands";
import ProgressRing from "./ProgressRing";

interface SessionCardProps {
  session: SessionInfo;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function SessionCard({ session, isSelected, onSelect }: SessionCardProps) {
  const progress = session.file_count > 0
    ? Math.round((session.completed_count / session.file_count) * 100)
    : 0;
  const isActive = session.status === "active";
  const isPrinted = session.status === "printed";

  return (
    <button
      onClick={() => onSelect(session.id)}
      className={`w-full text-left rounded-2xl p-4 transition-all duration-300 ease-out border
        ${isSelected
          ? "bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.08)]"
          : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]"
        }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold
          ${isActive ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white" : "bg-white/[0.06] text-gray-500"}`}>
          {session.ip_address.split(".").pop()}
        </div>

        <div className="flex-1 min-w-0">
          {/* IP and time */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-200">{session.ip_address}</span>
            <span className="text-[11px] text-gray-500 flex-shrink-0 ml-2">{formatTimeAgo(session.last_activity)}</span>
          </div>

          {/* File count and status */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-gray-500">
              {session.file_count} {session.file_count === 1 ? "file" : "files"}
            </span>
            <span className="text-gray-600">·</span>
            <span className={`text-xs font-medium ${isPrinted ? "text-emerald-400" : isActive ? "text-indigo-400" : "text-gray-500"}`}>
              {isPrinted ? "Printed" : isActive ? "Active" : session.status}
            </span>
          </div>
        </div>

        {/* Progress ring */}
        {session.file_count > 0 && (
          <ProgressRing progress={progress} size={36} strokeWidth={3} />
        )}
      </div>
    </button>
  );
}