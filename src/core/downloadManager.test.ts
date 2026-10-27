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
});
