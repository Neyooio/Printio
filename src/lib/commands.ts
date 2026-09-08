import { invoke } from "@tauri-apps/api/core";

export interface SessionInfo {
  id: string;
  ip_address: string;
  device_name?: string;
  device_type?: "phone" | "android" | "laptop";
  is_pulsing?: boolean;
  created_at: string;
  last_activity: string;
  status: string;
  file_count: number;
  completed_count: number;
}

export interface UploadInfo {
  id: string;
  file_id: string;
  original_name: string;
  safe_name: string;
  file_type: string;
  file_size: number;
  uploaded_bytes: number;
  file_path: string | null;
  fingerprint: string;
  status: string;
  pages?: number;
  created_at: string;
  completed_at: string | null;
}

export interface StorageStats {
  total_used_bytes: number;
  file_count: number;
  active_sessions: number;
}

export interface ServerStatus {
  dns_running: boolean;
  http_running: boolean;
}

// Check if running inside Tauri webview
const isTauri =
  typeof window !== "undefined" &&
  Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

// In-memory mock state matching the user's dashboard mockup
let mockSessions: SessionInfo[] = [
  {
    id: "sess-iphone",
    ip_address: "192.168.137.45",
    device_name: "iPhone",
    device_type: "phone",
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString().replace("Z", ""),
    last_activity: new Date(Date.now() - 3 * 60 * 1000).toISOString().replace("Z", ""),
    status: "active",
    file_count: 2,
    completed_count: 2,
  },
  {
    id: "sess-android",
    ip_address: "192.168.137.89",
    device_name: "Android",
    device_type: "android",
    is_pulsing: true,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString().replace("Z", ""),
    last_activity: new Date(Date.now() - 1 * 60 * 1000).toISOString().replace("Z", ""),
    status: "active",
    file_count: 1,
    completed_count: 1,
  },
  {
    id: "sess-laptop",
    ip_address: "192.168.137.112",
    device_name: "User #12 · Laptop",
    device_type: "laptop",
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString().replace("Z", ""),
    last_activity: new Date(Date.now() - 30 * 1000).toISOString().replace("Z", ""),
    status: "active",
    file_count: 3,
    completed_count: 3,
  },
  {
    id: "sess-completed-1",
    ip_address: "192.168.137.54",
    device_name: "User #9 · iPad Pro",
    device_type: "phone",
    created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString().replace("Z", ""),
    last_activity: new Date(Date.now() - 120 * 60 * 1000).toISOString().replace("Z", ""),
    status: "printed",
    file_count: 4,
    completed_count: 4,
  },
  {
    id: "sess-completed-2",
    ip_address: "192.168.137.77",
    device_name: "User #5 · MacBook",
    device_type: "laptop",
    created_at: new Date(Date.now() - 240 * 60 * 1000).toISOString().replace("Z", ""),
    last_activity: new Date(Date.now() - 200 * 60 * 1000).toISOString().replace("Z", ""),
    status: "printed",
    file_count: 2,
    completed_count: 2,
  },
];

let mockFiles: Record<string, UploadInfo[]> = {
  "sess-laptop": [
    {
      id: "f-thesis",
      file_id: "file-thesis-01",
      original_name: "Thesis_Draft.pdf",
      safe_name: "thesis_draft.pdf",
      file_type: "application/pdf",
      file_size: 22400000,
      uploaded_bytes: 22400000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.112\\Thesis_Draft.pdf",
      fingerprint: "hash-pdf-001",
      status: "complete",
      pages: 34,
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: new Date(Date.now() - 9 * 60 * 1000).toISOString().replace("Z", ""),
    },
    {
      id: "f-costing",
      file_id: "file-costing-02",
      original_name: "Research_Data_Sheet.xlsx",
      safe_name: "research_data_sheet.xlsx",
      file_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      file_size: 5800000,
      uploaded_bytes: 5800000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.112\\Research_Data_Sheet.xlsx",
      fingerprint: "hash-xlsx-002",
      status: "complete",
      pages: 8,
      created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: new Date(Date.now() - 7 * 60 * 1000).toISOString().replace("Z", ""),
    },
    {
      id: "f-references",
      file_id: "file-references-03",
      original_name: "Bibliography_Notes.docx",
      safe_name: "bibliography_notes.docx",
      file_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      file_size: 2100000,
      uploaded_bytes: 2100000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.112\\Bibliography_Notes.docx",
      fingerprint: "hash-docx-003",
      status: "complete",
      pages: 14,
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: new Date(Date.now() - 4 * 60 * 1000).toISOString().replace("Z", ""),
    },
  ],
  "sess-android": [
    {
      id: "f-android-1",
      file_id: "file-android-01",
      original_name: "Quarterly_Summary_Deck.pptx",
      safe_name: "quarterly_summary_deck.pptx",
      file_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      file_size: 16800000,
      uploaded_bytes: 16800000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.89\\Quarterly_Summary_Deck.pptx",
      fingerprint: "hash-pptx-001",
      status: "complete",
      pages: 22,
      created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: new Date(Date.now() - 13 * 60 * 1000).toISOString().replace("Z", ""),
    },
  ],
  "sess-iphone": [
    {
      id: "f-iphone-1",
      file_id: "file-iphone-01",
      original_name: "Conference_Poster_Print.pdf",
      safe_name: "conference_poster_print.pdf",
      file_type: "application/pdf",
      file_size: 12400000,
      uploaded_bytes: 12400000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.45\\Conference_Poster_Print.pdf",
      fingerprint: "hash-pdf-002",
      status: "complete",
      pages: 1,
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: new Date(Date.now() - 24 * 60 * 1000).toISOString().replace("Z", ""),
    },
    {
      id: "f-iphone-2",
      file_id: "file-iphone-02",
      original_name: "Flyer_DoubleSided.pdf",
      safe_name: "flyer_doublesided.pdf",
      file_type: "application/pdf",
      file_size: 4200000,
      uploaded_bytes: 4200000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.45\\Flyer_DoubleSided.pdf",
      fingerprint: "hash-pdf-003",
      status: "complete",
      pages: 2,
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: new Date(Date.now() - 19 * 60 * 1000).toISOString().replace("Z", ""),
    },
  ],
};

