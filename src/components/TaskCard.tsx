import React, { useState } from 'react';
import {
  FileText,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Clock,
  FolderOpen,
  Copy,
  Check,
  ShieldCheck
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
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  lang,
  onPause,
  onResume,
  onRemove
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
    setTimeout(() => setCopiedLink(false), 2000);
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
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono text-neutral-400">
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

              {task.savePath && (
                <>
                  <span>•</span>
                  <span className="text-neutral-500 truncate max-w-xs">{task.savePath}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {task.status === 'completed' && (
            <button
              onClick={handleOpenFolder}
              className="p-2 rounded-xl border border-[#1e2230] bg-[#08090c] hover:border-[#00e599]/40 text-neutral-300 hover:text-[#00e599] transition-colors"
              title={isAr ? 'فتح مكان الملف' : 'Show in Folder'}
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl border border-[#1e2230] bg-[#08090c] hover:border-neutral-500 text-neutral-400 hover:text-white transition-colors"
            title={isAr ? 'نسخ رابط التحميل' : 'Copy Download URL'}
          >
            {copiedLink ? <Check className="w-4 h-4 text-[#00e599]" /> : <Copy className="w-4 h-4" />}
          </button>

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

      {/* Checksum Status Section */}
      {task.status === 'completed' && (
        <div className="mt-3 pt-3 border-t border-[#1e2230]/60 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-neutral-400" />
            {task.checksum?.verified ? (
              <span className="text-[#00e599] font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {isAr ? 'تم التحقق من مطابقة SHA-256 بنجاح ✓' : 'SHA-256 Verified Match ✓'}
              </span>
            ) : task.checksum?.actual ? (
              <span className="text-neutral-400 truncate max-w-xs" title={task.checksum.actual}>
                SHA-256: {task.checksum.actual.slice(0, 16)}...
              </span>
            ) : (
              <span className="text-neutral-500">
                {isAr ? 'فحص البصمة الرقمية' : 'Integrity Verification'}
              </span>
            )}
          </div>

          {!task.checksum?.actual && (
            <button
              onClick={handleVerifyHash}
              disabled={isVerifying}
              className="text-[#00e599] hover:underline disabled:opacity-50"
            >
              {isVerifying
                ? isAr ? 'جاري الفحص...' : 'Verifying...'
                : isAr ? 'فحص البصمة الآن' : 'Verify SHA-256'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
