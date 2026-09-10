import React, { useState, useMemo } from "react";
import {
  Users,
  Smartphone,
  Laptop,
  Tablet,
  LogOut,
  ShieldCheck,
  Search,
  FileText,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Ban,
  ShieldAlert,
  X,
  Unlock,
} from "lucide-react";
import { SessionInfo, commands } from "../../lib/commands";

interface DeviceManagerViewProps {
  sessions: SessionInfo[];
  onKick?: (sessionId: string) => void;
  onBlock?: (sessionId: string) => void;
  onDisconnect?: (sessionId: string) => void;
  onBatchPrint?: (sessionId: string) => void;
}

interface ManagedUser {
  id: string;
  username: string;
  deviceName: string;
  osVersion: string;
  deviceType: "laptop" | "phone" | "tablet";
  status: "Uploading" | "Transferring" | "Idle" | "Active";
  filesCount: number;
  connectedTime: string;
}

const INITIAL_USERS: ManagedUser[] = [
  {
    id: "sess-laptop",
    username: "User #12",
    deviceName: "ThinkPad X1",
    osVersion: "Windows 11",
    deviceType: "laptop",
    status: "Uploading",
    filesCount: 3,
    connectedTime: "14m ago",
  },
  {
    id: "sess-iphone",
    username: "User #08",
    deviceName: "iPhone 15 Pro",
    osVersion: "iOS 17.4",
    deviceType: "phone",
    status: "Idle",
    filesCount: 1,
    connectedTime: "45m ago",
  },
  {
    id: "sess-android",
    username: "User #19",
    deviceName: "Galaxy S24 Ultra",
    osVersion: "Android 14",
    deviceType: "phone",
    status: "Transferring",
    filesCount: 2,
    connectedTime: "32m ago",
  },
];

