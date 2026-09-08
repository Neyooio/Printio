import React from "react";
import { Smartphone, Laptop } from "lucide-react";
import { SessionInfo } from "../lib/commands";

interface CustomerQueueProps {
  sessions?: SessionInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function CustomerQueue({
  sessions = [],
  selectedId,
  onSelect,
}: CustomerQueueProps) {
  // Use session list or fallback to canonical 3 items
  const displaySessions =
    sessions.length > 0
      ? sessions.slice(0, 3)
      : [
          {
            id: "sess-iphone",
            ip_address: "192.168.137.45",
            device_name: "iPhone",
            device_type: "iphone",
            connected_at: "10:42 AM",
            last_activity: "10:44 AM",
            status: "active" as const,
            files_count: 1,
            is_pulsing: false,
          },
          {
            id: "sess-android",
            ip_address: "192.168.137.82",
            device_name: "Android",
            device_type: "android",
            connected_at: "10:43 AM",
            last_activity: "10:45 AM",
            status: "active" as const,
            files_count: 2,
            is_pulsing: true,
          },
          {
            id: "sess-laptop",
            ip_address: "192.168.137.112",
            device_name: "User #12 · Laptop",
            device_type: "laptop",
            connected_at: "10:40 AM",
            last_activity: "10:46 AM",
            status: "active" as const,
            files_count: 1,
            is_pulsing: false,
          },
        ];

  return (
    <div className="flex-1 flex flex-col justify-between rounded-[24px] bg-zinc-800/30 border border-zinc-700/30 p-3.5 shadow-xl select-none">
      <span className="text-xs font-semibold tracking-wide text-zinc-300">
        Active Customer Queue
      </span>

      <div className="flex flex-col gap-2 my-auto">
        {displaySessions.map((session) => {
          const isSelected = selectedId === session.id;
          const isAndroid =
            session.device_type === "android" ||
            session.device_name?.toLowerCase().includes("android");
          const isLaptop =
            session.device_type === "laptop" ||
            session.device_name?.toLowerCase().includes("laptop") ||
            session.device_name?.toLowerCase().includes("user #12");
          const isPulsing = session.is_pulsing;

          if (isSelected) {
            return (
              <div
                key={session.id}
                onClick={() => onSelect(session.id)}
                className="flex items-center justify-between rounded-xl bg-zinc-200 text-zinc-900 p-2.5 shadow-md cursor-pointer transition-all active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-zinc-900" />
                  <div>
                    <p className="text-[11px] font-bold leading-tight">
                      {session.device_name || session.ip_address}
                    </p>
                    <p className="text-[9px] text-zinc-600 font-medium">
                      (Connected)
                    </p>
                  </div>
                </div>
                <span className="h-2 w-2 rounded-full bg-zinc-700" />
              </div>
            );
          }

          if (isPulsing || isAndroid) {
            return (
              <div
                key={session.id}
                onClick={() => onSelect(session.id)}
                className="flex items-center justify-between rounded-xl bg-zinc-700/30 border border-zinc-600/20 p-2.5 cursor-pointer hover:bg-zinc-700/50 transition-all active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-[11px] font-medium text-zinc-200 leading-tight">
                      {session.device_name || session.ip_address}
                    </p>
                    <p className="text-[9px] text-amber-400 font-medium">
                      Pulsing amber
                    </p>
                  </div>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-amber-500/20 animate-pulse shadow-[0_0_8px_#f59e0b]" />
              </div>
            );
          }

          return (
            <div
              key={session.id}
              onClick={() => onSelect(session.id)}
              className="flex items-center justify-between rounded-xl bg-zinc-700/30 border border-zinc-600/20 p-2.5 cursor-pointer hover:bg-zinc-700/50 transition-all active:scale-98"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-[11px] font-medium text-zinc-200 leading-tight">
                    {session.device_name || session.ip_address}
                  </p>
                  <p className="text-[9px] text-zinc-500 font-medium">
                    (Connected)
                  </p>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
