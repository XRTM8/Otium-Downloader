import React, { useState } from 'react';
import {
  FileText,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  FolderOpen,
  Copy,
  Check,
  Zap,
  RotateCcw
} from 'lucide-react';
import type { DownloadTask } from '../../types/downloader';
import { formatBytes, formatSpeed, formatEta } from '../../core/segmentation';
import { downloadManager } from '../../core/downloadManager';
import { haptics } from '../../core/haptics';

interface MobileTaskCardProps {
  task: DownloadTask;
  lang: 'ar' | 'en';
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
  onRestart?: (id: string) => void;
  onStartImmediately?: (id: string) => void;
}

export const MobileTaskCard: React.FC<MobileTaskCardProps> = ({
  task,
  lang,
  onPause,
  onResume,
  onRemove,
  onRestart,
  onStartImmediately
}) => {
  const [copied, setCopied] = useState(false);
  const isAr = lang === 'ar';

  const progressPercent =
    task.totalBytes > 0
      ? Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100))
      : 0;

  const handleCopy = () => {
    haptics.light();
    navigator.clipboard?.writeText(task.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePause = () => {
    haptics.medium();
    onPause(task.id);
  };

  const handleResume = () => {
    haptics.medium();
    onResume(task.id);
  };

  const handleRemove = () => {
    haptics.heavy();
    onRemove(task.id);
  };

  const handleRestart = () => {
    haptics.medium();
    onRestart?.(task.id);
  };

  const handleOpen = () => {
    haptics.light();
    downloadManager.openFile(task.savePath || task.filename);
  };

  const handleFolder = () => {
    haptics.light();
    downloadManager.openFolder(task.savePath || task.filename);
  };

  const getStatusText = () => {
    switch (task.status) {
      case 'downloading': return isAr ? 'قيد التنزيل' : 'Downloading';
      case 'paused': return isAr ? 'متوقف مؤقتاً' : 'Paused';
      case 'queued': return isAr ? 'في الانتظار' : 'Queued';
      case 'completed': return isAr ? 'مكتمل ✓' : 'Done ✓';
      case 'error': return isAr ? 'تعذر التحميل' : 'Error';
    }
  };

  return (
    <div className="bg-[#0c0e14] border border-[#1e2230] rounded-2xl p-4 shadow-md transition-all active:border-[#00e599]/30">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-[#08090c] border border-[#1e2230] flex items-center justify-center shrink-0">
            {task.status === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-[#00e599]" />
            ) : task.status === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : task.status === 'queued' ? (
              <Clock className="w-4 h-4 text-cyan-400" />
            ) : (
              <FileText className="w-4 h-4 text-[#00e599]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-xs text-white truncate" title={task.filename}>
              {task.filename}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-neutral-400">
              <span>{formatBytes(task.downloadedBytes)} / {formatBytes(task.totalBytes)}</span>
              <span>•</span>
              <span className={`font-bold ${
                task.status === 'completed'
                  ? 'text-[#00e599]'
                  : task.status === 'paused'
                  ? 'text-amber-400'
                  : task.status === 'queued'
                  ? 'text-cyan-400'
                  : task.status === 'error'
                  ? 'text-red-400'
                  : 'text-[#00e599]'
              }`}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="shrink-0 flex items-center gap-1.5">
          {task.status === 'queued' && onStartImmediately && (
            <button
              onClick={() => {
                haptics.medium();
                onStartImmediately(task.id);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-400/15 border border-cyan-400/40 text-cyan-400 font-bold text-[11px] font-mono transition-transform active:scale-95"
            >
              {isAr ? 'ابدأ' : 'Start'}
            </button>
          )}

          {task.status === 'downloading' && (
            <button
              onClick={handlePause}
              className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 transition-transform active:scale-95"
              title={isAr ? 'إيقاف مؤقت' : 'Pause'}
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          {(task.status === 'paused' || task.status === 'error') && (
            <button
              onClick={handleResume}
              className="p-2.5 rounded-xl bg-[#00e599]/15 border border-[#00e599]/40 text-[#00e599] transition-transform active:scale-95"
              title={isAr ? 'استئناف' : 'Resume'}
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}

          {task.status === 'completed' && (
            <button
              onClick={handleOpen}
              className="p-2.5 rounded-xl bg-[#00e599]/15 border border-[#00e599]/40 text-[#00e599] transition-transform active:scale-95"
              title={isAr ? 'فتح الملف' : 'Open'}
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
          <span className="text-white font-bold">{progressPercent}%</span>
          {task.status === 'downloading' && (
            <div className="flex items-center gap-2 text-neutral-400">
              <span className="text-[#00e599] flex items-center gap-1 font-bold">
                <Zap className="w-3 h-3" />
                {formatSpeed(task.speedBytesPerSec)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
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
                : task.status === 'queued'
                ? 'bg-cyan-400/50'
                : 'bg-[#00e599] shadow-[0_0_8px_rgba(0,229,153,0.4)]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Segment mini stream indicators */}
      {task.chunks && task.chunks.length > 1 && (
        <div className="grid grid-cols-8 gap-1 mt-2.5">
          {task.chunks.map((chunk) => {
            const chunkSpan = chunk.endByte - chunk.startByte + 1;
            const chunkPct = chunkSpan > 0 ? Math.round((chunk.downloaded / chunkSpan) * 100) : 0;
            return (
              <div
                key={chunk.index}
                className="h-1.5 rounded-sm bg-[#08090c] border border-[#1e2230] overflow-hidden"
              >
                <div
                  className={`h-full transition-all duration-200 ${
                    chunk.status === 'completed'
                      ? 'bg-[#00e599]'
                      : chunk.status === 'downloading'
                      ? 'bg-[#00e599] animate-pulse'
                      : 'bg-[#00e599]/30'
                  }`}
                  style={{ width: `${chunkPct}%` }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Action Strip */}
      <div className="mt-3 pt-2.5 border-t border-[#1e2230]/60 flex items-center justify-between text-neutral-400">
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:text-white hover:bg-white/5 transition-colors"
            title={isAr ? 'نسخ الرابط' : 'Copy link'}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00e599]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {task.status === 'completed' && (
            <button
              onClick={handleFolder}
              className="p-2 rounded-lg hover:text-[#00e599] hover:bg-white/5 transition-colors"
              title={isAr ? 'عرض بالمجلد' : 'Show in folder'}
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          )}

          {(task.status === 'completed' || task.status === 'error') && onRestart && (
            <button
              onClick={handleRestart}
              className="p-2 rounded-lg hover:text-[#00e599] hover:bg-white/5 transition-colors"
              title={isAr ? 'إعادة التنزيل' : 'Restart'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={handleRemove}
          className="p-2 rounded-lg hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title={isAr ? 'حذف' : 'Delete'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
