export interface ReleaseAsset {
  url: string;
  size?: number;
  sha256?: string;
}

export interface ReleaseAssets {
  windowsInstaller?: ReleaseAsset;
  windowsPortable?: ReleaseAsset;
  androidApk?: ReleaseAsset;
}

export interface ReleaseInfo {
  version: string;
  notes: string;
  pubDate: string;
  assets: ReleaseAssets;
}

export const OTIUM_RELEASES_URL = 'https://github.com/XRTM8/Otium-Downloader/releases/latest';
export const OTIUM_RELEASE_FEED_URL =
  'https://github.com/XRTM8/Otium-Downloader/releases/latest/download/latest.json';
export const GITHUB_API_URL =
  'https://api.github.com/repos/XRTM8/Otium-Downloader/releases/latest';
export const RAW_PKG_URL =
  'https://raw.githubusercontent.com/XRTM8/Otium-Downloader/main/package.json';

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '');
}

export function isNewerVersion(candidate: string, current: string): boolean {
  const parseParts = (v: string) =>
    normalizeVersion(v)
      .split('.')
      .map((part) => {
        const n = parseInt(part, 10);
        return Number.isFinite(n) ? n : 0;
      });

  const candParts = parseParts(candidate);
  const currParts = parseParts(current);
  const len = Math.max(candParts.length, currParts.length);

  for (let i = 0; i < len; i++) {
    const c = candParts[i] ?? 0;
    const cur = currParts[i] ?? 0;
    if (c > cur) return true;
    if (c < cur) return false;
  }
  return false;
}

export async function fetchReleaseInfo(
  url: string = OTIUM_RELEASE_FEED_URL,
  signal?: AbortSignal
): Promise<ReleaseInfo> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    // Attempt 1: Precompiled latest.json feed
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      if (response.ok) {
        const data = await response.json();
        return {
          version: normalizeVersion(data.version || ''),
          notes: data.notes || '',
          pubDate: data.pub_date || '',
          assets: data.assets || {}
        };
      }
    } catch {
      // Fall through to 3-tier
    }

    // TIER 1: GitHub API Releases Endpoint
    try {
      const apiRes = await fetch(GITHUB_API_URL, {
        cache: 'no-store',
        headers: { Accept: 'application/vnd.github.v3+json' },
        signal: controller.signal
      });
      if (apiRes.ok) {
        const data = await apiRes.json();
        const tag = (data.tag_name || data.name || '').replace(/^v/i, '').trim();
        if (tag) {
          const assets: ReleaseAssets = {};
          if (Array.isArray(data.assets)) {
            for (const asset of data.assets) {
              const name: string = asset.name || '';
              const downloadUrl: string = asset.browser_download_url || '';
              if (name.endsWith('.exe')) assets.windowsInstaller = { url: downloadUrl, size: asset.size };
              else if (name.endsWith('.zip')) assets.windowsPortable = { url: downloadUrl, size: asset.size };
              else if (name.endsWith('.apk')) assets.androidApk = { url: downloadUrl, size: asset.size };
            }
          }
          return {
            version: tag,
            notes: typeof data.body === 'string' ? data.body : '',
            pubDate: data.published_at || '',
            assets
          };
        }
      }
    } catch {
      // Proceed to Tier 2
    }

    // TIER 2: GitHub Web Releases Redirect (0 rate limit)
    try {
      const webRes = await fetch(OTIUM_RELEASES_URL, {
        redirect: 'manual',
        signal: controller.signal
      });
      const location = webRes.headers.get('location') || webRes.url;
      const match = location?.match(/tag\/v?([0-9]+\.[0-9]+\.[0-9]+)/i);
      if (match && match[1]) {
        return {
          version: match[1].trim(),
          notes: 'New version available on GitHub Releases.',
          pubDate: '',
          assets: {
            windowsInstaller: { url: OTIUM_RELEASES_URL }
          }
        };
      }
    } catch {
      // Proceed to Tier 3
    }

    // TIER 3: Raw Git package.json (0 rate limit)
    const rawRes = await fetch(RAW_PKG_URL, {
      cache: 'no-store',
      signal: controller.signal
    });
    if (rawRes.ok) {
      const pkg = await rawRes.json();
      if (typeof pkg.version === 'string' && pkg.version.trim()) {
        return {
          version: normalizeVersion(pkg.version),
          notes: 'New version available.',
          pubDate: '',
          assets: {
            windowsInstaller: { url: OTIUM_RELEASES_URL }
          }
        };
      }
    }

    throw new Error('All update discovery tiers exhausted.');
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
