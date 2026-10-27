import React, { useState } from 'react';
import { DownloadCloud, Trash2 } from 'lucide-react';
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
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  lang,
  onPause,
  onResume,
  onRemove,
  onClearCompleted,
  onOpenAddModal
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const isAr = lang === 'ar';

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return t.status === 'downloading' || t.status === 'paused';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Sub-header Filter Tabs */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-[#1e2230]">
        <div className="flex items-center gap-2">
          {(['all', 'active', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                filter === tab
                  ? 'bg-[#00e599]/10 text-[#00e599] border border-[#00e599]/30 font-bold'
                  : 'text-neutral-400 hover:text-white border border-transparent'
              }`}
            >
              {tab === 'all'
                ? isAr ? 'الكل' : 'All'
                : tab === 'active'
                ? isAr ? 'النشطة' : 'Active'
                : isAr ? 'المكتملة' : 'Completed'}
            </button>
          ))}
        </div>

        {tasks.some((t) => t.status === 'completed') && (
          <button
            onClick={onClearCompleted}
            className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'مسح المكتملة' : 'Clear Completed'}</span>
          </button>
        )}
      </div>

      {/* List content */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#1e2230] rounded-2xl bg-[#0c0e14]/50">
          <DownloadCloud className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">
            {isAr ? 'لا توجد تنزيلات في قائمة الانتظار' : 'No downloads in queue'}
          </h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4">
            {isAr
              ? 'أضف رابط تنزيل مباشر لتسريع التنزيل عبر مسارات متزامنة بدون خوادم وسيطة.'
              : 'Add a direct link to accelerate downloading over segmented parallel streams.'}
          </p>
          <button
            onClick={onOpenAddModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#08090c] border border-[#00e599]/40 text-[#00e599] hover:bg-[#00e599]/10 transition-colors"
          >
            {isAr ? 'إضافة رابط الآن' : 'Add Download URL'}
          </button>
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
