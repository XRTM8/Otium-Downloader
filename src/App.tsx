import { useState, useEffect } from 'react';
import {
  X,
  ArrowDownToLine,
  CheckCircle2,
  Sliders,
  } from 'lucide-react';
import { Header, CURRENT_VERSION, type MainViewTab } from './components/Header';
import { QuickAddBar } from './components/QuickAddBar';
import { TaskList } from './components/TaskList';
import { SettingsView } from './components/SettingsView';
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
  const [activeView, setActiveView] = useState<MainViewTab>('downloads');
  const [autoUpdateState, setAutoUpdateState] = useState<{
    version: string;
    percent: number;
    status: 'downloading' | 'ready';
    filePath?: string;
  } | null>(null);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [detectedClipboardUrl, setDetectedClipboardUrl] = useState<string | null>(null);

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

      if (lines.length > 0) {
        e.preventDefault();
        setActiveView('downloads');
        setDetectedClipboardUrl(lines[0]);
      }
    };

    // Drag and Drop URLs or files onto window
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
          16,
          undefined,
          resolved.suggestedHeaders
        );
        setActiveView('downloads');
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    // Smart Clipboard Link Sniffer
    const checkClipboardForUrl = async () => {
      try {
        const text = await navigator.clipboard?.readText?.();
        if (text && /^https?:\/\/.+/i.test(text.trim())) {
          const trimmed = text.trim();
          const current = downloadManager.getTasks();
          const alreadyExists = current.some((t) => t.url === trimmed);
          if (!alreadyExists) {
            setDetectedClipboardUrl(trimmed);
          }
        }
      } catch {}
    };

    checkClipboardForUrl();
    window.addEventListener('focus', checkClipboardForUrl);

    // Background Autonomous Direct Update Check
    const updateTimer = setTimeout(() => {
      fetchReleaseInfo()
        .then((info) => {
          if (info && isNewerVersion(info.version, CURRENT_VERSION)) {
            startAutonomousDirectUpdate(info);
          }
        })
        .catch(() => {});
    }, 2000);

    return () => {
      unsubscribe();
      clearTimeout(updateTimer);
      window.removeEventListener('focus', checkClipboardForUrl);
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

  const handleAddTask = (url: string, filename?: string, segmentCount: number = 16) => {
    const resolved = resolveUniversalLink(url);
    downloadManager.addTask(
      resolved.resolvedUrl,
      filename,
      segmentCount,
      undefined,
      resolved.suggestedHeaders
    );
    setActiveView('downloads');
  };

  const startAutonomousDirectUpdate = (info: ReleaseInfo) => {
    if (!info || !isNewerVersion(info.version, CURRENT_VERSION)) return;
    const existing = downloadManager.getTasks().some((t) => t.filename.includes(info.version));
    if (existing) return;
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
              {lang === 'ar' ? 'أفلت الرابط هنا للتنزيل الفوري' : 'Drop link here to download'}
            </span>
            <span className="text-zinc-400 text-xs font-mono">
              {lang === 'ar' ? 'سيتم تسريع التنزيل بـ 16 مساراً متوازياً' : 'Accelerated with 16 parallel streams'}
            </span>
          </div>
        </div>
      )}

      {/* Unified Minimal Header */}
      <Header
        stats={stats}
        lang={lang}
        activeTab={activeView}
        onTabChange={setActiveView}
        speedHistory={speedHistory}
        onToggleLang={handleToggleLang}
      />

      {/* Autonomous Update Banner if downloading */}
      {autoUpdateState && (
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-3 animate-in-fade">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-emerald-900/30 to-[#060709] border border-emerald-500/30 flex items-center justify-between gap-3 shadow-lg">
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
                    ? (lang === 'ar' ? 'اكتمل التنزيل! جاري فتح التثبيت...' : 'Downloaded! Opening installer...')
                    : (lang === 'ar'
                        ? `جاري التنزيل فائق السرعة (${autoUpdateState.percent}%)...`
                        : `Downloading update in background (${autoUpdateState.percent}%)...`)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {autoUpdateState.status === 'ready' && autoUpdateState.filePath && (
                <button
                  onClick={() => downloadManager.openFile(autoUpdateState.filePath!)}
                  className="px-3 py-1.5 rounded-lg bg-[#00e599] text-[#060709] font-bold text-xs active:scale-95 transition-transform"
                >
                  {lang === 'ar' ? 'تثبيت الآن' : 'Install Now'}
                </button>
              )}
              <button
                onClick={() => setAutoUpdateState(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Single-View Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-28 sm:pb-12 space-y-4">
        {activeView === 'downloads' && (
          <>
            {/* Integrated Quick-Add Hero Bar (Zero Modals!) */}
            <QuickAddBar
              lang={lang}
              onAdd={handleAddTask}
              detectedClipboardUrl={detectedClipboardUrl}
              onClearClipboardUrl={() => setDetectedClipboardUrl(null)}
            />

            {/* Active & Pending Downloads */}
            <TaskList
              tasks={tasks}
              lang={lang}
              mode="downloads"
              onPause={(id) => downloadManager.pauseTask(id)}
              onResume={(id) => downloadManager.resumeTask(id)}
              onStartImmediately={(id) => downloadManager.startTaskImmediately(id)}
              onRestart={(id) => downloadManager.restartTask(id)}
              onRemove={(id, deleteDisk) => downloadManager.removeTask(id, deleteDisk)}
              onClearCompleted={() => downloadManager.clearCompleted()}
              onPauseAll={() => downloadManager.pauseAll()}
              onResumeAll={() => downloadManager.resumeAll()}
            />
          </>
        )}

        {activeView === 'finished' && (
          <TaskList
            tasks={tasks}
            lang={lang}
            mode="finished"
            onPause={(id) => downloadManager.pauseTask(id)}
            onResume={(id) => downloadManager.resumeTask(id)}
            onRemove={(id, deleteDisk) => downloadManager.removeTask(id, deleteDisk)}
            onClearCompleted={() => downloadManager.clearCompleted()}
            onRestart={(id) => downloadManager.restartTask(id)}
            onSwitchToDownloads={() => setActiveView('downloads')}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView lang={lang} />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Thumb Ergonomics) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#07080a]/95 backdrop-blur-2xl border-t border-white/[0.06] pb-safe px-4 py-2">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Active Downloads Tab */}
          <button
            onClick={() => setActiveView('downloads')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all relative ${
              activeView === 'downloads'
                ? 'text-[#00e599] font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <ArrowDownToLine className="w-5 h-5" />
              {stats.activeCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#00e599] text-[#060709] text-[9px] font-bold font-mono px-1 rounded-full animate-pulse">
                  {stats.activeCount}
                </span>
              )}
            </div>
            <span className="text-[11px] tracking-tight">
              {lang === 'ar' ? 'التنزيلات' : 'Downloads'}
            </span>
          </button>

          {/* Finished Library Tab */}
          <button
            onClick={() => setActiveView('finished')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all relative ${
              activeView === 'finished'
                ? 'text-[#00e599] font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <CheckCircle2 className="w-5 h-5" />
              {stats.completedCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-white/10 text-zinc-300 text-[9px] font-mono px-1 rounded-full">
                  {stats.completedCount}
                </span>
              )}
            </div>
            <span className="text-[11px] tracking-tight">
              {lang === 'ar' ? 'المكتملة' : 'Finished'}
            </span>
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => setActiveView('settings')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
              activeView === 'settings'
                ? 'text-[#00e599] font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">
              {lang === 'ar' ? 'الإعدادات' : 'Settings'}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
