import type { DownloadTask, AppSettings } from '../types/downloader';
import { detectCategory } from './segmentation';

export const STORAGE_TASKS_KEY = 'otium_download_tasks_v1';
export const STORAGE_SETTINGS_KEY = 'otium_settings_v1';

/**
 * Safely resolves the available browser or runtime localStorage engine.
 */
export function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
      return (globalThis as unknown as { localStorage: Storage }).localStorage;
    }
  } catch {
    // Storage access blocked or unavailable
  }
  return null;
}

/**
 * Loads and sanitizes persisted download tasks from local storage.
 * Tasks in 'downloading' state are automatically reset to 'paused' to prevent zombie states.
 */
export function loadTasksFromStorage(): DownloadTask[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(STORAGE_TASKS_KEY);
    if (!raw) return [];

    const parsed: DownloadTask[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((task) => {
      // Backfill category if missing
      if (!task.category) {
        task.category = detectCategory(task.filename);
      }
      // If task was downloading when the app terminated or refreshed, restore it as paused
      if (task.status === 'downloading') {
        task.status = 'paused';
        task.speedBytesPerSec = 0;
        task.etaSeconds = 0;
      }
      return task;
    });
  } catch (error) {
    console.warn('[Otium Storage] Failed to load tasks from storage:', error);
    return [];
  }
}

/**
 * Persists an array of download tasks to local storage.
 */
export function saveTasksToStorage(tasks: DownloadTask[]): boolean {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.warn('[Otium Storage] Storage quota reached, compacting completed history:', error);
    try {
      // Retain all non-completed tasks and the 50 most recent completed tasks
      const activeOrPending = tasks.filter((t) => t.status !== 'completed');
      const recentCompleted = tasks
        .filter((t) => t.status === 'completed')
        .sort((a, b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt))
        .slice(0, 50);
      const compacted = [...activeOrPending, ...recentCompleted];
      storage.setItem(STORAGE_TASKS_KEY, JSON.stringify(compacted));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Loads application settings from local storage.
 */
export function loadSettingsFromStorage(): Partial<AppSettings> | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return null;

    const parsed: Partial<AppSettings> = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    return parsed;
  } catch (error) {
    console.warn('[Otium Storage] Failed to load settings from storage:', error);
    return null;
  }
}

/**
 * Persists application settings to local storage.
 */
export function saveSettingsToStorage(settings: AppSettings): boolean {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.warn('[Otium Storage] Failed to persist settings to storage:', error);
    return false;
  }
}

/**
 * Clears all Otium-related stored data (useful for resets or testing).
 */
export function clearAllStoredData(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_TASKS_KEY);
    storage.removeItem(STORAGE_SETTINGS_KEY);
  } catch (error) {
    console.warn('[Otium Storage] Failed to clear storage:', error);
  }
}
