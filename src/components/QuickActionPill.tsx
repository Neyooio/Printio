import React, { useState } from "react";

interface QuickActionPillProps {
  onAddManualFile?: () => void;
  onSearch?: (query: string) => void;
}

export default function QuickActionPill({
  onAddManualFile,
  onSearch,
}: QuickActionPillProps) {
  const [query, setQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <div className="flex items-center gap-2 bg-[#20242e] border border-white/[0.08] rounded-full px-2 py-1.5 shadow-md flex-1 max-w-[280px]">
      {/* Plus Action Circle */}
      <button
        onClick={onAddManualFile}
        className="w-6 h-6 rounded-full bg-[#2a2f3d] hover:bg-[#383f52] text-gray-200 flex items-center justify-center transition-all active:scale-95 shadow-inner"
        title="Add file or manual intake"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Input / Filter Field */}
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Quick intake / search..."
        className="bg-transparent text-xs text-gray-200 placeholder-gray-500 focus:outline-none w-full pr-2"
      />
    </div>
  );
}
