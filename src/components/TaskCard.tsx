import React, { useState } from 'react';
import {
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
  RotateCcw,
  X
} from 'lucide-react';
import type { DownloadTask } from '../types/downloader';
import { formatBytes, formatSpeed, formatEta, humanizeErrorMessage } from '../core/segmentation';
import { downloadManager } from '../core/downloadManager';

interface TaskCardProps {
  task: DownloadTask;
  lang: 'ar' | 'en';
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string, deleteFileFromDisk?: boolean) => void;
  onStartImmediately?: (id: string) => void;
  onRestart?: (id: string) => void;
  isSelected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  lang,
  onPause,
  onResume,
  onRemove,
  onStartImmediately,
  onRestart,
  isSelected = false,
  selectionMode = false,
  onToggleSelect
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [showExecWarning, setShowExecWarning] = useState(false);

  const isAr = lang === 'ar';
  const progressPercent =
    task.totalBytes > 0
      ? Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100))
      : 0;

  const EXECUTABLE_EXTS = ['.exe', '.bat', '.cmd', '.msi', '.ps1', '.vbs', '.reg', '.scr', '.com', '.pif', '.jar'];
  const isExecutable = EXECUTABLE_EXTS.some((e) => task.filename.toLowerCase().endsWith(e));

  const handleOpenFile = () => {
    if (isExecutable) {
      setShowExecWarning(true);
    } else {
      downloadManager.openFile(task.savePath || task.filename);
    }
  };

  const confirmRunExecutable = () => {
    setShowExecWarning(false);
    downloadManager.openFile(task.savePath || task.filename);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(task.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1600);
  };

  const handleVerifyHash = async () => {
    setIsVerifying(true);
    await downloadManager.verifyHash(task.id);
    setIsVerifying(false);
  };

  const handleOpenFolder = () => {
    downloadManager.openFolder(task.savePath || task.filename);
  };

  // Determine file extension badge text & color
  const ext = task.filename.split('.').pop()?.toUpperCase() || 'FILE';
  const cleanExt = ext.length <= 4 ? ext : ext.slice(0, 3);

  const getCategoryTheme = (cat?: string) => {
    switch (cat) {
      case 'programs':
        return {
          bg: 'bg-sky-500/10',
          border: 'border-sky-500/20',
          text: 'text-sky-400'
        };
      case 'media':
        return {
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/20',
          text: 'text-purple-400'
        };
      case 'archives':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          text: 'text-amber-400'
        };
      case 'documents':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          text: 'text-emerald-400'
        };
      case 'torrents':
        return {
          bg: 'bg-fuchsia-500/10',
          border: 'border-fuchsia-500/20',
          text: 'text-fuchsia-400'
        };
      default:
        return {
          bg: 'bg-white/[0.04]',
          border: 'border-white/[0.08]',
          text: 'text-zinc-300'
        };
    }
  };

  const categoryTheme = getCategoryTheme(task.category);

  return (
    <div className="bg-[#0d0f14]/90 hover:bg-[#0d0f14] border border-white/[0.05] hover:border-white/[0.12] rounded-2xl p-3.5 sm:p-4 transition-all duration-200 group hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {selectionMode && (
            <button
              type="button"
              onClick={() => onToggleSelect?.(task.id)}
              className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                isSelected
                  ? 'bg-[#00e599] border-[#00e599] text-[#08090c]'
                  : 'border-white/[0.2] bg-white/[0.04] hover:border-white/[0.4]'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
          )}

          {/* File Extension Badge Icon */}
          <div className="shrink-0">
            {task.status === 'completed' ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-[#00e599] shadow-[0_0_8px_rgba(0,229,153,0.12)]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : task.status === 'error' ? (
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-4 h-4" />
              </div>
            ) : task.status === 'queued' ? (
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
                <Clock className="w-4 h-4" />
              </div>
            ) : (
              <div className={`w-8 h-8 rounded-lg ${categoryTheme.bg} ${categoryTheme.border} border flex items-center justify-center shadow-sm`}>
                <span className={`text-[10px] font-mono font-bold tracking-tight ${categoryTheme.text}`}>
                  {cleanExt}
                </span>
              </div>
            )}
          </div>

          {/* Title & Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs text-zinc-100 truncate" title={task.filename}>
                {task.filename}
              </h3>
              {task.category && task.category !== 'other' && (
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06] shrink-0">
                  {task.category}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-zinc-400">
              <span>{formatBytes(task.downloadedBytes)} / {formatBytes(task.totalBytes)}</span>
              <span className="text-zinc-600">•</span>
              <span className={`font-medium ${
                task.status === 'completed'
                  ? 'text-[#00e599]'
                  : task.status === 'paused'
                  ? 'text-amber-400'
                  : task.status === 'queued'
                  ? 'text-zinc-400'
                  : task.status === 'error'
                  ? 'text-rose-400'
                  : 'text-[#00e599]'
              }`}>
                {task.status === 'queued' ? (isAr ? 'في الانتظار' : 'Queued') : task.status.toUpperCase()}
              </span>

              {task.torrentInfo && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-fuchsia-400 font-mono text-[10px]" title={`InfoHash: ${task.torrentInfo.infoHash}`}>
                    BTIH: {task.torrentInfo.infoHash.slice(0, 8)}…
                  </span>
                </>
              )}

              {task.status === 'downloading' && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-100 font-semibold">{formatSpeed(task.speedBytesPerSec)}</span>
                  {task.etaSeconds > 0 && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-400">{formatEta(task.etaSeconds)}</span>
                    </>
                  )}
                </>
              )}
            </div>

            {task.errorMessage && (
              <div className="text-rose-400 text-[10px] font-mono mt-1 flex items-center gap-1 truncate" title={task.errorMessage}>
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span className="truncate">{humanizeErrorMessage(task.errorMessage, lang)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-1 shrink-0">
          {task.status === 'queued' && onStartImmediately && (
            <button
              onClick={() => onStartImmediately(task.id)}
              className="px-2.5 py-1 rounded-lg border border-white/[0.08] text-zinc-200 hover:text-white hover:bg-white/[0.06] text-xs font-mono font-medium transition-colors"
            >
              {isAr ? 'بدء الآن' : 'Start'}
            </button>
          )}

          {task.status === 'downloading' && (
            <button
              onClick={() => onPause(task.id)}
              className="p-1.5 rounded-lg border border-white/[0.06] text-zinc-300 hover:text-amber-400 hover:bg-white/[0.04] transition-colors"
              title={isAr ? 'إيقاف مؤقت' : 'Pause'}
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}

          {(task.status === 'paused' || task.status === 'error') && (
            <button
              onClick={() => onResume(task.id)}
              className="p-1.5 rounded-lg border border-white/[0.06] text-[#00e599] hover:bg-[#00e599]/10 transition-colors"
              title={isAr ? 'استئناف' : 'Resume'}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          {task.status === 'completed' && (
            <>
              <button
                onClick={handleOpenFile}
                className="p-1.5 rounded-lg border border-white/[0.06] text-[#00e599] hover:bg-[#00e599]/10 transition-colors"
                title={isAr ? 'تشغيل / فتح الملف' : 'Open File'}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleOpenFolder}
                className="p-1.5 rounded-lg border border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                title={isAr ? 'عرض في المجلد' : 'Show in Folder'}
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {(task.status === 'completed' || task.status === 'error') && onRestart && (
            <button
              onClick={() => onRestart(task.id)}
              className="p-1.5 rounded-lg border border-white/[0.06] text-zinc-400 hover:text-[#00e599] hover:bg-white/[0.04] transition-colors"
              title={isAr ? 'إعادة التنزيل' : 'Restart'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg border border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
            title={isAr ? 'نسخ الرابط' : 'Copy URL'}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#00e599]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {isConfirmingDelete ? (
            <div className="flex items-center gap-1 animate-in-fade bg-[#141722] p-1 rounded-lg border border-rose-500/30">
              <button
                onClick={() => {
                  onRemove(task.id, false);
                  setIsConfirmingDelete(false);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
                title={isAr ? 'حذف من القائمة فقط' : 'Remove from list only'}
              >
                {isAr ? 'من القائمة' : 'List only'}
              </button>
              <button
                onClick={() => {
                  onRemove(task.id, true);
                  setIsConfirmingDelete(false);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-mono text-rose-400 hover:text-white bg-rose-500/20 hover:bg-rose-500/40 transition-colors"
                title={isAr ? 'حذف الملف نهائياً من القرص' : 'Delete file permanently from disk'}
              >
                {isAr ? 'مع الملف' : 'With file'}
              </button>
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="p-1.5 rounded-lg border border-white/[0.06] text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title={isAr ? 'حذف' : 'Remove'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className="mt-3">
        <div className="w-full h-1.5 rounded-full bg-[#08090c] border border-white/[0.04] overflow-hidden relative">
          <div
            className={`h-full transition-all duration-200 relative overflow-hidden ${
              task.status === 'completed'
                ? 'bg-[#00e599]'
                : task.status === 'paused'
                ? 'bg-amber-400'
                : task.status === 'queued'
                ? 'bg-zinc-600'
                : 'bg-[#00e599] shadow-[0_0_10px_rgba(0,229,153,0.35)]'
            }`}
            style={{ width: `${progressPercent}%` }}
          >
            {task.status === 'downloading' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </div>
        </div>
      </div>

      {/* Segment Breakdown Track (Only when segmented & downloading) */}
      {task.chunks && task.chunks.length > 1 && task.status === 'downloading' && (
        <div
          className="grid gap-1 mt-2"
          style={{ gridTemplateColumns: `repeat(${task.chunks.length}, minmax(0, 1fr))` }}
        >
          {task.chunks.map((chunk) => {
            const span = chunk.endByte - chunk.startByte + 1;
            const pct = span > 0 ? Math.round((chunk.downloaded / span) * 100) : 0;
            return (
              <div
                key={chunk.index}
                className="h-1 rounded-sm bg-[#08090c] border border-white/[0.04] overflow-hidden"
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
        <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            {task.checksum?.verified ? (
              <span className="text-[#00e599] font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>{isAr ? 'تم التحقق من مطابقة SHA-256 بنجاح ✓' : 'SHA-256 Verified ✓'}</span>
              </span>
            ) : task.checksum?.actual ? (
              <span className="text-zinc-400 font-mono text-[10px]">
                SHA-256: {task.checksum.actual.slice(0, 16)}...
              </span>
            ) : (
              <span className="text-zinc-500">
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
              {isVerifying ? (isAr ? 'جاري الفحص...' : 'Verifying...') : (isAr ? 'فحص SHA-256' : 'Verify SHA-256')}
            </button>
          )}
        </div>
      )}

      {/* Executable Security Prompt */}
      {showExecWarning && (
        <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200 animate-in-fade">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isAr
                ? 'تحذير أمان: هذا ملف تنفيذي (.exe / برنامج). تشغيل ملفات البرامج المحملة من الإنترنت قد يضر بنظامك.'
                : 'Security Warning: Executable binary detected. Launching downloaded programs may pose a security risk.'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setShowExecWarning(false);
                handleOpenFolder();
              }}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 transition-colors font-medium text-[11px]"
            >
              {isAr ? 'عرض في المجلد' : 'Show in Folder'}
            </button>
            <button
              type="button"
              onClick={confirmRunExecutable}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-[11px]"
            >
              {isAr ? 'تشغيل على مسؤوليتي' : 'Run Anyway'}
            </button>
            <button
              type="button"
              onClick={() => setShowExecWarning(false)}
              className="p-1 rounded text-zinc-400 hover:text-white"
              title={isAr ? 'إلغاء' : 'Cancel'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
