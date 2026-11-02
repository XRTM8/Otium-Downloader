import React, { useState } from 'react';
import {
  Trash2,
  Search,
  Pause,
  Play,
  X,
  ArrowDownToLine,
  CheckCircle2,
  } from 'lucide-react';
import { OtiumLogo } from './OtiumLogo';
import type { DownloadTask } from '../types/downloader';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: DownloadTask[];
  lang: 'ar' | 'en';
  mode: 'downloads' | 'finished';
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string, deleteFileFromDisk?: boolean) => void;
  onClearCompleted: () => void;
  onStartImmediately?: (id: string) => void;
  onRestart?: (id: string) => void;
  onPauseAll?: () => void;
  onResumeAll?: () => void;
  onSwitchToDownloads?: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  lang,
  mode,
  onPause,
  onResume,
  onRemove,
  onClearCompleted,
  onStartImmediately,
  onRestart,
  onPauseAll,
  onResumeAll,
  onSwitchToDownloads
}) => {
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = useState('');

  // Partition tasks by mode
  const isDownloadsMode = mode === 'downloads';
  const filteredTasks = tasks.filter((t) => {
    if (isDownloadsMode) {
      if (t.status === 'completed') return false;
    } else {
      if (t.status !== 'completed') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.filename.toLowerCase().includes(q) || t.url.toLowerCase().includes(q);
    }
    return true;
  });

  const hasDownloading = tasks.some((t) => t.status === 'downloading');
  const hasPaused = tasks.some((t) => t.status === 'paused');
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-3 animate-in-fade">
      {/* Top Toolbar: Only show if there are tasks or in finished mode */}
      {(!isDownloadsMode || tasks.some((t) => t.status !== 'completed')) && (
        <div className="flex items-center justify-between gap-2">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث في القائمة...' : 'Search in list...'}
              className="w-full bg-[#0b0d13] border border-white/[0.06] focus:border-[#00e599]/40 rounded-xl pl-8 rtl:pr-8 rtl:pl-7 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none font-mono transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 rtl:left-2 rtl:right-auto top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Batch Control Buttons */}
          <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
            {isDownloadsMode && hasDownloading && onPauseAll && (
              <button
                onClick={onPauseAll}
                className="px-2.5 py-1.5 rounded-xl border border-white/[0.06] text-zinc-400 hover:text-amber-400 hover:bg-white/[0.04] transition-all flex items-center gap-1.5 active:scale-95"
                title={isAr ? 'إيقاف الكل' : 'Pause All'}
              >
                <Pause className="w-3 h-3" />
                <span className="hidden sm:inline text-[11px]">{isAr ? 'إيقاف الكل' : 'Pause All'}</span>
              </button>
            )}

            {isDownloadsMode && hasPaused && onResumeAll && (
              <button
                onClick={onResumeAll}
                className="px-2.5 py-1.5 rounded-xl border border-emerald-500/20 text-[#00e599] hover:bg-emerald-500/10 transition-all flex items-center gap-1.5 active:scale-95"
                title={isAr ? 'استئناف الكل' : 'Resume All'}
              >
                <Play className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline text-[11px]">{isAr ? 'استئناف الكل' : 'Resume All'}</span>
              </button>
            )}

            {!isDownloadsMode && completedCount > 0 && (
              <button
                onClick={onClearCompleted}
                className="px-2.5 py-1.5 rounded-xl border border-white/[0.06] text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all flex items-center gap-1.5 active:scale-95"
                title={isAr ? 'مسح السجل' : 'Clear History'}
              >
                <Trash2 className="w-3 h-3" />
                <span className="text-[11px]">{isAr ? 'مسح السجل' : 'Clear'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Task List / Empty States */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 sm:py-16 px-4 border border-white/[0.04] rounded-3xl bg-[#0b0d13]/60 backdrop-blur-md relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-[#00e599]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Icon Badge */}
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3.5 text-[#00e599] shadow-[0_0_24px_rgba(0,229,153,0.15)]">
            {isDownloadsMode ? <OtiumLogo className="w-6 h-6" glow /> : <CheckCircle2 className="w-6 h-6" />}
          </div>

          <h3 className="text-sm sm:text-base font-bold text-zinc-100 mb-1 tracking-tight">
            {searchQuery
              ? isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching items'
              : isDownloadsMode
              ? isAr ? 'لا توجد تنزيلات نشطة حالياً' : 'No active downloads'
              : isAr ? 'سجل التنزيلات المكتملة فارغ' : 'No completed downloads'}
          </h3>

          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4 leading-relaxed font-normal">
            {searchQuery
              ? isAr ? 'جرّب كلمة مفتاحية أخرى' : 'Try searching for something else'
              : isDownloadsMode
              ? isAr
                ? 'الصق أي رابط مباشر بالأعلى لبدء التنزيل فائق السرعة بـ 16 مساراً'
                : 'Paste any direct link above to accelerate download with 16 streams'
              : isAr
              ? 'الملفات المكتملة ستظهر هنا لتشغيلها والوصول إليها بلمسة واحدة'
              : 'Finished downloads will appear here for 1-tap playback'}
          </p>

          {!isDownloadsMode && onSwitchToDownloads && (
            <button
              onClick={onSwitchToDownloads}
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-mono text-zinc-300 hover:text-white transition-all inline-flex items-center gap-1.5"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 text-[#00e599]" />
              <span>{isAr ? 'الذهاب إلى قائمة التنزيلات' : 'Go to Downloads'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              lang={lang}
              onPause={onPause}
              onResume={onResume}
              onRemove={onRemove}
              onStartImmediately={onStartImmediately}
              onRestart={onRestart}
            />
          ))}
        </div>
      )}
    </div>
  );
};
