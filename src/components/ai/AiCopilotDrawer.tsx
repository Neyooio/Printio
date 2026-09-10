import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Send,
  Square,
  RotateCcw,
  Bot,
  User,
  ShieldCheck,
  AlertCircle,
  FileText,
  DollarSign,
  Search,
  CheckCircle2,
  Layers,
  Printer,
} from "lucide-react";
import {
  ChatMessage,
  ShopContext,
  checkOllamaStatus,
  streamChatWithCopilot,
  auditDocumentPreflight,
  PreflightResult,
} from "../../lib/aiService";
import { UploadInfo, formatBytes } from "../../lib/commands";

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shopContext: ShopContext;
  activeSelectedFile?: UploadInfo | null;
  onClearSelectedFile?: () => void;
  onApplyPreset?: (action: string) => void;
}

function formatCleanContent(raw: string): string {
  if (!raw) return "";
  // 1. Convert markdown bullet asterisks at the start of a line into clean standard hyphens
  let text = raw.replace(/^(\s*)\*\s+/gm, "$1- ");
  // 2. Strip raw markdown header hashes (e.g. ### Section -> Section)
  text = text.replace(/^#{1,6}\s+/gm, "");
  // 3. Strip bold and italic asterisks so no raw ** or * appear in the chat
  text = text.replace(/\*{1,3}/g, "");
  // 4. Strip stray backticks
  text = text.replace(/`+/g, "");
  return text;
}

export default function AiCopilotDrawer({
  isOpen,
  onClose,
  shopContext,
  activeSelectedFile,
  onClearSelectedFile,
}: AiCopilotDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Good day. I am Gwen, Printio's dedicated AI assistant. I am at your service to inspect documents, formulate billing quotes, and verify print specifications. How may I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  const [preflightData, setPreflightData] = useState<PreflightResult | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSummarizedIdRef = useRef<string | null>(null);

  // Poll Ollama status on drawer open
  useEffect(() => {
    if (isOpen) {
      checkOllamaStatus().then((res) => {
        setOllamaOnline(res.online);
      });
    }
  }, [isOpen]);

  // Automated Preflight Summary when a file is clicked by the user
  useEffect(() => {
    if (!isOpen || !activeSelectedFile) return;

    const fileKey =
      activeSelectedFile.id ||
      activeSelectedFile.file_id ||
      activeSelectedFile.original_name;
    if (lastSummarizedIdRef.current === fileKey) return;
    lastSummarizedIdRef.current = fileKey;

    const pgs = activeSelectedFile.pages || 1;
    const audit = auditDocumentPreflight(
      activeSelectedFile.original_name || "Document.pdf",
      pgs
    );
    setPreflightData(audit);

    const currency = shopContext.pricingRates?.currency || "₱";
    const bwRate = shopContext.pricingRates?.bwPerPage ?? 2.0;
    const colRate = shopContext.pricingRates?.colorPerPage ?? 5.0;
    const bwCost = audit.bwPagesCount * bwRate;
    const colCost = audit.colorPagesCount * colRate;
    const totalEst = bwCost + colCost;

    const colorDesc =
      audit.colorPagesCount === 0
        ? `${audit.totalPages} Black & White pages (Monochrome)`
        : audit.bwPagesCount === 0
        ? `${audit.totalPages} Full Color pages`
        : `Mixed: ${audit.bwPagesCount} B&W pages, ${audit.colorPagesCount} Color pages (${
            audit.colorPagesList.length > 0
              ? `Pages ${audit.colorPagesList.join(", ")}`
              : "Various"
          })`;

    const summaryText = `Good day. I have generated the automated document audit for "${activeSelectedFile.original_name}":

DOCUMENT SPECIFICATIONS:
- Total Pages: ${audit.totalPages} pages (${formatBytes(activeSelectedFile.file_size || 0)})
- Color Distribution: ${colorDesc}
- Estimated Ink Coverage: ${audit.inkCoverageEstimate}
- Margin Inspection: ${audit.marginSafety} (${audit.marginNotes})

PRELIMINARY BILLING ESTIMATE:
- Black & White Pages: ${audit.bwPagesCount} × ${currency}${bwRate.toFixed(2)} = ${currency}${bwCost.toFixed(2)}
- Color Pages: ${audit.colorPagesCount} × ${currency}${colRate.toFixed(2)} = ${currency}${colCost.toFixed(2)}
- Total Estimated Cost: ${currency}${totalEst.toFixed(2)}

RECOMMENDED FINISHING:
- Paper Stock: ${audit.suggestedPaper}
- Binding Option: ${audit.recommendedBinding}

Please inform me if you wish to apply custom finishing or adjust the print settings.`;

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: summaryText,
      },
    ]);
  }, [isOpen, activeSelectedFile, shopContext.pricingRates]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isGenerating) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: query },
    ];

    setMessages(newMessages);
    setInput("");
    setIsGenerating(true);

    // Prepare an empty assistant response placeholder for streaming
    const assistantIndex = newMessages.length;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "" },
    ]);

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      await streamChatWithCopilot(
        newMessages,
        shopContext,
        (token) => {
          setMessages((prev) => {
            const updated = [...prev];
            if (updated[assistantIndex]) {
              updated[assistantIndex] = {
                ...updated[assistantIndex],
                content: updated[assistantIndex].content + token,
              };
            }
            return updated;
          });
        },
        abortCtrl.signal
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[assistantIndex]) {
            updated[assistantIndex] = {
              ...updated[assistantIndex],
              content:
                "⚠️ *Could not reach local Ollama engine. Please verify Ollama is running in your taskbar.*",
            };
          }
          return updated;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: "assistant",
        content: "Conversation history cleared. I am prepared for your next instruction.",
      },
    ]);
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-[410px] flex-col border-l border-white/10 bg-zinc-950/90 backdrop-blur-2xl shadow-[-20px_0_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-right duration-200 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-[#131916] to-[#070a08] border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.25)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]"
            >
              <path d="M12 3.5v2.8m0 11.4v2.8m8.5-8.5h-2.8m-11.4 0H3.5m14.5-6l-2 2m-8 8l-2 2m12 0l-2-2m-8-8l-2-2" />
            </svg>
            <span
              className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-zinc-950 ${
                ollamaOnline
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]"
                  : "bg-amber-400"
              }`}
            />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
              Gwen
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-mono text-emerald-400">
                Printio AI
              </span>
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              {ollamaOnline ? "● Qwen 2.5 Connected" : "○ Checking Ollama..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Clear Chat"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Selected Document Context Banner - Only displayed when a file is actively selected */}
      {activeSelectedFile && (
        <div className="border-b border-white/5 bg-black/40 px-4 py-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span className="text-[11px] font-semibold text-zinc-200 truncate">
                {activeSelectedFile.original_name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded border border-white/5 whitespace-nowrap">
                {activeSelectedFile.pages || 1} pgs · {formatBytes(activeSelectedFile.file_size || 0)}
              </span>
              {onClearSelectedFile && (
                <button
                  onClick={onClearSelectedFile}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  title="Deselect file"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Preflight Chip Indicator */}
          {preflightData && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-medium text-zinc-300">
                <Layers className="h-2.5 w-2.5 text-blue-400" />
                {preflightData.colorPagesCount} Color / {preflightData.bwPagesCount} B&W
              </span>
              <span
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-medium border ${
                  preflightData.marginSafety === "Safe"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                {preflightData.marginSafety} Margins
              </span>
            </div>
          )}
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs font-sans scrollbar-thin scrollbar-thumb-zinc-700/40">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={index}
              className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] leading-relaxed select-text ${
                  isUser
                    ? "bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 rounded-tr-sm shadow-sm"
                    : "bg-black/50 text-zinc-200 border border-white/10 rounded-tl-sm shadow-inner"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans text-xs">
                  {formatCleanContent(msg.content)}
                  {isGenerating && index === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-400 animate-pulse align-middle" />
                  )}
                </div>
              </div>

              {isUser && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-800 border border-white/10 text-zinc-300">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="px-4 py-2 border-t border-white/5 bg-black/20">
        <p className="text-[10px] text-zinc-500 mb-1.5 font-medium">
          Quick Shop Actions:
        </p>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() =>
              handleQuickPrompt(
                `Please provide a formal document audit and cost quotation for "${shopContext.currentFileName || "the current document"}" (${shopContext.currentFilePages || 34} pages). Kindly itemize color versus black-and-white pages and total estimated charges.`
              )
            }
            className="flex items-center gap-1 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 px-2.5 py-1 text-[10px] text-zinc-300 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Layers className="h-3 w-3 text-emerald-400" /> Audit Color & Cost
          </button>
          <button
            onClick={() =>
              handleQuickPrompt(
                `Kindly prepare a formal quotation for 2 copies with spiral ring binding.`
              )
            }
            className="flex items-center gap-1 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 px-2.5 py-1 text-[10px] text-zinc-300 transition-colors whitespace-nowrap cursor-pointer"
          >
            <DollarSign className="h-3 w-3 text-amber-400" /> Spiral Binding Quote
          </button>
          <button
            onClick={() =>
              handleQuickPrompt(
                `Please evaluate the printable margins and recommend the appropriate paper stock for "${shopContext.currentFileName}".`
              )
            }
            className="flex items-center gap-1 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 px-2.5 py-1 text-[10px] text-zinc-300 transition-colors whitespace-nowrap cursor-pointer"
          >
            <ShieldCheck className="h-3 w-3 text-sky-400" /> Margin Check
          </button>
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-white/10 bg-black/40">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Gwen regarding documents, billing, or print jobs..."
            disabled={isGenerating}
            className="w-full rounded-xl bg-black/60 border border-white/10 py-2.5 pl-3.5 pr-10 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors"
          />

          {isGenerating ? (
            <button
              type="button"
              onClick={handleStop}
              className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
              title="Stop Generation"
            >
              <Square className="h-3 w-3" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition-all disabled:opacity-30 disabled:hover:bg-emerald-500 cursor-pointer"
              title="Send Message"
            >
              <Send className="h-3 w-3" />
            </button>
          )}
        </form>

        <div className="mt-2 flex items-center justify-between text-[9px] text-zinc-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" /> 100% On-Device &
            Private
          </span>
          <span>Press Enter to send</span>
        </div>
      </div>
    </div>
  );
}
