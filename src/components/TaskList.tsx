import React, { useState } from 'react';
import { DownloadCloud, Trash2, Search, Pause, Play, X, Filter, ArrowUpDown } from 'lucide-react';
import type { DownloadTask, TaskCategory } from '../types/downloader';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: DownloadTask[];
  lang: 'ar' | 'en';
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
  onOpenAddModal: () => void;
  onStartImmediately?: (id: string) => void;
  onRestart?: (id: string) => void;
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
  onStartImmediately,
  onRestart,
  onPauseAll,
  onResumeAll
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'queued' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'size' | 'speed' | 'name'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const isAr = lang === 'ar';

  const hasDownloading = tasks.some((t) => t.status === 'downloading');
  const hasPaused = tasks.some((t) => t.status === 'paused');
  const hasCompleted = tasks.some((t) => t.status === 'completed');

  const filteredTasks = tasks.filter((t) => {
    // Status Filter
    if (statusFilter === 'active' && !(t.status === 'downloading' || t.status === 'paused')) {
      return false;
    }
    if (statusFilter === 'queued' && t.status !== 'queued') {
      return false;
    }
    if (statusFilter === 'completed' && t.status !== 'completed') {
      return false;
    }

    // Category Filter
    if (categoryFilter !== 'all' && t.category !== categoryFilter) {
      return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.filename.toLowerCase().includes(q);
      const matchUrl = t.url.toLowerCase().includes(q);
      return matchName || matchUrl;
    }
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'newest') return b.createdAt - a.createdAt;
    if (sortBy === 'size') return b.totalBytes - a.totalBytes;
    if (sortBy === 'speed') return b.speedBytesPerSec - a.speedBytesPerSec;
    if (sortBy === 'name') return a.filename.localeCompare(b.filename);
    return 0;
  });

  const getStatusLabel = (tab: 'all' | 'active' | 'queued' | 'completed') => {
    switch (tab) {
      case 'all': return isAr ? 'الكل' : 'All';
      case 'active': return isAr ? 'النشطة' : 'Active';
      case 'queued': return isAr ? 'في الانتظار' : 'Queued';
      case 'completed': return isAr ? 'المكتملة' : 'Done';
    }
  };

  const getStatusCount = (tab: 'all' | 'active' | 'queued' | 'completed') => {
    if (tab === 'all') return tasks.length;
    if (tab === 'active') {
      return tasks.filter((t) => t.status === 'downloading' || t.status === 'paused').length;
    }
    if (tab === 'queued') {
      return tasks.filter((t) => t.status === 'queued').length;
    }
    return tasks.filter((t) => t.status === 'completed').length;
  };

  const getCategoryLabel = (cat: TaskCategory | 'all') => {
    switch (cat) {
      case 'all': return isAr ? 'كل الأنواع' : 'All Types';
      case 'programs': return isAr ? 'برامج' : 'Programs';
      case 'media': return isAr ? 'وسائط' : 'Media';
      case 'documents': return isAr ? 'مستندات' : 'Docs';
      case 'archives': return isAr ? 'أرشيف' : 'Archives';
      default: return isAr ? 'أخرى' : 'Other';
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-header Filter & Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2230]">
        {/* Left: Filter Tabs + Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 bg-[#0e111a] p-1 rounded-xl border border-[#1e2230]">
            {(['all', 'active', 'queued', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                  statusFilter === tab
                    ? 'bg-[#00e599]/15 text-[#00e599] font-bold border border-[#00e599]/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white border border-transparent'
                }`}
              >
                {getStatusLabel(tab)}
                <span className="ml-1.5 rtl:mr-1.5 opacity-60 text-[10px]">
                  ({getStatusCount(tab)})
                </span>
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1 bg-[#0e111a] px-2 py-1 rounded-xl border border-[#1e2230] text-xs font-mono text-neutral-400">
            <Filter className="w-3 h-3 text-neutral-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-transparent text-neutral-300 focus:outline-none cursor-pointer text-xs"
            >
              {(['all', 'programs', 'media', 'documents', 'archives', 'other'] as const).map((cat) => (
                <option key={cat} value={cat} className="bg-[#0c0e14] text-white">
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-[#0e111a] px-2 py-1 rounded-xl border border-[#1e2230] text-xs font-mono text-neutral-400">
            <ArrowUpDown className="w-3 h-3 text-neutral-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-neutral-300 focus:outline-none cursor-pointer text-xs"
            >
              <option value="newest" className="bg-[#0c0e14]">{isAr ? 'الأحدث' : 'Newest'}</option>
              <option value="size" className="bg-[#0c0e14]">{isAr ? 'الأكبر حجماً' : 'Largest Size'}</option>
              <option value="speed" className="bg-[#0c0e14]">{isAr ? 'الأسرع' : 'Fastest'}</option>
              <option value="name" className="bg-[#0c0e14]">{isAr ? 'الاسم' : 'Name (A-Z)'}</option>
            </select>
          </div>

          {/* Quick Search Input */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 rtl:right-2.5 rtl:left-auto top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث...' : 'Search...'}
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
      {sortedTasks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#1e2230] rounded-2xl bg-[#0c0e14]/50">
          <DownloadCloud className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">
            {searchQuery
              ? isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'No downloads matched your search'
              : isAr ? 'لا توجد تنزيلات في هذه القائمة' : 'No downloads in this view'}
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
          {sortedTasks.map((task) => (
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
