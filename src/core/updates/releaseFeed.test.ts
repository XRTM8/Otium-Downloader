import { describe, it, expect } from 'vitest';
import { isNewerVersion } from './releaseFeed';

describe('Otium Downloader Update Engine', () => {
  it('correctly compares semantic versions', () => {
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true);
    expect(isNewerVersion('1.1.0', '1.0.9')).toBe(true);
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true);
    expect(isNewerVersion('v1.0.5', '1.0.4')).toBe(true);

    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(false);
    expect(isNewerVersion('0.9.9', '1.0.0')).toBe(false);
  });
});
