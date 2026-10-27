import React from 'react';
import { ArrowDownToLine, Zap, Globe, Plus } from 'lucide-react';
import type { DownloadStats } from '../types/downloader';
import { formatSpeed, formatBytes } from '../core/segmentation';

interface HeaderProps {
  stats: DownloadStats;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  onOpenAddModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  lang,
  onToggleLang,
  onOpenAddModal
}) => {
  const isAr = lang === 'ar';

  return (
    <header className="border-b border-[#1e2230] bg-[#0c0e14]/90 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-[#08090c] border border-[#00e599]/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,153,0.15)]">
            <ArrowDownToLine className="w-5 h-5 text-[#00e599]" />
            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00e599] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-wide">Otium Downloader</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#00e599]/10 text-[#00e599] border border-[#00e599]/20">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono">
              {isAr ? 'مسرّع التنزيل المحلي متعدد المسارات' : 'Local-First Segmented Accelerator'}
            </p>
          </div>
        </div>

        {/* Live Telemetry Cockpit */}
        <div className="hidden md:flex items-center gap-4 bg-[#08090c] border border-[#1e2230] rounded-xl px-4 py-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#00e599]" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-mono">{isAr ? 'السرعة الكلية' : 'TOTAL SPEED'}</div>
              <div className="text-xs font-mono font-bold text-[#00e599]">
                {formatSpeed(stats.currentTotalSpeed)}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-[#1e2230]" />

          <div>
            <div className="text-[10px] text-neutral-400 uppercase font-mono">{isAr ? 'نشط / مكتمل' : 'ACTIVE / DONE'}</div>
            <div className="text-xs font-mono text-white">
              {stats.activeCount} <span className="text-neutral-500">/</span> {stats.completedCount}
            </div>
          </div>

          <div className="h-6 w-px bg-[#1e2230]" />

          <div>
            <div className="text-[10px] text-neutral-400 uppercase font-mono">{isAr ? 'إجمالي المحمّل' : 'TOTAL BANDWIDTH'}</div>
            <div className="text-xs font-mono text-neutral-300">
              {formatBytes(stats.totalBytesDownloaded)}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono border border-[#1e2230] hover:border-[#00e599]/40 bg-[#08090c] text-neutral-300 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-[#00e599]" />
            <span>{isAr ? 'EN' : 'العربية'}</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#00e599] text-[#08090c] hover:bg-[#00e599]/90 shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'تنزيل جديد' : 'New Download'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
