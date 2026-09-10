import React, { useState } from "react";
import {
  Printer,
  Play,
  Pause,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Layers,
  Sliders,
  DollarSign,
  Zap,
  Clock,
  Sparkles,
  Square,
  CheckSquare,
  HardDrive,
  Copy,
  ChevronRight,
  FileCheck,
} from "lucide-react";
import { getFileIcon } from "../../lib/fileTypeHelper";

interface PrintJob {
  id: string;
  priority: number;
  fileName: string;
  owner: string;
  totalPages: number;
  bwPages: number;
  colorPages: number;
  size: string;
  status: "Ready to Print" | "Printing" | "Queued" | "On Hold";
  targetPrinter: string;
  paperSize: "A4 (80gsm)" | "Letter" | "Legal" | "A3 Tabloid";
  colorMode: "Mixed Auto-Detect" | "Pure B&W" | "Full Color";
  duplex: "Duplex (Long Edge)" | "1-Sided (Simplex)" | "Duplex (Short Edge)";
  copies: number;
  basePricePerPageBw: number;
  basePricePerPageColor: number;
  receivedAt: string;
  printProgress?: number;
}

export default function PrintQueueView() {
  const [isSpoolerPaused, setIsSpoolerPaused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "ready" | "printing" | "held">("all");
  const [selectedJobId, setSelectedJobId] = useState<string>("job-1");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Hardware status
  const [selectedPrinter, setSelectedPrinter] = useState<string>("Canon imageRUNNER C5535i");

  const [queue, setQueue] = useState<PrintJob[]>([
    {
      id: "job-1",
      priority: 1,
      fileName: "Thesis_Final_Draft.pdf",
      owner: "User #12 · Laptop",
      totalPages: 34,
      bwPages: 28,
      colorPages: 6,
      size: "22.4 MB",
      status: "Ready to Print",
      targetPrinter: "Canon imageRUNNER C5535i",
      paperSize: "A4 (80gsm)",
      colorMode: "Mixed Auto-Detect",
      duplex: "Duplex (Long Edge)",
      copies: 1,
      basePricePerPageBw: 0.05,
      basePricePerPageColor: 0.35,
      receivedAt: "10:45 AM",
      printProgress: 0,
    },
    {
      id: "job-2",
      priority: 2,
      fileName: "Lab_Manual_Biology_2026.docx",
      owner: "User #19 · Android",
      totalPages: 18,
      bwPages: 12,
      colorPages: 6,
      size: "14.2 MB",
      status: "Printing",
      targetPrinter: "Canon imageRUNNER C5535i",
      paperSize: "A4 (80gsm)",
      colorMode: "Full Color",
      duplex: "Duplex (Long Edge)",
      copies: 2,
      basePricePerPageBw: 0.05,
      basePricePerPageColor: 0.35,
      receivedAt: "10:47 AM",
      printProgress: 56,
    },
    {
      id: "job-3",
      priority: 3,
      fileName: "Architectural_Blueprints_A3.pdf",
      owner: "User #08 · iPhone",
      totalPages: 8,
      bwPages: 0,
      colorPages: 8,
      size: "42.1 MB",
      status: "Ready to Print",
      targetPrinter: "Epson SureColor T3170 (Plotter)",
      paperSize: "A3 Tabloid",
      colorMode: "Full Color",
      duplex: "1-Sided (Simplex)",
      copies: 1,
      basePricePerPageBw: 0.1,
      basePricePerPageColor: 1.2,
      receivedAt: "10:49 AM",
      printProgress: 0,
    },
    {
      id: "job-4",
      priority: 4,
      fileName: "Resume_Engineering_Lead.pdf",
      owner: "User #03 · MacBook",
      totalPages: 2,
      bwPages: 2,
      colorPages: 0,
      size: "1.1 MB",
      status: "Queued",
      targetPrinter: "HP LaserJet M608 (Mono)",
      paperSize: "Letter",
      colorMode: "Pure B&W",
      duplex: "1-Sided (Simplex)",
      copies: 3,
      basePricePerPageBw: 0.05,
      basePricePerPageColor: 0.35,
      receivedAt: "10:50 AM",
      printProgress: 0,
    },
    {
      id: "job-5",
      priority: 5,
      fileName: "Financial_Report_Q3_Spreadsheet.xlsx",
      owner: "User #14 · Windows PC",
      totalPages: 12,
      bwPages: 10,
      colorPages: 2,
      size: "3.8 MB",
      status: "On Hold",
      targetPrinter: "Canon imageRUNNER C5535i",
      paperSize: "A4 (80gsm)",
      colorMode: "Mixed Auto-Detect",
      duplex: "Duplex (Long Edge)",
      copies: 1,
      basePricePerPageBw: 0.05,
      basePricePerPageColor: 0.35,
      receivedAt: "10:52 AM",
      printProgress: 0,
    },
  ]);

  const activeJob = queue.find((j) => j.id === selectedJobId) || queue[0];

  // Price calculation
  const calculateJobTotal = (job: PrintJob) => {
    let singleCopyPrice = 0;
    if (job.colorMode === "Pure B&W") {
      singleCopyPrice = job.totalPages * job.basePricePerPageBw;
    } else if (job.colorMode === "Full Color") {
      singleCopyPrice = job.totalPages * job.basePricePerPageColor;
    } else {
      singleCopyPrice =
        job.bwPages * job.basePricePerPageBw + job.colorPages * job.basePricePerPageColor;
    }
    return (singleCopyPrice * job.copies).toFixed(2);
  };

  const updateActiveJob = (partial: Partial<PrintJob>) => {
    if (!activeJob) return;
    setQueue((prev) =>
      prev.map((item) => (item.id === activeJob.id ? { ...item, ...partial } : item))
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredQueue.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQueue.map((q) => q.id));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const movePriority = (index: number, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= queue.length) return;
    const newQueue = [...queue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[target];
    newQueue[target] = temp;
    setQueue(newQueue);
  };

  const handleStartPrint = (jobId: string) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === jobId) {
          return { ...item, status: "Printing", printProgress: 10 };
        }
        return item;
      })
    );
  };

  const handleHoldJob = (jobId: string) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === jobId) {
          const nextStatus = item.status === "On Hold" ? "Ready to Print" : "On Hold";
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const filteredQueue = queue.filter((j) => {
    if (activeFilter === "ready") return j.status === "Ready to Print";
    if (activeFilter === "printing") return j.status === "Printing";
    if (activeFilter === "held") return j.status === "On Hold";
    return true;
  });

  return (
    <div className="flex-1 h-full flex flex-col gap-2.5 p-1 min-h-0 select-none overflow-hidden font-sans">
      {/* ─── Top Telemetry & Control Bar ─── */}
      <div className="grid grid-cols-12 gap-2.5 flex-shrink-0">
        {/* Hardware Status Tile */}
        <div className="col-span-8 flex items-center justify-between bg-gradient-to-b from-zinc-800/70 to-zinc-900/90 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <Printer className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#181920] shadow-[0_0_8px_#10b981]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-100">{selectedPrinter}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Online • RAW 9100
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-zinc-400 mt-0.5 font-medium">
                <span>Tray 1: A4 (85%)</span>
                <span>•</span>
                <span>Tray 2: Legal (60%)</span>
                <span>•</span>
                <span>Toner: C:76% M:82% Y:64% K:88%</span>
              </div>
            </div>
          </div>

          {/* Quick printer selector */}
          <select
            value={selectedPrinter}
            onChange={(e) => setSelectedPrinter(e.target.value)}
            className="bg-black/40 border border-white/10 text-zinc-300 text-[11px] rounded-xl px-2.5 py-1.5 outline-none cursor-pointer hover:border-emerald-500/40 transition-colors"
          >
            <option value="Canon imageRUNNER C5535i">Canon C5535i (Color Laser)</option>
            <option value="HP LaserJet M608 (Mono)">HP M608 (High-Speed Mono)</option>
            <option value="Epson SureColor T3170 (Plotter)">Epson SureColor (Plotter)</option>
          </select>
        </div>

        {/* Spooler Control Tile */}
        <div className="col-span-4 flex items-center justify-between bg-gradient-to-b from-zinc-800/70 to-zinc-900/90 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSpoolerPaused
                  ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                  : "bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse"
              }`}
            />
            <div>
              <div className="text-xs font-bold text-zinc-200">
                {isSpoolerPaused ? "Spooler Paused" : "Spooler Active"}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                {queue.length} Jobs Queued
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSpoolerPaused((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                isSpoolerPaused
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-zinc-800/80 border-white/5 text-zinc-300 hover:bg-zinc-700/80"
              }`}
            >
              {isSpoolerPaused ? (
                <>
                  <Play className="w-3 h-3 text-emerald-400" /> Resume
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 text-zinc-400" /> Pause
                </>
              )}
            </button>
            <button
              onClick={() => {
                setQueue((prev) =>
                  prev.map((j) =>
                    j.status === "Ready to Print" ? { ...j, status: "Printing", printProgress: 15 } : j
                  )
                );
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[11px] shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" /> Batch Print
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Production Studio (Split View) ─── */}
      <div className="flex-1 grid grid-cols-12 gap-2.5 min-h-0 overflow-hidden">
        {/* Left Column (7 Cols): Production Queue List */}
        <div className="col-span-7 bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-2xl flex flex-col min-h-0 overflow-hidden">
          {/* Filter Pill Tabs & Bulk Counter */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/30 flex-shrink-0">
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/5">
              {(
                [
                  { key: "all", label: "All Jobs", count: queue.length },
                  {
                    key: "ready",
                    label: "Ready",
                    count: queue.filter((j) => j.status === "Ready to Print").length,
                  },
                  {
                    key: "printing",
                    label: "Printing",
                    count: queue.filter((j) => j.status === "Printing").length,
                  },
                  {
                    key: "held",
                    label: "Held",
                    count: queue.filter((j) => j.status === "On Hold").length,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    activeFilter === tab.key
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                {selectedIds.length === filteredQueue.length && filteredQueue.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-zinc-500" />
                )}
                <span>Select All</span>
              </button>
            </div>
          </div>

          {/* Job List Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 min-h-0">
            {filteredQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-12 gap-2">
                <FileCheck className="w-8 h-8 text-zinc-600" />
                <span className="text-xs">No jobs in this category</span>
              </div>
            ) : (
              filteredQueue.map((job, idx) => {
                const isSelected = selectedJobId === job.id;
                const isChecked = selectedIds.includes(job.id);
                const isPrinting = job.status === "Printing";

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "bg-emerald-500/10 border-l-2 border-emerald-400"
                        : "hover:bg-zinc-800/40"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => toggleSelect(job.id, e)}
                      className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-zinc-600" />
                      )}
                    </button>

                    {/* Priority order badge */}
                    <span className="font-mono text-[10px] font-bold text-zinc-400 w-5 text-center flex-shrink-0">
                      #{job.priority}
                    </span>

                    {/* File Icon */}
                    <img
                      src={getFileIcon(job.fileName)}
                      alt=""
                      className="w-5 h-6 object-contain flex-shrink-0 drop-shadow-sm pointer-events-none"
                    />

                    {/* Job Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100 truncate">
                          {job.fileName}
                        </span>
                        {job.copies > 1 && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[9px] font-mono font-bold text-zinc-300 border border-white/5">
                            {job.copies}x
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                        <span className="text-zinc-300">{job.owner}</span>
                        <span>•</span>
                        <span className="font-mono">{job.totalPages} pages</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold font-mono">
                          ${calculateJobTotal(job)}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill & Progress */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          isPrinting
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(74,222,128,0.25)] animate-pulse"
                            : job.status === "Ready to Print"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : job.status === "On Hold"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {isPrinting ? `Printing (${job.printProgress}%)` : job.status}
                      </span>
                      {isPrinting && (
                        <div className="w-20 h-1 bg-black/60 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-300 shadow-[0_0_8px_#10b981]"
                            style={{ width: `${job.printProgress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Reorder Arrows */}
                    <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                      <button
                        onClick={(e) => movePriority(idx, "up", e)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-black/40 disabled:opacity-20 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Move Up in Queue"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => movePriority(idx, "down", e)}
                        disabled={idx === queue.length - 1}
                        className="p-1 rounded hover:bg-black/40 disabled:opacity-20 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Move Down in Queue"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Summary Strip */}
          <div className="px-4 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
            <div className="flex items-center gap-3">
              <span>
                Total: <strong className="text-zinc-200">{queue.length}</strong> jobs
              </span>
              <span>•</span>
              <span>
                Total Pages:{" "}
                <strong className="text-zinc-200">
                  {queue.reduce((acc, cur) => acc + cur.totalPages * cur.copies, 0)}
                </strong>
              </span>
            </div>
            <div className="text-emerald-400 font-bold font-mono">
              Est. Value: $
              {queue
                .reduce((acc, cur) => acc + parseFloat(calculateJobTotal(cur)), 0)
                .toFixed(2)}
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Live Job Ticket & Production Inspector */}
        <div className="col-span-5 bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-2xl flex flex-col min-h-0 overflow-hidden">
          {activeJob ? (
            <div className="flex-1 flex flex-col justify-between p-4 min-h-0 overflow-y-auto gap-3">
              {/* Header Info */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase font-mono">
                    Production Job Ticket · #{activeJob.priority}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Received {activeJob.receivedAt}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-zinc-100 truncate">
                  {activeJob.fileName}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Client: <span className="text-zinc-200 font-medium">{activeJob.owner}</span>
                </p>
              </div>

              {/* Page & Color Composition Bento */}
              <div className="grid grid-cols-3 gap-2 bg-black/40 border border-white/5 rounded-xl p-2.5">
                <div className="text-center">
                  <div className="text-[10px] text-zinc-400">Total Pages</div>
                  <div className="text-sm font-bold text-zinc-100 font-mono">
                    {activeJob.totalPages}p
                  </div>
                </div>
                <div className="text-center border-x border-white/5">
                  <div className="text-[10px] text-zinc-400">B&W Pages</div>
                  <div className="text-sm font-bold text-zinc-300 font-mono">
                    {activeJob.bwPages}p
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-zinc-400">Color Pages</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    {activeJob.colorPages}p
                  </div>
                </div>
              </div>

              {/* Configuration Controls */}
              <div className="space-y-2.5 bg-black/30 border border-white/5 rounded-xl p-3 text-xs">
                {/* Destination Printer */}
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                    Destination Hardware
                  </label>
                  <select
                    value={activeJob.targetPrinter}
                    onChange={(e) => updateActiveJob({ targetPrinter: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs outline-none hover:border-emerald-500/40 transition-colors"
                  >
                    <option value="Canon imageRUNNER C5535i">Canon imageRUNNER C5535i (Color Laser)</option>
                    <option value="HP LaserJet M608 (Mono)">HP LaserJet M608 (High-Speed Mono)</option>
                    <option value="Epson SureColor T3170 (Plotter)">Epson SureColor T3170 (Plotter)</option>
                  </select>
                </div>

                {/* Paper Size & Color Mode */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                      Paper Media
                    </label>
                    <select
                      value={activeJob.paperSize}
                      onChange={(e) =>
                        updateActiveJob({ paperSize: e.target.value as PrintJob["paperSize"] })
                      }
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-zinc-200 text-[11px] outline-none hover:border-emerald-500/40"
                    >
                      <option value="A4 (80gsm)">A4 (80gsm)</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                      <option value="A3 Tabloid">A3 Tabloid</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                      Color Mode
                    </label>
                    <select
                      value={activeJob.colorMode}
                      onChange={(e) =>
                        updateActiveJob({ colorMode: e.target.value as PrintJob["colorMode"] })
                      }
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-zinc-200 text-[11px] outline-none hover:border-emerald-500/40"
                    >
                      <option value="Mixed Auto-Detect">Mixed Auto-Detect</option>
                      <option value="Pure B&W">Pure B&W (Economical)</option>
                      <option value="Full Color">Full Color (Vibrant)</option>
                    </select>
                  </div>
                </div>

                {/* Duplex & Copies Stepper */}
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                      Sides
                    </label>
                    <select
                      value={activeJob.duplex}
                      onChange={(e) =>
                        updateActiveJob({ duplex: e.target.value as PrintJob["duplex"] })
                      }
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-zinc-200 text-[11px] outline-none hover:border-emerald-500/40"
                    >
                      <option value="Duplex (Long Edge)">2-Sided (Long Edge)</option>
                      <option value="1-Sided (Simplex)">1-Sided (Simplex)</option>
                      <option value="Duplex (Short Edge)">2-Sided (Short Edge)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                      Copies
                    </label>
                    <div className="flex items-center bg-black/60 border border-white/10 rounded-lg px-2 py-0.5">
                      <button
                        onClick={() =>
                          updateActiveJob({ copies: Math.max(1, activeJob.copies - 1) })
                        }
                        className="px-2 py-1 text-zinc-400 hover:text-white font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-mono font-bold text-zinc-100">
                        {activeJob.copies}
                      </span>
                      <button
                        onClick={() => updateActiveJob({ copies: activeJob.copies + 1 })}
                        className="px-2 py-1 text-zinc-400 hover:text-white font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Calculation Card */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold text-emerald-400/80">
                    Calculated Job Quote
                  </div>
                  <div className="text-xs text-zinc-300 mt-0.5">
                    {activeJob.totalPages * activeJob.copies} total pages printed
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-emerald-400 font-mono leading-none">
                    ${calculateJobTotal(activeJob)}
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono mt-0.5">
                    Tax incl.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleStartPrint(activeJob.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-zinc-950 font-bold text-xs shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Printer className="w-4 h-4 fill-current" />
                  <span>Direct Spool to Printer</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleHoldJob(activeJob.id)}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-zinc-300 text-[11px] font-medium transition-all active:scale-95 cursor-pointer"
                  >
                    <Pause className="w-3 h-3 text-amber-400" />
                    <span>{activeJob.status === "On Hold" ? "Release Hold" : "Hold Job"}</span>
                  </button>

                  <button
                    onClick={() => {
                      alert(`Test proof generated for ${activeJob.fileName}`);
                    }}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-zinc-300 text-[11px] font-medium transition-all active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Print Proof</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
              Select a job to inspect production ticket
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
