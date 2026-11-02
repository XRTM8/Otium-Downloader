/**
 * Otium Media & Stream Resolver
 * Inspired by VRKA architecture: Zero-telemetry stream observation & multi-factor format discovery.
 */

export type PlatformType = 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'soundcloud' | 'direct' | 'other';

export interface MediaFormatOption {
  id: string;
  label: string;
  labelAr: string;
  ext: string;
  resolution?: string;
  qualityBadge: string;
  isAudioOnly: boolean;
  estimatedSizeMultiplier?: number;
}

export interface MediaPreview {
  originalUrl: string;
  platform: PlatformType;
  title: string;
  author?: string;
  thumbnail?: string;
  durationSeconds?: number;
  availableFormats: MediaFormatOption[];
  resolvedStreamUrl?: string;
}

export const DEFAULT_FORMATS: MediaFormatOption[] = [
  {
    id: 'video-1080p',
    label: '1080p Full HD (60fps)',
    labelAr: 'فيديو فائق الوضوح 1080p',
    ext: 'mp4',
    resolution: '1080p',
    qualityBadge: '1080P',
    isAudioOnly: false,
    estimatedSizeMultiplier: 1.0,
  },
  {
    id: 'video-720p',
    label: '720p HD (Balanced)',
    labelAr: 'فيديو قياسي 720p HD',
    ext: 'mp4',
    resolution: '720p',
    qualityBadge: '720P',
    isAudioOnly: false,
    estimatedSizeMultiplier: 0.6,
  },
  {
    id: 'video-480p',
    label: '480p (Data Saver)',
    labelAr: 'فيديو اقتصادي 480p',
    ext: 'mp4',
    resolution: '480p',
    qualityBadge: '480P',
    isAudioOnly: false,
    estimatedSizeMultiplier: 0.35,
  },
  {
    id: 'audio-mp3-320',
    label: 'Audio MP3 (320 kbps HQ)',
    labelAr: 'صوت عالي النقاء MP3 (320k)',
    ext: 'mp3',
    qualityBadge: 'MP3 HQ',
    isAudioOnly: true,
    estimatedSizeMultiplier: 0.15,
  },
  {
    id: 'audio-m4a',
    label: 'Audio M4A / AAC',
    labelAr: 'صوت قياسي M4A / AAC',
    ext: 'm4a',
    qualityBadge: 'M4A',
    isAudioOnly: true,
    estimatedSizeMultiplier: 0.1,
  },
];

/**
 * Detects target platform from input URL
 */
export function detectPlatform(rawUrl: string): PlatformType {
  const url = rawUrl.trim().toLowerCase();
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('soundcloud.com')) return 'soundcloud';

  const directVideoExts = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv', '.m3u8', '.ts'];
  const directAudioExts = ['.mp3', '.m4a', '.aac', '.flac', '.wav', '.ogg', '.opus'];
  if (directVideoExts.some((e) => url.includes(e)) || directAudioExts.some((e) => url.includes(e))) {
    return 'direct';
  }

  return 'other';
}

/**
 * Clean and format media title from raw string
 */
export function cleanMediaTitle(rawTitle: string): string {
  return rawTitle
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 120);
}

/**
 * Fetches rich preview metadata for media links using fast zero-auth oEmbed endpoints
 */
