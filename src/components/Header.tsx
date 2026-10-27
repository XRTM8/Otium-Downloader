import React, { useState } from 'react';
import { ArrowDownToLine, Zap, Globe, Plus, Settings2, X, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { DownloadStats } from '../types/downloader';
import { formatSpeed, formatBytes } from '../core/segmentation';
import { fetchReleaseInfo, isNewerVersion } from '../core/updates/releaseFeed';

interface HeaderProps {
  stats: DownloadStats;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  onOpenAddModal: () => void;
}

const CURRENT_VERSION = '1.1.0';

export const Header: React.FC<HeaderProps> = ({
  stats,
  lang,
  onToggleLang,
  onOpenAddModal
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ hasUpdate: boolean; version?: string } | null>(null);

  const isAr = lang === 'ar';

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateInfo(null);
    try {
      const release = await fetchReleaseInfo();
      if (release && isNewerVersion(release.version, CURRENT_VERSION)) {
        setUpdateInfo({ hasUpdate: true, version: release.version });
      } else {
        setUpdateInfo({ hasUpdate: false });
      }
    } catch {
      setUpdateInfo({ hasUpdate: false });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <>
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
                  v{CURRENT_VERSION}
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
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl text-neutral-400 hover:text-white border border-[#1e2230] hover:border-[#00e599]/30 bg-[#08090c] transition-colors"
              title={isAr ? 'الإعدادات والتحديثات' : 'Settings & Updates'}
            >
              <Settings2 className="w-4 h-4" />
            </button>

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

      {/* Settings & Updates Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0c0e14] border border-[#1e2230] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2230]">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Settings2 className="w-4 h-4 text-[#00e599]" />
                <span>{isAr ? 'إعدادات المنظومة والتحديثات' : 'Settings & Sovereign Updates'}</span>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#08090c] border border-[#1e2230]">
                <div className="text-neutral-400 mb-1">{isAr ? 'الإصدار الحالي' : 'Current Release'}</div>
                <div className="text-[#00e599] font-bold text-sm">Otium Downloader v{CURRENT_VERSION}</div>
                <div className="text-neutral-500 text-[10px] mt-0.5">GNU General Public License v3.0 • 100% Local</div>
              </div>

              <div className="p-3 rounded-xl bg-[#08090c] border border-[#1e2230]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white mb-0.5">{isAr ? 'التحقق من التحديثات' : 'Check for Updates'}</div>
                    <div className="text-neutral-400 text-[11px]">{isAr ? 'تحديثات مباشرة وموقعة رقمياً' : 'Direct signed releases from GitHub'}</div>
                  </div>
                  <button
                    onClick={handleCheckUpdates}
                    disabled={isCheckingUpdate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00e599]/15 border border-[#00e599]/30 text-[#00e599] hover:bg-[#00e599]/25 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'فحص الآن' : 'Check'}</span>
                  </button>
                </div>

                {updateInfo && (
                  <div className="mt-3 pt-3 border-t border-[#1e2230] text-[11px]">
                    {updateInfo.hasUpdate ? (
                      <div className="flex items-center justify-between text-amber-400">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" />
                          <span>{isAr ? `يتوفر إصدار جديد v${updateInfo.version}` : `New version available: v${updateInfo.version}`}</span>
                        </span>
                        <a
                          href="https://github.com/XRTM8/Otium-Downloader/releases/latest"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00e599] underline font-bold"
                        >
                          {isAr ? 'تنزيل' : 'Get'}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#00e599]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isAr ? 'أنت تستخدم أحدث إصدار معتمد ✓' : 'You are on the latest version ✓'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#1e2230] flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
