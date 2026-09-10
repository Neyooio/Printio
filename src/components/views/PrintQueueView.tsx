import React, { useState } from "react";
import {
  Printer,
  ArrowUpDown,
  CheckSquare,
  Square,
  Play,
  Pause,
  Trash2,
  FileText,
  Clock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { getFileIcon } from "../../lib/fileTypeHelper";

export default function PrintQueueView() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [queue, setQueue] = useState([
    {
      id: "job-1",
      priority: 1,
      fileName: "Thesis_Final_Draft.pdf",
      owner: "User #12 · Laptop",
      pages: 34,
      size: "22.4 MB",
      uploadProgress: 100,
      status: "Ready to Print",
      receivedAt: "10:45 AM",
    },
    {
      id: "job-2",
      priority: 2,
      fileName: "Lab_Manual_Biology_2026.docx",
      owner: "User #19 · Android",
      pages: 18,
      size: "14.2 MB",
      uploadProgress: 100,
      status: "Queued",
      receivedAt: "10:47 AM",
    },
    {
      id: "job-3",
      priority: 3,
      fileName: "Architectural_Blueprints_A3.pdf",
      owner: "User #08 · iPhone",
      pages: 8,
      size: "42.1 MB",
      uploadProgress: 85,
      status: "Uploading (85%)",
      receivedAt: "10:49 AM",
    },
    {
      id: "job-4",
      priority: 4,
      fileName: "Resume_Engineering_Lead.pdf",
      owner: "User #03 · MacBook",
      pages: 2,
      size: "1.1 MB",
      uploadProgress: 100,
      status: "Queued",
      receivedAt: "10:50 AM",
    },
  ]);

  const toggleSelectAll = () => {
    if (selectedIds.length === queue.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(queue.map((q) => q.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const movePriority = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= queue.length) return;
    const newQueue = [...queue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[target];
    newQueue[target] = temp;
    setQueue(newQueue);
  };

  return (
    <div className="flex-1 h-full flex flex-col gap-3 p-1 min-h-0 select-none overflow-hidden font-sans">
      {/* Top Header & Bulk Controls */}
      <div className="flex items-center justify-between bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">
              Incoming Print Queue
            </h2>
            <p className="text-[11px] text-zinc-400">
              Sortable production table, priority reordering & batch shop controls
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 transition-all active:scale-95 shadow-[0_0_15px_rgba(74,222,128,0.2)] cursor-pointer">
            <Play className="w-3.5 h-3.5" /> Start Batch (
            {selectedIds.length > 0 ? selectedIds.length : queue.length})
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner text-xs font-medium text-zinc-300 transition-all active:scale-95 cursor-pointer">
            <Pause className="w-3.5 h-3.5" /> Pause Spooler
          </button>
        </div>
      </div>

      {/* Flat Data Table */}
      <div className="flex-1 bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/40 text-zinc-400 font-semibold sticky top-0 z-10 backdrop-blur-xl">
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="hover:text-zinc-100"
                  >
                    {selectedIds.length === queue.length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-2 w-14">Priority</th>
                <th className="py-2.5 px-3">Document</th>
                <th className="py-2.5 px-3">Customer Device</th>
                <th className="py-2.5 px-2">Pages</th>
                <th className="py-2.5 px-2">Size</th>
                <th className="py-2.5 px-3 w-36">Upload Progress</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 w-20 text-center">Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {queue.map((job, idx) => {
                const isSelected = selectedIds.includes(job.id);
                return (
                  <tr
                    key={job.id}
                    className={`hover:bg-zinc-700/20 transition-colors ${
                      isSelected ? "bg-emerald-500/5" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => toggleSelect(job.id)}
                        className="hover:text-zinc-100"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                      </button>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="font-mono text-zinc-400 font-bold">
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-zinc-100 flex items-center gap-2">
                      <img
                        src={getFileIcon(job.fileName)}
                        alt=""
                        className="w-4 h-5 object-contain flex-shrink-0 drop-shadow-sm select-none pointer-events-none"
                      />
                      <span className="truncate max-w-[180px]">
                        {job.fileName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">{job.owner}</td>
                    <td className="py-2.5 px-2 font-mono text-zinc-300">
                      {job.pages}p
                    </td>
                    <td className="py-2.5 px-2 font-mono text-zinc-400 text-[10px]">
                      {job.size}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-black/60 overflow-hidden border border-white/5">
                          <div
                            className="h-full rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]"
                            style={{ width: `${job.uploadProgress}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400">
                          {job.uploadProgress}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          job.status.includes("Ready")
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : job.status.includes("Uploading")
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => movePriority(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 rounded-lg hover:bg-black/40 disabled:opacity-30 transition-colors cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="w-3 h-3 text-zinc-300" />
                        </button>
                        <button
                          onClick={() => movePriority(idx, "down")}
                          disabled={idx === queue.length - 1}
                          className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="w-3 h-3 text-zinc-300" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