export const commands = {
  getSessions: async (): Promise<SessionInfo[]> => {
    if (isTauri) return invoke<SessionInfo[]>("get_sessions");
    return [...mockSessions];
  },

  getSessionFiles: async (sessionId: string): Promise<UploadInfo[]> => {
    if (isTauri) return invoke<UploadInfo[]>("get_session_files", { sessionId });
    return [...(mockFiles[sessionId] || [])];
  },

  markJobComplete: async (sessionId: string): Promise<void> => {
    if (isTauri) return invoke<void>("mark_job_complete", { sessionId });
    mockSessions = mockSessions.map((s) =>
      s.id === sessionId ? { ...s, status: "printed" } : s
    );
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    if (isTauri) return invoke<void>("delete_session", { sessionId });
    mockSessions = mockSessions.filter((s) => s.id !== sessionId);
    delete mockFiles[sessionId];
  },

  clearAllCompleted: async (): Promise<void> => {
    mockSessions = mockSessions.filter((s) => s.status === "active");
  },

  deleteFile: async (sessionId: string, fileId: string): Promise<void> => {
    if (mockFiles[sessionId]) {
      mockFiles[sessionId] = mockFiles[sessionId].filter((f) => f.id !== fileId && f.file_id !== fileId);
    }
  },

  getStorageStats: async (): Promise<StorageStats> => {
    if (isTauri) return invoke<StorageStats>("get_storage_stats");
    return {
      total_used_bytes: 1.2 * 1024 * 1024 * 1024,
      file_count: Object.values(mockFiles).flat().length,
      active_sessions: mockSessions.filter((s) => s.status === "active").length,
    };
  },

  getStorageCap: async (): Promise<number> => {
    if (isTauri) return invoke<number>("get_storage_cap");
    return 10 * 1024 * 1024 * 1024; // 10 GB to match user's mockup
  },

  openInWord: async (filePath: string): Promise<void> => {
    if (isTauri) return invoke<void>("open_in_word", { filePath });
    console.log("[Mock Preview] Opening in Word:", filePath);
  },

  openInDefault: async (filePath: string): Promise<void> => {
    if (isTauri) return invoke<void>("open_in_default", { filePath });
    console.log("[Mock Preview] Opening in default viewer:", filePath);
  },

  openInExplorer: async (filePath: string): Promise<void> => {
    if (isTauri) return invoke<void>("open_in_explorer", { filePath });
    console.log("[Mock Preview] Opening in file explorer:", filePath);
  },

  copyPath: async (filePath: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(filePath);
    } catch {
      console.log("[Clipboard Fallback] Copied path:", filePath);
    }
  },

  getServerStatus: async (): Promise<ServerStatus> => {
    if (isTauri) return invoke<ServerStatus>("get_server_status");
    return {
      dns_running: true,
      http_running: true,
    };
  },

  getGatewayIp: async (): Promise<string> => {
    if (isTauri) return invoke<string>("get_gateway_ip");
    return "192.168.137.1";
  },

  configureFirewall: async (): Promise<string> => {
    if (isTauri) return invoke<string>("configure_firewall");
    return "Firewall configured (mock)";
  },

  checkFirewall: async (): Promise<boolean> => {
    if (isTauri) return invoke<boolean>("check_firewall");
    return true;
  },
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr + "Z");
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function getFileColor(ext: string): string {
  const map: Record<string, string> = {
    pdf: "from-red-500 to-rose-600",
    docx: "from-blue-500 to-indigo-600",
    doc: "from-blue-500 to-indigo-600",
    xlsx: "from-emerald-500 to-green-600",
    pptx: "from-orange-500 to-amber-600",
    jpg: "from-violet-500 to-purple-600",
    jpeg: "from-violet-500 to-purple-600",
    png: "from-violet-500 to-purple-600",
  };
  return map[ext] || "from-gray-500 to-gray-600";
}