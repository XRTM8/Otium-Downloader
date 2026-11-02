/**
 * Sovereign BitTorrent & Magnet Protocol Engine for Otium Downloader
 * Implements BEP 0003 (Bencode & .torrent) and BEP 0009 (Magnet URI with BTIH)
 */

import { sanitizeFilename } from './segmentation';

export interface TorrentFileItem {
  path: string;
  length: number;
}

export interface TorrentMetadata {
  infoHash: string;
  name: string;
  totalLength: number;
  pieceLength?: number;
  pieceCount?: number;
  trackers: string[];
  files: TorrentFileItem[];
  comment?: string;
  isMagnet?: boolean;
}

/**
 * Validates whether a given string is a BitTorrent Magnet URI.
 */
export function isMagnetUri(uri: string): boolean {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  return /^magnet:\?[\s\S]*xt=urn:btih:/i.test(trimmed);
}

/**
 * Decodes RFC 4648 Base32 string to 40-character lowercase hexadecimal.
 */
function base32ToHex(base32: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '');
  let bits = '';

  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean.charAt(i));
    if (val === -1) {
      throw new Error(`Invalid base32 character: ${clean.charAt(i)}`);
    }
    bits += val.toString(2).padStart(5, '0');
  }

  let hex = '';
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.substring(i, i + 4);
    hex += parseInt(chunk, 2).toString(16);
  }

  return hex.substring(0, 40).toLowerCase();
}

/**
 * Parses a BitTorrent magnet link into structured metadata.
 */
export function parseMagnetUri(uri: string): TorrentMetadata | null {
  if (!isMagnetUri(uri)) return null;

  try {
    const raw = uri.trim();
    const queryPart = raw.startsWith('magnet:?') ? raw.slice(8) : raw;
    const params = new URLSearchParams(queryPart);

    // Extract exact topic (xt)
    const xtList = params.getAll('xt');
    let infoHash = '';

    for (const xt of xtList) {
      const match = xt.match(/^urn:btih:([a-f0-9]{40}|[a-z2-7]{32})/i);
      if (match) {
        const candidate = match[1];
        if (candidate.length === 40) {
          infoHash = candidate.toLowerCase();
        } else if (candidate.length === 32) {
          infoHash = base32ToHex(candidate);
        }
        break;
      }
    }

    if (!infoHash) return null;

    // Display Name (dn)
    const name = params.get('dn') || `Torrent_${infoHash.slice(0, 8)}`;

    // Trackers (tr)
    const trackers: string[] = [];
    for (const tr of params.getAll('tr')) {
      const cleanTr = decodeURIComponent(tr).trim();
      if (cleanTr && !trackers.includes(cleanTr)) {
        trackers.push(cleanTr);
      }
    }

    // Exact Length (xl)
    const xl = params.get('xl');
    const totalLength = xl ? parseInt(xl, 10) : 0;

    return {
      infoHash,
      name,
      totalLength: isNaN(totalLength) ? 0 : totalLength,
      trackers,
      files: totalLength > 0 ? [{ path: name, length: totalLength }] : [],
      isMagnet: true
    };
  } catch {
    return null;
  }
}

/**
 * Robust Bencode Decoder compliant with BitTorrent specification (BEP 0003).
 */
export class BencodeDecoder {
  private pos = 0;
  private depth = 0;
  private readonly maxDepth = 64;
  private readonly data: Uint8Array;
  public rawInfoSlice: Uint8Array | null = null;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  public decode(): any {
    this.pos = 0;
    this.depth = 0;
    this.rawInfoSlice = null;
    return this.parseNext();
  }

  private parseNext(): any {
    if (this.pos >= this.data.length) {
      throw new Error('Unexpected end of Bencode stream');
    }

    if (this.depth > this.maxDepth) {
      throw new Error('Bencode recursion depth limit exceeded (malformed or nested payload)');
    }

    const byte = this.data[this.pos];

    // Integer: i<digits>e
    if (byte === 0x69) {
      // 'i'
      return this.parseInteger();
    }

    // List: l<items>e
    if (byte === 0x6c) {
      // 'l'
      return this.parseList();
    }

    // Dictionary: d<key><val>...e
    if (byte === 0x64) {
      // 'd'
      return this.parseDictionary();
    }

    // Byte String: <length>:<bytes>
    if (byte >= 0x30 && byte <= 0x39) {
      return this.parseByteString();
    }

    throw new Error(`Invalid bencode token at byte ${this.pos}: 0x${byte.toString(16)}`);
  }

  private parseInteger(): number {
    this.pos++; // skip 'i'
    const start = this.pos;
    while (this.pos < this.data.length && this.data[this.pos] !== 0x65) {
      this.pos++;
    }
    if (this.pos >= this.data.length) {
      throw new Error('Unterminated bencode integer');
    }
    const str = new TextDecoder('ascii').decode(this.data.subarray(start, this.pos));
    this.pos++; // skip 'e'
    return parseInt(str, 10);
  }

  private parseByteString(): Uint8Array {
    const colonIdx = this.indexOfByte(0x3a, this.pos); // ':'
    if (colonIdx === -1) {
      throw new Error('Invalid bencode string length prefix');
    }
    const lenStr = new TextDecoder('ascii').decode(this.data.subarray(this.pos, colonIdx));
    const len = parseInt(lenStr, 10);
    if (isNaN(len) || len < 0) {
      throw new Error(`Invalid bencode string length: ${lenStr}`);
    }
    this.pos = colonIdx + 1;
    if (this.pos + len > this.data.length) {
      throw new Error('Bencode string out of bounds');
    }
    const slice = this.data.subarray(this.pos, this.pos + len);
    this.pos += len;
    return slice;
  }

