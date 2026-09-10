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
  name?: string;
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
export let mockSessions: SessionInfo[] = [
  {
    id: "sess-iphone",
    ip_address: "192.168.137.45",
    device_name: "iPhone",
    device_type: "phone",
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString().replace("Z", ""),
    last_activity: new Date(Date.now() - 3 * 60 * 1000).toISOString().replace("Z", ""),
    status: "active",
    file_count: 3,
    completed_count: 3,
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
    file_count: 2,
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
    file_count: 5,
    completed_count: 5,
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

export let mockFiles: Record<string, UploadInfo[]> = {
  "sess-laptop": [
    {
      id: "f-blueprint-pdf",
      file_id: "file-blueprint-01",
      original_name: "Architecture_Blueprint.pdf",
      safe_name: "architecture_blueprint.pdf",
      file_type: "application/pdf",
      file_size: 4500000,
      uploaded_bytes: 4500000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.112\\Architecture_Blueprint.pdf",
      fingerprint: "hash-pdf-001",
      status: "complete",
      pages: 1,
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: new Date(Date.now() - 9 * 60 * 1000).toISOString().replace("Z", ""),
    },
    {
      id: "f-schematic-pdf",
      file_id: "file-schematic-02",
      original_name: "Schematic_001.pdf",
      safe_name: "schematic_001.pdf",
      file_type: "application/pdf",
      file_size: 2400000,
      uploaded_bytes: 2400000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.112\\Schematic_001.pdf",
      fingerprint: "hash-pdf-002",
      status: "complete",
      pages: 3,
      created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: new Date(Date.now() - 7 * 60 * 1000).toISOString().replace("Z", ""),
    },
    {
      id: "f-siteplan-pdf",
      file_id: "file-siteplan-03",
      original_name: "Site_Plan_Revision.pdf",
      safe_name: "site_plan_revision.pdf",
      file_type: "application/pdf",
      file_size: 15800000,
      uploaded_bytes: 15800000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.112\\Site_Plan_Revision.pdf",
      fingerprint: "hash-pdf-003",
      status: "complete",
      pages: 12,
      created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: new Date(Date.now() - 5 * 60 * 1000).toISOString().replace("Z", ""),
    },
    {
      id: "f-blueprint",
      file_id: "file-blueprint-04",
      original_name: "Architecture_Blueprint.png",
      safe_name: "architecture_blueprint.png",
      file_type: "image/png",
      file_size: 4700000,
      uploaded_bytes: 4700000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.112\\Architecture_Blueprint.png",
      fingerprint: "hash-png-004",
      status: "complete",
      pages: 1,
      created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: new Date(Date.now() - 2 * 60 * 1000).toISOString().replace("Z", ""),
    },
    {
      id: "f-slides",
      file_id: "file-slides-05",
      original_name: "Project_Pitch_Deck.pptx",
      safe_name: "project_pitch_deck.pptx",
      file_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      file_size: 14200000,
      uploaded_bytes: 14200000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.112\\Project_Pitch_Deck.pptx",
      fingerprint: "hash-pptx-005",
      status: "complete",
      pages: 18,
      created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: new Date(Date.now() - 1 * 60 * 1000).toISOString().replace("Z", ""),
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
    {
      id: "f-android-2",
      file_id: "file-android-02",
      original_name: "Budget_Forecast_2026.xlsx",
      safe_name: "budget_forecast_2026.xlsx",
      file_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      file_size: 3400000,
      uploaded_bytes: 3400000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.89\\Budget_Forecast_2026.xlsx",
      fingerprint: "hash-xlsx-003",
      status: "transferring",
      pages: 4,
      created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: null,
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
      original_name: "Campus_ID_Badge.jpg",
      safe_name: "campus_id_badge.jpg",
      file_type: "image/jpeg",
      file_size: 3100000,
      uploaded_bytes: 3100000,
      file_path: "C:\\PrintioData\\sessions\\192.168.137.45\\Campus_ID_Badge.jpg",
      fingerprint: "hash-jpg-002",
      status: "complete",
      pages: 1,
      created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString().replace("Z", ""),
      completed_at: new Date(Date.now() - 17 * 60 * 1000).toISOString().replace("Z", ""),
    },
    {
      id: "f-iphone-3",
      file_id: "file-iphone-03",
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
    if (isTauri) {
      try {
        const live = await invoke<SessionInfo[]>("get_sessions");
        if (live && live.length > 0) {
          return live;
        }
      } catch (e) {
        console.warn("get_sessions failed or returned empty, using mock data:", e);
      }
    }
    return [...mockSessions];
  },

  getSessionFiles: async (sessionId: string): Promise<UploadInfo[]> => {
    if (isTauri) {
      try {
        const live = await invoke<UploadInfo[]>("get_session_files", { sessionId });
        if (live && live.length > 0) {
          return live;
        }
      } catch (e) {
        console.warn("get_session_files failed, checking mockFiles:", e);
      }
    }
    return [...(mockFiles[sessionId] || [])];
  },

  markJobComplete: async (sessionId: string): Promise<void> => {
    if (isTauri) {
      try {
        await invoke<void>("mark_job_complete", { sessionId });
      } catch (e) {
        console.warn("mark_job_complete tauri fallback:", e);
      }
    }
    mockSessions = mockSessions.map((s) =>
      s.id === sessionId ? { ...s, status: "printed" } : s
    );
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    if (isTauri) {
      try {
        await invoke<void>("delete_session", { sessionId });
      } catch (e) {
        console.warn("delete_session tauri fallback:", e);
      }
    }
    mockSessions = mockSessions.filter((s) => s.id !== sessionId);
    delete mockFiles[sessionId];
  },

  clearAllCompleted: async (): Promise<void> => {
    if (isTauri) {
      try {
        await invoke<void>("clear_all_completed");
      } catch (e) {
        console.warn("clear_all_completed tauri fallback:", e);
      }
    }
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