import React from "react";
import {
  FileType,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileImage,
  FileArchive,
  File,
  LucideIcon,
} from "lucide-react";

import pdfIcon from "@/assets/file-icons/pdf.png";
import docsIcon from "@/assets/file-icons/docs.png";
import excelIcon from "@/assets/file-icons/excel.png";
import imageIcon from "@/assets/file-icons/image.png";

export { pdfIcon, docsIcon, excelIcon, imageIcon };

export function getFileIcon(filename: string = ""): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (ext === "pdf") return pdfIcon;
  if (["xlsx", "xls", "csv"].includes(ext)) return excelIcon;
  if (["png", "jpg", "jpeg", "webp", "svg"].includes(ext)) return imageIcon;
  return docsIcon;
}

export interface FileTypeConfig {
  icon: LucideIcon;
  extension: string;
  typeLabel: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  accentClasses: string; // Combined text, bg, and border for convenience
  badgeBorder: string;
  viewerActionLabel: string;
}

export function getFileTypeConfig(filenameOrPath: string = ""): FileTypeConfig {
  const cleanName = filenameOrPath.trim().toLowerCase();
  const lastDot = cleanName.lastIndexOf(".");
  const ext = lastDot !== -1 ? cleanName.slice(lastDot) : "";

  switch (ext) {
    case ".pdf":
      return {
        icon: FileType,
        extension: "pdf",
        typeLabel: "PDF",
        textColor: "text-rose-400",
        bgColor: "bg-rose-500/10",
        borderColor: "border-rose-500/30",
        accentClasses: "text-rose-400 bg-rose-500/10 border-rose-500/30",
        badgeBorder: "border-rose-500/40",
        viewerActionLabel: "Open in PDF",
      };

    case ".docx":
    case ".doc":
      return {
        icon: FileText,
        extension: ext.replace(".", ""),
        typeLabel: "DOCX",
        textColor: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        accentClasses: "text-blue-400 bg-blue-500/10 border-blue-500/30",
        badgeBorder: "border-blue-500/40",
        viewerActionLabel: "Open in Word",
      };

    case ".xlsx":
    case ".xls":
    case ".csv":
      return {
        icon: FileSpreadsheet,
        extension: ext.replace(".", ""),
        typeLabel: "SHEET",
        textColor: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        accentClasses: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
        badgeBorder: "border-emerald-500/40",
        viewerActionLabel: "Open in Excel",
      };

    case ".pptx":
    case ".ppt":
      return {
        icon: Presentation,
        extension: ext.replace(".", ""),
        typeLabel: "SLIDES",
        textColor: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        accentClasses: "text-orange-400 bg-orange-500/10 border-orange-500/30",
        badgeBorder: "border-orange-500/40",
        viewerActionLabel: "Open Slides",
      };

    case ".jpg":
    case ".jpeg":
    case ".png":
    case ".webp":
    case ".svg":
      return {
        icon: FileImage,
        extension: ext.replace(".", ""),
        typeLabel: "IMAGE",
        textColor: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        accentClasses: "text-purple-400 bg-purple-500/10 border-purple-500/30",
        badgeBorder: "border-purple-500/40",
        viewerActionLabel: "Open Image",
      };

    case ".zip":
    case ".rar":
    case ".7z":
    case ".tar":
    case ".gz":
      return {
        icon: FileArchive,
        extension: ext.replace(".", ""),
        typeLabel: "ZIP",
        textColor: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        accentClasses: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        badgeBorder: "border-amber-500/40",
        viewerActionLabel: "Open Archive",
      };

    default:
      return {
        icon: File,
        extension: ext ? ext.replace(".", "") : "file",
        typeLabel: ext ? ext.replace(".", "").toUpperCase() : "FILE",
        textColor: "text-zinc-400",
        bgColor: "bg-zinc-500/10",
        borderColor: "border-zinc-500/30",
        accentClasses: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30",
        badgeBorder: "border-zinc-500/40",
        viewerActionLabel: "Open File",
      };
  }
}

export function getStatusBadgeConfig(status: string = "ready") {
  const s = status.toLowerCase();
  if (s === "complete" || s === "ready" || s === "printed") {
    return {
      label: "READY",
      classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    };
  }
  if (s === "transferring" || s === "uploading" || s === "pending") {
    return {
      label: "TRANSFERRING",
      classes: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 animate-pulse",
    };
  }
  if (s === "error" || s === "failed") {
    return {
      label: "ERROR",
      classes: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    };
  }
  return {
    label: status.toUpperCase(),
    classes: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
}

/**
 * Strict Security Whitelist for Printio
 * Only printable documents and image files are permitted.
 */
export const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "doc",
  "xlsx",
  "pptx",
  "jpg",
  "jpeg",
  "png",
]);

export function isAllowedFile(filenameOrPath: string = ""): boolean {
  const clean = filenameOrPath.trim().toLowerCase();
  const ext = clean.split(".").pop() || "";
  return ALLOWED_EXTENSIONS.has(ext);
}

