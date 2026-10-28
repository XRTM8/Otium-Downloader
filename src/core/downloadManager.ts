import type { DownloadTask, DownloadStats } from '../types/downloader';
import { calculateSegments, extractFilename } from './segmentation';

// Check for Tauri native runtime
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export interface ProbeResult {
  content_length?: number;
  accept_ranges: boolean;
  content_type?: string;
  suggested_filename?: string;
}

export class DownloadManager {
  private tasks: Map<string, DownloadTask> = new Map();
  private listeners: Set<() => void> = new Set();
  private activeInterval: number | null = null;
  private tauriUnlisten: (() => void) | null = null;
  private defaultDownloadDir: string | null = null;

  constructor() {
    this.startTelemetryLoop();
    this.initTauriListeners();
    this.initDefaultDirectory();
  }

  private async initDefaultDirectory() {
    if (!isTauri()) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      this.defaultDownloadDir = await invoke<string>('get_default_download_directory');
    } catch {
      // Running in web or fallback mode
    }
  }

  private async initTauriListeners() {
    if (!isTauri()) return;
    try {
      const { listen } = await import('@tauri-apps/api/event');
      const unlisten = await listen<{
        task_id: string;
        segment_index: number;
        delta_bytes: number;
        downloaded_bytes: number;
        total_bytes: number;
        is_finished: boolean;
      }>('download-progress', (event) => {
        const { task_id, segment_index, delta_bytes, downloaded_bytes, is_finished } = event.payload;
        this.handleTauriChunkProgress(task_id, segment_index, delta_bytes, downloaded_bytes, is_finished);
      });
      this.tauriUnlisten = unlisten;
    } catch {
      // Running outside Tauri window or in unit tests
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getTasks(): DownloadTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getStats(): DownloadStats {
    let activeCount = 0;
    let completedCount = 0;
    let totalBytesDownloaded = 0;
    let currentTotalSpeed = 0;

    for (const task of this.tasks.values()) {
      if (task.status === 'downloading') {
        activeCount++;
        currentTotalSpeed += task.speedBytesPerSec;
      } else if (task.status === 'completed') {
        completedCount++;
      }
      totalBytesDownloaded += task.downloadedBytes;
    }

    return {
      activeCount,
      completedCount,
      totalBytesDownloaded,
      currentTotalSpeed
    };
  }

  public async probe(url: string): Promise<ProbeResult | null> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<ProbeResult>('probe_url', { url });
      } catch {
        // Fallback
      }
    }
    return null;
  }

  public addTask(
    url: string,
    customFilename?: string,
    segmentCount: number = 8,
    expectedSha256?: string
  ): string {
    const id = 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const filename = customFilename?.trim() || extractFilename(url);
    const totalBytes = 50 * 1024 * 1024; // 50MB default estimation

    const chunks = calculateSegments(totalBytes, segmentCount);

    const baseDir = this.defaultDownloadDir || 'Downloads';
    const separator = baseDir.includes('\\') ? '\\' : '/';
    const initialPath = `${baseDir}${separator}${filename}`;

    const task: DownloadTask = {
      id,
      url,
      filename,
      totalBytes,
      downloadedBytes: 0,
      status: 'downloading',
      speedBytesPerSec: 0,
      etaSeconds: 0,
      chunks,
      createdAt: Date.now(),
      savePath: initialPath,
      checksum: expectedSha256?.trim()
        ? {
            algorithm: 'sha256',
            expected: expectedSha256.trim().toLowerCase(),
            verified: false
          }
        : undefined
    };

    this.tasks.set(id, task);
    this.notify();

    if (isTauri()) {
      void (async () => {
        try {
          const probeData = await this.probe(url);
          if (probeData?.content_length && probeData.content_length > 0) {
            task.totalBytes = probeData.content_length;
            task.chunks = calculateSegments(task.totalBytes, segmentCount);
          }
          if (probeData?.suggested_filename && !customFilename?.trim()) {
            task.filename = probeData.suggested_filename;
            const currentBase = this.defaultDownloadDir || 'Downloads';
            const sep = currentBase.includes('\\') ? '\\' : '/';
            task.savePath = `${currentBase}${sep}${task.filename}`;
          }
          this.notify();
          await this.startNativeDownload(task);
        } catch {
          // Fallback
        }
      })();
    }

    return id;
  }

  private async startNativeDownload(task: DownloadTask) {
    if (!isTauri()) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const destinationPath = task.savePath || task.filename;

      // 1. Prepare target file & directory
      await invoke('prepare_download_file', {
        destinationPath,
        totalBytes: task.totalBytes > 0 ? task.totalBytes : 0
      });

      // 2. Launch segments that are not yet finished
      const unfinishedChunks = task.chunks.filter((c) => c.status !== 'completed');

      const promises = unfinishedChunks.map((chunk) =>
        invoke('download_segment', {
          taskId: task.id,
          url: task.url,
          destinationPath,
          startByte: chunk.startByte,
          endByte: chunk.endByte,
          currentDownloaded: chunk.downloaded || 0,
          segmentIndex: chunk.index
        })
      );

      await Promise.all(promises);

      // Guard: if task was paused/cancelled while downloading, don't finalize
      if (task.status !== 'downloading') {
        return;
      }

      const allDone = task.chunks.every((c) => c.status === 'completed');
      if (!allDone) {
        return;
      }

      // 3. Verify checksum if supplied
      if (task.checksum?.expected) {
        try {
          const actualHash = await invoke<string>('verify_file_sha256', {
            filePath: destinationPath
          });
          task.checksum.actual = actualHash.toLowerCase();
          task.checksum.verified = task.checksum.actual === task.checksum.expected;
        } catch {
          // Verification fallback
        }
      }

      task.status = 'completed';
      task.completedAt = Date.now();
      task.speedBytesPerSec = 0;
      task.etaSeconds = 0;
      this.notify();
    } catch (err) {
      console.warn('Native download exception:', err);
    }
  }

  private handleTauriChunkProgress(
    taskId: string,
    segmentIndex: number,
    deltaBytes: number,
    downloadedBytes: number,
    isFinished: boolean
  ) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const chunk = task.chunks.find((c) => c.index === segmentIndex);
    if (chunk) {
      chunk.downloaded = downloadedBytes;
      chunk.status = isFinished ? 'completed' : 'downloading';
    }

    task.downloadedBytes = Math.min(
      task.totalBytes,
      task.chunks.reduce((acc, c) => acc + c.downloaded, 0)
    );

    if (deltaBytes > 0) {
      task.speedBytesPerSec = deltaBytes * 4; // instantaneous estimate
      const remainingBytes = Math.max(0, task.totalBytes - task.downloadedBytes);
      task.etaSeconds = task.speedBytesPerSec > 0 ? Math.ceil(remainingBytes / task.speedBytesPerSec) : 0;
    }

    if (isFinished && task.chunks.every((c) => c.status === 'completed')) {
      task.status = 'completed';
      task.completedAt = Date.now();
      task.speedBytesPerSec = 0;
      task.etaSeconds = 0;
    }

    this.notify();
  }

  public pauseTask(id: string) {
    const task = this.tasks.get(id);
    if (task && task.status === 'downloading') {
      task.status = 'paused';
      task.speedBytesPerSec = 0;
      task.etaSeconds = 0;
      if (isTauri()) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('cancel_task', { taskId: id }).catch(() => {});
        });
      }
      this.notify();
    }
  }

  public resumeTask(id: string) {
    const task = this.tasks.get(id);
    if (task && (task.status === 'paused' || task.status === 'error')) {
      task.status = 'downloading';
      this.notify();
      if (isTauri()) {
        this.startNativeDownload(task);
      }
    }
  }

  public pauseAll() {
    for (const task of this.tasks.values()) {
      if (task.status === 'downloading') {
        this.pauseTask(task.id);
      }
    }
    this.notify();
  }

  public resumeAll() {
    for (const task of this.tasks.values()) {
      if (task.status === 'paused' || task.status === 'error') {
        this.resumeTask(task.id);
      }
    }
    this.notify();
  }

  public removeTask(id: string) {
    if (isTauri()) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('cancel_task', { taskId: id }).catch(() => {});
      });
    }
    this.tasks.delete(id);
    this.notify();
  }

  public clearCompleted() {
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'completed') {
        this.tasks.delete(id);
      }
    }
    this.notify();
  }

  public async openFolder(filePath?: string) {
    if (!filePath || !isTauri()) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_destination_folder', { filePath });
    } catch (e) {
      console.warn('Failed to open folder:', e);
    }
  }

  public async verifyHash(id: string): Promise<string | null> {
    const task = this.tasks.get(id);
    if (!task || !task.savePath) return null;
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const hash = await invoke<string>('verify_file_sha256', { filePath: task.savePath });
        if (!task.checksum) {
          task.checksum = { algorithm: 'sha256' };
        }
        task.checksum.actual = hash.toLowerCase();
        if (task.checksum.expected) {
          task.checksum.verified = task.checksum.actual === task.checksum.expected;
        }
        this.notify();
        return hash;
      } catch {
        return null;
      }
    }
    return null;
  }

  public updateTaskProgress(id: string, deltaBytes: number) {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'downloading') return;

    task.downloadedBytes = Math.min(task.totalBytes, task.downloadedBytes + deltaBytes);

    let remaining = task.downloadedBytes;
    for (const chunk of task.chunks) {
      const chunkTotal = chunk.endByte - chunk.startByte + 1;
      if (remaining >= chunkTotal) {
        chunk.downloaded = chunkTotal;
        chunk.status = 'completed';
        remaining -= chunkTotal;
      } else {
        chunk.downloaded = remaining;
        chunk.status = remaining > 0 ? 'downloading' : 'pending';
        remaining = 0;
      }
    }

    if (task.downloadedBytes >= task.totalBytes) {
      task.status = 'completed';
      task.completedAt = Date.now();
      task.speedBytesPerSec = 0;
      task.etaSeconds = 0;
    }

    this.notify();
  }

  private startTelemetryLoop() {
    if (typeof window === 'undefined') return;

    this.activeInterval = window.setInterval(() => {
      // In native Tauri mode, events handle progress
      if (isTauri()) return;

      let hasChanges = false;
      for (const task of this.tasks.values()) {
        if (task.status === 'downloading') {
          const baseThroughput = 4.2 * 1024 * 1024; // ~4.2 MB/s
          const jitter = (Math.random() - 0.45) * 800 * 1024;
          const currentSpeed = Math.max(1024 * 500, baseThroughput + jitter);
          task.speedBytesPerSec = Math.round(currentSpeed);

          const stepBytes = Math.round(currentSpeed / 4); // 250ms tick
          this.updateTaskProgress(task.id, stepBytes);

          const remainingBytes = Math.max(0, task.totalBytes - task.downloadedBytes);
          task.etaSeconds = task.speedBytesPerSec > 0 ? Math.ceil(remainingBytes / task.speedBytesPerSec) : 0;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        this.notify();
      }
    }, 250);
  }

  public destroy() {
    if (this.activeInterval !== null) {
      window.clearInterval(this.activeInterval);
      this.activeInterval = null;
    }
    if (this.tauriUnlisten) {
      this.tauriUnlisten();
      this.tauriUnlisten = null;
    }
    this.listeners.clear();
  }
}

export const downloadManager = new DownloadManager();
