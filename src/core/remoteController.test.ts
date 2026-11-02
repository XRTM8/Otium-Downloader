import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RemoteController } from './remoteController';

describe('RemoteController Engine', () => {
  let controller: RemoteController;
  let memoryStorage: Record<string, string> = {};

  beforeEach(() => {
    memoryStorage = {};
    const mockStorage: Storage = {
      getItem: (k: string) => memoryStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        memoryStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete memoryStorage[k];
      },
      clear: () => {
        memoryStorage = {};
      },
      key: (i: number) => Object.keys(memoryStorage)[i] ?? null,
      length: 0
    };
    (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
    vi.restoreAllMocks();
    controller = new RemoteController();
  });

  afterEach(() => {
    delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
  });

  it('initializes with default empty config and disconnected status', () => {
    const config = controller.getConfig();
    expect(config.isConnected).toBe(false);
    expect(config.isConnecting).toBe(false);
    expect(config.host).toBe('');
    expect(config.pin).toBe('');
    expect(config.lastError).toBeNull();
  });

  it('saves and restores connection credentials', () => {
    controller.saveConnection('192.168.1.50:41524', '654321');
    const restored = new RemoteController();
    expect(restored.getConfig().host).toBe('192.168.1.50:41524');
    expect(restored.getConfig().pin).toBe('654321');
  });

  it('notifies subscribers on state updates', () => {
    const subscriber = vi.fn();
    const unsub = controller.subscribe(subscriber);

    controller.disconnect();
    expect(subscriber).toHaveBeenCalled();

    unsub();
    controller.disconnect();
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('successfully handles status polling with valid mock response', async () => {
    controller.saveConnection('127.0.0.1:41524', '123456');

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        app: 'Otium PC Remote',
        version: '1.3.1',
        stats: {
          activeCount: 1,
          queuedCount: 0,
          completedCount: 2,
          totalBytesDownloaded: 1048576,
          currentTotalSpeed: 524288,
          speedLimitBytesPerSec: 0
        },
        tasks: []
      })
    }) as any;

    const ok = await controller.pollStatus();
    expect(ok).toBe(true);
    expect(controller.getConfig().isConnected).toBe(true);
    expect(controller.getRemoteState().stats.activeCount).toBe(1);
  });

  it('handles invalid PIN with unauthorized 401 response', async () => {
    controller.saveConnection('127.0.0.1:41524', '000000');

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401
    }) as any;

    const ok = await controller.pollStatus();
    expect(ok).toBe(false);
    expect(controller.getConfig().isConnected).toBe(false);
    expect(controller.getConfig().lastError).toContain('PIN');
  });
});
