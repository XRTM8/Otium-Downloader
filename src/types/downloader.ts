export type TaskStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'error';

export interface DownloadChunk {
  index: number;
  startByte: number;
  endByte: number;
  downloaded: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
}

export interface ChecksumInfo {
  algorithm: 'sha256' | 'md5';
  expected?: string;
  actual?: string;
  verified?: boolean;
}

export interface DownloadTask {
  id: string;
  url: string;
  filename: string;
  totalBytes: number;
  downloadedBytes: number;
  status: TaskStatus;
  speedBytesPerSec: number;
  etaSeconds: number;
  chunks: DownloadChunk[];
  createdAt: number;
  completedAt?: number;
  errorMessage?: string;
  checksum?: ChecksumInfo;
  savePath?: string;
}

export interface DownloadStats {
  activeCount: number;
  completedCount: number;
  totalBytesDownloaded: number;
  currentTotalSpeed: number;
}
