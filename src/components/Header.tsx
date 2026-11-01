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
  onToggleLang: () => void;
  onOpenAddModal: () => void;
}

const CURRENT_VERSION = '1.2.0';

export const Header: React.FC<HeaderProps> = ({
  stats,
  lang,
  onToggleLang,
  onOpenAddModal
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

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#090a0f]/90 backdrop-blur-md border-b border-[#1e2230] px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#11131a] border border-[#1e2230] flex items-center justify-center text-[#00e599]">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight">Otium</span>
              <span className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                v{CURRENT_VERSION}
              </span>
            </div>
          </div>

          {/* Real-time Status Indicator */}
          <div className="flex items-center gap-2">
            {stats.currentTotalSpeed > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#11131a] border border-[#1e2230] text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-[#00e599]" />
                <span className="font-semibold text-white">{formatSpeed(stats.currentTotalSpeed)}</span>
                <span className="text-neutral-500">|</span>
                <span className="text-neutral-400">{stats.activeCount} {isAr ? 'نشط' : 'active'}</span>
              </div>
            ) : stats.completedCount > 0 ? (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-neutral-400">
                <span>{isAr ? 'تم تحميل:' : 'Total:'}</span>
                <span className="text-neutral-200">{formatBytes(stats.totalBytesDownloaded)}</span>
              </div>
            ) : null}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleLang}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-neutral-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-[#1e2230]"
              title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-neutral-400" />
                <span>{isAr ? 'EN' : 'العربية'}</span>
              </span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-[#1e2230]"
              title={isAr ? 'الإعدادات' : 'Settings'}
            >
              <Settings2 className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#00e599] text-[#090a0f] hover:bg-[#00e599]/90 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isAr ? 'تنزيل جديد' : 'New Download'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal - Clean & Focused */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f1118] border border-[#1e2230] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2230]">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Settings2 className="w-4 h-4 text-[#00e599]" />
                <span>{isAr ? 'الإعدادات' : 'Settings'}</span>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-mono">
              {/* Default Save Directory */}
              <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#1e2230]">
                <div className="flex items-center justify-between mb-1.5 text-neutral-300 font-semibold">
                  <span>{isAr ? 'مجلد الحفظ الافتراضي' : 'Download Directory'}</span>
                  <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                <div className="text-[11px] text-neutral-400 truncate bg-[#151822] px-2.5 py-1.5 rounded-lg border border-[#1e2230]">
                  {currentSettings.defaultDirectory || 'Downloads'}
                </div>
              </div>

              {/* Max Concurrent Downloads */}
              <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#1e2230]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-300 font-semibold">
                    {isAr ? 'الحد الأقصى للتحميلات المتزامنة' : 'Max Concurrent Downloads'}
                  </span>
                  <span className="text-[#00e599] font-bold">{maxConcurrent}</span>
                </div>
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

              {/* Speed Limiter */}
              <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#1e2230]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-300 font-semibold">
                    {isAr ? 'محدد السرعة الإجمالي' : 'Speed Limit'}
                  </span>
                  <span className="text-[#00e599] font-bold">
                    {speedLimit === 0 ? (isAr ? 'غير محدود' : 'Unlimited') : formatSpeed(speedLimit)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
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
                          ? 'border-[#00e599] text-[#00e599] bg-[#00e599]/10'
                          : 'border-[#1e2230] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#1e2230] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-300 font-medium">
                    {isAr ? 'إشعارات سطح المكتب' : 'Desktop Notifications'}
                  </span>
                  <button
                    onClick={handleNotificationToggle}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                      notifications ? 'bg-[#00e599]' : 'bg-[#1e2230]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#090a0f] transition-transform ${
                        notifications ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1e2230]">
                  <span className="text-neutral-300 font-medium">
                    {isAr ? 'نغمة صوتية عند الاكتمال' : 'Sound on Completion'}
                  </span>
                  <button
                    onClick={handleSoundToggle}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                      sound ? 'bg-[#00e599]' : 'bg-[#1e2230]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#090a0f] transition-transform ${
                        sound ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Updates Check */}
              <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#1e2230] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{isAr ? 'الإصدار الحالي' : 'Version'}</div>
                  <div className="text-neutral-400 text-[11px]">v{CURRENT_VERSION}</div>
                </div>
                <button
                  onClick={handleCheckUpdates}
                  disabled={isCheckingUpdate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e2230] text-neutral-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isAr ? 'فحص التحديثات' : 'Check for Updates'}</span>
                </button>
              </div>

              {updateInfo && (
                <div className="p-2.5 rounded-lg text-xs">
                  {updateInfo.hasUpdate ? (
                    <div className="flex items-center justify-between text-amber-400">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>v{updateInfo.version} {isAr ? 'متاح' : 'available'}</span>
                      </span>
                      <a
                        href="https://github.com/XRTM8/Otium-Downloader/releases/latest"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#00e599] underline font-bold"
                      >
                        {isAr ? 'تنزيل' : 'Download'}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[#00e599]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'أنت تستخدم أحدث إصدار ✓' : 'You are up to date ✓'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#1e2230] flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-mono bg-white/5 hover:bg-white/10 text-white transition-colors"
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
