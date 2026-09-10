import React from "react";
import gwenIcon from "@/assets/gwen-app-icon.png";

interface TitleBarProps {
  title?: string;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export default function TitleBar({
  title = "Printio - Digital Drop Box",
  onMinimize,
  onMaximize,
  onClose,
}: TitleBarProps) {
  const handleMinimize = async () => {
    if (onMinimize) {
      onMinimize();
      return;
    }
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch {
      console.log("[Window] Minimize");
    }
  };

  const handleMaximize = async () => {
    if (onMaximize) {
      onMaximize();
      return;
    }
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().toggleMaximize();
    } catch {
      console.log("[Window] Maximize");
    }
  };

  const handleClose = async () => {
    if (onClose) {
      onClose();
      return;
    }
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {
      console.log("[Window] Close");
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="flex h-9 w-full items-center justify-between border-b border-zinc-800/50 bg-[#16171b] px-4 text-xs text-zinc-400 select-none flex-shrink-0"
    >
      <div className="flex items-center gap-2.5 pointer-events-none">
        <img
          src={gwenIcon}
          alt="Printio Logo"
          className="h-4.5 w-4.5 rounded-[5px] object-cover shadow-[0_0_8px_rgba(16,185,129,0.4)]"
        />
        <span className="font-medium text-zinc-300">{title}</span>
      </div>
      <div className="flex items-center gap-3 text-zinc-500">
        <button
          onClick={handleMinimize}
          className="hover:text-zinc-200 cursor-pointer transition-colors p-1"
          title="Minimize"
          aria-label="Minimize"
        >
          ―
        </button>
        <button
          onClick={handleMaximize}
          className="hover:text-zinc-200 cursor-pointer transition-colors p-1"
          title="Maximize"
          aria-label="Maximize"
        >
          □
        </button>
        <button
          onClick={handleClose}
          className="hover:text-red-400 cursor-pointer transition-colors p-1"
          title="Close"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </header>
  );
}
