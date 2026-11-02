import type { DownloadChunk, TaskCategory } from '../types/downloader';

/**
 * Calculates parallel chunks for segmented downloading.
 */
export function calculateSegments(totalBytes: number, segmentCount: number = 4): DownloadChunk[] {
  if (totalBytes <= 0) {
    return [{ index: 0, startByte: 0, endByte: 0, downloaded: 0, status: 'pending' }];
  }
  if (segmentCount <= 1 || totalBytes < 512) {
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

/**
 * Strict filename sanitizer protecting against Directory Traversal and Windows reserved device names.
 */
export function sanitizeFilename(name: string): string {
  let clean = name
    .replace(/[\\/:*?"<>|\r\n\t\0]/g, '_')
    .replace(/\.\.+/g, '_')
    .trim()
    .replace(/^[. ]+|[. ]+$/g, '');

  if (!clean) clean = 'download';

  const stem = clean.split('.')[0]?.toUpperCase() || '';
  const reserved = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];
  if (reserved.includes(stem)) {
    clean = '_' + clean;
  }

  return clean;
}

/**
 * Splits a filename into its stem and extension, preserving compound extensions
 * like .tar.gz, .tar.bz2, .tar.xz, .user.js, etc.
 */
export function splitFilename(filename: string): { stem: string; ext: string } {
  const clean = filename.trim();
  const compoundExtensions = [
    '.tar.gz', '.tar.bz2', '.tar.xz', '.tar.zst',
    '.user.js', '.user.css'
  ];

  for (const comp of compoundExtensions) {
    if (clean.toLowerCase().endsWith(comp)) {
      const stem = clean.slice(0, -comp.length);
      return { stem: stem || 'file', ext: comp };
    }
  }

  const dotIndex = clean.lastIndexOf('.');
  if (dotIndex > 0 && dotIndex < clean.length - 1) {
    return {
      stem: clean.slice(0, dotIndex),
      ext: clean.slice(dotIndex)
    };
  }

  return { stem: clean || 'download', ext: '' };
}

/**
 * Deduplicates filenames when conflicts exist, formatting as "name (1).ext", "name (2).ext".
 */
export function deduplicateFilename(desiredFilename: string, existingFilenames: Set<string> | string[]): string {
  const existingSet = new Set(
    Array.isArray(existingFilenames)
      ? existingFilenames.map((f) => f.toLowerCase())
      : Array.from(existingFilenames).map((f) => f.toLowerCase())
  );

  const clean = sanitizeFilename(desiredFilename);
  if (!existingSet.has(clean.toLowerCase())) {
    return clean;
  }

  const { stem, ext } = splitFilename(clean);
  let counter = 1;
  while (counter < 10000) {
    const candidate = `${stem} (${counter})${ext}`;
    if (!existingSet.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter++;
  }

  return `${stem}_${Date.now()}${ext}`;
}

/**
 * Humanizes raw HTTP or network error messages into friendly, actionable advice.
 */
export function humanizeErrorMessage(rawError?: string, lang: 'ar' | 'en' = 'ar'): string {
  if (!rawError) return '';
  const err = rawError.toLowerCase();
  const isAr = lang === 'ar';

  if (err.includes('401') || err.includes('403') || err.includes('forbidden') || err.includes('unauthorized')) {
    return isAr
      ? 'تم رفض الوصول: قد يكون الرابط منتهي الصلاحية أو يتطلب تسجيل دخول أو كوكيز'
      : 'Access denied: Link may have expired or requires authentication/cookies';
  }

  if (err.includes('404') || err.includes('not found')) {
    return isAr
      ? 'الملف غير موجود: تأكد من صحة الرابط أو أنه لم يُحذف من الخادم'
      : 'File not found: The link is invalid or the file was deleted from the server';
  }

  if (err.includes('429') || err.includes('too many requests')) {
    return isAr
      ? 'تم تجاوز حد الطلبات: الخادم يطلب تقليل الضغط، جرّب تقليل المسارات المتزامنة'
      : 'Rate limit exceeded: Server requested throttling. Reduce concurrent streams';
  }

  if (
    err.includes('500') ||
    err.includes('502') ||
    err.includes('503') ||
    err.includes('504') ||
    err.includes('bad gateway') ||
    err.includes('service unavailable')
  ) {
    return isAr
      ? 'خطأ في الخادم البعيد: الخادم يواجه تعطلاً مؤقتاً أو أعمال صيانة'
      : 'Remote server error: Host server is temporarily down or under maintenance';
  }

  if (err.includes('does not support byte ranges') || err.includes('200 instead of 206')) {
    return isAr
      ? 'الخادم لا يدعم تقسيم الملف أو استئناف التنزيل'
      : 'Server does not support partial byte ranges or resume';
  }

  if (err.includes('timed out') || err.includes('timeout') || err.includes('stalled')) {
    return isAr
      ? 'انتهت مهلة الاتصال بالخادم. تحقق من سرعة واستقرار شبكة الإنترنت'
      : 'Connection timed out. Check your internet connection or server availability';
  }

  if (err.includes('disk write') || err.includes('no space') || err.includes('device full')) {
    return isAr
      ? 'تعذر الكتابة على القرص: تأكد من وجود مساحة تخزين شاغرة كافية'
      : 'Disk write error: Ensure you have sufficient free storage space';
  }

  return rawError;
}

/**
 * Automatically classifies a file by its extension into functional categories.
 */
export function detectCategory(filename: string): TaskCategory {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['torrent'].includes(ext)) {
    return 'torrents';
  }
  if (['exe', 'msi', 'apk', 'dmg', 'deb', 'rpm', 'iso', 'img', 'bin'].includes(ext)) {
    return 'programs';
  }
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'flac', 'wav', 'aac', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
    return 'media';
  }
  if (['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'csv', 'epub', 'md'].includes(ext)) {
    return 'documents';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'zst'].includes(ext)) {
    return 'archives';
  }
  return 'other';
}
