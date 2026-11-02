import { describe, it, expect } from 'vitest';
import {
  isMagnetUri,
  parseMagnetUri,
  BencodeDecoder,
  parseTorrentFile
} from './torrent';

describe('Torrent & Magnet Protocol Engine', () => {
  it('correctly identifies valid and invalid magnet links', () => {
    expect(isMagnetUri('magnet:?xt=urn:btih:c12fe1c06bba254a9dc9f519b335de7ec72523ad')).toBe(true);
    expect(isMagnetUri('magnet:?dn=Test&xt=urn:btih:C12FE1C06BBA254A9DC9F519B335DE7EC72523AD')).toBe(true);
    expect(isMagnetUri('https://example.com/file.torrent')).toBe(false);
    expect(isMagnetUri('')).toBe(false);
    expect(isMagnetUri('magnet:?dn=NoHash')).toBe(false);
  });

  it('parses standard 40-character hex BTIH magnet link', () => {
    const uri = 'magnet:?xt=urn:btih:da39a3ee5e6b4b0d3255bfef95601890afd80709&dn=Ubuntu_24_04.iso&tr=http%3A%2F%2Ftracker.example.com%3A80%2Fannounce&xl=2147483648';
    const parsed = parseMagnetUri(uri);

    expect(parsed).not.toBeNull();
    expect(parsed?.infoHash).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(parsed?.name).toBe('Ubuntu_24_04.iso');
    expect(parsed?.totalLength).toBe(2147483648);
    expect(parsed?.trackers).toContain('http://tracker.example.com:80/announce');
    expect(parsed?.isMagnet).toBe(true);
  });

  it('parses 32-character Base32 BTIH magnet link and converts to hex', () => {
    // 32-char base32 test
    const uri = 'magnet:?xt=urn:btih:MFRGGZDFMY2TMOBVHA4TKMRQGE3DKMJT&dn=TestArchive';
    const parsed = parseMagnetUri(uri);

    expect(parsed).not.toBeNull();
    expect(parsed?.infoHash).toHaveLength(40);
    expect(parsed?.name).toBe('TestArchive');
  });

  it('handles bencode integer, string, list, and dictionary', () => {
    // d4:name4:test3:numi42e4:listli1ei2ei3eee
    const encoder = new TextEncoder();
    const bencoded = encoder.encode('d4:name4:test3:numi42e4:listli1ei2ei3eee');
    const decoder = new BencodeDecoder(bencoded);
    const result = decoder.decode();

    expect(result).toBeDefined();
    expect(new TextDecoder().decode(result.name)).toBe('test');
    expect(result.num).toBe(42);
    expect(result.list).toEqual([1, 2, 3]);
  });

  it('parses synthetic single-file .torrent buffer and computes infoHash', async () => {
    // Construct valid bencoded .torrent:
    // d8:announce28:http://tracker.test/announce4:infod6:lengthi5000e4:name8:test.txtee
    const encoder = new TextEncoder();
    const torrentBytes = encoder.encode('d8:announce28:http://tracker.test/announce4:infod6:lengthi5000e4:name8:test.txtee');

    const meta = await parseTorrentFile(torrentBytes);
    expect(meta.name).toBe('test.txt');
    expect(meta.totalLength).toBe(5000);
    expect(meta.trackers).toContain('http://tracker.test/announce');
    expect(meta.infoHash).toHaveLength(40);
    expect(meta.files).toHaveLength(1);
    expect(meta.files[0]).toEqual({ path: 'test.txt', length: 5000 });
  });

  it('parses synthetic multi-file .torrent buffer', async () => {
    // Multi-file torrent:
    // d8:announce28:http://tracker.test/announce4:infod5:filesld6:lengthi100e4:pathl5:a.txteed6:lengthi200e4:pathl5:b.txteee4:name7:my_rootee
    const encoder = new TextEncoder();
    const torrentBytes = encoder.encode(
      'd8:announce28:http://tracker.test/announce4:infod5:filesld6:lengthi100e4:pathl5:a.txteed6:lengthi200e4:pathl5:b.txteee4:name7:my_rootee'
    );

    const meta = await parseTorrentFile(torrentBytes);
    expect(meta.name).toBe('my_root');
    expect(meta.totalLength).toBe(300);
    expect(meta.files).toHaveLength(2);
    expect(meta.files[0]).toEqual({ path: 'my_root/a.txt', length: 100 });
    expect(meta.files[1]).toEqual({ path: 'my_root/b.txt', length: 200 });
  });

  it('neutralizes directory traversal attempts in multi-file torrents (Zip Slip protection)', async () => {
    // Malicious torrent with path: ["..", "..", "evil.bat"]
    const encoder = new TextEncoder();
    const maliciousBytes = encoder.encode(
      'd8:announce28:http://tracker.test/announce4:infod5:filesld6:lengthi999e4:pathl2:..2:..8:evil.bateee4:name9:test_travee'
    );

    const meta = await parseTorrentFile(maliciousBytes);
    expect(meta.files).toHaveLength(1);
    expect(meta.files[0].path).toBe('test_trav/evil.bat');
    expect(meta.files[0].path).not.toContain('..');
  });

  it('protects against prototype pollution and excessive recursion depth in bencode', () => {
    const encoder = new TextEncoder();

    // 1. Prototype pollution attempt (9 characters for __proto__)
    const protoAttack = encoder.encode('d9:__proto__d8:polluted4:trueee');
    const decoder = new BencodeDecoder(protoAttack);
    const decoded = decoder.decode();
    expect(decoded).toBeDefined();
    expect((Object.prototype as any).polluted).toBeUndefined();

    // 2. Excessive recursion depth attempt (> 64 nested lists)
    const deepPayload = 'l'.repeat(70) + 'i1e' + 'e'.repeat(70);
    const deepDecoder = new BencodeDecoder(encoder.encode(deepPayload));
    expect(() => deepDecoder.decode()).toThrow(/depth limit exceeded/i);
  });
});
