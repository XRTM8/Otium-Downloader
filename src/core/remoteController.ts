/**
 * Sovereign Remote Control Client & Companion Engine
 * Enables seamless control of Otium Desktop from mobile or other LAN devices.
 */

import type { DownloadStats, DownloadTask } from '../types/downloader';

export interface RemoteServerStatus {
  app: string;
  version: string;
  stats: DownloadStats;
  tasks: DownloadTask[];
}

export interface RemoteConnectionConfig {
  host: string;
  pin: string;
  autoConnect?: boolean;
}

const STORAGE_REMOTE_KEY = 'otium_remote_connection_v1';

export class RemoteController {
  private host = '';
  private pin = '';
  private isConnected = false;
  private isConnecting = false;
  private lastError: string | null = null;
  private pollInterval: number | null = null;
  private remoteStats: DownloadStats = {
    activeCount: 0,
    queuedCount: 0,
    completedCount: 0,
    totalBytesDownloaded: 0,
    currentTotalSpeed: 0,
    speedLimitBytesPerSec: 0
  };
  private remoteTasks: DownloadTask[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.restoreSavedConnection();
  }

  private getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
    return null;
  }

  private restoreSavedConnection() {
    try {
      const storage = this.getStorage();
      if (!storage) return;
      const raw = storage.getItem(STORAGE_REMOTE_KEY);
      if (raw) {
        const config: RemoteConnectionConfig = JSON.parse(raw);
        if (config.host && config.pin) {
          this.host = config.host;
          this.pin = config.pin;
        }
      }
    } catch {
      // Storage access fallback
    }
  }

  public saveConnection(host: string, pin: string) {
    this.host = host.trim();
    this.pin = pin.trim();
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.setItem(STORAGE_REMOTE_KEY, JSON.stringify({ host: this.host, pin: this.pin }));
      }
    } catch {}
  }

  public getConfig(): { host: string; pin: string; isConnected: boolean; isConnecting: boolean; lastError: string | null } {
    return {
      host: this.host,
      pin: this.pin,
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      lastError: this.lastError
    };
  }

  public getRemoteState(): { stats: DownloadStats; tasks: DownloadTask[] } {
    return {
      stats: this.remoteStats,
      tasks: this.remoteTasks
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private normalizeUrl(endpoint: string): string {
    let clean = this.host.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    return `${clean.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  }

  public async connect(host: string, pin: string): Promise<boolean> {
    this.saveConnection(host, pin);
    this.isConnecting = true;
    this.lastError = null;
    this.notify();

    try {
      const ok = await this.pollStatus();
      if (ok) {
        this.isConnected = true;
        this.isConnecting = false;
        this.lastError = null;
        this.startPolling();
        this.notify();
        return true;
      }
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : 'Connection failed';
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.notify();
    return false;
  }

  public disconnect() {
    this.isConnected = false;
    this.isConnecting = false;
    this.stopPolling();
    this.notify();
  }

  private startPolling() {
    this.stopPolling();
    this.pollInterval = window.setInterval(() => {
      if (this.isConnected) {
        this.pollStatus().catch(() => {});
      }
    }, 1500);
  }

  private stopPolling() {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public async pollStatus(): Promise<boolean> {
    if (!this.host || !this.pin) return false;

    const targetUrl = `${this.normalizeUrl('remote/status')}?pin=${encodeURIComponent(this.pin)}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);

    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'X-Otium-Pin': this.pin },
        signal: ctrl.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          if (data.stats) this.remoteStats = data.stats;
          if (Array.isArray(data.tasks)) this.remoteTasks = data.tasks;
          this.isConnected = true;
          this.lastError = null;
          this.notify();
          return true;
        }
      } else if (res.status === 401) {
        this.lastError = 'رمز PIN غير صحيح';
        this.isConnected = false;
        this.notify();
        return false;
      }
    } catch (e) {
      this.lastError = 'تعذر الوصول إلى حاسوبك على الشبكة';
    }

    return false;
  }

  public async sendAddDownload(url: string, filename?: string, segmentCount: number = 8): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const targetUrl = this.normalizeUrl('remote/add');
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Otium-Pin': this.pin
        },
        body: JSON.stringify({
          pin: this.pin,
          url,
          filename: filename || null,
          segmentCount
        })
      });

      if (res.ok) {
        await this.pollStatus();
        return true;
      }
    } catch (e) {
      console.warn('Failed to dispatch remote download:', e);
    }
    return false;
  }

  public async sendAction(
    action: 'pause' | 'resume' | 'restart' | 'remove' | 'pause_all' | 'resume_all',
    taskId?: string
  ): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const targetUrl = this.normalizeUrl('remote/action');
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Otium-Pin': this.pin
        },
        body: JSON.stringify({
          pin: this.pin,
          action,
          task_id: taskId || null
        })
      });

      if (res.ok) {
        await this.pollStatus();
        return true;
      }
    } catch (e) {
      console.warn('Failed to dispatch remote action:', e);
    }
    return false;
  }

  public async sendShutdown(): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const targetUrl = this.normalizeUrl('remote/shutdown');
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Otium-Pin': this.pin
        },
        body: JSON.stringify({
          pin: this.pin,
          action: 'shutdown'
        })
      });

      return res.ok;
    } catch {
      return false;
    }
  }
}

export const remoteController = new RemoteController();
