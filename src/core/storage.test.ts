import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadTasksFromStorage,
  saveTasksToStorage,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  clearAllStoredData,
  STORAGE_TASKS_KEY,
  STORAGE_SETTINGS_KEY
} from './storage';
import type { DownloadTask, AppSettings } from '../types/downloader';

describe('Storage Module', () => {
  let memoryStorage: Record<string, string> = {};

  beforeEach(() => {
    memoryStorage = {};
    const mockStorage: Storage = {
      getItem: (k: string) => memoryStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        memoryStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete memoryStorage[k];
      },
      clear: () => {
        memoryStorage = {};
      },
      key: (i: number) => Object.keys(memoryStorage)[i] ?? null,
      length: 0
    };
    (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
  });

  afterEach(() => {
    delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
  });

  it('returns empty array when storage is uninitialized or invalid JSON', () => {
    expect(loadTasksFromStorage()).toEqual([]);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    memoryStorage[STORAGE_TASKS_KEY] = 'invalid-json';
    expect(loadTasksFromStorage()).toEqual([]);
    warnSpy.mockRestore();
  });

  it('saves and loads tasks properly with category backfill and downloading-to-paused reset', () => {
    const mockTasks: DownloadTask[] = [
      {
        id: 'task-1',
        url: 'https://example.com/installer.exe',
        filename: 'installer.exe',
        totalBytes: 1048576,
        downloadedBytes: 524288,
        status: 'downloading',
        speedBytesPerSec: 100000,
        etaSeconds: 5,
        chunks: [],
        createdAt: 1000
      },
      {
        id: 'task-2',
        url: 'https://example.com/document.pdf',
        filename: 'document.pdf',
        totalBytes: 5000,
        downloadedBytes: 5000,
        status: 'completed',
        speedBytesPerSec: 0,
        etaSeconds: 0,
        chunks: [],
        createdAt: 2000,
        category: 'documents'
      }
    ];

    expect(saveTasksToStorage(mockTasks)).toBe(true);

    const loaded = loadTasksFromStorage();
    expect(loaded.length).toBe(2);

    // Task 1 was downloading -> should now be paused, speed 0, eta 0, category detected
    expect(loaded[0].status).toBe('paused');
    expect(loaded[0].speedBytesPerSec).toBe(0);
    expect(loaded[0].etaSeconds).toBe(0);
    expect(loaded[0].category).toBe('programs');

    // Task 2 was completed -> status preserved, category preserved
    expect(loaded[1].status).toBe('completed');
    expect(loaded[1].category).toBe('documents');
  });

  it('saves and loads application settings', () => {
    expect(loadSettingsFromStorage()).toBeNull();

    const settings: AppSettings = {
      maxConcurrentDownloads: 5,
      globalSpeedLimitBytes: 2097152,
      enableNotifications: false,
      enableSound: true,
      defaultDirectory: '/custom/downloads'
    };

    expect(saveSettingsToStorage(settings)).toBe(true);

    const loaded = loadSettingsFromStorage();
    expect(loaded).toEqual(settings);
  });

  it('clears all stored keys with clearAllStoredData', () => {
    saveTasksToStorage([]);
    saveSettingsToStorage({
      maxConcurrentDownloads: 3,
      globalSpeedLimitBytes: 0,
      enableNotifications: true,
      enableSound: true,
      defaultDirectory: 'Downloads'
    });

    expect(memoryStorage[STORAGE_TASKS_KEY]).toBeDefined();
    expect(memoryStorage[STORAGE_SETTINGS_KEY]).toBeDefined();

    clearAllStoredData();

    expect(memoryStorage[STORAGE_TASKS_KEY]).toBeUndefined();
    expect(memoryStorage[STORAGE_SETTINGS_KEY]).toBeUndefined();
  });
});
