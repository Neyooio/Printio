import React, { useState, useEffect, useRef } from "react";
import {
  Settings2,
  Wifi,
  Radio,
  ShieldCheck,
  HardDrive,
  Clock,
  Network,
  CheckCircle2,
  Receipt,
  Printer,
  Layers,
  BookOpen,
  Calculator,
  Save,
  RotateCcw,
  Sparkles,
  DollarSign,
  FileText,
  Scan,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface NetworkSettingsViewProps {
  serverRunning?: boolean;
  onToggleServer?: () => void;
  storageCap?: number;
}

interface PricingRates {
  currency: string;
  bwPerPage: number;
  colorPerPage: number;
  colorFullPhoto: number;
  legalSurcharge: number;
  laminationId: number;
  laminationA4: number;
  laminationLegal: number;
  ringBinding: number;
  hardboundBinding: number;
  scanPerPage: number;
  minJobFee: number;
}

const DEFAULT_PRICING: PricingRates = {
  currency: "₱",
  bwPerPage: 2.0,
  colorPerPage: 5.0,
  colorFullPhoto: 10.0,
  legalSurcharge: 1.0,
  laminationId: 15.0,
  laminationA4: 30.0,
  laminationLegal: 40.0,
  ringBinding: 35.0,
  hardboundBinding: 250.0,
  scanPerPage: 5.0,
  minJobFee: 5.0,
};

interface RateStepperInputProps {
  value: number;
  onChange: (val: number) => void;
  step?: number;
  min?: number;
  max?: number;
  prefix?: string;
  className?: string;
}

function RateStepperInput({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999999,
  prefix,
  className = "w-28",
}: RateStepperInputProps) {
  const [localVal, setLocalVal] = useState(value.toString());
  const isFocusedRef = useRef(false);
  const valRef = useRef(value);
  valRef.current = value;

  const repeatRef = useRef<{ timer: any; interval: any }>({
    timer: null,
    interval: null,
  });

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalVal(value.toString());
    }
  }, [value]);

  const getDecimals = (n: number) => {
    const s = n.toString();
    return s.includes(".") ? s.split(".")[1].length : 0;
  };

  const stepBy = (dir: 1 | -1, multiplier: number = 1) => {
    const current = valRef.current;
    const delta = dir * step * multiplier;
    const precision = Math.max(getDecimals(step), getDecimals(current), 0);
    const next = parseFloat((current + delta).toFixed(precision));
    const clamped = Math.min(max, Math.max(min, next));
    setLocalVal(clamped.toString());
    onChange(clamped);
  };

  const stopRepeat = () => {
    if (repeatRef.current.timer) clearTimeout(repeatRef.current.timer);
    if (repeatRef.current.interval) clearInterval(repeatRef.current.interval);
    repeatRef.current.timer = null;
    repeatRef.current.interval = null;
  };

  const startRepeat = (dir: 1 | -1) => {
    stepBy(dir);
    stopRepeat();
    repeatRef.current.timer = setTimeout(() => {
      repeatRef.current.interval = setInterval(() => {
        if (dir === -1 && valRef.current <= min) {
          stopRepeat();
          return;
        }
        if (dir === 1 && valRef.current >= max) {
          stopRepeat();
          return;
        }
        stepBy(dir);
      }, 70);
    }, 320);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => stopRepeat();
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      stopRepeat();
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(text)) {
      setLocalVal(text);
      const parsed = parseFloat(text);
      if (!isNaN(parsed)) {
        onChange(Math.min(max, Math.max(min, parsed)));
      }
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    const parsed = parseFloat(localVal);
    if (isNaN(parsed) || parsed < min) {
      setLocalVal(min.toString());
      onChange(min);
    } else if (parsed > max) {
      setLocalVal(max.toString());
      onChange(max);
    } else {
      setLocalVal(parsed.toString());
      onChange(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepBy(1, e.shiftKey ? 10 : 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      stepBy(-1, e.shiftKey ? 10 : 1);
    } else if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div
      className={`flex items-center h-8 bg-black/50 hover:bg-black/70 border border-white/10 hover:border-white/20 focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/25 rounded-xl shadow-inner transition-all overflow-hidden group shrink-0 ${className}`}
    >
      {prefix && (
        <span className="text-xs text-zinc-400 font-bold select-none pl-2.5 pr-0.5 shrink-0">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={localVal}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="bg-transparent text-xs text-zinc-100 font-mono font-bold focus:outline-none w-full text-right pr-2 min-w-0 select-text"
      />
      <div className="flex flex-col h-full w-[24px] border-l border-white/10 bg-white/[0.03] group-hover:bg-white/[0.06] shrink-0 select-none">
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            startRepeat(1);
          }}
          onMouseUp={stopRepeat}
          onMouseLeave={stopRepeat}
          disabled={value >= max}
          className="flex-1 flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/20 active:bg-emerald-500/35 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-zinc-500 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title={`Increase by ${step}`}
        >
          <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
        <div className="h-[1px] bg-white/10 w-full" />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            startRepeat(-1);
          }}
          onMouseUp={stopRepeat}
          onMouseLeave={stopRepeat}
          disabled={value <= min}
          className="flex-1 flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/20 active:bg-emerald-500/35 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-zinc-500 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title={`Decrease by ${step}`}
        >
          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}


