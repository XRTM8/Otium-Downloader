import React, { useState, useRef } from 'react';
import {
  Trash2,
  Search,
  Pause,
  Play,
  X,
  Filter,
  Upload,
  Download,
  Check,
  CheckSquare
} from 'lucide-react';
import { OtiumLogo } from './OtiumLogo';
import type { DownloadTask, TaskCategory } from '../types/downloader';
import { downloadManager } from '../core/downloadManager';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: DownloadTask[];
  lang: 'ar' | 'en';
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string, deleteFileFromDisk?: boolean) => void;
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
  const [copiedExport, setCopiedExport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isAr = lang === 'ar';

  const toggleSelectTask = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportUrls = () => {
    const urls = downloadManager.exportUrls(statusFilter === 'all' ? undefined : statusFilter);
    if (!urls) return;
    navigator.clipboard?.writeText(urls);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        downloadManager.importTasks(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const handleBatchPauseSelected = () => {
    downloadManager.pauseTasks(Array.from(selectedIds));
  };

  const handleBatchResumeSelected = () => {
    downloadManager.resumeTasks(Array.from(selectedIds));
  };

  const handleBatchRemoveSelected = () => {
    downloadManager.removeTasks(Array.from(selectedIds), false);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  return (
    <div className="space-y-3.5">
      {/* Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        {/* Status Tabs, Categories & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented Control Tabs */}
          <div className="flex items-center gap-1 bg-[#0f1118] p-1 rounded-lg border border-white/[0.06] text-xs font-mono">
            {(['all', 'active', 'completed'] as const).map((tab) => {
              const label = tab === 'all' ? (isAr ? 'الكل' : 'All') : tab === 'active' ? (isAr ? 'النشطة' : 'Active') : (isAr ? 'المكتملة' : 'Done');
              const count = getStatusCount(tab);
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1 rounded-md transition-all text-xs ${
                    statusFilter === tab
                      ? 'bg-white/[0.08] text-zinc-100 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {label} <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Category Selector */}
          <div className="flex items-center gap-1 bg-[#0f1118] px-2 py-1 rounded-lg border border-white/[0.06] text-xs font-mono text-zinc-400">
            <Filter className="w-3 h-3 text-zinc-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-[#0f1118]">{isAr ? 'كل الفئات' : 'All Types'}</option>
              <option value="programs" className="bg-[#0f1118]">{isAr ? 'برامج' : 'Programs'}</option>
              <option value="media" className="bg-[#0f1118]">{isAr ? 'وسائط' : 'Media'}</option>
              <option value="documents" className="bg-[#0f1118]">{isAr ? 'مستندات' : 'Docs'}</option>
              <option value="archives" className="bg-[#0f1118]">{isAr ? 'أرشيف' : 'Archives'}</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 rtl:right-2.5 rtl:left-auto top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث سريع... (/)' : 'Search... (/)'}
              className="w-full bg-[#0f1118] border border-white/[0.06] rounded-lg pl-8 rtl:pr-8 rtl:pl-7 pr-7 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#00e599]/40 transition-colors font-mono"
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
        </div>

        {/* Batch Actions Group */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs font-mono">
          {/* File Import Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".txt,.json"
            className="hidden"
            onChange={handleImportFile}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-white/[0.06] transition-colors"
            title={isAr ? 'استيراد روابط من ملف .txt أو .json' : 'Import URLs from file'}
          >
            <Upload className="w-3 h-3" />
            <span>{isAr ? 'استيراد' : 'Import'}</span>
          </button>

          {tasks.length > 0 && (
            <>
              <button
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedIds(new Set());
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                  isSelectionMode
                    ? 'bg-[#00e599]/10 border-[#00e599]/40 text-[#00e599]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border-white/[0.06]'
                }`}
                title={isAr ? 'وضع التحديد المتعدد' : 'Multi-select mode'}
              >
                <CheckSquare className="w-3 h-3" />
                <span>{isAr ? 'تحديد' : 'Select'}</span>
              </button>

              <button
                onClick={handleExportUrls}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-white/[0.06] transition-colors"
                title={isAr ? 'نسخ روابط التنزيل الحالية للحافظة' : 'Copy download URLs to clipboard'}
              >
                {copiedExport ? <Check className="w-3 h-3 text-[#00e599]" /> : <Download className="w-3 h-3" />}
                <span>{copiedExport ? (isAr ? 'تم النسخ ✓' : 'Copied ✓') : (isAr ? 'تصدير' : 'Export')}</span>
              </button>
            </>
          )}
          {hasDownloading && onPauseAll && (
            <button
              onClick={onPauseAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.04] border border-white/[0.06] transition-colors"
              title={isAr ? 'إيقاف الكل مؤقتاً' : 'Pause All'}
            >
              <Pause className="w-3 h-3" />
              <span>{isAr ? 'إيقاف الكل' : 'Pause All'}</span>
            </button>
          )}

          {hasPaused && onResumeAll && (
            <button
              onClick={onResumeAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[#00e599] hover:bg-[#00e599]/10 border border-white/[0.06] transition-colors"
              title={isAr ? 'استئناف الكل' : 'Resume All'}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isAr ? 'استئناف الكل' : 'Resume All'}</span>
            </button>
          )}

          {hasCompleted && (
            <button
              onClick={onClearCompleted}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/[0.06] transition-colors"
              title={isAr ? 'مسح التنزيلات المكتملة' : 'Clear Done'}
            >
              <Trash2 className="w-3 h-3" />
              <span>{isAr ? 'مسح المكتملة' : 'Clear Done'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Selection Mode Bar */}
      {isSelectionMode && filteredTasks.length > 0 && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f1118] border border-white/[0.08] text-xs font-mono animate-in-fade shadow-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-zinc-300 hover:text-white bg-white/[0.04] transition-colors"
            >
              <span>{selectedIds.size === filteredTasks.length ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect All') : (isAr ? 'تحديد الكل' : 'Select All')}</span>
            </button>
            <span className="text-[#00e599] font-semibold text-[11px]">
              {selectedIds.size} {isAr ? 'محدد' : 'selected'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={handleBatchPauseSelected}
                  className="px-2 py-1 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors"
                >
                  {isAr ? 'إيقاف' : 'Pause'}
                </button>
                <button
                  onClick={handleBatchResumeSelected}
                  className="px-2 py-1 rounded-lg text-[#00e599] hover:bg-[#00e599]/10 transition-colors"
                >
                  {isAr ? 'استئناف' : 'Resume'}
                </button>
                <button
                  onClick={handleBatchRemoveSelected}
                  className="px-2 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  {isAr ? 'حذف' : 'Delete'}
                </button>
              </>
            )}
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedIds(new Set());
              }}
              className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Task Cards Container */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/[0.06] rounded-2xl bg-[#0f1118]/25 animate-in-fade relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 shadow-inner">
            <OtiumLogo className="w-6 h-6 text-zinc-500" />
          </div>
          <h4 className="text-sm font-semibold text-zinc-200 mb-1">
            {searchQuery
              ? isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching downloads'
              : isAr ? 'لا توجد تنزيلات حالياً' : 'No downloads in this view'}
          </h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
            {searchQuery
              ? isAr ? 'جرّب كلمة مفتاحية أخرى أو امسح شريط البحث' : 'Try searching for something else or clear the query'
              : isAr ? 'أضف رابط تنزيل مباشر أو اضغط ⌘N للبدء' : 'Add a download link or press ⌘N to start'}
          </p>
          {!searchQuery && (
            <button
              onClick={onOpenAddModal}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#00e599] text-[#08090c] hover:bg-[#00e599]/90 active:scale-[0.98] transition-all shadow-[0_0_12px_rgba(0,229,153,0.15)]"
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
              isSelected={selectedIds.has(task.id)}
              selectionMode={isSelectionMode}
              onToggleSelect={toggleSelectTask}
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
