import React from "react";
import gwenIcon from "@/assets/gwen-app-icon.png";

interface PrintioLogoGlyphProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * The official Printio emblem glyph or icon.
 */
export function PrintioLogoGlyph({
  className = "w-5 h-5 object-cover rounded-md",
}: PrintioLogoGlyphProps) {
  return (
    <img
      src={gwenIcon}
      alt="Printio"
      className={className}
    />
  );
}

interface PrintioLogoBadgeProps {
  size?: "sm" | "md" | "lg" | "xl";
  showDot?: boolean;
  className?: string;
  glow?: boolean;
}

/**
 * Official Printio App Icon Badge (Squircle + Emerald Border + Gwen Icon + Top-Right Status Dot).
 */
export default function PrintioLogoBadge({
  size = "md",
  showDot = true,
  className = "",
  glow = true,
}: PrintioLogoBadgeProps) {
  const sizeMap = {
    sm: { box: "w-8 h-8 rounded-xl", img: "w-7 h-7 rounded-lg", dot: "top-0.5 right-0.5 h-2 w-2" },
    md: { box: "w-10 h-10 rounded-2xl", img: "w-9 h-9 rounded-xl", dot: "top-1 right-1 h-2.5 w-2.5" },
    lg: { box: "w-12 h-12 rounded-2xl", img: "w-11 h-11 rounded-xl", dot: "top-1.5 right-1.5 h-2.5 w-2.5" },
    xl: { box: "w-16 h-16 rounded-[22px]", img: "w-14 h-14 rounded-2xl", dot: "top-2 right-2 h-3 w-3" },
  };

  const current = sizeMap[size];

  return (
    <div
      className={`relative flex items-center justify-center bg-[#0d0e12] border border-emerald-500/40 ${
        glow ? "shadow-[0_0_20px_rgba(16,185,129,0.3)]" : ""
      } ${current.box} ${className}`}
    >
      <img
        src={gwenIcon}
        alt="Printio"
        className={`${current.img} object-cover`}
      />
      {showDot && (
        <span
          className={`absolute ${current.dot} rounded-full bg-emerald-400 ring-2 ring-zinc-950 shadow-[0_0_8px_rgba(74,222,128,0.9)]`}
        />
      )}
    </div>
  );
}
