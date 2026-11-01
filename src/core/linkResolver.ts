/**
 * Otium Universal Link Resolver
 * Normalizes, resolves, and bypasses common download barriers (Google Drive, Dropbox, GitHub, etc.)
 */

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

  try {
    const url = new URL(trimmed);

    // 1. Google Drive direct export resolver
    if (url.hostname.includes('drive.google.com')) {
      // Matches /file/d/{id}/...
      const fileMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch && fileMatch[1]) {
        return {
          resolvedUrl: `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`,
          originalUrl: trimmed,
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
        isSpecialHost: true,
        serviceName: 'GitHub Raw'
      };
    }

    // 4. Default: Auto-inject origin Referer for anti-hotlinking protection
    const defaultHeaders: Record<string, string> = {
      Referer: `${url.origin}/`
    };

    return {
      resolvedUrl: trimmed,
      originalUrl: trimmed,
      suggestedHeaders: defaultHeaders
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
  if (!/^https?:\/\/.+/i.test(trimmed)) return false;

  // Obvious download extensions
  const downloadExtensions = [
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.zst',
    '.exe', '.msi', '.apk', '.dmg', '.pkg', '.deb', '.rpm', '.iso', '.bin',
    '.mp4', '.mkv', '.avi', '.mov', '.mp3', '.flac', '.wav',
    '.pdf', '.epub', '.docx', '.xlsx'
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