export async function fetchMediaMetadata(url: string): Promise<MediaPreview> {
  const platform = detectPlatform(url);
  const cleanUrl = url.trim();

  // 1. YouTube oEmbed
  if (platform === 'youtube') {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        const title = data.title ? cleanMediaTitle(data.title) : 'YouTube Video';
        return {
          originalUrl: cleanUrl,
          platform: 'youtube',
          title,
          author: data.author_name || 'YouTube Creator',
          thumbnail: data.thumbnail_url || undefined,
          availableFormats: DEFAULT_FORMATS,
        };
      }
    } catch {
      // Fallback
    }

    // Direct YouTube video ID fallback
    const videoIdMatch = cleanUrl.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : undefined;
    return {
      originalUrl: cleanUrl,
      platform: 'youtube',
      title: videoId ? `YouTube Video (${videoId})` : 'YouTube Media',
      author: 'YouTube',
      thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined,
      availableFormats: DEFAULT_FORMATS,
    };
  }

  // 2. TikTok oEmbed / Rapid Metadata
  if (platform === 'tiktok') {
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        const title = data.title ? cleanMediaTitle(data.title) : 'TikTok Video';
        return {
          originalUrl: cleanUrl,
          platform: 'tiktok',
          title,
          author: data.author_name || 'TikTok Creator',
          thumbnail: data.thumbnail_url || undefined,
          availableFormats: [
            {
              id: 'tiktok-hd',
              label: 'Watermark-Free Video (HD)',
              labelAr: 'فيديو فائق الجودة بدون علامة مائية',
              ext: 'mp4',
              qualityBadge: 'HD NO-WM',
              isAudioOnly: false,
            },
            {
              id: 'tiktok-audio',
              label: 'Original Audio (MP3)',
              labelAr: 'الصوت الأصلي (MP3)',
              ext: 'mp3',
              qualityBadge: 'MP3',
              isAudioOnly: true,
            },
          ],
        };
      }
    } catch {
      // Fallback
    }

    return {
      originalUrl: cleanUrl,
      platform: 'tiktok',
      title: 'TikTok Video',
      author: 'TikTok Creator',
      availableFormats: [
        {
          id: 'tiktok-hd',
          label: 'Watermark-Free Video (HD)',
          labelAr: 'فيديو فائق الجودة بدون علامة مائية',
          ext: 'mp4',
          qualityBadge: 'HD NO-WM',
          isAudioOnly: false,
        },
        {
          id: 'tiktok-audio',
          label: 'Original Audio (MP3)',
          labelAr: 'الصوت الأصلي (MP3)',
          ext: 'mp3',
          qualityBadge: 'MP3',
          isAudioOnly: true,
        },
      ],
    };
  }

  // 3. Instagram Reels / Posts
  if (platform === 'instagram') {
    return {
      originalUrl: cleanUrl,
      platform: 'instagram',
      title: 'Instagram Reel / Media',
      author: 'Instagram',
      availableFormats: [
        {
          id: 'insta-video',
          label: 'Original Video (MP4)',
          labelAr: 'فيديو انستغرام الأصلي (MP4)',
          ext: 'mp4',
          qualityBadge: 'HD MP4',
          isAudioOnly: false,
        },
        {
          id: 'insta-audio',
          label: 'Extracted Audio (MP3)',
          labelAr: 'الصوت المستخرج (MP3)',
          ext: 'mp3',
          qualityBadge: 'MP3',
          isAudioOnly: true,
        },
      ],
    };
  }

  // 4. Twitter / X Video
  if (platform === 'twitter') {
    return {
      originalUrl: cleanUrl,
      platform: 'twitter',
      title: 'X / Twitter Video',
      author: 'X (Twitter)',
      availableFormats: [
        {
          id: 'x-video-hd',
          label: 'High Definition (MP4)',
          labelAr: 'فيديو عالي الدقة (MP4)',
          ext: 'mp4',
          qualityBadge: 'HD',
          isAudioOnly: false,
        },
        {
          id: 'x-audio',
          label: 'Audio Only (MP3)',
          labelAr: 'مقطع صوتي (MP3)',
          ext: 'mp3',
          qualityBadge: 'MP3',
          isAudioOnly: true,
        },
      ],
    };
  }

  // 5. Direct Media Stream Link
  try {
    const urlObj = new URL(cleanUrl);
    const pathSegs = urlObj.pathname.split('/').filter(Boolean);
    const lastSeg = pathSegs.pop() || 'media_stream';
    const cleanFilename = decodeURIComponent(lastSeg);
    const ext = cleanFilename.split('.').pop()?.toLowerCase() || 'mp4';
    const isAudio = ['mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg'].includes(ext);

    return {
      originalUrl: cleanUrl,
      platform: 'direct',
      title: cleanFilename,
      author: urlObj.hostname,
      availableFormats: [
        {
          id: 'direct-original',
          label: `Direct Stream (${ext.toUpperCase()})`,
          labelAr: `التدفق الأصلي المباشر (${ext.toUpperCase()})`,
          ext,
          qualityBadge: ext.toUpperCase(),
          isAudioOnly: isAudio,
        },
      ],
    };
  } catch {
    return {
      originalUrl: cleanUrl,
      platform: 'other',
      title: 'Direct Download',
      availableFormats: DEFAULT_FORMATS,
    };
  }
}

/**
 * Resolves a social/video platform URL to a direct downloadable MP4/MP3 stream URL.
 */
export async function resolveMediaDownloadUrl(
  url: string,
  formatOption?: MediaFormatOption
): Promise<{ downloadUrl: string; suggestedFilename?: string }> {
  const cleanUrl = url.trim();
  const platform = detectPlatform(cleanUrl);

  if (platform === 'direct' || platform === 'other') {
    return { downloadUrl: cleanUrl };
  }

  // 1. TikTok: High-speed watermark-free direct MP4 CDN extraction
  if (platform === 'tiktok') {
    try {
      const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.code === 0 && json.data) {
          const isAudio = formatOption?.isAudioOnly;
          const streamUrl = isAudio ? (json.data.music || json.data.play) : json.data.play;
          const ext = isAudio ? 'mp3' : 'mp4';
          const title = json.data.title ? cleanMediaTitle(json.data.title) : 'TikTok_Video';
          return {
            downloadUrl: streamUrl,
            suggestedFilename: `${title}.${ext}`,
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  // 2. Multi-platform stream extraction (YouTube, Twitter/X, Instagram) via Cobalt API
  const cobaltInstances = [
    'https://api.cobalt.tools',
    'https://cobalt-api.kwiatekm.tokyo',
    'https://co.wuk.sh',
  ];

  for (const instance of cobaltInstances) {
    try {
      const isAudio = formatOption?.isAudioOnly ?? false;
      const bodyPayload: Record<string, unknown> = {
        url: cleanUrl,
        downloadMode: isAudio ? 'audio' : 'auto',
        videoQuality: formatOption?.resolution?.replace('p', '') || '1080',
        audioFormat: 'mp3',
      };

      const res = await fetch(`${instance}/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(7000),
      });

      if (res.ok) {
        const data = await res.json();
        if ((data.status === 'stream' || data.status === 'redirect') && data.url) {
          return {
            downloadUrl: data.url,
            suggestedFilename: data.filename || undefined,
          };
        }
      }
    } catch {
      // Try next instance
    }
  }

  // Fallback to original URL
  return { downloadUrl: cleanUrl };
}
