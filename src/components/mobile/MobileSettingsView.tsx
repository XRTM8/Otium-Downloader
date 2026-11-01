import React, { useState } from 'react';
import {
  Settings2,
  Gauge,
  ListOrdered,
  Bell,
  Volume2,
  Vibrate,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Trash2,
  Monitor
} from 'lucide-react';
import { downloadManager } from '../../core/downloadManager';
import { formatSpeed } from '../../core/segmentation';
import { fetchReleaseInfo, isNewerVersion } from '../../core/updates/releaseFeed';
import { haptics } from '../../core/haptics';

interface MobileSettingsViewProps {
  lang: 'ar' | 'en';
  onSwitchToDesktop: () => void;
  onClearCompleted: () => void;
}

const CURRENT_VERSION = '1.2.0';

export const MobileSettingsView: React.FC<MobileSettingsViewProps> = ({
  lang,
  onSwitchToDesktop,
  onClearCompleted
}) => {
  const currentSettings = downloadManager.getSettings();
  const [maxConcurrent, setMaxConcurrent] = useState(currentSettings.maxConcurrentDownloads);
  const [speedLimit, setSpeedLimit] = useState(currentSettings.globalSpeedLimitBytes);
  const [notifications, setNotifications] = useState(currentSettings.enableNotifications);
  const [sound, setSound] = useState(currentSettings.enableSound ?? true);
  const [hapticEnabled, setHapticEnabled] = useState(haptics.enabled);

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ hasUpdate: boolean; version?: string } | null>(null);

  const isAr = lang === 'ar';

  const handleMaxConcurrent = (val: number) => {
    haptics.light();
    setMaxConcurrent(val);
    downloadManager.updateSettings({ maxConcurrentDownloads: val });
  };

  const handleSpeedLimit = (bytes: number) => {
    haptics.light();
    setSpeedLimit(bytes);
    downloadManager.updateSettings({ globalSpeedLimitBytes: bytes });
  };

  const handleNotificationsToggle = () => {
    haptics.medium();
    const next = !notifications;
    setNotifications(next);
    downloadManager.updateSettings({ enableNotifications: next });
  };

  const handleSoundToggle = () => {
    haptics.medium();
    const next = !sound;
    setSound(next);
    downloadManager.updateSettings({ enableSound: next });
  };

  const handleHapticToggle = () => {
    const next = !hapticEnabled;
    haptics.enabled = next;
    setHapticEnabled(next);
    if (next) haptics.heavy();
  };

  const handleCheckUpdates = async () => {
    haptics.light();
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

  const handleClear = () => {
    haptics.heavy();
    onClearCompleted();
  };

  return (
    <div className="space-y-4 max-w-md mx-auto animate-fade-in pb-24">
      {/* Header */}
      <div className="bg-[#0c0e14] border border-[#1e2230] rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-2.5 text-white font-bold text-sm mb-1">
          <Settings2 className="w-5 h-5 text-[#00e599]" />
          <span>{isAr ? 'إعدادات المنظومة والمحرك' : 'Engine & System Settings'}</span>
        </div>
        <p className="text-xs text-neutral-400">
          {isAr ? 'التحكم بسرعة التحميل، الطابور، التنبيهات، والواجهة' : 'Manage queue limits, speeds, and haptics.'}
        </p>
      </div>

      {/* Concurrent Downloads */}
      <div className="bg-[#0c0e14] border border-[#1e2230] rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <ListOrdered className="w-4 h-4 text-[#00e599]" />
            <span>{isAr ? 'التنزيلات المتزامنة القصوى' : 'Max Concurrent Downloads'}</span>
          </div>
          <span className="text-[#00e599] font-mono font-bold text-xs">{maxConcurrent}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[1, 2, 3, 5].map((count) => (
            <button
              key={count}
              onClick={() => handleMaxConcurrent(count)}
              className={`py-2 rounded-xl border text-center font-bold font-mono text-xs transition-all ${
                maxConcurrent === count
                  ? 'border-[#00e599] text-[#00e599] bg-[#00e599]/10'
                  : 'border-[#1e2230] text-neutral-400'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Speed Limiter */}
      <div className="bg-[#0c0e14] border border-[#1e2230] rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <Gauge className="w-4 h-4 text-[#00e599]" />
            <span>{isAr ? 'محدد السرعة الإجمالي' : 'Global Bandwidth Limiter'}</span>
          </div>
          <span className="text-amber-400 font-mono font-bold text-xs">
            {speedLimit === 0 ? (isAr ? 'حر' : 'MAX') : formatSpeed(speedLimit)}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { label: isAr ? 'حر' : 'MAX', val: 0 },
            { label: '2 MB/s', val: 2 * 1024 * 1024 },
            { label: '5 MB/s', val: 5 * 1024 * 1024 },
            { label: '10 MB/s', val: 10 * 1024 * 1024 }
          ].map((opt) => (
            <button
              key={opt.val}
              onClick={() => handleSpeedLimit(opt.val)}
              className={`py-2 rounded-xl border text-center font-bold font-mono text-[11px] transition-all ${
                speedLimit === opt.val
                  ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                  : 'border-[#1e2230] text-neutral-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles Group */}
      <div className="bg-[#0c0e14] border border-[#1e2230] rounded-3xl p-5 shadow-xl space-y-4">
        {/* Haptics */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-white">
            <Vibrate className="w-4 h-4 text-[#00e599]" />
            <div>
              <div className="text-xs font-bold">{isAr ? 'الاهتزاز اللمسي (Haptic Feedback)' : 'Haptic Feedback'}</div>
              <div className="text-[10px] text-neutral-400">{isAr ? 'اهتزاز خفيف عند الضغط وإتمام التنزيل' : 'Tactile response on actions'}</div>
            </div>
          </div>
          <button
            onClick={handleHapticToggle}
            className={`w-11 h-6 rounded-full transition-colors relative p-1 ${
              hapticEnabled ? 'bg-[#00e599]' : 'bg-[#1e2230]'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-[#08090c] transition-transform ${
              hapticEnabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Audio chime */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1e2230]">
          <div className="flex items-center gap-2.5 text-white">
            <Volume2 className="w-4 h-4 text-[#00e599]" />
            <div>
              <div className="text-xs font-bold">{isAr ? 'النغمة الصوتية السيبرانية' : 'Cyber Synth Chime'}</div>
              <div className="text-[10px] text-neutral-400">{isAr ? 'صوت ناعم عند اكتمال التنزيل' : 'Chime on completion'}</div>
            </div>
          </div>
          <button
            onClick={handleSoundToggle}
            className={`w-11 h-6 rounded-full transition-colors relative p-1 ${
              sound ? 'bg-[#00e599]' : 'bg-[#1e2230]'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-[#08090c] transition-transform ${
              sound ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1e2230]">
          <div className="flex items-center gap-2.5 text-white">
            <Bell className="w-4 h-4 text-[#00e599]" />
            <div>
              <div className="text-xs font-bold">{isAr ? 'الإشعارات' : 'Notifications'}</div>
              <div className="text-[10px] text-neutral-400">{isAr ? 'تنبيه النظام عند انتهاء الملف' : 'System notifications'}</div>
            </div>
          </div>
          <button
            onClick={handleNotificationsToggle}
            className={`w-11 h-6 rounded-full transition-colors relative p-1 ${
              notifications ? 'bg-[#00e599]' : 'bg-[#1e2230]'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-[#08090c] transition-transform ${
              notifications ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* Switch to Desktop Layout */}
      <div className="bg-[#0c0e14] border border-[#1e2230] rounded-3xl p-5 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Monitor className="w-4 h-4 text-[#00e599]" />
          <div>
            <div className="text-xs font-bold">{isAr ? 'عرض وضع الحاسوب' : 'Switch to Desktop View'}</div>
            <div className="text-[10px] text-neutral-400">{isAr ? 'الانتقال إلى واجهة الحاسوب الموسعة' : 'Open high-density cockpit layout'}</div>
          </div>
        </div>
        <button
          onClick={() => {
            haptics.medium();
            onSwitchToDesktop();
          }}
          className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono font-bold hover:bg-white/10 transition-colors"
        >
          {isAr ? 'تبديل' : 'Switch'}
        </button>
      </div>

      {/* Clear Completed & Updates */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleClear}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold font-mono transition-transform active:scale-95"
        >
          <Trash2 className="w-4 h-4" />
          <span>{isAr ? 'مسح المكتملة' : 'Clear Done'}</span>
        </button>

        <button
          onClick={handleCheckUpdates}
          disabled={isCheckingUpdate}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#00e599]/10 border border-[#00e599]/30 text-[#00e599] text-xs font-bold font-mono transition-transform active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
          <span>{isAr ? 'فحص التحديث' : 'Check Updates'}</span>
        </button>
      </div>

      {updateInfo && (
        <div className="p-3 rounded-2xl bg-[#0c0e14] border border-[#1e2230] text-xs font-mono">
          {updateInfo.hasUpdate ? (
            <div className="flex items-center justify-between text-amber-400">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>v{updateInfo.version} {isAr ? 'متاح الآن' : 'Available'}</span>
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
              <CheckCircle2 className="w-4 h-4" />
              <span>{isAr ? 'أنت تستخدم أحدث إصدار ✓' : 'Latest version installed ✓'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
