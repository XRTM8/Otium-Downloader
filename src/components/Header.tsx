import React, { useState } from 'react';
import {
  ArrowDownToLine,
  Zap,
  Globe,
  Plus,
  Settings2,
  X,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Gauge,
  Bell,
  Volume2,
  ListOrdered,
  Smartphone
} from 'lucide-react';
import type { DownloadStats } from '../types/downloader';
import { formatSpeed, formatBytes } from '../core/segmentation';
import { fetchReleaseInfo, isNewerVersion } from '../core/updates/releaseFeed';
import { downloadManager } from '../core/downloadManager';

interface HeaderProps {
  stats: DownloadStats;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  onOpenAddModal: () => void;
  onSwitchToMobile?: () => void;
}

const CURRENT_VERSION = '1.2.0';

export const Header: React.FC<HeaderProps> = ({
  stats,
  lang,
  onToggleLang,
  onOpenAddModal,
  onSwitchToMobile
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ hasUpdate: boolean; version?: string } | null>(null);

  const currentSettings = downloadManager.getSettings();
  const [maxConcurrent, setMaxConcurrent] = useState(currentSettings.maxConcurrentDownloads);
  const [speedLimit, setSpeedLimit] = useState(currentSettings.globalSpeedLimitBytes);
  const [notifications, setNotifications] = useState(currentSettings.enableNotifications);
  const [sound, setSound] = useState(currentSettings.enableSound ?? true);

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

  const handleMaxConcurrentChange = (limit: number) => {
    setMaxConcurrent(limit);
    downloadManager.updateSettings({ maxConcurrentDownloads: limit });
  };

  const handleSpeedLimitChange = (bytesPerSec: number) => {
    setSpeedLimit(bytesPerSec);
    downloadManager.updateSettings({ globalSpeedLimitBytes: bytesPerSec });
  };

  const handleNotificationToggle = () => {
    const next = !notifications;
    setNotifications(next);
    downloadManager.updateSettings({ enableNotifications: next });
  };

  const handleSoundToggle = () => {
    const next = !sound;
    setSound(next);
    downloadManager.updateSettings({ enableSound: next });
  };

  const speedHistory = downloadManager.getSpeedHistory();
  const maxVal = Math.max(...speedHistory, 1024 * 1024);
  const speedPoints = speedHistory
    .map((v, i) => {
      const x = (i / Math.max(1, speedHistory.length - 1)) * 60;
      const y = 23 - (v / maxVal) * 18;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#00e599]" />
                <div>
                  <div className="text-[10px] text-neutral-400 uppercase font-mono">{isAr ? 'السرعة الكلية' : 'TOTAL SPEED'}</div>
                  <div className="text-xs font-mono font-bold text-[#00e599]">
                    {formatSpeed(stats.currentTotalSpeed)}
                  </div>
                </div>
              </div>

              {/* Live Sparkline Visualizer */}
              <div className="w-16 h-6 flex items-center justify-center shrink-0 border-l rtl:border-l-0 rtl:border-r border-[#1e2230]/80 px-1">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 60 24">
                  <defs>
                    <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e599" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#00e599" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {stats.currentTotalSpeed > 0 && (
                    <>
                      <polygon points={`0,24 ${speedPoints} 60,24`} fill="url(#speedGrad)" />
                      <polyline
                        fill="none"
                        stroke="#00e599"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={speedPoints}
                      />
                    </>
                  )}
                </svg>
              </div>
            </div>

            <div className="h-6 w-px bg-[#1e2230]" />

            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-mono">{isAr ? 'نشط / انتظار / تم' : 'ACTIVE / QUEUE / DONE'}</div>
              <div className="text-xs font-mono text-white flex items-center gap-1">
                <span className="text-[#00e599] font-bold">{stats.activeCount}</span>
                {stats.queuedCount > 0 && (
                  <span className="text-amber-400 text-[10px]">({stats.queuedCount}Q)</span>
                )}
                <span className="text-neutral-500">/</span>
                <span>{stats.completedCount}</span>
              </div>
            </div>

            <div className="h-6 w-px bg-[#1e2230]" />

            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-mono">{isAr ? 'إجمالي المحمّل' : 'TOTAL BANDWIDTH'}</div>
              <div className="text-xs font-mono text-neutral-300">
                {formatBytes(stats.totalBytesDownloaded)}
              </div>
            </div>

            {stats.speedLimitBytesPerSec > 0 && (
              <>
                <div className="h-6 w-px bg-[#1e2230]" />
                <div className="text-[10px] font-mono text-amber-400 flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  <Gauge className="w-3 h-3" />
                  <span>{formatSpeed(stats.speedLimitBytesPerSec)}</span>
                </div>
              </>
            )}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2.5">
            {onSwitchToMobile && (
              <button
                onClick={onSwitchToMobile}
                className="p-2 rounded-xl text-neutral-400 hover:text-white border border-[#1e2230] hover:border-[#00e599]/30 bg-[#08090c] transition-colors"
                title={isAr ? 'التبديل إلى واجهة الهاتف (120Hz Mobile View)' : 'Switch to Mobile View'}
              >
                <Smartphone className="w-4 h-4 text-[#00e599]" />
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl text-neutral-400 hover:text-white border border-[#1e2230] hover:border-[#00e599]/30 bg-[#08090c] transition-colors"
              title={isAr ? 'الإعدادات والطابور والسرعة' : 'Settings & Controls'}
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

      {/* Settings & Controls Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#0c0e14] border border-[#1e2230] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2230]">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Settings2 className="w-4 h-4 text-[#00e599]" />
                <span>{isAr ? 'إعدادات المنظومة والطابور' : 'System & Queue Settings'}</span>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-mono">
              {/* Queue Max Concurrent Setting */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-[#1e2230]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <ListOrdered className="w-4 h-4 text-[#00e599]" />
                    <span>{isAr ? 'الحد الأقصى للتنزيلات المتزامنة' : 'Max Concurrent Downloads'}</span>
                  </div>
                  <span className="text-[#00e599] font-bold">{maxConcurrent}</span>
                </div>
                <p className="text-[10px] text-neutral-400 mb-2.5">
                  {isAr
                    ? 'يتم وضع التنزيلات الزائدة في الطابور تلقائياً وتبدأ بالتتابع.'
                    : 'Surplus downloads are queued and start automatically upon completion.'}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 5].map((count) => (
                    <button
                      key={count}
                      onClick={() => handleMaxConcurrentChange(count)}
                      className={`py-1.5 rounded-lg border text-center font-bold transition-all ${
                        maxConcurrent === count
                          ? 'border-[#00e599] text-[#00e599] bg-[#00e599]/10'
                          : 'border-[#1e2230] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed Limiter Setting */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-[#1e2230]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Gauge className="w-4 h-4 text-[#00e599]" />
                    <span>{isAr ? 'محدد السرعة الإجمالي' : 'Global Bandwidth Limiter'}</span>
                  </div>
                  <span className="text-amber-400 font-bold">
                    {speedLimit === 0 ? (isAr ? 'غير محدود' : 'Unlimited') : formatSpeed(speedLimit)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: isAr ? 'حر' : 'MAX', val: 0 },
                    { label: '2 MB/s', val: 2 * 1024 * 1024 },
                    { label: '5 MB/s', val: 5 * 1024 * 1024 },
                    { label: '10 MB/s', val: 10 * 1024 * 1024 }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => handleSpeedLimitChange(opt.val)}
                      className={`py-1.5 rounded-lg border text-center font-bold text-[11px] transition-all ${
                        speedLimit === opt.val
                          ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                          : 'border-[#1e2230] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop Notification Toggle */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-[#1e2230] flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Bell className="w-4 h-4 text-[#00e599]" />
                  <div>
                    <div className="font-bold">{isAr ? 'إشعارات سطح المكتب' : 'Desktop Notifications'}</div>
                    <div className="text-[10px] text-neutral-400">
                      {isAr ? 'تنبيه فوري عند اكتمال تنزيل الملف' : 'Notify when downloads finish'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleNotificationToggle}
                  className={`w-11 h-6 rounded-full transition-colors relative p-1 ${
                    notifications ? 'bg-[#00e599]' : 'bg-[#1e2230]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-[#08090c] transition-transform ${
                      notifications ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sound Chime Toggle */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-[#1e2230] flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Volume2 className="w-4 h-4 text-[#00e599]" />
                  <div>
                    <div className="font-bold">{isAr ? 'تنبيه نغمي سيبراني' : 'Cyber Synth Chime'}</div>
                    <div className="text-[10px] text-neutral-400">
                      {isAr ? 'صوت مستقبلي ناعم عند انتهاء التنزيل' : 'Gentle audio chime on completion'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSoundToggle}
                  className={`w-11 h-6 rounded-full transition-colors relative p-1 ${
                    sound ? 'bg-[#00e599]' : 'bg-[#1e2230]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-[#08090c] transition-transform ${
                      sound ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Version & Update Check */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-[#1e2230]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white mb-0.5">{isAr ? 'التحقق من التحديثات' : 'Check for Updates'}</div>
                    <div className="text-[#00e599] text-[11px]">v{CURRENT_VERSION}</div>
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
