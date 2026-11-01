import { describe, it, expect } from 'vitest';
import {
  calculateSegments,
  parseContentRange,
  formatBytes,
  formatSpeed,
  formatEta,
  extractFilename,
  sanitizeFilename,
  detectCategory,
  splitFilename,
  deduplicateFilename,
  humanizeErrorMessage
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
    expect(sanitizeFilename('../../etc/passwd')).toBe('____etc_passwd');
    expect(sanitizeFilename('..\\..\\Windows\\System32\\cmd.exe')).toBe('____Windows_System32_cmd.exe');
    expect(sanitizeFilename('CON.txt')).toBe('_CON.txt');
    expect(sanitizeFilename('aux.log')).toBe('_aux.log');
  });

  it('handles unknown length with single stream fallback', () => {
    const unknownChunks = calculateSegments(0, 8);
    expect(unknownChunks.length).toBe(1);
    expect(unknownChunks[0].startByte).toBe(0);
    expect(unknownChunks[0].endByte).toBe(0);
  });

  it('classifies filenames into correct categories', () => {
    expect(detectCategory('installer.exe')).toBe('programs');
    expect(detectCategory('linux.iso')).toBe('programs');
    expect(detectCategory('movie.mp4')).toBe('media');
    expect(detectCategory('song.mp3')).toBe('media');
    expect(detectCategory('report.pdf')).toBe('documents');
    expect(detectCategory('sheet.xlsx')).toBe('documents');
    expect(detectCategory('archive.zip')).toBe('archives');
    expect(detectCategory('data.tar.gz')).toBe('archives');
    expect(detectCategory('unknown.xyz')).toBe('other');
  });

  it('splits filenames correctly including compound extensions', () => {
    expect(splitFilename('report.pdf')).toEqual({ stem: 'report', ext: '.pdf' });
    expect(splitFilename('linux-x86_64.tar.gz')).toEqual({ stem: 'linux-x86_64', ext: '.tar.gz' });
    expect(splitFilename('backup.tar.bz2')).toEqual({ stem: 'backup', ext: '.tar.bz2' });
    expect(splitFilename('script.user.js')).toEqual({ stem: 'script', ext: '.user.js' });
    expect(splitFilename('README')).toEqual({ stem: 'README', ext: '' });
  });

  it('deduplicates filenames with incrementing collision counters', () => {
    const existing = ['report.pdf', 'report (1).pdf', 'archive.tar.gz'];

    expect(deduplicateFilename('report.pdf', existing)).toBe('report (2).pdf');
    expect(deduplicateFilename('new-file.pdf', existing)).toBe('new-file.pdf');
    expect(deduplicateFilename('archive.tar.gz', existing)).toBe('archive (1).tar.gz');
  });

  it('humanizes error messages into friendly descriptions', () => {
    expect(humanizeErrorMessage('Server returned HTTP 403', 'en')).toContain('Access denied');
    expect(humanizeErrorMessage('Server returned HTTP 403', 'ar')).toContain('تم رفض الوصول');
    expect(humanizeErrorMessage('HTTP 404 Not Found', 'en')).toContain('File not found');
    expect(humanizeErrorMessage('HTTP 404 Not Found', 'ar')).toContain('الملف غير موجود');
    expect(humanizeErrorMessage('HTTP 429 Too Many Requests', 'en')).toContain('Rate limit exceeded');
    expect(humanizeErrorMessage('Connection timed out on segment 2', 'en')).toContain('timed out');
    expect(humanizeErrorMessage('Random unexpected string', 'en')).toBe('Random unexpected string');
  });
});
