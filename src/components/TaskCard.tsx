import React from 'react';
import {
  FileText,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Clock
} from 'lucide-react';
import type { DownloadTask } from '../types/downloader';
import { formatBytes, formatSpeed, formatEta } from '../core/segmentation';

interface TaskCardProps {
  task: DownloadTask;
  lang: 'ar' | 'en';
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  lang,
  onPause,
  onResume,
  onRemove
}) => {
  const isAr = lang === 'ar';
  const progressPercent =
    task.totalBytes > 0
      ? Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100))
      : 0;

  return (
    <div className="bg-[#0c0e14] border border-[#1e2230] hover:border-[#00e599]/30 rounded-2xl p-5 transition-all shadow-lg group">
      {/* Top Meta Bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#08090c] border border-[#1e2230] flex items-center justify-center shrink-0">
            {task.status === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-[#00e599]" />
            ) : task.status === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-400" />
            ) : (
              <FileText className="w-5 h-5 text-neutral-300 group-hover:text-[#00e599] transition-colors" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-bold text-sm text-white truncate max-w-md" title={task.filename}>
              {task.filename}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-neutral-400">
              <span>{formatBytes(task.downloadedBytes)} / {formatBytes(task.totalBytes)}</span>
              <span>•</span>
              <span className={`font-bold ${
                task.status === 'completed'
                  ? 'text-[#00e599]'
                  : task.status === 'paused'
                  ? 'text-amber-400'
                  : 'text-neutral-300'
              }`}>
                {task.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {task.status === 'downloading' && (
            <button
              onClick={() => onPause(task.id)}
              className="p-2 rounded-xl border border-[#1e2230] bg-[#08090c] hover:border-amber-400/40 text-neutral-300 hover:text-amber-400 transition-colors"
              title={isAr ? 'إيقاف مؤقت' : 'Pause'}
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          {(task.status === 'paused' || task.status === 'error') && (
            <button
              onClick={() => onResume(task.id)}
              className="p-2 rounded-xl border border-[#1e2230] bg-[#08090c] hover:border-[#00e599]/40 text-[#00e599] transition-colors"
              title={isAr ? 'استئناف' : 'Resume'}
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onRemove(task.id)}
            className="p-2 rounded-xl border border-[#1e2230] bg-[#08090c] hover:border-red-400/40 text-neutral-400 hover:text-red-400 transition-colors"
            title={isAr ? 'حذف' : 'Remove'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Continuous Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className="text-white font-bold">{progressPercent}%</span>
          {task.status === 'downloading' && (
            <div className="flex items-center gap-3 text-neutral-400">
              <span className="flex items-center gap-1 text-[#00e599]">
                <Zap className="w-3.5 h-3.5" />
                {formatSpeed(task.speedBytesPerSec)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatEta(task.etaSeconds)}
              </span>
            </div>
          )}
        </div>

        <div className="w-full h-2 rounded-full bg-[#08090c] border border-[#1e2230] overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              task.status === 'completed'
                ? 'bg-[#00e599]'
                : task.status === 'paused'
                ? 'bg-amber-400'
                : 'bg-[#00e599] shadow-[0_0_10px_rgba(0,229,153,0.5)]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Multi-Stream Segment Matrix Visualizer */}
      {task.chunks && task.chunks.length > 1 && (
        <div className="mt-3 pt-3 border-t border-[#1e2230]/60">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 mb-1.5">
            <span>{isAr ? 'مصفوفة المسارات المتزامنة' : 'PARALLEL SEGMENT MATRIX'}</span>
            <span>{task.chunks.length} {isAr ? 'مسارات نشطة' : 'STREAMS'}</span>
          </div>

          <div className="grid grid-cols-8 gap-1.5">
            {task.chunks.map((chunk) => {
              const chunkSpan = chunk.endByte - chunk.startByte + 1;
              const chunkPct = chunkSpan > 0 ? Math.round((chunk.downloaded / chunkSpan) * 100) : 0;
              return (
                <div
                  key={chunk.index}
                  className="h-2 rounded bg-[#08090c] border border-[#1e2230] overflow-hidden relative"
                  title={`Chunk #${chunk.index + 1}: ${chunkPct}%`}
                >
                  <div
                    className="h-full bg-[#00e599]/80 transition-all duration-300"
                    style={{ width: `${chunkPct}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
