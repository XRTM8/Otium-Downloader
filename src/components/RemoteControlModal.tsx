import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  Wifi,
  Copy,
  Check,
  X,
  Play,
  Pause,
  Trash2,
  Send,
  Power,
  RotateCw,
  AlertCircle
} from 'lucide-react';
import { downloadManager } from '../core/downloadManager';
import { remoteController } from '../core/remoteController';
import { formatBytes, formatSpeed } from '../core/segmentation';
import type { DownloadStats, DownloadTask } from '../types/downloader';

interface RemoteControlModalProps {
  isOpen: boolean;
  lang: 'ar' | 'en';
  onClose: () => void;
}

export const RemoteControlModal: React.FC<RemoteControlModalProps> = ({
  isOpen,
  lang,
  onClose
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'client' | 'host'>('client');
  const [hostInfo, setHostInfo] = useState<{ local_ip: string; port: number; pin: string; enabled: boolean } | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Client Controller State
  const initialConfig = remoteController.getConfig();
  const [serverHost, setServerHost] = useState(initialConfig.host || '');
  const [serverPin, setServerPin] = useState(initialConfig.pin || '');
  const [remoteState, setRemoteState] = useState<{ stats: DownloadStats; tasks: DownloadTask[] }>(
    remoteController.getRemoteState()
  );
  const [isConnected, setIsConnected] = useState(initialConfig.isConnected);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connError, setConnError] = useState<string | null>(initialConfig.lastError);

  // Quick Add on PC from Mobile
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isSendingUrl, setIsSendingUrl] = useState(false);
  const [urlSendSuccess, setUrlSendSuccess] = useState(false);

  // Load Host Info (if running on desktop)
  useEffect(() => {
    if (isOpen) {
      downloadManager.getRemoteServerInfo().then((info) => {
        if (info) {
          setHostInfo(info);
          // If on PC, default to host tab if not already connected as client
          if (!remoteController.getConfig().isConnected) {
            setActiveTab('host');
          }
        } else {
          setActiveTab('client');
        }
      });
    }
  }, [isOpen]);

  // Subscribe to Remote Controller State
  useEffect(() => {
    const unsub = remoteController.subscribe(() => {
      const cfg = remoteController.getConfig();
      setIsConnected(cfg.isConnected);
      setIsConnecting(cfg.isConnecting);
      setConnError(cfg.lastError);
      setRemoteState(remoteController.getRemoteState());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'ip' | 'pin') => {
    navigator.clipboard?.writeText(text);
    if (type === 'ip') {
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 1600);
    } else {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 1600);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverHost.trim() || !serverPin.trim()) return;
    setIsConnecting(true);
    setConnError(null);
    const success = await remoteController.connect(serverHost, serverPin);
    setIsConnecting(false);
    if (!success) {
      setConnError(remoteController.getConfig().lastError || (isAr ? 'فشل الاتصال' : 'Connection failed'));
    }
  };

  const handleSendRemoteDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteUrl.trim()) return;
    setIsSendingUrl(true);
    const ok = await remoteController.sendAddDownload(remoteUrl.trim());
    setIsSendingUrl(false);
    if (ok) {
      setRemoteUrl('');
      setUrlSendSuccess(true);
      setTimeout(() => setUrlSendSuccess(false), 2000);
    }
  };

  const handleRemoteShutdown = async () => {
    const confirmMsg = isAr
      ? 'هل أنت متأكد من رغبتك في إيقاف تشغيل جهاز الكمبيوتر عن بُعد بعد 60 ثانية؟'
      : 'Are you sure you want to shut down your PC remotely in 60 seconds?';
    if (window.confirm(confirmMsg)) {
      await remoteController.sendShutdown();
      alert(isAr ? 'تم جدولة إيقاف تشغيل الكمبيوتر بنجاح 🌙' : 'PC shutdown scheduled 🌙');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in-fade">
      <div className="bg-[#0f1118] border border-white/[0.08] rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative text-zinc-200 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-[#00e599]">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <span>{isAr ? 'التحكم عن بُعد عبر الهاتف (Remote Link)' : 'Remote Phone Companion'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-[#00e599] border border-emerald-500/20">
                  LAN ⚡
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-[#08090c] p-1 border border-white/[0.06] my-3.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('client')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'client'
                ? 'bg-[#00e599] text-[#08090c] font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isAr ? 'التحكم بالحاسوب (من الهاتف)' : 'Control PC (from Phone)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('host')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'host'
                ? 'bg-[#00e599] text-[#08090c] font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>{isAr ? 'بيانات هذا الحاسوب (Host)' : 'This PC Info (Host)'}</span>
          </button>
        </div>

        {/* Tab 1: Client Mode (Control PC from Phone) */}
        {activeTab === 'client' && (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs font-mono">
            {!isConnected ? (
              <form onSubmit={handleConnect} className="p-4 rounded-xl bg-[#08090c] border border-white/[0.06] space-y-3">
                <div className="text-zinc-300 font-sans text-xs">
                  {isAr
                    ? 'اتصل بتطبيق Otium المشغل على جهاز الكمبيوتر للتحكم بتنزيلاته وإرسال روابط جديدة:'
                    : 'Connect to Otium running on your PC over local Wi-Fi to control downloads:'}
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    {isAr ? 'عنوان IP ومنفذ الكمبيوتر (مثال: 192.168.1.15:41524)' : 'PC IP Address & Port'}
                  </label>
                  <input
                    type="text"
                    value={serverHost}
                    onChange={(e) => setServerHost(e.target.value)}
                    placeholder="192.168.1.15:41524"
                    dir="ltr"
                    className="w-full bg-[#141720] border border-white/[0.08] focus:border-[#00e599]/60 rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-600 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    {isAr ? 'رمز الأمان PIN (6 أرقام معروضة على الكمبيوتر)' : 'Security PIN (6 digits on PC)'}
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={serverPin}
                    onChange={(e) => setServerPin(e.target.value)}
                    placeholder="******"
                    dir="ltr"
                    className="w-full bg-[#141720] border border-white/[0.08] focus:border-[#00e599]/60 rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-600 outline-none text-center tracking-widest font-bold"
                    required
                  />
                </div>

                {connError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center gap-1.5 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{connError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full py-2 rounded-lg bg-[#00e599] text-[#08090c] font-bold text-xs hover:bg-[#00e599]/90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isAr ? 'جاري الاتصال...' : 'Connecting...'}</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5" />
                      <span>{isAr ? 'اتصال بالحاسوب ⚡' : 'Connect to PC ⚡'}</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-3.5">
                {/* Active Connection Status Bar */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00e599] animate-pulse" />
                    <div>
                      <div className="text-[#00e599] font-bold text-xs">
                        {isAr ? 'متصل بجهاز الكمبيوتر 🟢' : 'Connected to PC 🟢'}
                      </div>
                      <div className="text-zinc-400 text-[10px] dir-ltr">{serverHost}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => remoteController.disconnect()}
                    className="px-2.5 py-1 rounded-lg border border-white/[0.08] text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-[11px]"
                  >
                    {isAr ? 'قطع الاتصال' : 'Disconnect'}
                  </button>
                </div>

                {/* PC Stats Summary Card */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#08090c] border border-white/[0.06] text-center">
                    <div className="text-[10px] text-zinc-500">{isAr ? 'السرعة الحالية' : 'Speed'}</div>
                    <div className="text-[#00e599] font-bold text-xs mt-0.5">
                      {formatSpeed(remoteState.stats.currentTotalSpeed)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#08090c] border border-white/[0.06] text-center">
                    <div className="text-[10px] text-zinc-500">{isAr ? 'تنزيلات نشطة' : 'Active'}</div>
                    <div className="text-zinc-200 font-bold text-xs mt-0.5">
                      {remoteState.stats.activeCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#08090c] border border-white/[0.06] text-center">
                    <div className="text-[10px] text-zinc-500">{isAr ? 'المكتملة' : 'Completed'}</div>
                    <div className="text-zinc-200 font-bold text-xs mt-0.5">
                      {remoteState.stats.completedCount}
                    </div>
                  </div>
                </div>

                {/* Send Download to PC */}
                <form onSubmit={handleSendRemoteDownload} className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06] space-y-2">
                  <span className="text-zinc-300 font-medium text-xs block">
                    {isAr ? 'إرسال رابط للتنزيل على الكمبيوتر 🚀' : 'Send Download URL to PC 🚀'}
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={remoteUrl}
                      onChange={(e) => setRemoteUrl(e.target.value)}
                      placeholder="https://... أو magnet:?xt=..."
                      dir="ltr"
                      className="flex-1 bg-[#141720] border border-white/[0.08] focus:border-[#00e599]/60 rounded-lg px-2.5 py-1.5 text-zinc-100 placeholder:text-zinc-600 outline-none text-xs"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSendingUrl}
                      className="px-3 py-1.5 rounded-lg bg-[#00e599] text-[#08090c] font-bold hover:bg-[#00e599]/90 transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isAr ? 'إرسال' : 'Send'}</span>
                    </button>
                  </div>
                  {urlSendSuccess && (
                    <span className="text-[#00e599] text-[10px] flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>{isAr ? 'تم بدء التنزيل على الحاسوب بنجاح ✓' : 'Download queued on PC ✓'}</span>
                    </span>
                  )}
                </form>

                {/* Remote Actions Bar */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => remoteController.sendAction('pause_all')}
                    className="flex-1 py-1.5 rounded-lg border border-white/[0.08] bg-[#08090c] hover:bg-white/[0.04] text-zinc-300 transition-colors flex items-center justify-center gap-1 text-[11px]"
                  >
                    <Pause className="w-3 h-3" />
                    <span>{isAr ? 'إيقاف الكل' : 'Pause All'}</span>
                  </button>
                  <button
                    onClick={() => remoteController.sendAction('resume_all')}
                    className="flex-1 py-1.5 rounded-lg border border-[#00e599]/20 bg-[#00e599]/10 hover:bg-[#00e599]/20 text-[#00e599] transition-colors flex items-center justify-center gap-1 text-[11px]"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isAr ? 'استئناف الكل' : 'Resume All'}</span>
                  </button>
                  <button
                    onClick={handleRemoteShutdown}
                    className="p-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title={isAr ? 'إيقاف تشغيل الكمبيوتر بعد 60 ثانية' : 'Remote PC Shutdown (60s)'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>

                {/* PC Task List View */}
                <div className="space-y-2">
                  <div className="text-[11px] text-zinc-400 font-semibold flex items-center justify-between">
                    <span>{isAr ? 'تنزيلات الكمبيوتر الحالية:' : 'Current PC Downloads:'}</span>
                    <button
                      onClick={() => remoteController.pollStatus()}
                      className="text-zinc-500 hover:text-zinc-300 p-0.5"
                      title={isAr ? 'تحديث' : 'Refresh'}
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  </div>
                  {remoteState.tasks.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#08090c] border border-white/[0.06] text-center text-zinc-500 text-[11px]">
                      {isAr ? 'لا توجد تنزيلات على الكمبيوتر حالياً' : 'No active downloads on PC'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {remoteState.tasks.map((task) => {
                        const pct = task.totalBytes > 0 ? Math.round((task.downloadedBytes / task.totalBytes) * 100) : 0;
                        return (
                          <div
                            key={task.id}
                            className="p-2 rounded-lg bg-[#08090c] border border-white/[0.06] flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-zinc-200 text-[11px] font-semibold truncate" title={task.filename}>
                                {task.filename}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5 font-mono">
                                <span>{pct}%</span>
                                <span>•</span>
                                <span>{formatBytes(task.downloadedBytes)} / {formatBytes(task.totalBytes)}</span>
                                {task.speedBytesPerSec > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[#00e599]">{formatSpeed(task.speedBytesPerSec)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {task.status === 'downloading' ? (
                                <button
                                  onClick={() => remoteController.sendAction('pause', task.id)}
                                  className="p-1 rounded text-zinc-400 hover:text-white"
                                  title={isAr ? 'إيقاف مؤقت' : 'Pause'}
                                >
                                  <Pause className="w-3 h-3" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => remoteController.sendAction('resume', task.id)}
                                  className="p-1 rounded text-[#00e599] hover:bg-[#00e599]/10"
                                  title={isAr ? 'استئناف' : 'Resume'}
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                </button>
                              )}
                              <button
                                onClick={() => remoteController.sendAction('remove', task.id)}
                                className="p-1 rounded text-zinc-500 hover:text-rose-400"
                                title={isAr ? 'حذف' : 'Remove'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Host Mode (Info to Connect to this PC) */}
        {activeTab === 'host' && (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs font-mono">
            {hostInfo ? (
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-zinc-300 font-medium">
                    <span>{isAr ? 'عنوان IP للحاسوب على شبكة Wi-Fi:' : 'PC Local LAN IP Address:'}</span>
                    <span className="text-[10px] text-[#00e599] bg-[#00e599]/10 px-2 py-0.5 rounded-full border border-[#00e599]/20 font-bold">
                      {isAr ? 'منفذ 41524 نشط' : 'Port 41524 Active'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#141720] px-3 py-2 rounded-lg border border-white/[0.06]">
                    <span className="font-bold text-[#00e599] text-sm dir-ltr">
                      {hostInfo.local_ip}:{hostInfo.port}
                    </span>
                    <button
                      onClick={() => handleCopy(`${hostInfo.local_ip}:${hostInfo.port}`, 'ip')}
                      className="p-1 text-zinc-400 hover:text-white"
                      title={isAr ? 'نسخ' : 'Copy'}
                    >
                      {copiedIp ? <Check className="w-3.5 h-3.5 text-[#00e599]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-zinc-300 font-medium">
                    <span>{isAr ? 'رمز الأمان السري PIN للتحكم:' : 'Security Access PIN:'}</span>
                    <span className="text-[10px] text-zinc-500">{isAr ? 'خاص بهذا الجهاز فقط' : 'Device specific'}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#141720] px-3 py-2 rounded-lg border border-white/[0.06]">
                    <span className="font-bold text-amber-400 text-lg tracking-widest dir-ltr">
                      {hostInfo.pin}
                    </span>
                    <button
                      onClick={() => handleCopy(hostInfo.pin, 'pin')}
                      className="p-1 text-zinc-400 hover:text-white"
                      title={isAr ? 'نسخ' : 'Copy'}
                    >
                      {copiedPin ? <Check className="w-3.5 h-3.5 text-[#00e599]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 font-sans text-xs text-zinc-400">
                  <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#00e599]" />
                    <span>{isAr ? 'كيفية الاتصال من هاتفك المحمول:' : 'How to connect from your phone:'}</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                    <li>{isAr ? 'تأكد أن الهاتف والكمبيوتر متصلان بنفس شبكة الـ Wi-Fi المنزلية.' : 'Ensure your phone & PC are on the same Wi-Fi network.'}</li>
                    <li>{isAr ? 'افتح تطبيق Otium على هاتفك واضغط على أيقونة الربط 📱 في الأعلى.' : 'Open Otium on your phone and tap the Remote Link 📱 icon.'}</li>
                    <li>{isAr ? 'أدخل عنوان الـ IP ورمز الـ PIN الموضحين أعلاه للتحكم الفوري.' : 'Enter the IP and PIN shown above for instant sovereign control.'}</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[#08090c] border border-white/[0.06] text-center text-zinc-400 space-y-2 font-sans">
                <Laptop className="w-8 h-8 mx-auto text-zinc-600" />
                <p>{isAr ? 'أنت تستخدم تطبيق الهاتف حالياً أو بيئة الويب. استخدم علامة التبويب "التحكم بالحاسوب" للاتصال بجهاز الكمبيوتر.' : 'You are currently on mobile or web. Use the "Control PC" tab to link to your computer.'}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-zinc-500 shrink-0">
          <span>{isAr ? 'ربط محلي 100% بدون خوادم سحابية' : '100% Local Sovereign LAN Link'}</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-xs font-mono bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
