import { describe, it, expect } from 'vitest';
import { DownloadManager } from './downloadManager';

describe('DownloadManager', () => {
  it('adds and queues download task properly', () => {
    const mgr = new DownloadManager();
    const id = mgr.addTask('https://example.com/iso/archlinux.iso', 'archlinux.iso', 8);
    const tasks = mgr.getTasks();

    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(id);
    expect(tasks[0].filename).toBe('archlinux.iso');
    expect(tasks[0].chunks.length).toBe(8);
    mgr.destroy();
  });

  it('handles pause and resume', () => {
    const mgr = new DownloadManager();
    const id = mgr.addTask('https://example.com/test.zip');
    
    mgr.pauseTask(id);
    let task = mgr.getTasks()[0];
    expect(task.status).toBe('paused');
    expect(task.speedBytesPerSec).toBe(0);

    mgr.resumeTask(id);
    task = mgr.getTasks()[0];
    expect(task.status).toBe('downloading');
    mgr.destroy();
  });

  it('handles pauseAll and resumeAll batch controls', () => {
    const mgr = new DownloadManager();
    mgr.addTask('https://example.com/file1.zip');
    mgr.addTask('https://example.com/file2.zip');

    mgr.pauseAll();
    expect(mgr.getTasks().every((t) => t.status === 'paused')).toBe(true);

    mgr.resumeAll();
    expect(mgr.getTasks().every((t) => t.status === 'downloading')).toBe(true);
    mgr.destroy();
  });

  it('calculates aggregate statistics properly', () => {
    const mgr = new DownloadManager();
    mgr.addTask('https://example.com/f1.bin');
    mgr.addTask('https://example.com/f2.bin');

    const stats = mgr.getStats();
    expect(stats.activeCount).toBe(2);
    expect(stats.completedCount).toBe(0);

    const task1 = mgr.getTasks()[0];
    mgr.updateTaskProgress(task1.id, task1.totalBytes);

    const updatedStats = mgr.getStats();
    expect(updatedStats.completedCount).toBe(1);
    expect(updatedStats.activeCount).toBe(1);

    mgr.clearCompleted();
    expect(mgr.getTasks().length).toBe(1);

    mgr.destroy();
  });

  it('initializes optional checksum verification', () => {
    const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const mgr = new DownloadManager();
    const id = mgr.addTask('https://example.com/release.iso', undefined, 4, expected);
    const task = mgr.getTasks().find((t) => t.id === id);

    expect(task?.checksum).toBeDefined();
    expect(task?.checksum?.expected).toBe(expected);
    expect(task?.checksum?.verified).toBe(false);

    mgr.destroy();
  });

  it('correctly handles magnet links and assigns torrents category', () => {
    const mgr = new DownloadManager();
    const magnetUri = 'magnet:?xt=urn:btih:da39a3ee5e6b4b0d3255bfef95601890afd80709&dn=ArchLinux_2026.iso&xl=1073741824';
    const id = mgr.addTask(magnetUri);
    const task = mgr.getTasks().find((t) => t.id === id);

    expect(task).toBeDefined();
    expect(task?.category).toBe('torrents');
    expect(task?.filename).toBe('ArchLinux_2026.iso');
    expect(task?.torrentInfo?.infoHash).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(task?.totalBytes).toBe(1073741824);

    mgr.destroy();
  });

  it('restores tasks from storage and marks downloading tasks as paused', () => {
    const memoryStorage: Record<string, string> = {};
    const mockStorage: Storage = {
      getItem: (k: string) => memoryStorage[k] ?? null,
      setItem: (k: string, v: string) => { memoryStorage[k] = v; },
      removeItem: (k: string) => { delete memoryStorage[k]; },
      clear: () => { Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]); },
      key: (i: number) => Object.keys(memoryStorage)[i] ?? null,
      length: 0
    };
    (globalThis as any).localStorage = mockStorage;

    const rawSaved = JSON.stringify([
      {
        id: 'task_saved_1',
        url: 'https://example.com/movie.mp4',
        filename: 'movie.mp4',
        totalBytes: 1000,
        downloadedBytes: 500,
        status: 'downloading',
        speedBytesPerSec: 1024,
        etaSeconds: 10,
        chunks: [],
        createdAt: 1000
      }
    ]);
    mockStorage.setItem('otium_download_tasks_v1', rawSaved);

    const mgr = new DownloadManager();
    const tasks = mgr.getTasks();
    const restored = tasks.find((t) => t.id === 'task_saved_1');

    expect(restored).toBeDefined();
    expect(restored?.status).toBe('paused');
    expect(restored?.speedBytesPerSec).toBe(0);
    expect(restored?.downloadedBytes).toBe(500);

    mgr.destroy();
    delete (globalThis as any).localStorage;
  });

  it('enforces max concurrent downloads queue and promotes queued tasks', () => {
    const mgr = new DownloadManager();
    mgr.updateSettings({ maxConcurrentDownloads: 2 });

    const id1 = mgr.addTask('https://example.com/1.bin');
    const id2 = mgr.addTask('https://example.com/2.bin');
    const id3 = mgr.addTask('https://example.com/3.bin');

    const tasks = mgr.getTasks();
    const t1 = tasks.find((t) => t.id === id1);
    const t2 = tasks.find((t) => t.id === id2);
    const t3 = tasks.find((t) => t.id === id3);

    expect(t1?.status).toBe('downloading');
    expect(t2?.status).toBe('downloading');
    expect(t3?.status).toBe('queued');

    const stats = mgr.getStats();
    expect(stats.activeCount).toBe(2);
    expect(stats.queuedCount).toBe(1);

    // Complete task 1 -> task 3 should automatically be promoted to downloading
    mgr.updateTaskProgress(id1, t1!.totalBytes);

    expect(t1?.status).toBe('completed');
    expect(t3?.status).toBe('downloading');

    mgr.destroy();
  });

  it('allows manual promotion of queued task to start immediately', () => {
    const mgr = new DownloadManager();
    mgr.updateSettings({ maxConcurrentDownloads: 1 });

    mgr.addTask('https://example.com/a.bin');
    const id2 = mgr.addTask('https://example.com/b.bin');

    const t2 = mgr.getTasks().find((t) => t.id === id2);
    expect(t2?.status).toBe('queued');

    mgr.startTaskImmediately(id2);
    expect(t2?.status).toBe('downloading');

    mgr.destroy();
  });

  it('handles addBatchTasks with multi-line filtering', () => {
    const mgr = new DownloadManager();
    const urls = [
      'https://example.com/file1.iso',
      '',
      '   ',
      'https://example.com/file2.zip',
      'https://example.com/file3.tar.gz'
    ];

    const addedIds = mgr.addBatchTasks(urls, 4);
    expect(addedIds.length).toBe(3);

    const tasks = mgr.getTasks();
    expect(tasks.length).toBe(3);
    expect(tasks.map((t) => t.filename).sort()).toEqual([
      'file1.iso',
      'file2.zip',
      'file3.tar.gz'
    ]);

    mgr.destroy();
  });

  it('restarts an existing completed or paused task from zero bytes', () => {
    const mgr = new DownloadManager();
    const id = mgr.addTask('https://example.com/test-restart.bin');

    const task = mgr.getTasks().find((t) => t.id === id)!;
    // Simulate partial progress and completion
    mgr.updateTaskProgress(id, task.totalBytes);
    expect(mgr.getTasks().find((t) => t.id === id)?.status).toBe('completed');
    expect(mgr.getTasks().find((t) => t.id === id)?.downloadedBytes).toBe(task.totalBytes);

    // Restart the task
    mgr.restartTask(id);
    const restarted = mgr.getTasks().find((t) => t.id === id);
    expect(restarted?.downloadedBytes).toBe(0);
    expect(restarted?.status).toBe('downloading');
    expect(restarted?.chunks.every((c) => c.downloaded === 0)).toBe(true);

    mgr.destroy();
  });

  it('maintains a rolling speed history buffer of 20 samples', () => {
    const mgr = new DownloadManager();
    const history = mgr.getSpeedHistory();
    expect(history).toBeInstanceOf(Array);
    expect(history.length).toBe(20);
    expect(history.every((v) => typeof v === 'number')).toBe(true);

    mgr.destroy();
  });

  it('automatically deduplicates filenames when adding duplicate names', () => {
    const mgr = new DownloadManager();
    mgr.addTask('https://example.com/data.zip');
    mgr.addTask('https://example.com/data.zip');
    mgr.addTask('https://example.com/data.zip');

    const filenames = mgr.getTasks().map((t) => t.filename).sort();
    expect(filenames).toEqual(['data (1).zip', 'data (2).zip', 'data.zip']);

    mgr.destroy();
  });

  it('exports URLs and JSON task definitions correctly', () => {
    const mgr = new DownloadManager();
    mgr.addTask('https://example.com/test1.zip');
    mgr.addTask('https://example.com/test2.iso');

    const urls = mgr.exportUrls();
    expect(urls).toContain('https://example.com/test1.zip');
    expect(urls).toContain('https://example.com/test2.iso');

    const json = mgr.exportTasksJson();
    const parsed = JSON.parse(json);
    expect(parsed.length).toBe(2);
    expect(parsed[0].url).toBeDefined();

    mgr.destroy();
  });

  it('imports tasks from text and JSON definitions accurately', () => {
    const mgr = new DownloadManager();
    const textData = `
      https://example.com/first.mp4
      some random log line
      https://example.com/second.pdf
    `;

    const importedFromText = mgr.importTasks(textData, 4);
    expect(importedFromText).toBe(2);

    const jsonData = JSON.stringify([
      { url: 'https://example.com/json1.tar.gz', filename: 'custom-json.tar.gz' },
      { url: 'https://example.com/json2.bin' }
    ]);

    const importedFromJson = mgr.importTasks(jsonData, 8);
    expect(importedFromJson).toBe(2);

    expect(mgr.getTasks().length).toBe(4);
    expect(mgr.getTasks().some((t) => t.filename === 'custom-json.tar.gz')).toBe(true);

    mgr.destroy();
  });

  it('handles batch pause, resume, and remove actions on selected task ids', () => {
    const mgr = new DownloadManager();
    const id1 = mgr.addTask('https://example.com/batch1.zip');
    const id2 = mgr.addTask('https://example.com/batch2.zip');
    const id3 = mgr.addTask('https://example.com/batch3.zip');

    mgr.pauseTasks([id1, id2]);
    expect(mgr.getTasks().find((t) => t.id === id1)?.status).toBe('paused');
    expect(mgr.getTasks().find((t) => t.id === id2)?.status).toBe('paused');

    mgr.resumeTasks([id1]);
    expect(mgr.getTasks().find((t) => t.id === id1)?.status).toBe('downloading');

    mgr.removeTasks([id1, id3]);
    expect(mgr.getTasks().length).toBe(1);
    expect(mgr.getTasks()[0].id).toBe(id2);

    mgr.destroy();
  });
});
