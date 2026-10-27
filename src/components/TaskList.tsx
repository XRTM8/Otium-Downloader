import React, { useState } from 'react';
import { DownloadCloud, Trash2, Search, Pause, Play, X } from 'lucide-react';
import type { DownloadTask } from '../types/downloader';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: DownloadTask[];
  lang: 'ar' | 'en';
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
  onOpenAddModal: () => void;
  onPauseAll?: () => void;
  onResumeAll?: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  lang,
  onPause,
  onResume,
  onRemove,
  onClearCompleted,
  onOpenAddModal,
  onPauseAll,
  onResumeAll
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const isAr = lang === 'ar';

  const hasDownloading = tasks.some((t) => t.status === 'downloading');
  const hasPaused = tasks.some((t) => t.status === 'paused');
  const hasCompleted = tasks.some((t) => t.status === 'completed');

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active' && !(t.status === 'downloading' || t.status === 'paused')) {
      return false;
    }
    if (filter === 'completed' && t.status !== 'completed') {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.filename.toLowerCase().includes(q);
      const matchUrl = t.url.toLowerCase().includes(q);
      return matchName || matchUrl;
    }
    return true;
  });

  const getTabLabel = (tab: 'all' | 'active' | 'completed') => {
    if (tab === 'all') return isAr ? 'الكل' : 'All';
    if (tab === 'active') return isAr ? 'النشطة' : 'Active';
    return isAr ? 'المكتملة' : 'Completed';
  };

  const getTabCount = (tab: 'all' | 'active' | 'completed') => {
    if (tab === 'all') return tasks.length;
    if (tab === 'active') {
      return tasks.filter((t) => t.status === 'downloading' || t.status === 'paused').length;
    }
    return tasks.filter((t) => t.status === 'completed').length;
  };

  return (
    <div className="space-y-4">
      {/* Sub-header Filter & Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2230]">
        {/* Left: Filter Tabs + Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#0e111a] p-1 rounded-xl border border-[#1e2230]">
            {(['all', 'active', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                  filter === tab
                    ? 'bg-[#00e599]/15 text-[#00e599] font-bold border border-[#00e599]/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white border border-transparent'
                }`}
              >
                {getTabLabel(tab)}
                <span className="ml-1.5 rtl:mr-1.5 opacity-60 text-[10px]">
                  ({getTabCount(tab)})
                </span>
              </button>
            ))}
          </div>

          {/* Quick Search Input */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 rtl:right-2.5 rtl:left-auto top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم أو الرابط...' : 'Search downloads...'}
              className="w-full bg-[#0c0e14] border border-[#1e2230] rounded-xl pl-8 rtl:pr-8 rtl:pl-7 pr-7 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#00e599]/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 rtl:left-2 rtl:right-auto top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Batch Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {hasDownloading && onPauseAll && (
            <button
              onClick={onPauseAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-[#141824] hover:bg-[#1a2030] text-amber-300 border border-amber-500/30 transition-colors"
              title={isAr ? 'إيقاف كل التنزيلات النشطة مؤقتاً' : 'Pause all active downloads'}
            >
              <Pause className="w-3 h-3" />
              <span>{isAr ? 'إيقاف الكل' : 'Pause All'}</span>
            </button>
          )}

          {hasPaused && onResumeAll && (
            <button
              onClick={onResumeAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-[#141824] hover:bg-[#1a2030] text-[#00e599] border border-[#00e599]/30 transition-colors"
              title={isAr ? 'استئناف كل التنزيلات المتوقفة' : 'Resume all paused downloads'}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isAr ? 'استئناف الكل' : 'Resume All'}</span>
            </button>
          )}

          {hasCompleted && (
            <button
              onClick={onClearCompleted}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title={isAr ? 'حذف المهام المكتملة من القائمة' : 'Clear completed tasks from list'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'مسح المكتملة' : 'Clear Completed'}</span>
            </button>
          )}
        </div>
      </div>

      {/* List content */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#1e2230] rounded-2xl bg-[#0c0e14]/50">
          <DownloadCloud className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">
            {searchQuery
              ? isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'No downloads matched your search'
              : isAr ? 'لا توجد تنزيلات في قائمة الانتظار' : 'No downloads in queue'}
          </h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4">
            {searchQuery
              ? isAr ? 'جرّب كلمة مفتاحية أخرى أو امسح البحث.' : 'Try a different keyword or clear the search query.'
              : isAr
              ? 'أضف رابط تنزيل مباشر لتسريع التنزيل عبر مسارات متزامنة بدون خوادم وسيطة.'
              : 'Add a direct link to accelerate downloading over segmented parallel streams.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#08090c] border border-[#00e599]/40 text-[#00e599] hover:bg-[#00e599]/10 transition-colors"
            >
              {isAr ? 'إضافة رابط الآن' : 'Add Download URL'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              lang={lang}
              onPause={onPause}
              onResume={onResume}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
};
