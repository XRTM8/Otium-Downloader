import { describe, it, expect } from 'vitest';
import { resolveUniversalLink, isLikelyDownloadUrl } from './linkResolver';

describe('linkResolver', () => {
  it('resolves Google Drive view links to direct export links', () => {
    const raw = 'https://drive.google.com/file/d/1A2B3C4D5E6F7G/view?usp=sharing';
    const res = resolveUniversalLink(raw);
    expect(res.resolvedUrl).toBe('https://drive.google.com/uc?export=download&id=1A2B3C4D5E6F7G');
    expect(res.isSpecialHost).toBe(true);
    expect(res.serviceName).toBe('Google Drive');
  });

  it('resolves Google Drive open?id links to direct export links', () => {
    const raw = 'https://drive.google.com/open?id=xyz789';
    const res = resolveUniversalLink(raw);
    expect(res.resolvedUrl).toBe('https://drive.google.com/uc?export=download&id=xyz789');
  });

  it('resolves Dropbox dl=0 to dl=1', () => {
    const raw = 'https://www.dropbox.com/s/abcdef123/file.zip?dl=0';
    const res = resolveUniversalLink(raw);
    expect(res.resolvedUrl).toContain('dl=1');
    expect(res.serviceName).toBe('Dropbox');
  });

  it('resolves GitHub blob URLs to raw user content', () => {
    const raw = 'https://github.com/XRTM8/Otium-Downloader/blob/main/package.json';
    const res = resolveUniversalLink(raw);
    expect(res.resolvedUrl).toBe('https://raw.githubusercontent.com/XRTM8/Otium-Downloader/main/package.json');
  });

  it('injects default origin referer for normal URLs', () => {
    const raw = 'https://speedtest.server.com/test100MB.bin';
    const res = resolveUniversalLink(raw);
    expect(res.suggestedHeaders?.Referer).toBe('https://speedtest.server.com/');
  });

  it('detects likely download URLs accurately', () => {
    expect(isLikelyDownloadUrl('https://example.com/dist/setup.exe')).toBe(true);
    expect(isLikelyDownloadUrl('https://example.com/video.mp4')).toBe(true);
    expect(isLikelyDownloadUrl('https://drive.google.com/file/d/123/view')).toBe(true);
    expect(isLikelyDownloadUrl('https://github.com/user/repo/releases/download/v1.0/app.apk')).toBe(true);
    expect(isLikelyDownloadUrl('https://google.com')).toBe(false);
    expect(isLikelyDownloadUrl('hello world')).toBe(false);
  });
});
