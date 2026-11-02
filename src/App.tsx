import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Header } from './components/Header';
import { TaskList } from './components/TaskList';
import { AddTaskModal } from './components/AddTaskModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { RemoteControlModal } from './components/RemoteControlModal';
import { OtiumLogo } from './components/OtiumLogo';
import { downloadManager } from './core/downloadManager';
import { resolveUniversalLink } from './core/linkResolver';
import { fetchReleaseInfo, isNewerVersion, type ReleaseInfo } from './core/updates/releaseFeed';
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false);
  const [autoUpdateState, setAutoUpdateState] = useState<{
    version: string;
    percent: number;
    status: 'downloading' | 'ready';
    filePath?: string;
  } | null>(null);
  const [initialAddUrl, setInitialAddUrl] = useState<string | undefined>(undefined);
  const [initialBatchText, setInitialBatchText] = useState<string | undefined>(undefined);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    // Initial data fetch
    setTasks(downloadManager.getTasks());
    setStats(downloadManager.getStats());
    setSpeedHistory(downloadManager.getSpeedHistory());

    // Subscribe to state changes
    const unsubscribe = downloadManager.subscribe(() => {
      setTasks([...downloadManager.getTasks()]);
      setStats(downloadManager.getStats());
      setSpeedHistory([...downloadManager.getSpeedHistory()]);
    });

    // Global Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isInputActive = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

      // ?: Toggle Keyboard Shortcuts Cheatsheet
      if (e.key === '?' && !isInputActive) {
        e.preventDefault();
        setIsShortcutsOpen((p) => !p);
        return;
      }

      // Ctrl/Cmd + N: New Download
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setInitialAddUrl(undefined);
        setInitialBatchText(undefined);
        setIsAddModalOpen(true);
        return;
      }

      // Ctrl/Cmd + ,: Open Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }

      // Escape: Close all modals
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsSettingsOpen(false);
        setIsShortcutsOpen(false);
        setIsRemoteModalOpen(false);
        return;
      }

      // /: Quick Search Focus (when not typing in an input)
      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
        return;
      }
    };

    // Global Paste Listener (Ctrl+V / Cmd+V outside input fields)
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      const pasted = e.clipboardData?.getData('text/plain');
      if (!pasted || !pasted.trim()) return;

      const lines = pasted
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter((l) => /^https?:\/\/.+/i.test(l));

      if (lines.length > 1) {
        e.preventDefault();
        setInitialBatchText(lines.join('\n'));
        setInitialAddUrl(undefined);
        setIsAddModalOpen(true);
      } else if (lines.length === 1) {
        e.preventDefault();
        setInitialAddUrl(lines[0]);
        setInitialBatchText(undefined);
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
    window.addEventListener('paste', handleGlobalPaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    // Background Autonomous Direct Update Check
    const updateTimer = setTimeout(() => {
      fetchReleaseInfo()
        .then((info) => {
          if (info && isNewerVersion(info.version, '1.4.1')) {
            startAutonomousDirectUpdate(info);
          }
        })
        .catch(() => {});
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(updateTimer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handleGlobalPaste);
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

  const startAutonomousDirectUpdate = (info: ReleaseInfo) => {
    const isAndroid =
      /android/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && (window as any).__TAURI_METADATA__?.currentPlatform === 'android');
    const version = info.version;
    const downloadUrl = isAndroid
      ? info.assets?.androidApk?.url ||
        `https://github.com/XRTM8/Otium-Downloader/releases/download/v${version}/Otium_Downloader_${version}_arm64.apk`
      : info.assets?.windowsInstaller?.url ||
        `https://github.com/XRTM8/Otium-Downloader/releases/download/v${version}/Otium_Downloader_${version}_x64-setup.exe`;
    const filename = isAndroid
      ? `Otium_Downloader_${version}_arm64.apk`
      : `Otium_Downloader_${version}_x64-setup.exe`;

    // Immediately start accelerated 16-segment background download without waiting!
    const taskId = downloadManager.addTask(downloadUrl, filename, 16);
    setAutoUpdateState({
      version,
      percent: 0,
      status: 'downloading'
    });

    const unsub = downloadManager.subscribe(() => {
      const task = downloadManager.getTasks().find((t) => t.id === taskId);
      if (!task) return;

      const pct =
        task.totalBytes > 0
          ? Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100))
          : 0;

      if (task.status === 'completed') {
        unsub();
        setAutoUpdateState({
          version,
          percent: 100,
          status: 'ready',
          filePath: task.savePath
        });
        // Immediately trigger package installer / setup wizard!
        downloadManager.openFile(task.savePath);
      } else {
        setAutoUpdateState((prev) => (prev ? { ...prev, percent: pct } : null));
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#060709] text-zinc-100 flex flex-col selection:bg-[#00e599]/30 selection:text-[#00e599] relative">
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-[#00e599]/10 border-2 border-dashed border-[#00e599] backdrop-blur-md flex items-center justify-center pointer-events-none animate-in-fade">
          <div className="p-6 rounded-2xl bg-[#0f1118]/95 border border-[#00e599]/40 text-center shadow-2xl backdrop-blur-xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 text-[#00e599] shadow-[0_0_16px_rgba(0,229,153,0.25)]">
              <OtiumLogo className="w-6 h-6" glow />
            </div>
            <span className="text-[#00e599] font-bold text-sm block mb-1">
              {lang === 'ar' ? 'أفلت الرابط هنا للتنزيل المباشر' : 'Drop URL here to download'}
            </span>
            <span className="text-zinc-400 text-xs font-mono">
              {lang === 'ar' ? 'سيتم تسريع التنزيل عبر مسارات متزامنة' : 'Accelerated parallel streams'}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        stats={stats}
        lang={lang}
        speedHistory={speedHistory}
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={setIsSettingsOpen}
        onOpenShortcutsModal={() => setIsShortcutsOpen(true)}
        onOpenRemoteModal={() => setIsRemoteModalOpen(true)}
        onToggleLang={handleToggleLang}
        onOpenAddModal={() => {
          setInitialAddUrl(undefined);
          setInitialBatchText(undefined);
          setIsAddModalOpen(true);
        }}
      />

      {/* Real-time Autonomous Direct Background Update Banner */}
      {autoUpdateState && (
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-3 animate-in-fade">
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 via-emerald-900/30 to-[#060709] border border-emerald-500/30 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e599] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00e599]" />
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 truncate">
                <span className="text-xs font-bold text-[#00e599] font-mono">
                  ⚡ v{autoUpdateState.version} {lang === 'ar' ? 'تحديث تلقائي فوري' : 'Direct Auto-Update'}
                </span>
                <span className="text-[11px] text-zinc-300 truncate">
                  {autoUpdateState.status === 'ready'
                    ? (lang === 'ar' ? 'اكتمل التنزيل! جاري فتح نافذة التثبيت...' : 'Downloaded! Opening installer...')
                    : (lang === 'ar'
                        ? `جاري التنزيل فائق السرعة في الخلفية تلقائياً (${autoUpdateState.percent}%)...`
                        : `Downloading update in background (${autoUpdateState.percent}%)...`)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {autoUpdateState.status === 'ready' && autoUpdateState.filePath && (
                <button
                  onClick={() => downloadManager.openFile(autoUpdateState.filePath!)}
                  className="px-3 py-1.5 rounded-lg bg-[#00e599] text-[#060709] font-bold text-xs transition-transform active:scale-95 shadow-sm"
                >
                  {lang === 'ar' ? 'تثبيت الآن' : 'Install Now'}
                </button>
              )}
              <button
                onClick={() => setAutoUpdateState(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.04]"
                title={lang === 'ar' ? 'إغلاق' : 'Dismiss'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-28 sm:pb-12">
        <TaskList
          tasks={tasks}
          lang={lang}
          onPause={(id) => downloadManager.pauseTask(id)}
          onResume={(id) => downloadManager.resumeTask(id)}
          onStartImmediately={(id) => downloadManager.startTaskImmediately(id)}
          onRestart={(id) => downloadManager.restartTask(id)}
          onRemove={(id, deleteDisk) => downloadManager.removeTask(id, deleteDisk)}
          onClearCompleted={() => downloadManager.clearCompleted()}
          onOpenAddModal={() => {
            setInitialAddUrl(undefined);
            setInitialBatchText(undefined);
            setIsAddModalOpen(true);
          }}
          onPauseAll={() => downloadManager.pauseAll()}
          onResumeAll={() => downloadManager.resumeAll()}
        />
      </main>

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => {
          setInitialAddUrl(undefined);
          setInitialBatchText(undefined);
          setIsAddModalOpen(true);
        }}
        className="sm:hidden fixed bottom-6 end-5 z-40 w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500 to-[#00e599] text-[#060709] flex items-center justify-center shadow-[0_8px_28px_rgba(0,229,153,0.35)] active:scale-90 transition-transform"
        aria-label={lang === 'ar' ? 'تنزيل جديد' : 'New Download'}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Add Download Modal */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        lang={lang}
        initialUrl={initialAddUrl}
        initialBatchText={initialBatchText}
        onClose={() => {
          setIsAddModalOpen(false);
          setInitialAddUrl(undefined);
          setInitialBatchText(undefined);
        }}
        onAdd={handleAddTask}
        onAddBatch={handleAddBatch}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        lang={lang}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Sovereign Remote Control Companion Modal */}
      <RemoteControlModal
        isOpen={isRemoteModalOpen}
        lang={lang}
        onClose={() => setIsRemoteModalOpen(false)}
      />
    </div>
  );
}

export default App;