  private parseList(): any[] {
    this.pos++; // skip 'l'
    this.depth++;
    const list: any[] = [];
    try {
      while (this.pos < this.data.length && this.data[this.pos] !== 0x65) {
        list.push(this.parseNext());
      }
      if (this.pos >= this.data.length) {
        throw new Error('Unterminated bencode list');
      }
      this.pos++; // skip 'e'
      return list;
    } finally {
      this.depth--;
    }
  }

  private parseDictionary(): Record<string, any> {
    this.pos++; // skip 'd'
    this.depth++;
    const dict: Record<string, any> = Object.create(null);

    try {
      while (this.pos < this.data.length && this.data[this.pos] !== 0x65) {
        const keyBytes = this.parseByteString();
        const key = new TextDecoder('utf-8').decode(keyBytes);

        const valStartPos = this.pos;
        const val = this.parseNext();
        const valEndPos = this.pos;

        if (key === 'info') {
          this.rawInfoSlice = this.data.subarray(valStartPos, valEndPos);
        }

        // Prevent prototype pollution
        if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
          dict[key] = val;
        }
      }

      if (this.pos >= this.data.length) {
        throw new Error('Unterminated bencode dictionary');
      }
      this.pos++; // skip 'e'
      return dict;
    } finally {
      this.depth--;
    }
  }

  private indexOfByte(target: number, from: number): number {
    for (let i = from; i < this.data.length; i++) {
      if (this.data[i] === target) return i;
    }
    return -1;
  }
}

/**
 * Converts a Uint8Array or ArrayBuffer into SHA-1 hex string.
 */
async function computeSha1Hex(bytes: Uint8Array): Promise<string> {
  const cleanBytes = new Uint8Array(bytes.slice());
  const hashBuffer = await crypto.subtle.digest('SHA-1', cleanBytes as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toLowerCase();
}

/**
 * Decodes string from utf-8 or ascii bytes safely.
 */
function decodeUtf8(bytes: Uint8Array | undefined): string {
  if (!bytes) return '';
  try {
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return new TextDecoder('latin1').decode(bytes);
  }
}

/**
 * Parses raw .torrent file bytes into comprehensive TorrentMetadata.
 */
export async function parseTorrentFile(buffer: Uint8Array | ArrayBuffer): Promise<TorrentMetadata> {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const decoder = new BencodeDecoder(data);
  const root = decoder.decode();

  if (!root || typeof root !== 'object' || !root.info) {
    throw new Error('Invalid .torrent file: missing "info" dictionary');
  }

  if (!decoder.rawInfoSlice) {
    throw new Error('Failed to isolate raw "info" slice for SHA-1 verification');
  }

  const infoHash = await computeSha1Hex(decoder.rawInfoSlice);
  const info = root.info;

  // Name
  const name = decodeUtf8(info['name.utf-8'] || info.name) || `Torrent_${infoHash.slice(0, 8)}`;

  // Trackers
  const trackers: string[] = [];
  if (root.announce) {
    const mainTracker = decodeUtf8(root.announce).trim();
    if (mainTracker) trackers.push(mainTracker);
  }
  if (Array.isArray(root['announce-list'])) {
    for (const tier of root['announce-list']) {
      if (Array.isArray(tier)) {
        for (const tr of tier) {
          const t = decodeUtf8(tr).trim();
          if (t && !trackers.includes(t)) {
            trackers.push(t);
          }
        }
      }
    }
  }

  // Files & Size
  const files: TorrentFileItem[] = [];
  let totalLength = 0;

  if (typeof info.length === 'number') {
    // Single file torrent
    totalLength = info.length;
    files.push({ path: name, length: totalLength });
  } else if (Array.isArray(info.files)) {
    // Multi-file torrent
    for (const fileObj of info.files) {
      const len = typeof fileObj.length === 'number' ? fileObj.length : 0;
      totalLength += len;

      let rawSegments: string[] = [];
      if (Array.isArray(fileObj['path.utf-8'])) {
        rawSegments = fileObj['path.utf-8'].map(decodeUtf8);
      } else if (Array.isArray(fileObj.path)) {
        rawSegments = fileObj.path.map(decodeUtf8);
      }

      // Sanitize path segments to prevent directory traversal / Zip-Slip
      const safeSegments = rawSegments
        .filter((raw) => {
          const t = raw.trim();
          return t && t !== '.' && t !== '..' && !t.includes('/') && !t.includes('\\');
        })
        .map((seg) => sanitizeFilename(seg))
        .filter((seg) => seg && seg !== '_' && seg !== '.' && seg !== '..');

      const safeName = sanitizeFilename(name);
      const subPath = safeSegments.join('/');

      files.push({
        path: subPath ? `${safeName}/${subPath}` : safeName,
        length: len
      });
    }
  }

  // Piece Length & Pieces
  const pieceLength = typeof info['piece length'] === 'number' ? info['piece length'] : undefined;
  let pieceCount: number | undefined = undefined;
  if (info.pieces instanceof Uint8Array) {
    pieceCount = Math.floor(info.pieces.length / 20);
  }

  // Comment
  const comment = decodeUtf8(root['comment.utf-8'] || root.comment) || undefined;

  return {
    infoHash,
    name,
    totalLength,
    pieceLength,
    pieceCount,
    trackers,
    files,
    comment,
    isMagnet: false
  };
}
