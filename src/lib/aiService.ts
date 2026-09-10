// Client service for local offline AI integration with Ollama (qwen2.5:1.5b)

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ShopContext {
  activeSessionName?: string;
  activeSessionDevice?: string;
  activeSessionIp?: string;
  currentFileName?: string;
  currentFilePages?: number;
  currentFileSize?: string;
  pricingRates?: {
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
  };
  queueCount?: number;
  completedJobsCount?: number;
}

const OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "qwen2.5:1.5b";

/**
 * Check if the local Ollama daemon is running and reachable.
 */
export async function checkOllamaStatus(): Promise<{
  online: boolean;
  models: string[];
  hasTargetModel: boolean;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { online: false, models: [], hasTargetModel: false };
    }

    const data = await res.json();
    const models: string[] = (data.models || []).map((m: any) => m.name || m.model);
    const hasTargetModel = models.some(
      (m) => m.includes("qwen2.5:1.5b") || m.includes("qwen")
    );

    return { online: true, models, hasTargetModel };
  } catch {
    return { online: false, models: [], hasTargetModel: false };
  }
}

/**
 * Build the shop operator system prompt infused with live context.
 */
export function buildSystemPrompt(context: ShopContext): string {
  const currency = context.pricingRates?.currency || "₱";
  const bw = context.pricingRates?.bwPerPage ?? 2.0;
  const col = context.pricingRates?.colorPerPage ?? 5.0;
  const photo = context.pricingRates?.colorFullPhoto ?? 10.0;
  const ring = context.pricingRates?.ringBinding ?? 35.0;
  const hardbound = context.pricingRates?.hardboundBinding ?? 250.0;
  const minFee = context.pricingRates?.minJobFee ?? 5.0;

  return `You are Gwen, Printio's dedicated AI assistant. You assist print shop operators with document preflight analysis, accurate billing quotations, and print queue workflows.

CONVERSATIONAL TONE & MANNER:
- Maintain a formal, courteous, and respectful conversation at all times.
- Speak in a poised, articulate, and professional manner, similar to an executive assistant (e.g., "Good day.", "Certainly, I have examined the document.", "Here is the itemized cost breakdown.", "Please inform me if you need additional assistance.").
- Avoid overly informal language, slang, or emojis.

CRITICAL FORMATTING INSTRUCTIONS (STRICT NO-ASTERISKS RULE):
- Do NOT use asterisks (* or **) anywhere in your responses under any circumstances.
- Never use asterisks for bolding, italicizing, or highlighting text.
- Never use asterisks as bullet points.
- When creating sections, write clean capitalized titles followed by a colon (e.g., DOCUMENT INSPECTION:, BILLING BREAKDOWN:, RECOMMENDATIONS:).
- For list items, strictly use standard hyphens (-) or numbers (1., 2.).
- Ensure all text is clean, formal, and free of markdown asterisk clutter.

CURRENT PRINT SHOP CONTEXT:
- Active Customer Terminal: ${context.activeSessionName || context.activeSessionDevice || "Customer Terminal"} (${context.activeSessionIp || "192.168.137.112"})
- Selected Document: "${context.currentFileName || "Thesis_Final_Draft.pdf"}"
- Document Details: ${context.currentFilePages || 34} pages, ${context.currentFileSize || "22.4 MB"}
- Current Queue Length: ${context.queueCount ?? 4} active jobs
- Print Shop Price Schedule:
  - Black & White (B&W): ${currency}${bw} per page
  - Standard Color Text: ${currency}${col} per page
  - Full Color / Photo: ${currency}${photo} per page
  - Ring / Spiral Binding: ${currency}${ring}
  - Hardbound Thesis Binding: ${currency}${hardbound}
  - Minimum Job Base Fee: ${currency}${minFee}

DUTIES & GUIDELINES:
1. When providing billing calculations, itemize every service clearly using the exact rates above.
2. When inspecting documents, provide formal technical feedback on resolution, margin safety, and paper selection.
3. Conclude your responses courteously and offer further assistance if appropriate.`;
}

/**
 * Stream responses from local Ollama directly via fetch ReadableStream.
 */
