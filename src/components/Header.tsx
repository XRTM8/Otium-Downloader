import React, { useState } from 'react';
import {
  ArrowDownToLine,
  Globe,
  Plus,
  Settings2,
  X,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  FolderOpen
} from 'lucide-react';
import type { DownloadStats } from '../types/downloader';
import { formatSpeed, formatBytes } from '../core/segmentation';
import { fetchReleaseInfo, isNewerVersion } from '../core/updates/releaseFeed';
import { downloadManager } from '../core/downloadManager';

interface HeaderProps {
  stats: DownloadStats;
  lang: 'ar' | 'en';
  isSettingsOpen?: boolean;
  onToggleSettings?: (open: boolean) => void;
  onToggleLang: () => void;
  onOpenAddModal: () => void;
}

const CURRENT_VERSION = '1.2.0';

export const Header: React.FC<HeaderProps> = ({
  stats,
  lang,
  isSettingsOpen: controlledSettingsOpen,
  onToggleSettings,
  onToggleLang,
  onOpenAddModal
}) => {
  const [internalSettingsOpen, setInternalSettingsOpen] = useState(false);
  const isSettingsOpen = controlledSettingsOpen !== undefined ? controlledSettingsOpen : internalSettingsOpen;
  const setSettingsOpen = (open: boolean) => {
    if (onToggleSettings) onToggleSettings(open);
    else setInternalSettingsOpen(open);
  };

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

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#08090c]/85 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-6 py-2.5 transition-all">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00e599] shadow-sm">
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-zinc-100 tracking-tight">Otium</span>
              <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                v{CURRENT_VERSION}
              </span>
            </div>
          </div>

          {/* Live Throughput Pill */}
          <div className="flex items-center gap-2">
            {stats.currentTotalSpeed > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 animate-in-fade">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e599] animate-pulse" />
                <span className="font-semibold">{formatSpeed(stats.currentTotalSpeed)}</span>
                <span className="text-emerald-500/40">|</span>
                <span className="text-emerald-300/80 text-[11px]">{stats.activeCount} {isAr ? 'نشط' : 'active'}</span>
              </div>
            ) : stats.completedCount > 0 ? (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                <span>{isAr ? 'المحمّل:' : 'Total:'}</span>
                <span className="text-zinc-300 font-medium">{formatBytes(stats.totalBytesDownloaded)}</span>
              </div>
            ) : null}
          </div>

          {/* Action Group */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onToggleLang}
              className="px-2 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]"
              title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[11px] font-medium">{isAr ? 'EN' : 'العربية'}</span>
              </span>
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]"
              title={isAr ? 'الإعدادات (⌘,)' : 'Settings (⌘,)'}
            >
              <Settings2 className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00e599] text-[#08090c] hover:bg-[#00e599]/90 active:scale-[0.98] transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isAr ? 'تنزيل جديد' : 'New'}</span>
              <kbd className="hidden md:inline-block text-[9px] font-mono px-1 py-0.5 rounded bg-black/15 text-black/70 ml-1 rtl:mr-1 rtl:ml-0 font-normal">
                ⌘N
              </kbd>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in-fade">
          <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative text-zinc-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Settings2 className="w-4 h-4 text-[#00e599]" />
                <span>{isAr ? 'الإعدادات' : 'Settings'}</span>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs font-mono">
              {/* Destination Directory */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-1.5 text-zinc-300 font-medium">
                  <span>{isAr ? 'مجلد الحفظ' : 'Save Location'}</span>
                  <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <div className="text-[11px] text-zinc-400 truncate bg-[#141720] px-2.5 py-1.5 rounded-lg border border-white/[0.06] select-all">
                  {currentSettings.defaultDirectory || 'Downloads'}
                </div>
              </div>

              {/* Concurrency Limit */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-300 font-medium">
                    {isAr ? 'التحميلات المتزامنة القصوى' : 'Max Concurrent Downloads'}
                  </span>
                  <span className="text-[#00e599] font-bold">{maxConcurrent}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 5].map((count) => (
                    <button
                      key={count}
                      onClick={() => handleMaxConcurrentChange(count)}
                      className={`py-1.5 rounded-lg border text-center font-bold text-xs transition-all ${
                        maxConcurrent === count
                          ? 'border-[#00e599]/60 text-[#00e599] bg-[#00e599]/10'
                          : 'border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed Limiter */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-300 font-medium">
                    {isAr ? 'محدد السرعة الإجمالي' : 'Global Bandwidth Limit'}
                  </span>
                  <span className="text-[#00e599] font-bold">
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
                          ? 'border-[#00e599]/60 text-[#00e599] bg-[#00e599]/10'
                          : 'border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification & Sound Toggles */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">
                    {isAr ? 'إشعارات النظام' : 'System Notifications'}
                  </span>
                  <button
                    onClick={handleNotificationToggle}
                    className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${
                      notifications ? 'bg-[#00e599]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-[#08090c] transition-transform ${
                        notifications ? 'translate-x-3.5 rtl:-translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <span className="text-zinc-300">
                    {isAr ? 'نغمة صوتية عند الاكتمال' : 'Chime on Completion'}
                  </span>
                  <button
                    onClick={handleSoundToggle}
                    className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${
                      sound ? 'bg-[#00e599]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-[#08090c] transition-transform ${
                        sound ? 'translate-x-3.5 rtl:-translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Version Card */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-zinc-200 text-xs">{isAr ? 'الإصدار' : 'Version'}</div>
                  <div className="text-zinc-400 text-[11px]">v{CURRENT_VERSION}</div>
                </div>
                <button
                  onClick={handleCheckUpdates}
                  disabled={isCheckingUpdate}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-50 text-xs"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isAr ? 'فحص التحديثات' : 'Check Updates'}</span>
                </button>
              </div>

              {updateInfo && (
                <div className="p-2.5 rounded-lg text-xs bg-[#08090c] border border-white/[0.06]">
                  {updateInfo.hasUpdate ? (
                    <div className="flex items-center justify-between text-amber-400">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>v{updateInfo.version} {isAr ? 'متاح للتحميل' : 'Available'}</span>
                      </span>
                      <a
                        href="https://github.com/XRTM8/Otium-Downloader/releases/latest"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#00e599] underline font-bold"
                      >
                        {isAr ? 'تنزيل' : 'Get'}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[#00e599]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'أنت تستخدم أحدث إصدار معتمد ✓' : 'Latest version verified ✓'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex justify-end">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-mono bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors"
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
