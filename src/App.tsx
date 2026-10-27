import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TaskList } from './components/TaskList';
import { AddTaskModal } from './components/AddTaskModal';
import { downloadManager } from './core/downloadManager';
import type { DownloadTask, DownloadStats } from './types/downloader';

export function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [stats, setStats] = useState<DownloadStats>({
    activeCount: 0,
    completedCount: 0,
    totalBytesDownloaded: 0,
    currentTotalSpeed: 0
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    // Initial fetch
    setTasks(downloadManager.getTasks());
    setStats(downloadManager.getStats());

    // Subscribe to state updates
    const unsubscribe = downloadManager.subscribe(() => {
      setTasks([...downloadManager.getTasks()]);
      setStats(downloadManager.getStats());
    });

    return () => unsubscribe();
  }, []);

  const handleToggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    document.documentElement.setAttribute('lang', next);
    document.documentElement.setAttribute('dir', next === 'ar' ? 'rtl' : 'ltr');
  };

  const handleAddTask = (url: string, filename?: string, segmentCount?: number) => {
    downloadManager.addTask(url, filename, segmentCount);
  };

  return (
    <div className="min-h-screen bg-[#08090c] text-white flex flex-col selection:bg-[#00e599]/30 selection:text-[#00e599]">
      <Header
        stats={stats}
        lang={lang}
        onToggleLang={handleToggleLang}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        <TaskList
          tasks={tasks}
          lang={lang}
          onPause={(id) => downloadManager.pauseTask(id)}
          onResume={(id) => downloadManager.resumeTask(id)}
          onRemove={(id) => downloadManager.removeTask(id)}
          onClearCompleted={() => downloadManager.clearCompleted()}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      </main>

      <AddTaskModal
        isOpen={isAddModalOpen}
        lang={lang}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTask}
      />
    </div>
  );
}

export default App;
