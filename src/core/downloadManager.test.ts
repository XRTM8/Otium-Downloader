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

  it('updates task progress and completes when all bytes downloaded', () => {
    const mgr = new DownloadManager();
    const id = mgr.addTask('https://example.com/video.mp4');
    const task = mgr.getTasks()[0];
    
    mgr.updateTaskProgress(id, task.totalBytes);
    expect(task.status).toBe('completed');
    expect(task.downloadedBytes).toBe(task.totalBytes);
    expect(task.completedAt).toBeDefined();

    mgr.destroy();
  });
});
