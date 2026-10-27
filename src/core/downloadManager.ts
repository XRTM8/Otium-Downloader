import type { DownloadTask, DownloadStats } from '../types/downloader';
import { calculateSegments, extractFilename } from './segmentation';

export class DownloadManager {
  private tasks: Map<string, DownloadTask> = new Map();
  private listeners: Set<() => void> = new Set();
  private activeInterval: number | null = null;

  constructor() {
    this.startTelemetryLoop();
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

  public addTask(url: string, customFilename?: string, segmentCount: number = 4): string {
    const id = 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const filename = customFilename?.trim() || extractFilename(url);

    // Initial estimation or placeholder before probe
    const estimatedTotal = 25 * 1024 * 1024; // 25 MB placeholder
    const chunks = calculateSegments(estimatedTotal, segmentCount);

    const task: DownloadTask = {
      id,
      url,
      filename,
      totalBytes: estimatedTotal,
      downloadedBytes: 0,
      status: 'downloading',
      speedBytesPerSec: 0,
      etaSeconds: 0,
      chunks,
      createdAt: Date.now()
    };

    this.tasks.set(id, task);
    this.notify();
    return id;
  }

  public pauseTask(id: string) {
    const task = this.tasks.get(id);
    if (task && task.status === 'downloading') {
      task.status = 'paused';
      task.speedBytesPerSec = 0;
      task.etaSeconds = 0;
      this.notify();
    }
  }

  public resumeTask(id: string) {
    const task = this.tasks.get(id);
    if (task && (task.status === 'paused' || task.status === 'error')) {
      task.status = 'downloading';
      this.notify();
    }
  }

  public removeTask(id: string) {
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

  public updateTaskProgress(id: string, deltaBytes: number) {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'downloading') return;

    task.downloadedBytes = Math.min(task.totalBytes, task.downloadedBytes + deltaBytes);
    
    // Distribute progress across chunks
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
      let hasChanges = false;

      for (const task of this.tasks.values()) {
        if (task.status === 'downloading') {
          // Simulate high-speed multi-threaded chunks throughput
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
    this.listeners.clear();
  }
}

export const downloadManager = new DownloadManager();