export default function DeviceManagerView({
  sessions,
  onKick,
  onBlock,
  onDisconnect,
}: DeviceManagerViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [blockedUsers, setBlockedUsers] = useState<ManagedUser[]>([]);
  const [confirmBlockUser, setConfirmBlockUser] = useState<ManagedUser | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "info" | "warning";
  } | null>(null);

  // Sync with sessions prop if dynamic sessions are added, else fallback to INITIAL_USERS
  const activeUsers = useMemo(() => {
    // If backend has dynamic sessions not in INITIAL_USERS, map them cleanly
    const baseList: ManagedUser[] = [...INITIAL_USERS];

    sessions.forEach((s) => {
      const existing = baseList.find((u) => u.id === s.id);
      if (!existing && s.status === "active") {
        // Parse friendly name
        const parts = (s.device_name || "Guest User").split("·").map((p) => p.trim());
        const username = parts[0] || `User #${s.id.slice(-2)}`;
        const devName = parts[1] || (s.device_type === "laptop" ? "Laptop" : "Mobile Device");
        baseList.push({
          id: s.id,
          username,
          deviceName: devName,
          osVersion: s.device_type === "laptop" ? "Windows / macOS" : "iOS / Android",
          deviceType: s.device_type === "laptop" ? "laptop" : "phone",
          status: "Active",
          filesCount: s.file_count || 0,
          connectedTime: "Recently",
        });
      }
    });

    const blockedIds = new Set(blockedUsers.map((b) => b.id));
    return baseList.filter((u) => !removedIds.has(u.id) && !blockedIds.has(u.id));
  }, [sessions, removedIds, blockedUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return activeUsers;
    const q = searchQuery.toLowerCase();
    return activeUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.deviceName.toLowerCase().includes(q) ||
        u.osVersion.toLowerCase().includes(q)
    );
  }, [activeUsers, searchQuery]);

  const showToast = (text: string, type: "info" | "warning" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const handleDisconnect = async (user: ManagedUser) => {
    setRemovedIds((prev) => new Set([...prev, user.id]));
    showToast(`${user.username} (${user.deviceName}) session disconnected`, "info");
    if (onDisconnect) {
      onDisconnect(user.id);
    } else if (onKick) {
      onKick(user.id);
    }
    try {
      await commands.deleteSession(user.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmBlock = async (user: ManagedUser) => {
    setConfirmBlockUser(null);
    setBlockedUsers((prev) => [...prev, user]);
    showToast(`${user.username} (${user.deviceName}) has been blocked`, "warning");
    if (onBlock) {
      onBlock(user.id);
    } else if (onKick) {
      onKick(user.id);
    } else if (onDisconnect) {
      onDisconnect(user.id);
    }
    try {
      await commands.deleteSession(user.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnblock = (user: ManagedUser) => {
    setBlockedUsers((prev) => prev.filter((b) => b.id !== user.id));
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(user.id);
      return next;
    });
    showToast(`${user.username} has been unblocked`, "info");
  };

  const handleResetUsers = () => {
    setRemovedIds(new Set());
    setBlockedUsers([]);
    showToast("User session list reset to default", "info");
  };

  return (
    <div className="relative flex-1 h-full flex flex-col gap-3.5 p-1 min-h-0 select-none overflow-hidden font-sans">
      {/* View Header */}
      <div className="flex items-center justify-between bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl px-4 py-3 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100">User Manager</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.15)]">
                {activeUsers.length} Active
              </span>
              {blockedUsers.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-semibold text-rose-400 flex items-center gap-1 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
                  <Ban className="w-2.5 h-2.5" />
                  {blockedUsers.length} Blocked
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              Connected customer devices · Disconnect or block active user sessions
            </p>
          </div>
        </div>

        {/* Right Header: Search & Privacy Indicator */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user or device..."
              className="w-44 bg-black/40 border border-white/5 border-t-black/60 shadow-inner rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-400/50 transition-all"
            />
          </div>

          {/* Privacy Protection Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 border-t-black/60 shadow-inner text-[11px] text-zinc-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Privacy Guard Active</span>
          </div>
        </div>
      </div>

      {/* Main User Grid: Compact Bento Cards */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 flex flex-col gap-4">
        {filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-max content-start">
            {filteredUsers.map((user) => {
              const DeviceIcon =
                user.deviceType === "laptop"
                  ? Laptop
                  : user.deviceType === "tablet"
                  ? Tablet
                  : Smartphone;

              const statusColor =
                user.status === "Uploading"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.15)]"
                  : user.status === "Transferring"
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                  : user.status === "Active"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.15)]"
                  : "bg-zinc-700/20 border-zinc-700/40 text-zinc-400";

              const dotColor =
                user.status === "Uploading"
                  ? "bg-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.4)]"
                  : user.status === "Transferring"
                  ? "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                  : user.status === "Active"
                  ? "bg-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.4)]"
                  : "bg-zinc-500";

              return (
                <div
                  key={user.id}
                  className="bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:border-white/15 rounded-2xl p-3.5 flex flex-col justify-between transition-all group"
                >
                  {/* Card Header: Device Icon, Username, Device Name, Status Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-9 h-9 rounded-xl bg-black/40 border border-white/5 border-t-black/60 shadow-inner flex items-center justify-center text-zinc-200 flex-shrink-0">
                          <DeviceIcon className="w-4 h-4 text-zinc-300 group-hover:text-white transition-colors" />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#181a20] ${dotColor}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white truncate">
                            {user.username}
                          </h3>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {user.deviceName} · {user.osVersion}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full border text-[9px] font-bold tracking-wide uppercase flex-shrink-0 ${statusColor}`}
                      >
                        {user.status}
                      </span>
                    </div>

                    {/* Compact Activity Meta Info */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-black/40 rounded-xl px-2.5 py-1.5 border border-white/5 border-t-black/60 shadow-inner mb-3">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <FileText className="w-3 h-3 text-zinc-500" />
                        <span>{user.filesCount} file{user.filesCount === 1 ? "" : "s"} shared</span>
                      </span>
                      <span className="flex items-center gap-1 text-zinc-500">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <span>{user.connectedTime}</span>
                      </span>
                    </div>
                  </div>

                  {/* Dedicated User Manager Action Buttons: Disconnect & Block */}
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => handleDisconnect(user)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner text-zinc-300 hover:text-zinc-100 text-[11px] font-medium transition-all active:scale-95 cursor-pointer"
                      title={`Disconnect ${user.username}`}
                    >
                      <LogOut className="w-3 h-3 text-zinc-400" />
                      <span>Disconnect</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmBlockUser(user)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 text-[11px] font-semibold transition-all active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.15)] cursor-pointer"
                      title={`Block ${user.username} from network`}
                    >
                      <Ban className="w-3 h-3 text-rose-400" />
                      <span>Block</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State when all users are kicked/disconnected or no search matches */
          <div className="h-44 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 backdrop-blur-xl border border-dashed border-white/10 p-6 text-center shadow-lg">
            <div className="w-10 h-10 rounded-2xl bg-black/40 border border-white/5 border-t-black/60 shadow-inner flex items-center justify-center text-zinc-400 mb-2.5">
              <Users className="w-5 h-5 text-zinc-400" />
            </div>
            <h4 className="text-xs font-bold text-zinc-200 mb-1">
              {searchQuery ? "No matching users found" : "No Active Users Connected"}
            </h4>
            <p className="text-[11px] text-zinc-400 max-w-sm mb-3">
              {searchQuery
                ? `No user or device matched "${searchQuery}". Clear your search query to see all clients.`
                : "Customers who connect to the Wi-Fi hotspot and access the drop box will appear here."}
            </p>
            {(removedIds.size > 0 || blockedUsers.length > 0) && (
              <button
                type="button"
                onClick={handleResetUsers}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-medium text-emerald-300 transition-all active:scale-95 shadow-[0_0_15px_rgba(74,222,128,0.2)] cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Restore Connected Users
              </button>
            )}
          </div>
        )}

        {/* Blocked Users Section (if any users are currently blocked) */}
        {blockedUsers.length > 0 && (
          <div className="bg-gradient-to-b from-zinc-800/60 to-zinc-900/80 backdrop-blur-xl border border-rose-500/20 border-t-rose-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Ban className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-bold text-zinc-300">
                  Blocked Devices ({blockedUsers.length})
                </span>
              </div>
              <span className="text-[10px] text-zinc-500">
                Prevented from accessing hotspot upload queue
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {blockedUsers.map((bUser) => (
                <div
                  key={bUser.id}
                  className="bg-black/40 border border-rose-500/20 border-t-black/60 shadow-inner rounded-xl p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {bUser.username}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {bUser.deviceName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblock(bUser)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner text-zinc-300 hover:text-emerald-400 text-[10px] font-medium transition-colors cursor-pointer"
                    title="Unblock device"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>Unblock</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal Popup for Block */}
      {confirmBlockUser && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setConfirmBlockUser(null)}
        >
          <div
            className="bg-gradient-to-b from-zinc-800/90 to-zinc-900/95 backdrop-blur-2xl border border-white/10 border-t-white/20 rounded-3xl max-w-sm w-full p-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col gap-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">
                    Block Device & User
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Confirmation required
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmBlockUser(null)}
                className="w-7 h-7 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Target User Info Box */}
            <div className="bg-black/40 border border-white/5 border-t-black/60 shadow-inner rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-300">
                {confirmBlockUser.deviceType === "laptop" ? (
                  <Laptop className="w-4 h-4" />
                ) : (
                  <Smartphone className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-zinc-100 truncate">
                  {confirmBlockUser.username}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {confirmBlockUser.deviceName} · {confirmBlockUser.osVersion}
                </p>
              </div>
            </div>

            {/* Warning Explanation */}
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3 text-[11px] text-zinc-300 leading-relaxed shadow-inner">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p>
                Are you sure you want to block <strong className="text-rose-300">{confirmBlockUser.username}</strong>? Their session will be terminated and this device will be barred from uploading files to Printio.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmBlockUser(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 border-t-black/60 shadow-inner text-zinc-300 hover:text-zinc-100 text-xs font-medium transition-all active:scale-95 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleConfirmBlock(confirmBlockUser)}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-500 text-white text-xs font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Block Device</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Toast Feedback */}
      {toastMessage && (
        <div
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border shadow-[0_8px_25px_rgba(0,0,0,0.5)] transition-all animate-fade-in self-center ${
            toastMessage.type === "warning"
              ? "bg-rose-950/80 border-rose-500/40 text-rose-300"
              : "bg-zinc-900/90 border-white/10 text-zinc-200"
          }`}
        >
          {toastMessage.type === "warning" ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
