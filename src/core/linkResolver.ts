/**
 * Otium Universal Link Resolver
 * Normalizes, resolves, and bypasses common download barriers (Google Drive, Dropbox, GitHub, etc.)
 */

import { isMagnetUri } from './torrent';

export interface ResolvedLink {
  resolvedUrl: string;
  originalUrl: string;
  suggestedHeaders?: Record<string, string>;
  isSpecialHost?: boolean;
  serviceName?: string;
}

export function resolveUniversalLink(rawUrl: string): ResolvedLink {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { resolvedUrl: '', originalUrl: rawUrl };
  }

  // 0. Detect BitTorrent Magnet links immediately
  if (isMagnetUri(trimmed)) {
    return {
      resolvedUrl: trimmed,
      originalUrl: trimmed,
      isSpecialHost: true,
      serviceName: 'BitTorrent Magnet'
    };
  }

  try {
    const url = new URL(trimmed);
    const suggestedHeaders: Record<string, string> = {};

    // 0. Extract Basic Auth credentials if present in authority
    if (url.username || url.password) {
      try {
        const credentials = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
        let base64 = '';
        if (typeof btoa !== 'undefined') {
          base64 = btoa(credentials);
        } else if (typeof (globalThis as unknown as { Buffer?: { from: (s: string) => { toString: (enc: string) => string } } }).Buffer !== 'undefined') {
          base64 = (globalThis as any).Buffer.from(credentials).toString('base64');
        }
        if (base64) {
          suggestedHeaders['Authorization'] = `Basic ${base64}`;
        }
        url.username = '';
        url.password = '';
      } catch {}
    }

    // 1. Google Drive direct export resolver
    if (url.hostname.includes('drive.google.com')) {
      // Matches /file/d/{id}/...
      const fileMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch && fileMatch[1]) {
        return {
          resolvedUrl: `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`,
          originalUrl: trimmed,
          suggestedHeaders,
          isSpecialHost: true,
          serviceName: 'Google Drive'
        };
      }
      // Matches ?id={id}
      const idParam = url.searchParams.get('id');
      if (idParam) {
        return {
          resolvedUrl: `https://drive.google.com/uc?export=download&id=${idParam}`,
          originalUrl: trimmed,
          suggestedHeaders,
          isSpecialHost: true,
          serviceName: 'Google Drive'
        };
      }
    }

    // 2. Dropbox Direct Download Resolver (?dl=1)
    if (url.hostname.includes('dropbox.com')) {
      url.searchParams.set('dl', '1');
      return {
        resolvedUrl: url.toString(),
        originalUrl: trimmed,
        suggestedHeaders,
        isSpecialHost: true,
        serviceName: 'Dropbox'
      };
    }

    // 3. GitHub Blob to Raw Resolver
    if (url.hostname === 'github.com' && url.pathname.includes('/blob/')) {
      const rawUrl = trimmed.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      return {
        resolvedUrl: rawUrl,
        originalUrl: trimmed,
        suggestedHeaders,
        isSpecialHost: true,
        serviceName: 'GitHub Raw'
      };
    }

    // 4. Hugging Face Model / Dataset Weights (/blob/ -> /resolve/)
    if (url.hostname.includes('huggingface.co') && url.pathname.includes('/blob/')) {
      const resolved = url.toString().replace('/blob/', '/resolve/');
      return {
        resolvedUrl: resolved,
        originalUrl: trimmed,
        suggestedHeaders,
        isSpecialHost: true,
        serviceName: 'Hugging Face'
      };
    }

    // 5. Internet Archive Details to Direct Download (/details/ -> /download/)
    if (url.hostname.includes('archive.org') && url.pathname.includes('/details/')) {
      const resolved = url.toString().replace('/details/', '/download/');
      return {
        resolvedUrl: resolved,
        originalUrl: trimmed,
        suggestedHeaders,
        isSpecialHost: true,
        serviceName: 'Internet Archive'
      };
    }

    // 6. Default: Auto-inject origin Referer for anti-hotlinking protection
    suggestedHeaders['Referer'] = `${url.origin}/`;

    return {
      resolvedUrl: url.toString(),
      originalUrl: trimmed,
      suggestedHeaders
    };
  } catch {
    return {
      resolvedUrl: trimmed,
      originalUrl: trimmed
    };
  }
}

/**
 * Checks if a string in clipboard looks like a downloadable link
 */
export function isLikelyDownloadUrl(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (isMagnetUri(trimmed)) return true;
  if (!/^https?:\/\/.+/i.test(trimmed)) return false;

  // Obvious download extensions
  const downloadExtensions = [
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.zst',
    '.exe', '.msi', '.apk', '.dmg', '.pkg', '.deb', '.rpm', '.iso', '.bin',
    '.mp4', '.mkv', '.avi', '.mov', '.mp3', '.flac', '.wav',
    '.pdf', '.epub', '.docx', '.xlsx', '.torrent'
  ];

  const lower = trimmed.toLowerCase();
  for (const ext of downloadExtensions) {
    if (lower.includes(ext)) return true;
  }

  // Cloud storage / direct download signatures
  if (
    lower.includes('drive.google.com') ||
    lower.includes('dropbox.com') ||
    lower.includes('github.com/releases') ||
    lower.includes('raw.githubusercontent.com') ||
    lower.includes('mediafire.com') ||
    lower.includes('/download')
  ) {
    return true;
  }

  return false;
}