type SettingsTab = "pricing" | "network" | "storage";

export default function NetworkSettingsView({
  serverRunning = true,
  onToggleServer,
  storageCap = 10 * 1024 * 1024 * 1024,
}: NetworkSettingsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>("pricing");

  // Pricing State (Loaded from localStorage if available)
  const [pricing, setPricing] = useState<PricingRates>(() => {
    try {
      const saved = localStorage.getItem("printio_pricing_rates");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_PRICING;
  });

  const [savedFeedback, setSavedFeedback] = useState(false);

  // Live Calculator State
  const [calcPages, setCalcPages] = useState<number>(34);
  const [calcPrintType, setCalcPrintType] = useState<"bw" | "color" | "photo">("bw");
  const [calcIsLegal, setCalcIsLegal] = useState<boolean>(false);
  const [calcLamination, setCalcLamination] = useState<"none" | "id" | "a4" | "legal">("none");
  const [calcBinding, setCalcBinding] = useState<"none" | "ring" | "hardbound">("none");

  // Network State
  const [ssid, setSsid] = useState("Printio_DropBox_5G");
  const [band, setBand] = useState<"2.4GHz" | "5GHz">("5GHz");
  const [dnsRedirect, setDnsRedirect] = useState(true);
  const [httpRedirect, setHttpRedirect] = useState(true);

  // Storage State
  const [capGb, setCapGb] = useState(10);
  const [autoPurgeHours, setAutoPurgeHours] = useState(24);
  const [purgeOnDisconnect, setPurgeOnDisconnect] = useState(true);

  const handleSavePricing = () => {
    try {
      localStorage.setItem("printio_pricing_rates", JSON.stringify(pricing));
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch (e) {
      console.error("Failed to save pricing rates:", e);
    }
  };

  const handleResetPricing = () => {
    setPricing(DEFAULT_PRICING);
    try {
      localStorage.setItem("printio_pricing_rates", JSON.stringify(DEFAULT_PRICING));
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const updateRate = (field: keyof PricingRates, value: any) => {
    setPricing((prev) => ({
      ...prev,
      [field]: typeof value === "number" ? Math.max(0, value) : value,
    }));
  };

  // Calculate live estimate
  const calculateTotal = () => {
    let printRate = pricing.bwPerPage;
    if (calcPrintType === "color") printRate = pricing.colorPerPage;
    if (calcPrintType === "photo") printRate = pricing.colorFullPhoto;

    const paperSurcharge = calcIsLegal ? pricing.legalSurcharge : 0;
    const printCost = calcPages * (printRate + paperSurcharge);

    let laminationCost = 0;
    if (calcLamination === "id") laminationCost = pricing.laminationId;
    if (calcLamination === "a4") laminationCost = pricing.laminationA4;
    if (calcLamination === "legal") laminationCost = pricing.laminationLegal;

    let bindingCost = 0;
    if (calcBinding === "ring") bindingCost = pricing.ringBinding;
    if (calcBinding === "hardbound") bindingCost = pricing.hardboundBinding;

    const total = printCost + laminationCost + bindingCost;
    return Math.max(total, pricing.minJobFee);
  };

  return (
    <div className="flex-1 h-full flex flex-col gap-3 p-1 min-h-0 select-none overflow-hidden font-sans text-zinc-200">
      {/* Top Header Bar with Categorized Tab Switcher */}
      <div className="flex items-center justify-between bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl px-5 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Shop Settings & Configuration</h2>
            <p className="text-[11px] text-zinc-400">
              Configure billing rates, hotspot infrastructure & disk retention limits
            </p>
          </div>
        </div>

        {/* Organized Navigation Pills */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
          <button
            onClick={() => setActiveSubTab("pricing")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === "pricing"
                ? "bg-emerald-500 text-zinc-950 shadow-md font-bold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Billing & Pricing
          </button>
          <button
            onClick={() => setActiveSubTab("network")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === "network"
                ? "bg-emerald-500 text-zinc-950 shadow-md font-bold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            Network & Hotspot
          </button>
          <button
            onClick={() => setActiveSubTab("storage")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === "storage"
                ? "bg-emerald-500 text-zinc-950 shadow-md font-bold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Storage & Security
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. BILLING & PRICING TAB                                 */}
      {/* ========================================================= */}
      {activeSubTab === "pricing" && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pr-1">
          {/* Top Row: Printing Rates & Lamination / Finishing */}
          <div className="grid grid-cols-3 gap-3">
            {/* Panel A: Printing Rates */}
            <div className="bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-zinc-200">Printing Rates</h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">per page</span>
                </div>

                <div className="space-y-2.5">
                  {/* B&W */}
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Black & White (B&W)</p>
                      <p className="text-[10px] text-zinc-500">Standard text documents</p>
                    </div>
                    <RateStepperInput
                      value={pricing.bwPerPage}
                      onChange={(val) => updateRate("bwPerPage", val)}
                      step={0.25}
                      min={0}
                      prefix={pricing.currency}
                    />
                  </div>

                  {/* Color Text */}
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Color (Standard / Text)</p>
                      <p className="text-[10px] text-zinc-500">Charts, colored titles</p>
                    </div>
                    <RateStepperInput
                      value={pricing.colorPerPage}
                      onChange={(val) => updateRate("colorPerPage", val)}
                      step={0.5}
                      min={0}
                      prefix={pricing.currency}
                    />
                  </div>

                  {/* Full Color / Photo */}
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Full Color / Photo</p>
                      <p className="text-[10px] text-zinc-500">Heavy ink & photo paper</p>
                    </div>
                    <RateStepperInput
                      value={pricing.colorFullPhoto}
                      onChange={(val) => updateRate("colorFullPhoto", val)}
                      step={1}
                      min={0}
                      prefix={pricing.currency}
                    />
                  </div>

                  {/* Legal Paper Surcharge */}
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Legal / Long Surcharge</p>
                      <p className="text-[10px] text-zinc-500">Additional charge per long sheet</p>
                    </div>
                    <RateStepperInput
                      value={pricing.legalSurcharge}
                      onChange={(val) => updateRate("legalSurcharge", val)}
                      step={0.5}
                      min={0}
                      prefix={`+${pricing.currency}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Panel B: Lamination & Finishing */}
            <div className="bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-zinc-200">Laminations & Scanning</h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">per item</span>
                </div>

                <div className="space-y-2.5">
                  {/* ID Size Lamination */}
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">ID / Badge Lamination</p>
                      <p className="text-[10px] text-zinc-500">Pocket / Wallet card size</p>
                    </div>
                    <RateStepperInput
                      value={pricing.laminationId}
                      onChange={(val) => updateRate("laminationId", val)}
                      step={1}
                      min={0}
                      prefix={pricing.currency}
                    />
                  </div>

                  {/* Short / A4 Lamination */}
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">A4 / Short Lamination</p>
                      <p className="text-[10px] text-zinc-500">Letter & standard certificate</p>
                    </div>
                    <RateStepperInput
                      value={pricing.laminationA4}
                      onChange={(val) => updateRate("laminationA4", val)}
                      step={1}
                      min={0}
                      prefix={pricing.currency}
                    />
                  </div>

                  {/* Long / Legal Lamination */}
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Legal / Long Lamination</p>
                      <p className="text-[10px] text-zinc-500">Diploma & legal contracts</p>
                    </div>
                    <RateStepperInput
                      value={pricing.laminationLegal}
                      onChange={(val) => updateRate("laminationLegal", val)}
                      step={1}
                      min={0}
                      prefix={pricing.currency}
                    />
                  </div>

                  {/* Scanning Rate */}
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Document Scanning</p>
                      <p className="text-[10px] text-zinc-500">Flatbed scan to digital PDF</p>
                    </div>
                    <RateStepperInput
                      value={pricing.scanPerPage}
                      onChange={(val) => updateRate("scanPerPage", val)}
                      step={1}
                      min={0}
                      prefix={pricing.currency}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Panel C: Binding & Shop Settings */}
            <div className="bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-zinc-200">Binding & Currency</h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">per service</span>
                </div>

                <div className="space-y-2.5">
                  {/* Ring / Coil Binding */}
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Ring / Coil Binding</p>
                      <p className="text-[10px] text-zinc-500">Spiral with PVC cover</p>
                    </div>
                    <RateStepperInput
                      value={pricing.ringBinding}
                      onChange={(val) => updateRate("ringBinding", val)}
                      step={5}
                      min={0}
                      prefix={pricing.currency}
                    />
                  </div>

                  {/* Hardbound / Thesis Binding */}
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Thesis Hardbound</p>
                      <p className="text-[10px] text-zinc-500">Gold stamping & leatherette</p>
                    </div>
                    <RateStepperInput
                      value={pricing.hardboundBinding}
                      onChange={(val) => updateRate("hardboundBinding", val)}
                      step={10}
                      min={0}
                      prefix={pricing.currency}
                    />
                  </div>

                  {/* Minimum Session Fee */}
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Min. Session Fee</p>
                      <p className="text-[10px] text-zinc-500">Minimum job base charge</p>
                    </div>
                    <RateStepperInput
                      value={pricing.minJobFee}
                      onChange={(val) => updateRate("minJobFee", val)}
                      step={1}
                      min={0}
                      prefix={pricing.currency}
                    />
                  </div>

                  {/* Currency Selector */}
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Shop Currency Symbol</p>
                      <p className="text-[10px] text-zinc-500">Displayed on bill & receipts</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {["₱", "$", "€", "£"].map((sym) => (
                        <button
                          key={sym}
                          onClick={() => updateRate("currency", sym)}
                          className={`w-6 h-6 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            pricing.currency === sym
                              ? "bg-emerald-500 text-zinc-950 shadow"
                              : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Live Price Estimator + Save / Reset Controls */}
          <div className="grid grid-cols-[1fr_300px] gap-3">
            {/* Live Job Price Calculator */}
            <div className="bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-zinc-200">Live Price Estimator</h3>
                  <span className="text-[10px] text-zinc-400">(Simulate print job billings)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[9px] font-bold text-purple-300">
                  Instant Preview
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 items-center">
                {/* Pages */}
                <div>
                  <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                    Page Count
                  </label>
                  <RateStepperInput
                    value={calcPages}
                    onChange={(val) => setCalcPages(Math.max(1, Math.round(val)))}
                    step={1}
                    min={1}
                    className="w-full"
                  />
                </div>

                {/* Print Type */}
                <div>
                  <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                    Color Mode
                  </label>
                  <select
                    value={calcPrintType}
                    onChange={(e: any) => setCalcPrintType(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 border-t-black/60 shadow-inner rounded-xl px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
                  >
                    <option value="bw">B&W ({pricing.currency}{pricing.bwPerPage})</option>
                    <option value="color">Color Text ({pricing.currency}{pricing.colorPerPage})</option>
                    <option value="photo">Full Photo ({pricing.currency}{pricing.colorFullPhoto})</option>
                  </select>
                </div>

                {/* Lamination */}
                <div>
                  <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                    Lamination
                  </label>
                  <select
                    value={calcLamination}
                    onChange={(e: any) => setCalcLamination(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 border-t-black/60 shadow-inner rounded-xl px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
                  >
                    <option value="none">None</option>
                    <option value="id">ID Size (+{pricing.currency}{pricing.laminationId})</option>
                    <option value="a4">A4 Size (+{pricing.currency}{pricing.laminationA4})</option>
                    <option value="legal">Legal Size (+{pricing.currency}{pricing.laminationLegal})</option>
                  </select>
                </div>

                {/* Binding */}
                <div>
                  <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                    Binding
                  </label>
                  <select
                    value={calcBinding}
                    onChange={(e: any) => setCalcBinding(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 border-t-black/60 shadow-inner rounded-xl px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
                  >
                    <option value="none">None</option>
                    <option value="ring">Coil/Ring (+{pricing.currency}{pricing.ringBinding})</option>
                    <option value="hardbound">Hardbound (+{pricing.currency}{pricing.hardboundBinding})</option>
                  </select>
                </div>
              </div>

              {/* Calculation Summary Row */}
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
                  <span>Paper: <strong className="text-zinc-200">{calcIsLegal ? "Legal" : "Short/A4"}</strong></span>
                  <span>•</span>
                  <span>Print Cost: <strong className="text-zinc-200">{pricing.currency}{(calcPages * (calcPrintType === "bw" ? pricing.bwPerPage : calcPrintType === "color" ? pricing.colorPerPage : pricing.colorFullPhoto)).toFixed(2)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-zinc-400">Total Customer Bill:</span>
                  <span className="text-base font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-0.5 rounded-lg shadow-inner">
                    {pricing.currency}{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Save & Reset Panel */}
            <div className="bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-200 mb-1">Save Shop Rates</h4>
                <p className="text-[10px] text-zinc-400 mb-3">
                  Persists all pricing values to local storage for billing and receipts.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleSavePricing}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  {savedFeedback ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                      Rates Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save Pricing
                    </>
                  )}
                </button>

                <button
                  onClick={handleResetPricing}
                  className="w-full py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner text-zinc-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-zinc-400" />
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. NETWORK & HOTSPOT TAB                                 */}
      {/* ========================================================= */}
      {activeSubTab === "network" && (
        <div className="flex-1 grid grid-cols-2 gap-3 min-h-0 overflow-y-auto">
          {/* Hotspot & Radio */}
          <div className="bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-zinc-200">Wi-Fi Hotspot Configuration</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-bold text-emerald-300">
                  Broadcasting
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                    Hotspot Network Name (SSID)
                  </label>
                  <div className="flex items-center gap-2 bg-black/40 border border-white/5 border-t-black/60 shadow-inner rounded-xl px-3 py-1.5">
                    <Radio className="w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text"
                      value={ssid}
                      onChange={(e) => setSsid(e.target.value)}
                      className="bg-transparent text-xs text-zinc-100 font-mono focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                    Frequency Band
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-black/30 p-1 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                    <button
                      onClick={() => setBand("2.4GHz")}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        band === "2.4GHz"
                          ? "bg-zinc-700 text-zinc-100 shadow"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      2.4 GHz (Long Range)
                    </button>
                    <button
                      onClick={() => setBand("5GHz")}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        band === "5GHz"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      5.0 GHz (High Speed)
                    </button>
                  </div>
                </div>

                <div className="bg-black/40 rounded-xl p-2.5 border border-white/5 border-t-black/60 shadow-inner text-[11px] space-y-1 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Gateway IP</span>
                    <span className="font-mono text-zinc-200">192.168.137.1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subnet Mask</span>
                    <span className="font-mono text-zinc-400">255.255.255.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DHCP Pool</span>
                    <span className="font-mono text-zinc-400">.10 - .150</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5">
              <button
                onClick={onToggleServer}
                className="w-full py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner text-xs font-semibold text-zinc-200 transition-all active:scale-98 cursor-pointer"
              >
                Restart Network Adapter
              </button>
            </div>
          </div>

          {/* DNS & HTTP Port Routing Rules */}
          <div className="bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-bold text-zinc-200">Routing & Port Interception</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-[9px] font-bold text-sky-300">
                  Port 53 / 80
                </span>
              </div>

              <div className="space-y-2.5">
                {/* DNS Port 53 */}
                <div className="bg-black/40 rounded-xl p-2.5 border border-white/5 border-t-black/60 shadow-inner flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200">DNS Hijacking (Port 53)</h4>
                    <p className="text-[10px] text-zinc-400">Routes domain requests to captive drop box</p>
                  </div>
                  <button
                    onClick={() => setDnsRedirect(!dnsRedirect)}
                    className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                      dnsRedirect ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        dnsRedirect ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* HTTP Port 80 */}
                <div className="bg-black/40 rounded-xl p-2.5 border border-white/5 border-t-black/60 shadow-inner flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200">HTTP 302 Redirection (Port 80)</h4>
                    <p className="text-[10px] text-zinc-400">Prompts immediate OS login popup on phones</p>
                  </div>
                  <button
                    onClick={() => setHttpRedirect(!httpRedirect)}
                    className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                      httpRedirect ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        httpRedirect ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Windows Firewall Status */}
                <div className="bg-black/40 rounded-xl p-2.5 border border-white/5 border-t-black/60 shadow-inner flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">Windows Firewall Sync</h4>
                      <p className="text-[10px] text-zinc-400">Inbound rules: TCP 80, UDP 53</p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>Status: Elevated Admin</span>
              <span>Adapter: OK</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. STORAGE & SECURITY TAB                                */}
      {/* ========================================================= */}
      {activeSubTab === "storage" && (
        <div className="flex-1 bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-5 flex flex-col justify-between overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            {/* Storage Quota */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-zinc-200">Local Storage Disk Cap</h3>
                </div>
                <span className="text-xs font-bold font-mono text-amber-400">
                  {capGb} GB Max Limit
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mb-4">
                Hard ceiling prevents student file spam from filling your host machine's drive.
              </p>

              <input
                type="range"
                min={2}
                max={50}
                step={2}
                value={capGb}
                onChange={(e) => setCapGb(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2">
                <span>2 GB</span>
                <span>10 GB (Recommended)</span>
                <span>25 GB</span>
                <span>50 GB</span>
              </div>
            </div>

            {/* Auto Purge */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-zinc-200">Automatic File Purge Timers</h3>
                </div>
                <span className="text-xs font-mono text-purple-400 font-bold">
                  {autoPurgeHours} Hours
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mb-3">
                Auto-removes temporary student uploads once the retention window expires.
              </p>

              <div className="flex items-center gap-2 mb-3">
                {[2, 6, 12, 24, 48].map((hrs) => (
                  <button
                    key={hrs}
                    onClick={() => setAutoPurgeHours(hrs)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      autoPurgeHours === hrs
                        ? "bg-purple-500/20 border-purple-500/40 text-purple-300 shadow"
                        : "bg-zinc-800/60 border-zinc-700/40 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {hrs}h
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/5 border-t-black/60 shadow-inner">
                <span className="text-xs text-zinc-300 font-medium">
                  Immediate purge upon client disconnect / Wi-Fi lease expiry
                </span>
                <input
                  type="checkbox"
                  checked={purgeOnDisconnect}
                  onChange={(e) => setPurgeOnDisconnect(e.target.checked)}
                  className="accent-purple-400 rounded cursor-pointer w-4 h-4"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <span>Storage policy: Automatic LRU eviction when disk cap is reached</span>
            <span className="font-mono text-zinc-500">Purge cron: active</span>
          </div>
        </div>
      )}
    </div>
  );
}
