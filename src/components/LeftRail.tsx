import React from "react";
import {
  Sparkles,
  HardDrive,
  MonitorSmartphone,
  Printer,
  LayoutDashboard,
  History,
  Settings2,
} from "lucide-react";

interface LeftRailProps {
  activeTab?: number;
  onTabChange?: (tab: number) => void;
  serverRunning?: boolean;
  onToggleServer?: () => void;
}

export default function LeftRail({
  activeTab = 2, // Dot 3 (index 2) is the Main Dashboard by default
  onTabChange,
  serverRunning = true,
  onToggleServer,
}: LeftRailProps) {
  const tabs = [
    {
      index: 0,
      title: "Dot 1 · Session & Device Manager",
      icon: MonitorSmartphone,
      isMiddle: false,
    },
    {
      index: 1,
      title: "Dot 2 · Incoming Print Queue",
      icon: Printer,
      isMiddle: false,
    },
    {
      index: 2,
      title: "Dot 3 (Active) · Main Dashboard",
      icon: LayoutDashboard,
      isMiddle: true, // Middle one is bigger than the rest
    },
    {
      index: 3,
      title: "Dot 4 · Print History & Audit Log",
      icon: History,
      isMiddle: false,
    },
    {
      index: 4,
      title: "Dot 5 · Network & System Settings",
      icon: Settings2,
      isMiddle: false,
    },
  ];

  return (
    <aside className="w-16 flex flex-col items-center justify-between flex-shrink-0 h-full select-none py-1">
      {/* Top: Brand icon with active green hotspot indicator dot */}
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/60 border border-zinc-700/40 shadow-inner">
        <Sparkles className="h-5 w-5 text-zinc-200" />
        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#121316] shadow-[0_0_8px_#10b981]" />
      </div>

      {/* Center: Floating vertical capsule containing the 5 navigation dots */}
      <div className="flex flex-col items-center gap-4 rounded-full bg-[#181920] border border-zinc-700/60 px-2 py-6 shadow-2xl my-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.index;
          const isMiddle = tab.isMiddle;

          if (isMiddle) {
            // Middle one (Dot 3 · Main Dashboard): visibly larger than the rest
            return (
              <button
                key={tab.index}
                onClick={() => onTabChange?.(tab.index)}
                className={`relative flex items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "w-11 h-11 bg-emerald-400 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.8)] ring-4 ring-emerald-500/20 scale-105 font-bold"
                    : "w-11 h-11 bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700/90 border border-zinc-600/50 hover:scale-105"
                }`}
                title={tab.title}
                aria-label={tab.title}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
                {isActive && (
                  <span className="absolute -right-0.5 -top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm ring-2 ring-emerald-500" />
                )}
              </button>
            );
          }

          // Consistent non-middle buttons
          return (
            <button
              key={tab.index}
              onClick={() => onTabChange?.(tab.index)}
              className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-emerald-400 text-zinc-950 ring-4 ring-emerald-500/20 shadow-[0_0_12px_#10b981] scale-105"
                  : "bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 border border-zinc-700/30 hover:scale-105"
              }`}
              title={tab.title}
              aria-label={tab.title}
            >
              <Icon className="w-4 h-4 stroke-[1.8]" />
            </button>
          );
        })}
      </div>

      {/* Bottom: Hardware storage icon styled in subtle amber */}
      <div
        onClick={onToggleServer}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
        title={
          serverRunning ? "Captive Portal Active" : "Captive Portal Paused"
        }
      >
        <HardDrive className="h-4 w-4" />
      </div>
    </aside>
  );
}
