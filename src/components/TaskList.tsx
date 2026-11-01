import React, { useState } from 'react';
import { DownloadCloud, Trash2, Search, Pause, Play, X, Filter } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const isAr = lang === 'ar';

  const hasDownloading = tasks.some((t) => t.status === 'downloading');
  const hasPaused = tasks.some((t) => t.status === 'paused');
  const hasCompleted = tasks.some((t) => t.status === 'completed');

  const filteredTasks = tasks.filter((t) => {
    // Status Filter
    if (statusFilter === 'active' && !(t.status === 'downloading' || t.status === 'paused' || t.status === 'queued')) {
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
      return t.filename.toLowerCase().includes(q) || t.url.toLowerCase().includes(q);
    }
    return true;
  });

  const getStatusCount = (tab: 'all' | 'active' | 'completed') => {
    if (tab === 'all') return tasks.length;
    if (tab === 'active') {
      return tasks.filter((t) => t.status === 'downloading' || t.status === 'paused' || t.status === 'queued').length;
    }
    return tasks.filter((t) => t.status === 'completed').length;
  };

  return (
    <div className="space-y-4">
      {/* Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2230]">
        {/* Status Pills & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#0f1118] p-1 rounded-lg border border-[#1e2230] text-xs font-mono">
            {(['all', 'active', 'completed'] as const).map((tab) => {
              const label = tab === 'all' ? (isAr ? 'الكل' : 'All') : tab === 'active' ? (isAr ? 'النشطة' : 'Active') : (isAr ? 'المكتملة' : 'Done');
              const count = getStatusCount(tab);
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1 rounded-md transition-all ${
                    statusFilter === tab
                      ? 'bg-white/10 text-white font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {label} <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1 bg-[#0f1118] px-2 py-1 rounded-lg border border-[#1e2230] text-xs font-mono text-neutral-400">
            <Filter className="w-3 h-3 text-neutral-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-transparent text-neutral-300 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-[#0f1118]">{isAr ? 'كل الفئات' : 'All Types'}</option>
              <option value="programs" className="bg-[#0f1118]">{isAr ? 'برامج' : 'Programs'}</option>
              <option value="media" className="bg-[#0f1118]">{isAr ? 'وسائط' : 'Media'}</option>
              <option value="documents" className="bg-[#0f1118]">{isAr ? 'مستندات' : 'Docs'}</option>
              <option value="archives" className="bg-[#0f1118]">{isAr ? 'أرشيف' : 'Archives'}</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 rtl:right-2.5 rtl:left-auto top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث...' : 'Search...'}
              className="w-full bg-[#0f1118] border border-[#1e2230] rounded-lg pl-8 rtl:pr-8 rtl:pl-7 pr-7 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#00e599]/40 transition-colors"
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

        {/* Batch Actions */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs font-mono">
          {hasDownloading && onPauseAll && (
            <button
              onClick={onPauseAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-neutral-300 hover:text-white hover:bg-white/5 border border-[#1e2230] transition-colors"
              title={isAr ? 'إيقاف الكل مؤقتاً' : 'Pause All'}
            >
              <Pause className="w-3 h-3" />
              <span>{isAr ? 'إيقاف الكل' : 'Pause All'}</span>
            </button>
          )}

          {hasPaused && onResumeAll && (
            <button
              onClick={onResumeAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[#00e599] hover:bg-[#00e599]/10 border border-[#1e2230] transition-colors"
              title={isAr ? 'استئناف الكل' : 'Resume All'}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isAr ? 'استئناف الكل' : 'Resume All'}</span>
            </button>
          )}

          {hasCompleted && (
            <button
              onClick={onClearCompleted}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 border border-[#1e2230] transition-colors"
              title={isAr ? 'مسح المكتملة' : 'Clear Done'}
            >
              <Trash2 className="w-3 h-3" />
              <span>{isAr ? 'مسح المكتملة' : 'Clear Done'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#1e2230] rounded-2xl bg-[#0f1118]/30">
          <DownloadCloud className="w-10 h-10 text-neutral-600 mx-auto mb-2.5" />
          <h4 className="text-sm font-semibold text-white mb-1">
            {searchQuery
              ? isAr ? 'لا توجد نتائج مطابقة' : 'No matching downloads'
              : isAr ? 'لا توجد تنزيلات حالياً' : 'No downloads yet'}
          </h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4">
            {searchQuery
              ? isAr ? 'جرّب كلمة مفتاحية أخرى' : 'Try searching for something else'
              : isAr ? 'أضف رابط تنزيل مباشر للبدء فوراً' : 'Add a direct link to accelerate downloading'}
          </p>
          {!searchQuery && (
            <button
              onClick={onOpenAddModal}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#00e599] text-[#090a0f] hover:bg-[#00e599]/90 transition-colors"
            >
              {isAr ? 'إضافة تنزيل' : 'New Download'}
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
