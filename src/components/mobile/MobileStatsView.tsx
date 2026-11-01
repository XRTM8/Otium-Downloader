import React from 'react';
import { Gauge, Zap, ArrowDownToLine, Pause, Play, CheckCircle2 } from 'lucide-react';
import type { DownloadStats } from '../../types/downloader';
import { formatSpeed, formatBytes } from '../../core/segmentation';
import { downloadManager } from '../../core/downloadManager';
import { haptics } from '../../core/haptics';

interface MobileStatsViewProps {
  stats: DownloadStats;
  lang: 'ar' | 'en';
}

export const MobileStatsView: React.FC<MobileStatsViewProps> = ({ stats, lang }) => {
  const isAr = lang === 'ar';
  const speedHistory = downloadManager.getSpeedHistory();
  const maxVal = Math.max(...speedHistory, 1024 * 1024);

  const speedPoints = speedHistory
    .map((v, i) => {
      const x = (i / Math.max(1, speedHistory.length - 1)) * 100;
      const y = 45 - (v / maxVal) * 38;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const handlePauseAll = () => {
    haptics.medium();
    downloadManager.pauseAll();
  };

  const handleResumeAll = () => {
    haptics.medium();
    downloadManager.resumeAll();
  };

  return (
    <div className="space-y-4 max-w-md mx-auto animate-fade-in pb-20">
      {/* Primary Speed Dial Card */}
      <div className="bg-[#0c0e14] border border-[#1e2230] rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase text-neutral-400">
            {isAr ? 'السرعة الكلية اللحظية' : 'REALTIME THROUGHPUT'}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono text-[#00e599] bg-[#00e599]/10 px-2 py-0.5 rounded-full border border-[#00e599]/20">
            <Zap className="w-3 h-3" />
            <span>{isAr ? 'متعدد المسارات' : 'Multi-Stream'}</span>
          </span>
        </div>

        <div className="text-3xl font-mono font-bold text-white tracking-tight flex items-baseline gap-2">
          <span className="text-[#00e599]">{formatSpeed(stats.currentTotalSpeed)}</span>
        </div>

        {/* SVG Speed Sparkline */}
        <div className="h-20 w-full mt-4 bg-[#08090c] rounded-2xl border border-[#1e2230] p-2 overflow-hidden relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 48" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mobileSpeedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e599" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#00e599" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {stats.currentTotalSpeed > 0 && (
              <>
                <polygon points={`0,48 ${speedPoints} 100,48`} fill="url(#mobileSpeedGrad)" />
                <polyline
                  fill="none"
                  stroke="#00e599"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={speedPoints}
                />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0c0e14] border border-[#1e2230] rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
            <ArrowDownToLine className="w-3.5 h-3.5 text-[#00e599]" />
            <span>{isAr ? 'إجمالي البيانات' : 'Total Bandwidth'}</span>
          </div>
          <div className="text-base font-mono font-bold text-white">
            {formatBytes(stats.totalBytesDownloaded)}
          </div>
        </div>

        <div className="bg-[#0c0e14] border border-[#1e2230] rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00e599]" />
            <span>{isAr ? 'المهام النشطة' : 'Active Tasks'}</span>
          </div>
          <div className="text-base font-mono font-bold text-white flex items-center gap-1.5">
            <span className="text-[#00e599]">{stats.activeCount}</span>
            <span className="text-neutral-500 text-xs font-normal">/</span>
            <span className="text-neutral-400 text-xs font-normal">{stats.completedCount} {isAr ? 'تم' : 'done'}</span>
          </div>
        </div>
      </div>

      {/* Speed Limiter Status */}
      {stats.speedLimitBytesPerSec > 0 && (
        <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-between text-xs font-mono text-amber-400">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            <span>{isAr ? 'محدد السرعة الإجمالي نشط:' : 'Speed Limiter Active:'}</span>
          </div>
          <span className="font-bold">{formatSpeed(stats.speedLimitBytesPerSec)}</span>
        </div>
      )}

      {/* Global Controls */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={handlePauseAll}
          disabled={stats.activeCount === 0}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#0c0e14] border border-amber-400/30 text-amber-400 text-xs font-bold font-mono hover:bg-amber-400/10 transition-transform active:scale-95 disabled:opacity-40"
        >
          <Pause className="w-4 h-4" />
          <span>{isAr ? 'إيقاف الكل' : 'Pause All'}</span>
        </button>

        <button
          onClick={handleResumeAll}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#0c0e14] border border-[#00e599]/30 text-[#00e599] text-xs font-bold font-mono hover:bg-[#00e599]/10 transition-transform active:scale-95"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isAr ? 'استئناف الكل' : 'Resume All'}</span>
        </button>
      </div>
    </div>
  );
};
