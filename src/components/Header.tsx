import React, { useState } from 'react';
import {
  Globe,
  Plus,
  Settings2,
  X,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  FolderOpen,
  HelpCircle,
  Smartphone,
  Moon,
  Power
} from 'lucide-react';
import { OtiumLogo } from './OtiumLogo';
import { ThroughputSparkline } from './ThroughputSparkline';
import type { DownloadStats } from '../types/downloader';
import { formatSpeed, formatBytes } from '../core/segmentation';
import { fetchReleaseInfo, isNewerVersion } from '../core/updates/releaseFeed';
import { downloadManager } from '../core/downloadManager';

interface HeaderProps {
  stats: DownloadStats;
  lang: 'ar' | 'en';
  speedHistory?: number[];
  isSettingsOpen?: boolean;
  onToggleSettings?: (open: boolean) => void;
  onOpenShortcutsModal?: () => void;
  onOpenRemoteModal?: () => void;
  onToggleLang: () => void;
  onOpenAddModal: () => void;
}

const CURRENT_VERSION = '1.4.0';

export const Header: React.FC<HeaderProps> = ({
  stats,
  lang,
  speedHistory,
  isSettingsOpen: controlledSettingsOpen,
  onToggleSettings,
  onOpenShortcutsModal,
  onOpenRemoteModal,
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
  const [soundVolume, setSoundVolume] = useState(currentSettings.soundVolume ?? 0.5);
  const [autoShutdown, setAutoShutdown] = useState(currentSettings.autoShutdownOnComplete ?? false);
  const [nightScheduler, setNightScheduler] = useState(currentSettings.nightSchedulerEnabled ?? false);
  const [nightStartHour, setNightStartHour] = useState(currentSettings.nightSchedulerStartHour ?? 2);
  const [nightEndHour, setNightEndHour] = useState(currentSettings.nightSchedulerEndHour ?? 8);

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

  const handleVolumeChange = (vol: number) => {
    setSoundVolume(vol);
    downloadManager.updateSettings({ soundVolume: vol });
  };

  const handleAutoShutdownToggle = () => {
    const next = !autoShutdown;
    setAutoShutdown(next);
    downloadManager.updateSettings({ autoShutdownOnComplete: next });
  };

  const handleNightSchedulerToggle = () => {
    const next = !nightScheduler;
    setNightScheduler(next);
    downloadManager.updateSettings({ nightSchedulerEnabled: next });
  };

  const handleNightHoursChange = (start: number, end: number) => {
    setNightStartHour(start);
    setNightEndHour(end);
    downloadManager.updateSettings({ nightSchedulerStartHour: start, nightSchedulerEndHour: end });
  };

  const handleAutoUpdate = (version: string) => {
    const installerUrl = `https://github.com/XRTM8/Otium-Downloader/releases/download/v${version}/Otium_Downloader_${version}_x64-setup.exe`;
    const filename = `Otium_Downloader_${version}_x64-setup.exe`;
    const taskId = downloadManager.addTask(installerUrl, filename, 16);
    const unsub = downloadManager.subscribe(() => {
      const task = downloadManager.getTasks().find((t) => t.id === taskId);
      if (task && task.status === 'completed') {
        unsub();
        downloadManager.openFile(task.savePath);
      }
    });
    setSettingsOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#060709]/90 backdrop-blur-xl border-b border-white/[0.05] px-3.5 sm:px-6 pt-safe pb-2.5 transition-all">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00e599] shadow-[0_0_16px_rgba(0,229,153,0.15)]">
              <OtiumLogo className="w-4 h-4" glow />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-zinc-100 tracking-tight">Otium</span>
              <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05]">
                v{CURRENT_VERSION}
              </span>
            </div>
          </div>

          {/* Live Throughput Pill */}
          <div className="flex items-center gap-2">
            {stats.currentTotalSpeed > 0 ? (
              <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono text-emerald-400 animate-in-fade shadow-[0_0_12px_rgba(0,229,153,0.12)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e599] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e599]"></span>
                </span>
                <span className="font-semibold tabular-nums tracking-tight text-xs">{formatSpeed(stats.currentTotalSpeed)}</span>
                <ThroughputSparkline history={speedHistory || []} className="w-12 h-3.5 hidden md:block" />
                <span className="text-emerald-500/40 hidden sm:inline">•</span>
                <span className="text-emerald-300/80 text-[11px] font-normal hidden sm:inline">{stats.activeCount} {isAr ? 'نشط' : 'active'}</span>
              </div>
            ) : stats.completedCount > 0 ? (
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/[0.05] text-xs font-mono text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span className="text-zinc-500">{isAr ? 'المحمّل:' : 'Total:'}</span>
                <span className="text-zinc-300 font-medium tabular-nums">{formatBytes(stats.totalBytesDownloaded)}</span>
              </div>
            ) : null}
          </div>

          {/* Action Group */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
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

            {onOpenShortcutsModal && (
              <button
                onClick={onOpenShortcutsModal}
                className="hidden sm:inline-flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]"
                title={isAr ? 'اختصارات لوحة المفاتيح (?)' : 'Keyboard Shortcuts (?)'}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}

            {onOpenRemoteModal && (
              <button
                onClick={onOpenRemoteModal}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-[#00e599] hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06] relative"
                title={isAr ? 'التحكم عن بُعد / ربط الأجهزة (Remote Link)' : 'Remote Link / Multi-device'}
              >
                <Smartphone className="w-4 h-4" />
                <span className="absolute top-1 right-1 rtl:left-1 rtl:right-auto w-1.5 h-1.5 rounded-full bg-[#00e599] opacity-75" />
              </button>
            )}

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]"
              title={isAr ? 'الإعدادات' : 'Settings'}
            >
              <Settings2 className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenAddModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00e599] text-[#07080a] hover:bg-[#00e599]/90 active:scale-[0.98] transition-all shadow-[0_0_12px_rgba(0,229,153,0.15)]"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in-fade">
          <div className="bg-[#0d0f14] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative text-zinc-200 pb-safe">
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3.5 sm:hidden" />

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
                    {isAr ? 'المؤثرات الصوتية' : 'Sound Effects'}
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

                {sound && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px]">
                    <span className="text-zinc-400">{isAr ? 'مستوى الصوت' : 'Volume'}</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={soundVolume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-24 accent-[#00e599] cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Smart Night Scheduler Card */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-xs">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isAr ? 'الجدول الليلي الذكي' : 'Smart Night Scheduler'}</span>
                  </div>
                  <button
                    onClick={handleNightSchedulerToggle}
                    className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${
                      nightScheduler ? 'bg-[#00e599]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-[#08090c] transition-transform ${
                        nightScheduler ? 'translate-x-3.5 rtl:-translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {isAr
                    ? 'بدء التنزيلات فقط خلال الساعات المحددة للاستفادة من سرعة الإنترنت وسعة التحميل المجانية.'
                    : 'Download only during off-peak hours to maximize speeds and ISP allowances.'}
                </p>
                {nightScheduler && (
                  <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
                    <span className="text-zinc-300">
                      {isAr ? `فترة التحميل: من ${nightStartHour}:00 إلى ${nightEndHour}:00` : `Hours: ${nightStartHour}:00 to ${nightEndHour}:00`}
                    </span>
                    <div className="flex gap-1">
                      {[
                        { s: 2, e: 8, label: '02-08' },
                        { s: 1, e: 7, label: '01-07' },
                        { s: 3, e: 9, label: '03-09' }
                      ].map((slot) => (
                        <button
                          key={slot.label}
                          onClick={() => handleNightHoursChange(slot.s, slot.e)}
                          className={`px-2 py-0.5 rounded text-[10px] border font-mono transition-colors ${
                            nightStartHour === slot.s && nightEndHour === slot.e
                              ? 'border-[#00e599]/60 text-[#00e599] bg-[#00e599]/10'
                              : 'border-white/[0.06] text-zinc-400 hover:text-white'
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-Shutdown Card */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-xs">
                    <Power className="w-3.5 h-3.5 text-rose-400" />
                    <span>{isAr ? 'إيقاف تشغيل الكمبيوتر عند الانتهاء' : 'Auto-Shutdown on Completion'}</span>
                  </div>
                  <button
                    onClick={handleAutoShutdownToggle}
                    className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${
                      autoShutdown ? 'bg-[#00e599]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-[#08090c] transition-transform ${
                        autoShutdown ? 'translate-x-3.5 rtl:-translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {isAr
                    ? 'إيقاف تشغيل الحاسوب تلقائياً بأمان بمجرد اكتمال كافة التنزيلات في قائمة الانتظار.'
                    : 'Safely shutdown the computer automatically once all queued downloads complete.'}
                </p>
              </div>

              {/* Remote Control Launcher Card */}
              {onOpenRemoteModal && (
                <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200 text-xs flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#00e599]" />
                      <span>{isAr ? 'التحكم عن بُعد من الهاتف (Remote Link)' : 'Remote Mobile Link'}</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Port 41524</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {isAr
                      ? 'تحكم بتنزيلات الكمبيوتر وأضف روابط وراقب السرعة مباشرة من هاتفك عبر شبكة Wi-Fi المحلية.'
                      : 'Control PC downloads, add links, and monitor speeds directly from your phone over local Wi-Fi.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      onOpenRemoteModal();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-[#00e599]/30 bg-[#00e599]/10 hover:bg-[#00e599]/20 text-[#00e599] transition-colors text-xs font-mono font-medium"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{isAr ? 'فتح لوحة ربط الهاتف والكمبيوتر' : 'Open Remote Link Panel'}</span>
                  </button>
                </div>
              )}

              {/* Browser Extension Card */}
              <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200 text-xs flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>{isAr ? 'إضافة المتصفح (Chrome / Edge / Firefox)' : 'Browser Extension'}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[#00e599] font-medium bg-[#00e599]/10 px-2 py-0.5 rounded-full border border-[#00e599]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00e599] animate-pulse" />
                    <span>{isAr ? 'المنفذ 41523 نشط' : 'Port 41523 Active'}</span>
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {isAr
                    ? 'التقاط تنزيلات المتصفح تلقائياً أو عبر زر الفأرة الأيمن في جميع المتصفحات.'
                    : 'Auto-intercept downloads and context-menu acceleration in all browsers.'}
                </p>
                <button
                  type="button"
                  onClick={() => downloadManager.openBrowserExtensionDir()}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.2] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 hover:text-white transition-colors text-xs font-mono font-medium"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#00e599]" />
                  <span>{isAr ? 'فتح مجلد الإضافة للتثبيت' : 'Open Extension Folder'}</span>
                </button>
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAutoUpdate(updateInfo.version!)}
                          className="px-2 py-0.5 rounded bg-[#00e599] hover:bg-[#00e599]/90 text-[#08090c] font-bold text-[11px] transition-transform active:scale-95 shadow-sm"
                        >
                          {isAr ? 'تحديث تلقائي ⚡' : 'Auto-Update ⚡'}
                        </button>
                        <a
                          href="https://github.com/XRTM8/Otium-Downloader/releases/latest"
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-400 hover:text-white underline text-[11px]"
                        >
                          {isAr ? 'ملاحظات' : 'Notes'}
                        </a>
                      </div>
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

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <div className="flex items-center gap-1.5">
                <OtiumLogo className="w-3.5 h-3.5 text-[#00e599]" />
                <span>Otium Downloader v{CURRENT_VERSION}</span>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-3 py-1 rounded-lg text-xs font-mono bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors"
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
