import { describe, it, expect } from 'vitest';
import { detectPlatform, cleanMediaTitle, fetchMediaMetadata } from './mediaResolver';

describe('mediaResolver', () => {
  it('detects platforms accurately', () => {
    expect(detectPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(detectPlatform('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    expect(detectPlatform('https://www.tiktok.com/@user/video/123456')).toBe('tiktok');
    expect(detectPlatform('https://www.instagram.com/reel/C123456/')).toBe('instagram');
    expect(detectPlatform('https://x.com/user/status/123456789')).toBe('twitter');
    expect(detectPlatform('https://twitter.com/user/status/123456789')).toBe('twitter');
    expect(detectPlatform('https://example.com/videos/stream.mp4')).toBe('direct');
    expect(detectPlatform('https://example.com/podcast.mp3')).toBe('direct');
    expect(detectPlatform('https://example.com/archive.zip')).toBe('other');
  });

  it('cleans media title properly', () => {
    const raw = 'Special Video: Title / Subtitle * [4K] ? <Cool>';
    const cleaned = cleanMediaTitle(raw);
    expect(cleaned).not.toContain(':');
    expect(cleaned).not.toContain('/');
    expect(cleaned).not.toContain('*');
    expect(cleaned).not.toContain('?');
    expect(cleaned).not.toContain('<');
    expect(cleaned).not.toContain('>');
  });

  it('generates rich preview with format options for direct video', async () => {
    const preview = await fetchMediaMetadata('https://archive.org/download/test/sample_video.mp4');
    expect(preview.platform).toBe('direct');
    expect(preview.availableFormats.length).toBeGreaterThan(0);
    expect(preview.availableFormats[0].ext).toBe('mp4');
  });

  it('generates fallback preview for YouTube links if offline', async () => {
    const preview = await fetchMediaMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(preview.platform).toBe('youtube');
    expect(preview.availableFormats.length).toBe(5);
    expect(preview.availableFormats.some((f) => f.isAudioOnly)).toBe(true);
    expect(preview.availableFormats.some((f) => f.resolution === '1080p')).toBe(true);
  });
});
