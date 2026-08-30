import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { DEFAULT_DISK_QUOTA, getDefaultStoragePath } from '../constants';
import { getTotalStorageUsed } from '../database/queries';

let storagePath: string | null = null;
let diskQuota: number = DEFAULT_DISK_QUOTA;

/**
 * Initializes the storage manager.
 * Creates the storage directory if it doesn't exist.
 */
export function initStorage(customPath?: string): void {
  storagePath = customPath || loadStorageSetting() || getDefaultStoragePath();
  fs.mkdirSync(storagePath, { recursive: true });
  console.log(`[Storage] Root directory: ${storagePath}`);
}

/**
 * Returns the current storage root path.
 */
export function getStoragePath(): string {
  if (!storagePath) {
    storagePath = getDefaultStoragePath();
    fs.mkdirSync(storagePath, { recursive: true });
  }
  return storagePath;
}

/**
 * Sets a new storage path and persists the setting.
 */
export function setStoragePath(newPath: string): void {
  fs.mkdirSync(newPath, { recursive: true });
  storagePath = newPath;
  saveStorageSetting(newPath);
  console.log(`[Storage] Updated root directory: ${newPath}`);
}

/**
 * Returns the current disk quota in bytes.
 */
export function getDiskQuota(): number {
  return diskQuota;
}

/**
 * Sets the disk quota in bytes.
 */
export function setDiskQuota(bytes: number): void {
  diskQuota = bytes;
  saveQuotaSetting(bytes);
}

/**
 * Checks if accepting a new file would exceed the disk quota.
 * Returns null if OK, error message if exceeded.
 */
export function checkDiskQuota(incomingBytes: number): string | null {
  const used = getTotalStorageUsed();
  if (used + incomingBytes > diskQuota) {
    const usedGB = (used / (1024 * 1024 * 1024)).toFixed(1);
    const quotaGB = (diskQuota / (1024 * 1024 * 1024)).toFixed(1);
    return `Storage quota exceeded: ${usedGB} GB used of ${quotaGB} GB limit.`;
  }
  return null;
}

/**
 * Returns disk usage statistics.
 */
export function getStorageStats(): {
  usedBytes: number;
  quotaBytes: number;
  freeBytes: number;
  percentUsed: number;
} {
  const used = getTotalStorageUsed();
  return {
    usedBytes: used,
    quotaBytes: diskQuota,
    freeBytes: Math.max(0, diskQuota - used),
    percentUsed: diskQuota > 0 ? Math.round((used / diskQuota) * 100) : 0,
  };
}

/**
 * Attempts to get available disk space on the storage volume.
 */
export function getSystemDiskFree(): number | null {
  try {
    const stats = fs.statfsSync(getStoragePath());
    return stats.bfree * stats.bsize;
  } catch {
    return null;
  }
}

// ── Settings Persistence ──────────────────────────────────────────

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'printio-settings.json');
}

function loadSettings(): Record<string, unknown> {
  try {
    const data = fs.readFileSync(getSettingsPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, unknown>): void {
  const settingsPath = getSettingsPath();
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function loadStorageSetting(): string | null {
  const settings = loadSettings();
  return typeof settings.storagePath === 'string' ? settings.storagePath : null;
}

function saveStorageSetting(storagePath: string): void {
  const settings = loadSettings();
  settings.storagePath = storagePath;
  saveSettings(settings);
}

function saveQuotaSetting(bytes: number): void {
  const settings = loadSettings();
  settings.diskQuota = bytes;
  saveSettings(settings);
}

/**
 * Loads saved settings on startup.
 */
export function loadSavedSettings(): void {
  const settings = loadSettings();
  if (typeof settings.diskQuota === 'number') {
    diskQuota = settings.diskQuota;
  }
}
