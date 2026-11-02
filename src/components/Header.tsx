import React from 'react';
import {
  Globe,
  ArrowDownToLine,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { OtiumLogo } from './OtiumLogo';
import { ThroughputSparkline } from './ThroughputSparkline';
import type { DownloadStats } from '../types/downloader';
import { formatSpeed, formatBytes } from '../core/segmentation';

export type MainViewTab = 'downloads' | 'finished' | 'settings';

interface HeaderProps {
  stats: DownloadStats;
  lang: 'ar' | 'en';
  activeTab: MainViewTab;
  onTabChange: (tab: MainViewTab) => void;
  speedHistory?: number[];
  onToggleLang: () => void;
}

export const CURRENT_VERSION = '1.5.0';

export const Header: React.FC<HeaderProps> = ({
  stats,
  lang,
  activeTab,
  onTabChange,
  speedHistory,
  onToggleLang,
}) => {
  const isAr = lang === 'ar';

  return (
    <header className="sticky top-0 z-30 bg-[#060709]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-6 pt-safe pb-2.5 transition-all">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-[#00e599] shadow-[0_0_16px_rgba(0,229,153,0.2)]">
            <OtiumLogo className="w-4 h-4" glow />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm sm:text-base text-zinc-100 tracking-tight">Otium</span>
            <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05]">
              v{CURRENT_VERSION}
            </span>
          </div>
        </div>

        {/* Live Speed Pill (When downloading) */}
        <div className="flex items-center gap-2">
          {stats.currentTotalSpeed > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-[#00e599] animate-in-fade shadow-[0_0_16px_rgba(0,229,153,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e599] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e599]" />
              </span>
              <span className="font-bold tabular-nums text-xs">{formatSpeed(stats.currentTotalSpeed)}</span>
              <ThroughputSparkline history={speedHistory || []} className="w-12 h-3.5 hidden md:block" />
              <span className="text-emerald-500/40 hidden sm:inline">•</span>
              <span className="text-emerald-300/80 text-[11px] hidden sm:inline">
                {stats.activeCount} {isAr ? 'نشط' : 'active'}
              </span>
            </div>
          ) : stats.completedCount > 0 ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/[0.05] text-xs font-mono text-zinc-400">
              <span className="text-zinc-500">{isAr ? 'المحمّل:' : 'Total:'}</span>
              <span className="text-zinc-300 font-medium tabular-nums">{formatBytes(stats.totalBytesDownloaded)}</span>
            </div>
          ) : null}
        </div>

        {/* Desktop View Switcher & Language Toggle */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Desktop Navigation Tabs */}
          <nav className="hidden sm:flex items-center bg-[#0d0f14] border border-white/[0.06] rounded-xl p-1 text-xs font-mono">
            <button
              onClick={() => onTabChange('downloads')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'downloads'
                  ? 'bg-zinc-100 text-[#07080a] font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>{isAr ? 'التنزيلات' : 'Downloads'}</span>
              {stats.activeCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'downloads' ? 'bg-black text-[#00e599]' : 'bg-[#00e599] text-black'
                }`}>
                  {stats.activeCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('finished')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'finished'
                  ? 'bg-zinc-100 text-[#07080a] font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'المكتملة' : 'Finished'}</span>
              {stats.completedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-zinc-400">
                  {stats.completedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('settings')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-zinc-100 text-[#07080a] font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isAr ? 'الإعدادات' : 'Settings'}</span>
            </button>
          </nav>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="px-2.5 py-1.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-white/[0.06] transition-colors flex items-center gap-1.5"
            title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <Globe className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-medium">{isAr ? 'EN' : 'العربية'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
