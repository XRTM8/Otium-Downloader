import React, { useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { DownloadTask, DownloadStats, TaskCategory } from '../../types/downloader';
import { MobileHeader } from './MobileHeader';
import { MobileNavBar, type MobileTab } from './MobileNavBar';
import { MobileTaskCard } from './MobileTaskCard';
import { MobileStatsView } from './MobileStatsView';
import { MobileSnifferView } from './MobileSnifferView';
import { MobileSettingsView } from './MobileSettingsView';
import { AddTaskModal } from '../AddTaskModal';
import { haptics } from '../../core/haptics';

interface MobileViewProps {
  tasks: DownloadTask[];
  stats: DownloadStats;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
  onRestart?: (id: string) => void;
  onStartImmediately?: (id: string) => void;
  onClearCompleted: () => void;
  onAddDownload: (
    url: string,
    filename?: string,
    segmentCount?: number,
    sha256?: string,
    headers?: Record<string, string>
  ) => void;
  onAddBatch?: (urls: string[], segmentCount?: number) => void;
  onSwitchToDesktop: () => void;
}

export const MobileView: React.FC<MobileViewProps> = ({
  tasks,
  stats,
  lang,
  onToggleLang,
  onPause,
  onResume,
  onRemove,
  onRestart,
  onStartImmediately,
  onClearCompleted,
  onAddDownload,
  onAddBatch,
  onSwitchToDesktop
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('downloads');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'queued' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');

  const isAr = lang === 'ar';

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'active' && !(t.status === 'downloading' || t.status === 'paused')) return false;
    if (statusFilter === 'queued' && t.status !== 'queued') return false;
    if (statusFilter === 'completed' && t.status !== 'completed') return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.filename.toLowerCase().includes(q) || t.url.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenAdd = () => {
    haptics.heavy();
    setIsAddSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#08090c] text-white flex flex-col relative selection:bg-[#00e599]/30 selection:text-[#00e599]">
      {/* Mobile Top Header */}
      <MobileHeader
        totalSpeed={stats.currentTotalSpeed}
        lang={lang}
        onToggleLang={onToggleLang}
        onSwitchToDesktop={onSwitchToDesktop}
      />

      {/* Main Tab View Container */}
      <main className="flex-1 p-4 pb-28 max-w-md w-full mx-auto">
        {activeTab === 'downloads' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Search & Filter Bar */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث في التنزيلات...' : 'Search downloads...'}
                  className="w-full bg-[#0c0e14] border border-[#1e2230] rounded-2xl pl-9 rtl:pr-9 rtl:pl-8 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#00e599]/40"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 rtl:left-2.5 rtl:right-auto top-1/2 -translate-y-1/2 text-neutral-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
                {[
                  { id: 'all' as const, label: isAr ? 'الكل' : 'All', count: tasks.length },
                  { id: 'active' as const, label: isAr ? 'النشطة' : 'Active', count: stats.activeCount },
                  { id: 'queued' as const, label: isAr ? 'الانتظار' : 'Queue', count: stats.queuedCount },
                  { id: 'completed' as const, label: isAr ? 'المكتملة' : 'Done', count: stats.completedCount }
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => {
                      haptics.light();
                      setStatusFilter(pill.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap text-[11px] ${
                      statusFilter === pill.id
                        ? 'bg-[#00e599]/15 text-[#00e599] font-bold border border-[#00e599]/40 shadow-sm'
                        : 'bg-[#0c0e14] text-neutral-400 border border-[#1e2230]'
                    }`}
                  >
                    {pill.label} ({pill.count})
                  </button>
                ))}
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
                {[
                  { id: 'all' as const, label: isAr ? 'كل الفئات' : 'All Types' },
                  { id: 'programs' as const, label: isAr ? 'برامج' : 'Programs' },
                  { id: 'media' as const, label: isAr ? 'وسائط' : 'Media' },
                  { id: 'documents' as const, label: isAr ? 'مستندات' : 'Docs' },
                  { id: 'archives' as const, label: isAr ? 'أرشيف' : 'Archives' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      haptics.light();
                      setCategoryFilter(cat.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap text-[10px] ${
                      categoryFilter === cat.id
                        ? 'bg-white/10 text-white font-bold border border-white/20'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Cards List */}
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-[#1e2230] bg-[#0c0e14]/40 mt-4">
                <span className="text-2xl block mb-2">⚡</span>
                <h4 className="text-sm font-bold text-white mb-1">
                  {searchQuery
                    ? isAr ? 'لا توجد نتائج مطابقة' : 'No matches found'
                    : isAr ? 'لا توجد تنزيلات في هذه القائمة' : 'No downloads yet'}
                </h4>
                <p className="text-xs text-neutral-500 mb-4 max-w-xs mx-auto">
                  {isAr ? 'اضغط على زر الزائد بالأسفل أو استعمل اللاقط الذكي' : 'Tap the + button below or use Smart Sniffer'}
                </p>
                <button
                  onClick={handleOpenAdd}
                  className="px-4 py-2 rounded-xl text-xs font-bold font-mono bg-[#00e599] text-[#08090c] shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-transform active:scale-95"
                >
                  {isAr ? 'إضافة تنزيل جديد' : 'New Download'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <MobileTaskCard
                    key={task.id}
                    task={task}
                    lang={lang}
                    onPause={onPause}
                    onResume={onResume}
                    onRemove={onRemove}
                    onRestart={onRestart}
                    onStartImmediately={onStartImmediately}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <MobileStatsView stats={stats} lang={lang} />
        )}

        {activeTab === 'sniffer' && (
          <MobileSnifferView
            lang={lang}
            onAddDownload={onAddDownload}
            onNavigateToDownloads={() => setActiveTab('downloads')}
          />
        )}

        {activeTab === 'settings' && (
          <MobileSettingsView
            lang={lang}
            onSwitchToDesktop={onSwitchToDesktop}
            onClearCompleted={onClearCompleted}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) for quick add on Downloads tab */}
      {activeTab === 'downloads' && (
        <button
          onClick={handleOpenAdd}
          className="fixed bottom-20 right-5 rtl:right-auto rtl:left-5 z-40 w-14 h-14 rounded-full bg-[#00e599] text-[#08090c] shadow-[0_0_20px_rgba(0,229,153,0.45)] flex items-center justify-center transition-transform active:scale-90 hover:scale-105"
          title={isAr ? 'تنزيل جديد' : 'New Download'}
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Bottom Sheet for Adding Downloads */}
      <AddTaskModal
        isOpen={isAddSheetOpen}
        lang={lang}
        onClose={() => setIsAddSheetOpen(false)}
        onAdd={onAddDownload}
        onAddBatch={onAddBatch}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeCount={stats.activeCount}
        queuedCount={stats.queuedCount}
        lang={lang}
      />
    </div>
  );
};
