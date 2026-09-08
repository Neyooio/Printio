import React, { useState } from "react";
import {
  MonitorSmartphone,
  Wifi,
  Smartphone,
  Laptop,
  UserX,
  Printer,
  ShieldCheck,
  Signal,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { SessionInfo } from "../../lib/commands";

interface DeviceManagerViewProps {
  sessions: SessionInfo[];
  onKick?: (sessionId: string) => void;
  onBatchPrint?: (sessionId: string) => void;
}

export default function DeviceManagerView({
  sessions,
  onKick,
  onBatchPrint,
}: DeviceManagerViewProps) {
  const [filter, setFilter] = useState("");

  const devices = [
    {
      id: "sess-laptop",
      name: "User #12 · ThinkPad X1",
      deviceType: "Windows 11",
      icon: Laptop,
      ip: "192.168.137.112",
      mac: "D4:5D:64:89:12:F0",
      signal: "-48 dBm (Excellent)",
      signalLevel: 4,
      lease: "01h 14m remaining",
      files: 3,
      status: "Uploading",
      permissions: "Read / Write",
    },
    {
      id: "sess-iphone",
      name: "User #08 · iPhone 15 Pro",
      deviceType: "iOS 17.4",
      icon: Smartphone,
      ip: "192.168.137.45",
      mac: "F2:88:91:02:44:A1",
      signal: "-54 dBm (Good)",
      signalLevel: 3,
      lease: "02h 45m remaining",
      files: 1,
      status: "Idle",
      permissions: "Read Only",
    },
    {
      id: "sess-android",
      name: "User #19 · Galaxy S24 Ultra",
      deviceType: "Android 14",
      icon: Smartphone,
      ip: "192.168.137.82",
      mac: "A0:C9:A0:55:18:7E",
      signal: "-62 dBm (Moderate)",
      signalLevel: 2,
      lease: "00h 32m remaining",
      files: 2,
      status: "Transferring",
      permissions: "Read / Write",
    },
  ];

  return (
    <div className="flex-1 h-full flex flex-col gap-3 p-1 min-h-0 select-none overflow-hidden font-sans">
      {/* View Header */}
      <div className="flex items-center justify-between bg-zinc-800/30 border border-zinc-700/30 rounded-2xl px-5 py-3 shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MonitorSmartphone className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">
              Session & Device Manager
            </h2>
            <p className="text-[11px] text-zinc-400">
              Active Wi-Fi hardware leases, client signal health & customer permissions
            </p>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 flex items-center gap-1.5 font-medium">
            <Wifi className="w-3 h-3 text-emerald-400" /> 3 Leases Active
          </span>
          <span className="px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3 h-3 text-sky-400" /> AP Isolation ON
          </span>
        </div>
      </div>

      {/* Main Device Grid Cards */}
      <div className="flex-1 grid grid-cols-3 gap-2.5 min-h-0 overflow-y-auto overflow-x-hidden">
        {devices.map((d) => {
          const Icon = d.icon;
          return (
            <div
              key={d.id}
              className="bg-zinc-800/30 border border-zinc-700/30 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg hover:border-zinc-600/50 transition-all min-w-0"
            >
              {/* Card Top */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-200 shadow-sm">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-100 truncate max-w-[150px]">
                        {d.name}
                      </h3>
                      <p className="text-[10px] text-zinc-400">{d.deviceType}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-bold text-emerald-300">
                    {d.status}
                  </span>
                </div>

                {/* Tech Specs */}
                <div className="space-y-1.5 text-[11px] bg-zinc-900/40 rounded-xl p-3 border border-zinc-800/60">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-medium">IP Address</span>
                    <span className="font-mono text-zinc-300">{d.ip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-medium">MAC ID</span>
                    <span className="font-mono text-zinc-400 text-[10px]">{d.mac}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-medium">Signal (RSSI)</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Signal className="w-3 h-3" /> {d.signal}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-medium">Lease Expire</span>
                    <span className="text-zinc-300">{d.lease}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-zinc-700/30 mt-3">
                <button
                  onClick={() => onBatchPrint?.(d.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300 transition-all active:scale-95 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Batch Print
                </button>
                <button
                  onClick={() => onKick?.(d.id)}
                  className="flex items-center justify-center p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-all active:scale-95"
                  title="Kick / Disconnect"
                >
                  <UserX className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
