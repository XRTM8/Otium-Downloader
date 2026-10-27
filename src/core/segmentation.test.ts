import { describe, it, expect } from 'vitest';
import {
  calculateSegments,
  parseContentRange,
  formatBytes,
  formatSpeed,
  formatEta,
  extractFilename,
  sanitizeFilename
} from './segmentation';

describe('segmentation utility', () => {
  it('calculates even chunks covering entire byte range', () => {
    const total = 1000;
    const chunks = calculateSegments(total, 4);
    expect(chunks.length).toBe(4);
    expect(chunks[0].startByte).toBe(0);
    expect(chunks[0].endByte).toBe(249);
    expect(chunks[3].endByte).toBe(999);

    // Sum of all chunk spans must equal totalBytes
    const totalSpan = chunks.reduce((acc, c) => acc + (c.endByte - c.startByte + 1), 0);
    expect(totalSpan).toBe(total);
  });

  it('handles small sizes gracefully', () => {
    const total = 500;
    const chunks = calculateSegments(total, 4);
    expect(chunks.length).toBe(1);
    expect(chunks[0].startByte).toBe(0);
    expect(chunks[0].endByte).toBe(499);
  });

  it('parses valid Content-Range header correctly', () => {
    const res = parseContentRange('bytes 0-1023/2048');
    expect(res).toEqual({ start: 0, end: 1023, total: 2048 });

    const wildcard = parseContentRange('bytes 500-999/*');
    expect(wildcard).toEqual({ start: 500, end: 999, total: -1 });

    const invalid = parseContentRange('invalid-range');
    expect(invalid).toBeNull();
  });

  it('formats byte sizes with correct units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 5.5)).toBe('5.5 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe('2 GB');
  });

  it('formats speeds and ETAs', () => {
    expect(formatSpeed(1024 * 500)).toBe('500 KB/s');
    expect(formatEta(45)).toBe('45s');
    expect(formatEta(125)).toBe('2m 5s');
    expect(formatEta(3665)).toBe('1h 1m');
  });

  it('extracts filename from URL and content disposition', () => {
    expect(extractFilename('https://example.com/files/archive.zip')).toBe('archive.zip');
    expect(
      extractFilename('https://example.com/dl', 'attachment; filename="setup_v1.0.exe"')
    ).toBe('setup_v1.0.exe');
    expect(sanitizeFilename('bad:file/name?.pdf')).toBe('bad_file_name_.pdf');
  });
});
