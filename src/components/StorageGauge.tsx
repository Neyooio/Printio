import { formatBytes } from "../lib/commands";

interface StorageGaugeProps {
  usedBytes: number;
  capBytes: number;
  fileCount: number;
  sessionCount: number;
}

export default function StorageGauge({ usedBytes, capBytes, fileCount, sessionCount }: StorageGaugeProps) {
  const pct = capBytes > 0 ? Math.min((usedBytes / capBytes) * 100, 100) : 0;
  const color = pct >= 80 ? "from-red-500 to-rose-500" : pct >= 50 ? "from-amber-500 to-yellow-500" : "from-emerald-400 to-teal-500";

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-400">Storage</span>
        <span className="text-xs text-gray-500">{formatBytes(usedBytes)} / {formatBytes(capBytes)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span className="text-xs text-gray-500">{fileCount} files</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span className="text-xs text-gray-500">{sessionCount} sessions</span>
        </div>
      </div>
    </div>
  );
}