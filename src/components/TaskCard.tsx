import React, { useState } from 'react';
import {
  FileText,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  FolderOpen,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import type { DownloadTask } from '../types/downloader';
import { formatBytes, formatSpeed, formatEta } from '../core/segmentation';
import { downloadManager } from '../core/downloadManager';

interface TaskCardProps {
  task: DownloadTask;
  lang: 'ar' | 'en';
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
  onStartImmediately?: (id: string) => void;
  onRestart?: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  lang,
  onPause,
  onResume,
  onRemove,
  onStartImmediately,
  onRestart
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const isAr = lang === 'ar';
  const progressPercent =
    task.totalBytes > 0
      ? Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100))
      : 0;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(task.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const handleVerifyHash = async () => {
    setIsVerifying(true);
    await downloadManager.verifyHash(task.id);
    setIsVerifying(false);
  };

  const handleOpenFolder = () => {
    downloadManager.openFolder(task.savePath || task.filename);
  };

  return (
    <div className="bg-[#0f1118] border border-[#1e2230] hover:border-[#2a3044] rounded-xl p-4 transition-all">
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* File Icon */}
          <div className="w-8 h-8 rounded-lg bg-[#090a0f] border border-[#1e2230] flex items-center justify-center shrink-0">
            {task.status === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-[#00e599]" />
            ) : task.status === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : task.status === 'queued' ? (
              <Clock className="w-4 h-4 text-neutral-400" />
            ) : (
              <FileText className="w-4 h-4 text-neutral-300" />
            )}
          </div>

          {/* Title & Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs text-white truncate" title={task.filename}>
                {task.filename}
              </h3>
              {task.category && task.category !== 'other' && (
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10 shrink-0">
                  {task.category}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-neutral-400">
              <span>{formatBytes(task.downloadedBytes)} / {formatBytes(task.totalBytes)}</span>
              <span>•</span>
              <span className={`font-medium ${
                task.status === 'completed'
                  ? 'text-[#00e599]'
                  : task.status === 'paused'
                  ? 'text-amber-400'
                  : task.status === 'queued'
                  ? 'text-neutral-400'
                  : task.status === 'error'
                  ? 'text-red-400'
                  : 'text-[#00e599]'
              }`}>
                {task.status === 'queued' ? (isAr ? 'في الانتظار' : 'Queued') : task.status.toUpperCase()}
              </span>

              {task.status === 'downloading' && (
                <>
                  <span>•</span>
                  <span className="text-white font-semibold">{formatSpeed(task.speedBytesPerSec)}</span>
                  {task.etaSeconds > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-neutral-400">{formatEta(task.etaSeconds)}</span>
                    </>
                  )}
                </>
              )}
            </div>

            {task.errorMessage && (
              <div className="text-red-400 text-[10px] font-mono mt-1 flex items-center gap-1 truncate" title={task.errorMessage}>
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span className="truncate">{task.errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {task.status === 'queued' && onStartImmediately && (
            <button
              onClick={() => onStartImmediately(task.id)}
              className="px-2.5 py-1 rounded-lg border border-[#1e2230] text-neutral-200 hover:text-white hover:bg-white/5 text-xs font-mono font-medium transition-colors"
            >
              {isAr ? 'بدء الآن' : 'Start'}
            </button>
          )}

          {task.status === 'downloading' && (
            <button
              onClick={() => onPause(task.id)}
              className="p-1.5 rounded-lg border border-[#1e2230] text-neutral-300 hover:text-amber-400 hover:bg-white/5 transition-colors"
              title={isAr ? 'إيقاف مؤقت' : 'Pause'}
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}

          {(task.status === 'paused' || task.status === 'error') && (
            <button
              onClick={() => onResume(task.id)}
              className="p-1.5 rounded-lg border border-[#1e2230] text-[#00e599] hover:bg-[#00e599]/10 transition-colors"
              title={isAr ? 'استئناف' : 'Resume'}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          {task.status === 'completed' && (
            <>
              <button
                onClick={() => downloadManager.openFile(task.savePath || task.filename)}
                className="p-1.5 rounded-lg border border-[#1e2230] text-[#00e599] hover:bg-[#00e599]/10 transition-colors"
                title={isAr ? 'فتح الملف' : 'Open'}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleOpenFolder}
                className="p-1.5 rounded-lg border border-[#1e2230] text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                title={isAr ? 'عرض في المجلد' : 'Show in Folder'}
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {(task.status === 'completed' || task.status === 'error') && onRestart && (
            <button
              onClick={() => onRestart(task.id)}
              className="p-1.5 rounded-lg border border-[#1e2230] text-neutral-400 hover:text-[#00e599] hover:bg-white/5 transition-colors"
              title={isAr ? 'إعادة التنزيل' : 'Restart'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg border border-[#1e2230] text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            title={isAr ? 'نسخ الرابط' : 'Copy URL'}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#00e599]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => onRemove(task.id)}
            className="p-1.5 rounded-lg border border-[#1e2230] text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title={isAr ? 'حذف' : 'Remove'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="mt-3">
        <div className="w-full h-1.5 rounded-full bg-[#090a0f] border border-[#1e2230] overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              task.status === 'completed'
                ? 'bg-[#00e599]'
                : task.status === 'paused'
                ? 'bg-amber-400'
                : task.status === 'queued'
                ? 'bg-neutral-600'
                : 'bg-[#00e599]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Segment Breakdown Track (Clean & Technical, Only when segmented) */}
      {task.chunks && task.chunks.length > 1 && task.status === 'downloading' && (
        <div className="grid grid-cols-8 gap-1 mt-2">
          {task.chunks.map((chunk) => {
            const span = chunk.endByte - chunk.startByte + 1;
            const pct = span > 0 ? Math.round((chunk.downloaded / span) * 100) : 0;
            return (
              <div
                key={chunk.index}
                className="h-1 rounded-sm bg-[#090a0f] border border-[#1e2230] overflow-hidden"
                title={`Part ${chunk.index + 1}: ${pct}%`}
              >
                <div
                  className={`h-full transition-all duration-150 ${
                    chunk.status === 'completed' ? 'bg-[#00e599]' : 'bg-[#00e599]/60'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Checksum Status (Completed Tasks) */}
      {task.status === 'completed' && (
        <div className="mt-2.5 pt-2 border-t border-[#1e2230]/60 flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
            {task.checksum?.verified ? (
              <span className="text-[#00e599] font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                {isAr ? 'تم التحقق من مطابقة SHA-256 ✓' : 'SHA-256 Verified ✓'}
              </span>
            ) : task.checksum?.actual ? (
              <span className="text-neutral-400 font-mono text-[10px]">
                SHA-256: {task.checksum.actual.slice(0, 16)}...
              </span>
            ) : (
              <span className="text-neutral-500">
                {isAr ? 'فحص البصمة' : 'Integrity'}
              </span>
            )}
          </div>

          {!task.checksum?.actual && (
            <button
              onClick={handleVerifyHash}
              disabled={isVerifying}
              className="text-[#00e599] hover:underline disabled:opacity-50 text-[10px]"
            >
              {isVerifying ? (isAr ? 'جاري الفحص...' : 'Checking...') : (isAr ? 'فحص SHA-256' : 'Verify Hash')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
