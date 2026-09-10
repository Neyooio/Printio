import React, { useState } from "react";
import {
  History,
  TrendingUp,
  Coins,
  FileCheck,
  Search,
  RotateCcw,
  Trash2,
  Calendar,
} from "lucide-react";
import { getFileIcon } from "../../lib/fileTypeHelper";

export default function AuditHistoryView() {
  const [query, setQuery] = useState("");

  const historyJobs = [
    {
      id: "hist-101",
      fileName: "Biology_Lab_Final_GroupB.pdf",
      owner: "User #04 · Android",
      pages: 42,
      cost: "$4.20",
      printedAt: "09:22 AM",
      copies: 1,
    },
    {
      id: "hist-102",
      fileName: "Quarterly_Financial_Report_Q3.xlsx",
      owner: "User #11 · Windows",
      pages: 12,
      cost: "$1.80",
      printedAt: "09:40 AM",
      copies: 2,
    },
    {
      id: "hist-103",
      fileName: "Passport_Photo_Sheet_Glossy.pdf",
      owner: "User #07 · iPhone",
      pages: 2,
      cost: "$1.50",
      printedAt: "10:15 AM",
      copies: 1,
    },
    {
      id: "hist-104",
      fileName: "Contract_Lease_Agreement_Signed.pdf",
      owner: "User #15 · MacBook",
      pages: 8,
      cost: "$0.80",
      printedAt: "10:31 AM",
      copies: 1,
    },
  ];

  return (
    <div className="flex-1 h-full flex flex-col gap-3 p-1 min-h-0 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">
              Print History & Audit Log
            </h2>
            <p className="text-[11px] text-zinc-400">
              Daily print volume analytics, revenue accounting & searchable print archives
            </p>
          </div>
        </div>

        {/* Clear Archive */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner text-xs font-medium text-zinc-300 transition-all active:scale-95 cursor-pointer">
          <Trash2 className="w-3.5 h-3.5 text-zinc-400" /> Purge Cache
        </button>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <div className="bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-medium">Pages Printed Today</p>
            <p className="text-lg font-bold text-zinc-100 leading-tight">184 pages</p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-medium">Billed Revenue</p>
            <p className="text-lg font-bold text-zinc-100 leading-tight">$24.80</p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-medium">Active Customers Served</p>
            <p className="text-lg font-bold text-zinc-100 leading-tight">14 clients</p>
          </div>
        </div>
      </div>

      {/* Searchable Archive Log */}
      <div className="flex-1 bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2 bg-black/40">
          <Search className="w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter past jobs by name, customer ID, or timestamp..."
            className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
          />
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-white/5 font-sans text-xs">
          {historyJobs.map((item) => (
            <div
              key={item.id}
              className="p-3 flex items-center justify-between hover:bg-zinc-700/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <img
                  src={getFileIcon(item.fileName)}
                  alt=""
                  className="w-5 h-6 object-contain flex-shrink-0 drop-shadow-sm select-none pointer-events-none"
                />
                <div>
                  <h4 className="font-semibold text-zinc-200">{item.fileName}</h4>
                  <p className="text-[10px] text-zinc-500">
                    {item.owner} · {item.pages} pages · {item.printedAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-zinc-300 font-bold">{item.cost}</span>
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner text-[10px] font-medium text-zinc-300 transition-all active:scale-95 cursor-pointer"
                  title="Re-queue document"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" /> Re-print
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
