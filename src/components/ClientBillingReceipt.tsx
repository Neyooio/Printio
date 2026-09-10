import React, { useState } from "react";
import {
  Receipt,
  Check,
  Printer,
  Sparkles,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { UploadInfo, SessionInfo, formatBytes } from "../lib/commands";
import { getFileIcon } from "../lib/fileTypeHelper";

interface ClientBillingReceiptProps {
  session: SessionInfo | null;
  files: UploadInfo[];
  onPrintReceipt?: () => void;
}

export function getFileBillingItem(file: UploadInfo) {
  const name = file.original_name || file.name || "Document";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const pages = file.pages || 1;
  const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext);
  const isColor =
    isImage ||
    name.toLowerCase().includes("poster") ||
    name.toLowerCase().includes("flyer") ||
    name.toLowerCase().includes("color") ||
    name.toLowerCase().includes("deck");
  const isLarge =
    name.toLowerCase().includes("blueprint") ||
    name.toLowerCase().includes("poster") ||
    name.toLowerCase().includes("a3");

  let ratePerPage = 0.05; // B&W default
  let rateLabel = "B&W";

  if (isImage) {
    ratePerPage = 0.5;
    rateLabel = "Photo";
  } else if (isLarge) {
    ratePerPage = 1.25;
    rateLabel = "Plot/CAD";
  } else if (isColor) {
    ratePerPage = 0.35;
    rateLabel = "Color";
  } else if (pages >= 10) {
    ratePerPage = 0.04;
    rateLabel = "Bulk B&W";
  }

  const itemTotal = pages * ratePerPage;

  return {
    id: file.id || file.file_id || name,
    name,
    pages,
    ratePerPage,
    rateLabel,
    itemTotal,
    formattedTotal: itemTotal.toFixed(2),
  };
}

export default function ClientBillingReceipt({
  session,
  files,
  onPrintReceipt,
}: ClientBillingReceiptProps) {
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [justPaidAnimation, setJustPaidAnimation] = useState<boolean>(false);

  const deviceName =
    session?.device_name || (session?.device_type === "laptop" ? "Laptop" : "Phone");

  const billingItems = files.map(getFileBillingItem);
  const totalAmount = billingItems.reduce((acc, item) => acc + item.itemTotal, 0);
  const totalPages = billingItems.reduce((acc, item) => acc + item.pages, 0);

  const handleMarkPaid = () => {
    setIsPaid(!isPaid);
    if (!isPaid) {
      setJustPaidAnimation(true);
      setTimeout(() => setJustPaidAnimation(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between rounded-[28px] bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-3.5 select-none min-h-0 overflow-hidden">
      {/* ─── Header: Client Tally Banner ─── */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
            <Receipt className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
              <span>Client Bill Tally</span>
              {isPaid && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase tracking-wider">
                  Paid
                </span>
              )}
            </h3>
          </div>
        </div>

        <span className="text-[10px] font-mono font-medium text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
          {deviceName} · {files.length} File{files.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* ─── Middle: Scrollable Detailed Receipt Items ─── */}
      <div className="flex-1 my-2 overflow-y-auto min-h-0 space-y-1.5 pr-0.5 scrollbar-thin scrollbar-thumb-zinc-700/40">
        {billingItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-[11px] py-4">
            <span>No billable files uploaded yet</span>
          </div>
        ) : (
          billingItems.map((item, idx) => (
            <div
              key={item.id + idx}
              className="flex items-center justify-between p-1.5 rounded-xl bg-black/30 border border-white/5 hover:bg-black/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                <img
                  src={getFileIcon(item.name)}
                  alt=""
                  className="w-4 h-5 object-contain flex-shrink-0 drop-shadow-sm pointer-events-none"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-zinc-200 truncate leading-tight" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-[9px] text-zinc-400 font-mono mt-0.5">
                    {item.pages}p · {item.rateLabel} @ ${item.ratePerPage.toFixed(2)}/p
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="text-xs font-bold font-mono text-zinc-100">
                  ${item.formattedTotal}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Bottom: Grand Total & Action Controls ─── */}
      <div className="pt-2 border-t border-dashed border-white/10 flex-shrink-0 space-y-2">
        {/* Total Price Row */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
              Total Due ({totalPages} pgs)
            </span>
          </div>
          <div className="text-right">
            <span
              className={`text-base font-extrabold font-mono transition-all ${
                isPaid
                  ? "text-zinc-400 line-through decoration-emerald-400 decoration-2"
                  : "text-emerald-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]"
              }`}
            >
              ${totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={handleMarkPaid}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
              isPaid
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            }`}
          >
            {isPaid ? (
              <>
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Paid Cash</span>
              </>
            ) : (
              <>
                <CreditCard className="w-3 h-3" />
                <span>Mark as Paid</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (onPrintReceipt) {
                onPrintReceipt();
              } else {
                alert(`Receipt printed for ${deviceName} (Total: $${totalAmount.toFixed(2)})`);
              }
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-zinc-300 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-3 h-3 text-zinc-400" />
            <span>Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
