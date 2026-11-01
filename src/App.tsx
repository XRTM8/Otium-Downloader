import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TaskList } from './components/TaskList';
import { AddTaskModal } from './components/AddTaskModal';
import { downloadManager } from './core/downloadManager';
import { resolveUniversalLink } from './core/linkResolver';
import type { DownloadTask, DownloadStats } from './types/downloader';

export function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [stats, setStats] = useState<DownloadStats>({
    activeCount: 0,
    queuedCount: 0,
    completedCount: 0,
    totalBytesDownloaded: 0,
    currentTotalSpeed: 0,
    speedLimitBytesPerSec: 0
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    // Initial data fetch
    setTasks(downloadManager.getTasks());
    setStats(downloadManager.getStats());

    // Subscribe to state changes
    const unsubscribe = downloadManager.subscribe(() => {
      setTasks([...downloadManager.getTasks()]);
      setStats(downloadManager.getStats());
    });

    // Global Keyboard Shortcuts (Ctrl/Cmd + N: New Download)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsAddModalOpen(true);
      }
    };

    // Drag and Drop URLs onto window
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(true);
    };

    const handleDragLeave = () => {
      setIsDraggingOver(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      const text = e.dataTransfer?.getData('text/plain') || e.dataTransfer?.getData('text/uri-list');
      if (text && /^https?:\/\/.+/i.test(text.trim())) {
        const resolved = resolveUniversalLink(text.trim());
        downloadManager.addTask(
          resolved.resolvedUrl,
          undefined,
          undefined,
          undefined,
          resolved.suggestedHeaders
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleToggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    document.documentElement.setAttribute('lang', next);
    document.documentElement.setAttribute('dir', next === 'ar' ? 'rtl' : 'ltr');
  };

  const handleAddTask = (
    url: string,
    filename?: string,
    segmentCount?: number,
    sha256?: string,
    headers?: Record<string, string>
  ) => {
    const resolved = resolveUniversalLink(url);
    const combinedHeaders = {
      ...(resolved.suggestedHeaders || {}),
      ...(headers || {})
    };
    downloadManager.addTask(
      resolved.resolvedUrl,
      filename,
      segmentCount,
      sha256,
      Object.keys(combinedHeaders).length > 0 ? combinedHeaders : undefined
    );
  };

  const handleAddBatch = (urls: string[], segmentCount?: number) => {
    const resolvedUrls = urls.map((u) => resolveUniversalLink(u).resolvedUrl);
    downloadManager.addBatchTasks(resolvedUrls, segmentCount);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex flex-col selection:bg-[#00e599]/30 selection:text-[#00e599] relative">
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-[#00e599]/10 border-2 border-dashed border-[#00e599] backdrop-blur-sm flex items-center justify-center pointer-events-none animate-fade-in">
          <div className="p-6 rounded-2xl bg-[#0f1118] border border-[#00e599]/40 text-center shadow-2xl">
            <span className="text-[#00e599] font-bold text-sm block mb-1">
              {lang === 'ar' ? 'أفلت الرابط هنا للتحميل المباشر' : 'Drop URL here to download'}
            </span>
            <span className="text-neutral-400 text-xs font-mono">
              {lang === 'ar' ? 'سيتم تسريع التنزيل عبر مسارات متزامنة' : 'Will accelerate via parallel streams'}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        stats={stats}
        lang={lang}
        onToggleLang={handleToggleLang}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-12">
        <TaskList
          tasks={tasks}
          lang={lang}
          onPause={(id) => downloadManager.pauseTask(id)}
          onResume={(id) => downloadManager.resumeTask(id)}
          onStartImmediately={(id) => downloadManager.startTaskImmediately(id)}
          onRestart={(id) => downloadManager.restartTask(id)}
          onRemove={(id) => downloadManager.removeTask(id)}
          onClearCompleted={() => downloadManager.clearCompleted()}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onPauseAll={() => downloadManager.pauseAll()}
          onResumeAll={() => downloadManager.resumeAll()}
        />
      </main>

      {/* Add Download Modal */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        lang={lang}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTask}
        onAddBatch={handleAddBatch}
      />
    </div>
  );
}

export default App;
