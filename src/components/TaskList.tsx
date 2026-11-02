import React, { useState, useRef } from 'react';
import {
  Trash2,
  Search,
  Pause,
  Play,
  X,
  Upload,
  Download,
  Check,
  CheckSquare,
  Plus
} from 'lucide-react';
import { OtiumLogo } from './OtiumLogo';
import type { DownloadTask, TaskCategory } from '../types/downloader';
import { downloadManager } from '../core/downloadManager';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: DownloadTask[];
  lang: 'ar' | 'en';
  activeTab?: 'all' | 'active' | 'completed';
  onTabChange?: (tab: 'all' | 'active' | 'completed') => void;
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
  activeTab,
  onTabChange,
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
  const [internalStatusFilter, setInternalStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const statusFilter = activeTab !== undefined ? activeTab : internalStatusFilter;
  const setStatusFilter = (tab: 'all' | 'active' | 'completed') => {
    if (onTabChange) onTabChange(tab);
    else setInternalStatusFilter(tab);
  };
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

  const categories: { key: TaskCategory; ar: string; en: string }[] = [
    { key: 'programs', ar: 'برامج', en: 'Apps' },
    { key: 'media', ar: 'وسائط', en: 'Media' },
    { key: 'documents', ar: 'مستندات', en: 'Docs' },
    { key: 'archives', ar: 'أرشيف', en: 'Archives' },
  ];

  return (
    <div className="space-y-3">
      {/* Search & Actions Bar */}
      <div className="flex items-center gap-2">
        {/* Unified Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث في التنزيلات...' : 'Search downloads...'}
            className="w-full bg-[#0d0f14]/80 border border-white/[0.06] rounded-xl pl-8 rtl:pr-8 rtl:pl-8 pr-8 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 rtl:left-2.5 rtl:right-auto top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Discreet Toolbar Actions */}
        <div className="flex items-center gap-1 shrink-0 font-mono text-xs">
          {/* Hidden file input for import */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".txt,.json"
            className="hidden"
            onChange={handleImportFile}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-white/[0.05] transition-colors flex items-center gap-1.5"
            title={isAr ? 'استيراد روابط' : 'Import URLs'}
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">{isAr ? 'استيراد' : 'Import'}</span>
          </button>

          {tasks.length > 0 && (
            <>
              <button
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedIds(new Set());
                }}
                className={`p-2 sm:px-2.5 sm:py-2 rounded-xl border transition-colors flex items-center gap-1.5 ${
                  isSelectionMode
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-[#00e599]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border-white/[0.05]'
                }`}
                title={isAr ? 'وضع التحديد' : 'Select'}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">{isAr ? 'تحديد' : 'Select'}</span>
              </button>

              <button
                onClick={handleExportUrls}
                className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-white/[0.05] transition-colors flex items-center gap-1.5"
                title={isAr ? 'تصدير الروابط' : 'Export URLs'}
              >
                {copiedExport ? <Check className="w-3.5 h-3.5 text-[#00e599]" /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline text-xs">{copiedExport ? (isAr ? 'تم ✓' : 'Done') : (isAr ? 'تصدير' : 'Export')}</span>
              </button>
            </>
          )}

          {hasDownloading && onPauseAll && (
            <button
              onClick={onPauseAll}
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-zinc-300 hover:text-amber-400 hover:bg-white/[0.04] border border-white/[0.05] transition-colors flex items-center gap-1.5"
              title={isAr ? 'إيقاف الكل' : 'Pause All'}
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">{isAr ? 'إيقاف الكل' : 'Pause All'}</span>
            </button>
          )}

          {hasPaused && onResumeAll && (
            <button
              onClick={onResumeAll}
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-[#00e599] hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors flex items-center gap-1.5"
              title={isAr ? 'استئناف الكل' : 'Resume All'}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline text-xs">{isAr ? 'استئناف الكل' : 'Resume'}</span>
            </button>
          )}

          {hasCompleted && (
            <button
              onClick={onClearCompleted}
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/[0.05] transition-colors flex items-center gap-1.5"
              title={isAr ? 'مسح المكتملة' : 'Clear Done'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">{isAr ? 'مسح' : 'Clear'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Filter Chips Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {/* Main Status Chips */}
        {(['all', 'active', 'completed'] as const).map((tab) => {
          const label = tab === 'all' ? (isAr ? 'الكل' : 'All') : tab === 'active' ? (isAr ? 'النشطة' : 'Active') : (isAr ? 'المكتملة' : 'Done');
          const count = getStatusCount(tab);
          const isActive = statusFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all shrink-0 flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-zinc-100 text-[#07080a] font-semibold border-zinc-200 shadow-sm'
                  : 'bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-zinc-200 border-white/[0.05]'
              }`}
            >
              <span>{label}</span>
              <span className={`text-[10px] font-normal ${isActive ? 'text-zinc-600' : 'text-zinc-500'}`}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-3.5 bg-white/[0.08] mx-1 shrink-0" />

        {/* Category Filter Chips */}
        {categories.map((cat) => {
          const isSelected = categoryFilter === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(isSelected ? 'all' : cat.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 border ${
                isSelected
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-[#00e599] font-medium shadow-[0_0_10px_rgba(0,229,153,0.1)]'
                  : 'bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-zinc-200 border-white/[0.05]'
              }`}
            >
              {isAr ? cat.ar : cat.en}
            </button>
          );
        })}
      </div>

      {/* Selection Mode Bar */}
      {isSelectionMode && filteredTasks.length > 0 && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d0f14] border border-white/[0.08] text-xs font-mono animate-in-fade shadow-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-zinc-300 hover:text-white bg-white/[0.04] transition-colors"
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
                  className="px-2.5 py-1 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors"
                >
                  {isAr ? 'إيقاف' : 'Pause'}
                </button>
                <button
                  onClick={handleBatchResumeSelected}
                  className="px-2.5 py-1 rounded-lg text-[#00e599] hover:bg-[#00e599]/10 transition-colors"
                >
                  {isAr ? 'استئناف' : 'Resume'}
                </button>
                <button
                  onClick={handleBatchRemoveSelected}
                  className="px-2.5 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
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
        <div className="text-center py-16 px-4 border border-white/[0.04] rounded-2xl bg-[#0b0d13]/60 backdrop-blur-sm animate-in-fade relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3.5 text-[#00e599] shadow-[0_0_20px_rgba(0,229,153,0.12)]">
            <OtiumLogo className="w-6 h-6" glow />
          </div>
          <h4 className="text-sm font-semibold text-zinc-100 mb-1">
            {searchQuery
              ? isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching downloads'
              : statusFilter === 'completed'
              ? isAr ? 'لا توجد تنزيلات مكتملة حتى الآن' : 'No finished downloads yet'
              : isAr ? 'لا توجد تنزيلات نشطة حالياً' : 'No active downloads'}
          </h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4 font-normal">
            {searchQuery ? (
              isAr ? 'جرّب كلمة مفتاحية أخرى أو امسح شريط البحث' : 'Try searching for something else or clear query'
            ) : (
              <>
                <span className="sm:hidden">
                  {statusFilter === 'completed'
                    ? isAr ? 'ستظهر هنا جميع الملفات التي تكتمل لتشغيلها بلمسة واحدة' : 'Completed downloads will appear here for 1-tap playback'
                    : isAr ? 'انسخ أي رابط وافتح التطبيق للتنزيل الفوري، أو اضغط +' : 'Copy any link and switch back to download, or tap +'}
                </span>
                <span className="hidden sm:inline">
                  {statusFilter === 'completed'
                    ? isAr ? 'الملفات المكتملة تظهر هنا لإدارتها وتشغيلها فوراً' : 'Completed files will be listed here'
                    : isAr ? 'أفلت رابطاً هنا للتنزيل، أو اضغط ⌘N للبدء' : 'Drop a URL here or press ⌘N to start'}
                </span>
              </>
            )}
          </p>
          {!searchQuery && statusFilter !== 'completed' && (
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00e599]/15 border border-[#00e599]/30 text-[#00e599] hover:bg-[#00e599]/25 active:scale-95 transition-all shadow-[0_0_12px_rgba(0,229,153,0.1)]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isAr ? 'تنزيل جديد' : 'New Download'}</span>
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