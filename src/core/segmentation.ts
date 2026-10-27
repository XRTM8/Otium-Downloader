import type { DownloadChunk } from '../types/downloader';

/**
 * Calculates parallel chunks for segmented downloading.
 */
export function calculateSegments(totalBytes: number, segmentCount: number = 4): DownloadChunk[] {
  if (totalBytes <= 0 || segmentCount <= 0) return [];
  if (totalBytes < 512) {
    return [{ index: 0, startByte: 0, endByte: totalBytes - 1, downloaded: 0, status: 'pending' }];
  }
  
  const count = Math.max(1, Math.min(segmentCount, Math.floor(totalBytes / 128)));
  const chunkSize = Math.floor(totalBytes / count);
  const chunks: DownloadChunk[] = [];

  for (let i = 0; i < count; i++) {
    const startByte = i * chunkSize;
    const endByte = i === count - 1 ? totalBytes - 1 : (i + 1) * chunkSize - 1;
    chunks.push({
      index: i,
      startByte,
      endByte,
      downloaded: 0,
      status: 'pending'
    });
  }

  return chunks;
}

/**
 * Parses HTTP Content-Range header (e.g. "bytes 0-1023/2048").
 */
export function parseContentRange(header: string): { start: number; end: number; total: number } | null {
  if (!header) return null;
  const match = header.trim().match(/^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i);
  if (!match) return null;

  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);
  const total = match[3] === '*' ? -1 : parseInt(match[3], 10);

  if (isNaN(start) || isNaN(end) || (match[3] !== '*' && isNaN(total))) return null;
  return { start, end, total };
}

/**
 * Formats byte size into human readable string.
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  if (!Number.isFinite(bytes) || bytes < 0) return '—';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] || 'TB'}`;
}

/**
 * Formats network throughput speed.
 */
export function formatSpeed(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '0 B/s';
  return `${formatBytes(bytesPerSec, 1)}/s`;
}

/**
 * Formats remaining ETA in minutes / seconds.
 */
export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds === Infinity) return '—';
  const sec = Math.floor(seconds);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min < 60) return `${min}m ${remSec}s`;
  const hrs = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hrs}h ${remMin}m`;
}

/**
 * Extracts a sane filename from a URL or Content-Disposition.
 */
export function extractFilename(rawUrl: string, contentDisposition?: string): string {
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    if (filenameMatch && filenameMatch[1]) {
      const decoded = decodeURIComponent(filenameMatch[1].trim());
      if (decoded.length > 0) return sanitizeFilename(decoded);
    }
  }

  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname;
    const base = pathname.split('/').filter(Boolean).pop();
    if (base && base.trim().length > 0) {
      return sanitizeFilename(decodeURIComponent(base));
    }
  } catch {
    // URL parsing fallback
  }

  return 'download_' + Date.now();
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|\r\n\t]/g, '_').trim() || 'download';
}