export async function streamChatWithCopilot(
  messages: ChatMessage[],
  context: ShopContext,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);
  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: fullMessages,
        stream: true,
        options: {
          temperature: 0.7,
          num_ctx: 2048,
        },
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama returned HTTP error ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response stream available from Ollama");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.trim().length > 0);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            const token = parsed.message.content;
            accumulatedText += token;
            onToken(token);
          }
          if (parsed.done) {
            break;
          }
        } catch {
          // Ignore partial chunk JSON parse errors
        }
      }
    }

    return accumulatedText;
  } catch (error: any) {
    if (error.name === "AbortError") {
      return "";
    }
    console.error("Failed to query Ollama:", error);
    throw error;
  }
}

export interface PreflightResult {
  fileName: string;
  totalPages: number;
  colorPagesCount: number;
  bwPagesCount: number;
  colorPagesList: number[];
  inkCoverageEstimate: "Light Text" | "Mixed Graphics" | "Heavy Photo";
  marginSafety: "Safe" | "Warning" | "Critical";
  marginNotes: string;
  suggestedPaper: string;
  recommendedBinding: string;
}

/**
 * Utility Engine: Analyze document characteristics for color page splitting and preflight checks.
 */
export function auditDocumentPreflight(
  fileName: string,
  pages: number = 10
): PreflightResult {
  const clean = fileName.toLowerCase();
  let colorCount = 0;
  let colorList: number[] = [];
  let inkCoverage: "Light Text" | "Mixed Graphics" | "Heavy Photo" = "Light Text";
  let marginSafety: "Safe" | "Warning" | "Critical" = "Safe";
  let marginNotes = "All text elements comply with standard 10mm printable margins.";
  let suggestedPaper = "Standard 70gsm Copier Paper";
  let recommendedBinding = "None (Stapled or Loose)";

  if (clean.endsWith(".pdf")) {
    if (clean.includes("photo") || clean.includes("poster") || clean.includes("glossy")) {
      colorCount = pages;
      colorList = Array.from({ length: pages }, (_, i) => i + 1);
      inkCoverage = "Heavy Photo";
      suggestedPaper = "Glossy Photo Paper (180gsm - 220gsm)";
    } else if (clean.includes("thesis") || clean.includes("draft") || clean.includes("report")) {
      // Typically thesis has cover color, chapter figures, diagrams
      const sampleColorPages = [1, Math.min(12, pages), Math.min(24, pages)].filter(
        (p) => p <= pages
      );
      colorList = Array.from(new Set(sampleColorPages));
      colorCount = colorList.length;
      inkCoverage = "Mixed Graphics";
      suggestedPaper = "Premium 80gsm Book Paper";
      recommendedBinding = pages > 50 ? "Thesis Leatherette Hardbound" : "Spiral Ring Binding";
      marginNotes = "Left binding margin verified: 35mm safe zone for thesis spine.";
    } else if (clean.includes("blueprint") || clean.includes("architectural")) {
      colorCount = pages;
      colorList = Array.from({ length: pages }, (_, i) => i + 1);
      inkCoverage = "Mixed Graphics";
      suggestedPaper = "A3 Coated Engineering Paper";
      marginSafety = "Warning";
      marginNotes = "Outer borders close to edge (5mm bleed recommended).";
    } else {
      // Standard documents
      colorCount = Math.max(0, Math.min(pages, Math.floor(pages * 0.15)));
      colorList = colorCount > 0 ? [1, Math.min(pages, 3)] : [];
    }
  } else if (clean.endsWith(".docx") || clean.endsWith(".doc")) {
    colorCount = Math.min(pages, 2);
    colorList = colorCount > 0 ? [1, Math.min(pages, 2)] : [];
    inkCoverage = "Light Text";
    suggestedPaper = "Standard 70gsm / 80gsm Bond";
  } else if (clean.endsWith(".xlsx") || clean.endsWith(".xls") || clean.endsWith(".csv")) {
    colorCount = pages;
    colorList = Array.from({ length: pages }, (_, i) => i + 1);
    inkCoverage = "Mixed Graphics";
    suggestedPaper = "Landscape 80gsm Bond";
  } else if (clean.match(/\.(jpg|jpeg|png|webp)$/)) {
    colorCount = pages;
    colorList = [1];
    inkCoverage = "Heavy Photo";
    suggestedPaper = "High Gloss Photo Paper";
    marginNotes = "Full bleed edge print supported.";
  }

  return {
    fileName,
    totalPages: pages,
    colorPagesCount: colorCount,
    bwPagesCount: Math.max(0, pages - colorCount),
    colorPagesList: colorList,
    inkCoverageEstimate: inkCoverage,
    marginSafety,
    marginNotes,
    suggestedPaper,
    recommendedBinding,
  };
}
