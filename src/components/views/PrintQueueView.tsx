import React, { useState, useEffect } from "react";
import {
  Printer,
  Play,
  Pause,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  RotateCw,
  CheckCircle2,
  Trash2,
  AlertCircle,
  FileText,
  Clock,
} from "lucide-react";
import { getFileIcon } from "../../lib/fileTypeHelper";

interface PrintJob {
  id: string;
  priority: number;
  fileName: string;
  owner: string;
  pages: number;
  printedPages: number;
  size: string;
  printProgress: number;
  status: "Printing" | "Ready to Print" | "Queued" | "Paused" | "Printed";
  receivedAt: string;
}

export default function PrintQueueView() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSpoolerPaused, setIsSpoolerPaused] = useState<boolean>(false);

  const [queue, setQueue] = useState<PrintJob[]>([
    {
      id: "job-1",
      priority: 1,
      fileName: "Thesis_Final_Draft.pdf",
      owner: "User #12 · Laptop",
      pages: 34,
      printedPages: 18,
      size: "22.4 MB",
      printProgress: 53,
      status: "Printing",
      receivedAt: "10:45 AM",
    },
    {
      id: "job-2",
      priority: 2,
      fileName: "Lab_Manual_Biology_2026.docx",
      owner: "User #19 · Android",
      pages: 18,
      printedPages: 0,
      size: "14.2 MB",
      printProgress: 0,
      status: "Ready to Print",
      receivedAt: "10:47 AM",
    },
    {
      id: "job-3",
      priority: 3,
      fileName: "Architectural_Blueprints_A3.pdf",
      owner: "User #08 · iPhone",
      pages: 8,
      printedPages: 0,
      size: "42.1 MB",
      printProgress: 0,
      status: "Ready to Print",
      receivedAt: "10:49 AM",
    },
    {
      id: "job-4",
      priority: 4,
      fileName: "Resume_Engineering_Lead.pdf",
      owner: "User #03 · MacBook",
      pages: 2,
      printedPages: 0,
      size: "1.1 MB",
      printProgress: 0,
      status: "Queued",
      receivedAt: "10:50 AM",
    },
    {
      id: "job-5",
      priority: 5,
      fileName: "Financial_Report_Q3.xlsx",
      owner: "User #14 · Windows PC",
      pages: 12,
      printedPages: 0,
      size: "3.8 MB",
      printProgress: 0,
      status: "Queued",
      receivedAt: "10:52 AM",
    },
    {
      id: "job-6",
      priority: 6,
      fileName: "Product_Catalog_2026.pdf",
      owner: "User #22 · iPad Pro",
      pages: 24,
      printedPages: 24,
      size: "19.5 MB",
      printProgress: 100,
      status: "Printed",
      receivedAt: "10:30 AM",
    },
  ]);

  // Live simulation: advance print progress on active "Printing" job
  useEffect(() => {
    if (isSpoolerPaused) return;

    const interval = setInterval(() => {
      setQueue((prev) =>
        prev.map((job) => {
          if (job.status === "Printing") {
            const nextProgress = Math.min(100, job.printProgress + 4);
            const nextPages = Math.min(
              job.pages,
              Math.ceil((nextProgress / 100) * job.pages)
            );
            if (nextProgress >= 100) {
              return {
                ...job,
                printProgress: 100,
                printedPages: job.pages,
                status: "Printed",
              };
            }
            return {
              ...job,
              printProgress: nextProgress,
              printedPages: nextPages,
            };
          }
          return job;
        })
      );
    }, 1200);

    return () => clearInterval(interval);
  }, [isSpoolerPaused]);

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

  const handleToggleJobPrint = (jobId: string) => {
    setQueue((prev) =>
      prev.map((job) => {
        if (job.id === jobId) {
          if (job.status === "Printing") {
            return { ...job, status: "Paused" };
          }
          if (job.status === "Paused" || job.status === "Ready to Print" || job.status === "Queued") {
            return { ...job, status: "Printing" };
          }
        }
        return job;
      })
    );
  };

  const handleStartBatch = () => {
    setQueue((prev) =>
      prev.map((job) => {
        const isTarget =
          selectedIds.length > 0 ? selectedIds.includes(job.id) : job.status === "Ready to Print" || job.status === "Queued";
        if (isTarget && job.status !== "Printed") {
          return { ...job, status: "Printing" };
        }
        return job;
      })
    );
  };

  const handleDeleteJob = (jobId: string) => {
    setQueue((prev) => prev.filter((j) => j.id !== jobId));
    setSelectedIds((prev) => prev.filter((id) => id !== jobId));
  };

  const activeJobsCount = queue.filter((j) => j.status !== "Printed").length;

  return (
    <div className="flex-1 h-full flex flex-col gap-3 p-1 min-h-0 select-none overflow-hidden font-sans">
      {/* ─── Top Header & Spooler Controls ─── */}
      <div className="flex items-center justify-between bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
            <Printer className="w-4 h-4" />
            <span
              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${
                isSpoolerPaused
                  ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                  : "bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse"
              }`}
            />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              Incoming Print Queue
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold font-mono">
                {activeJobsCount} Active Jobs
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">
              Print job spooler manager, live printing status & priority dispatch
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartBatch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-semibold text-emerald-300 transition-all active:scale-95 shadow-[0_0_15px_rgba(74,222,128,0.25)] cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Start Batch (
            {selectedIds.length > 0 ? selectedIds.length : activeJobsCount})
          </button>
          <button
            onClick={() => setIsSpoolerPaused((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all active:scale-95 cursor-pointer ${
              isSpoolerPaused
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]"
                : "bg-black/40 hover:bg-black/60 border-white/5 border-t-black/60 shadow-inner text-zinc-300"
            }`}
          >
            {isSpoolerPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-amber-400" /> Resume Spooler
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-zinc-400" /> Pause Spooler
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Print Job Manager Table ─── */}
      <div className="flex-1 bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/40 text-zinc-400 font-semibold sticky top-0 z-10 backdrop-blur-xl">
                <th className="py-2.5 px-3 w-10 text-center">
                  <button onClick={toggleSelectAll} className="hover:text-zinc-100 cursor-pointer">
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
                <th className="py-2.5 px-3 w-44">Print Progress</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 w-20 text-center">Order</th>
                <th className="py-2.5 px-3 w-20 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {queue.map((job, idx) => {
                const isSelected = selectedIds.includes(job.id);
                const isPrinting = job.status === "Printing";
                const isPaused = job.status === "Paused";
                const isPrinted = job.status === "Printed";

                return (
                  <tr
                    key={job.id}
                    className={`hover:bg-zinc-700/20 transition-colors ${
                      isSelected ? "bg-emerald-500/5" : ""
                    } ${isPrinted ? "opacity-60" : ""}`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => toggleSelect(job.id)}
                        className="hover:text-zinc-100 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                      </button>
                    </td>

                    {/* Priority */}
                    <td className="py-2.5 px-2">
                      <span className="font-mono text-zinc-400 font-bold">
                        #{idx + 1}
                      </span>
                    </td>

                    {/* Document */}
                    <td className="py-2.5 px-3 font-semibold text-zinc-100">
                      <div className="flex items-center gap-2">
                        <img
                          src={getFileIcon(job.fileName)}
                          alt=""
                          className="w-4 h-5 object-contain flex-shrink-0 drop-shadow-sm select-none pointer-events-none"
                        />
                        <span className="truncate max-w-[200px]" title={job.fileName}>
                          {job.fileName}
                        </span>
                      </div>
                    </td>

                    {/* Customer Device */}
                    <td className="py-2.5 px-3 text-zinc-300">{job.owner}</td>

                    {/* Pages */}
                    <td className="py-2.5 px-2 font-mono text-zinc-300">
                      {isPrinting ? (
                        <span className="text-emerald-400 font-bold">
                          {job.printedPages}/{job.pages}p
                        </span>
                      ) : (
                        `${job.pages}p`
                      )}
                    </td>

                    {/* Size */}
                    <td className="py-2.5 px-2 font-mono text-zinc-400 text-[10px]">
                      {job.size}
                    </td>

                    {/* Print Progress Bar */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-black/60 overflow-hidden border border-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isPrinted
                                ? "bg-zinc-500"
                                : isPaused
                                ? "bg-amber-400"
                                : "bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"
                            }`}
                            style={{
                              width: isPrinted
                                ? "100%"
                                : `${job.printProgress}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400 w-9 text-right">
                          {isPrinted
                            ? "100%"
                            : `${job.printProgress}%`}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          isPrinting
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(74,222,128,0.25)] animate-pulse"
                            : isPaused
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : isPrinted
                            ? "bg-zinc-800/80 border-zinc-700/60 text-zinc-400"
                            : job.status === "Ready to Print"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {isPrinting && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        )}
                        {job.status}
                      </span>
                    </td>

                    {/* Priority Order Buttons */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => movePriority(idx, "up")}
                          disabled={idx === 0 || isPrinted}
                          className="p-1 rounded-lg hover:bg-black/40 disabled:opacity-20 transition-colors cursor-pointer text-zinc-300 hover:text-white"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => movePriority(idx, "down")}
                          disabled={idx === queue.length - 1 || isPrinted}
                          className="p-1 rounded-lg hover:bg-black/40 disabled:opacity-20 transition-colors cursor-pointer text-zinc-300 hover:text-white"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Action Controls */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {!isPrinted ? (
                          <button
                            onClick={() => handleToggleJobPrint(job.id)}
                            className={`p-1 rounded-lg border transition-all cursor-pointer ${
                              isPrinting
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                            }`}
                            title={isPrinting ? "Pause Job" : "Print Job"}
                          >
                            {isPrinting ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3 fill-current" />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setQueue((prev) =>
                                prev.map((j) =>
                                  j.id === job.id
                                    ? { ...j, status: "Ready to Print", printProgress: 0, printedPages: 0 }
                                    : j
                                )
                              )
                            }
                            className="p-1 rounded-lg border bg-zinc-800/80 border-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                            title="Reprint"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-1 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Cancel Job"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ─── Bottom Print Job Manager Status Strip ─── */}
        <div className="px-5 py-2.5 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400 font-medium flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Printer: <strong>Canon imageRUNNER C5535i</strong></span>
            </span>
            <span>•</span>
            <span>Port: <strong className="font-mono text-zinc-300">RAW 9100</strong></span>
            <span>•</span>
            <span>Status: <strong className="text-emerald-400">Ready</strong></span>
          </div>

          <div className="flex items-center gap-4">
            <span>
              Queue: <strong className="text-zinc-200">{activeJobsCount}</strong> active jobs
            </span>
            <span>•</span>
            <span>
              Total:{" "}
              <strong className="text-zinc-200 font-mono">
                {queue.reduce((acc, cur) => acc + (cur.status !== "Printed" ? cur.pages : 0), 0)}
              </strong>{" "}
              pages queued
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
