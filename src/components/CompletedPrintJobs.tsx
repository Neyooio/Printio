import React from "react";
import { Check } from "lucide-react";

interface CompletedPrintJobsProps {
  onClearAll?: () => void;
}

export default function CompletedPrintJobs({
  onClearAll,
}: CompletedPrintJobsProps) {
  return (
    <div className="flex-1 flex flex-col justify-between rounded-[24px] bg-zinc-800/30 border border-zinc-700/30 p-3.5 shadow-xl select-none">
      <span className="text-xs font-semibold tracking-wide text-zinc-300">
        Completed Print Jobs
      </span>

      {/* Fanned Document Cards Graphic */}
      <div className="relative mx-auto my-2 flex h-24 w-36 items-center justify-center">
        <div className="absolute h-16 w-24 rounded-lg bg-zinc-700/30 border border-zinc-600/20 -rotate-12 translate-y-1" />
        <div className="absolute h-16 w-24 rounded-lg bg-zinc-700/50 border border-zinc-600/30 -rotate-6" />
        <div className="absolute h-16 w-24 rounded-lg bg-zinc-600/80 border border-zinc-400/40 flex items-center justify-center shadow-lg">
          <Check className="h-4 w-4 text-emerald-400 stroke-[3]" />
        </div>
      </div>

      <button
        onClick={onClearAll}
        className="text-center text-[10px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer active:scale-95 py-0.5"
      >
        Clear All Completed Sessions
      </button>
    </div>
  );
}
