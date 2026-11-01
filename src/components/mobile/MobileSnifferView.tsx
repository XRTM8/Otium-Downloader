import React, { useState, useEffect } from 'react';
import { Sparkles, Clipboard, ArrowDownToLine, Layers, Globe } from 'lucide-react';
import { resolveUniversalLink, isLikelyDownloadUrl } from '../../core/linkResolver';
import { formatBytes } from '../../core/segmentation';
import { downloadManager, type ProbeResult } from '../../core/downloadManager';
import { haptics } from '../../core/haptics';

interface MobileSnifferViewProps {
  lang: 'ar' | 'en';
  onAddDownload: (url: string, filename?: string, segmentCount?: number, sha256?: string, headers?: Record<string, string>) => void;
  onNavigateToDownloads: () => void;
}

export const MobileSnifferView: React.FC<MobileSnifferViewProps> = ({
  lang,
  onAddDownload,
  onNavigateToDownloads
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [detectedClipboard, setDetectedClipboard] = useState<string | null>(null);
  const [segments, setSegments] = useState<number>(8);
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);

  const isAr = lang === 'ar';

  useEffect(() => {
    // Attempt reading clipboard
    navigator.clipboard?.readText?.().then((text) => {
      if (text && isLikelyDownloadUrl(text)) {
        setDetectedClipboard(text.trim());
      }
    }).catch(() => {});
  }, []);

  const handleApplyClipboard = () => {
    if (detectedClipboard) {
      haptics.light();
      setInputUrl(detectedClipboard);
      handleProbe(detectedClipboard);
    }
  };

  const handleProbe = async (targetUrl: string) => {
    if (!targetUrl.trim() || !/^https?:\/\/.+/i.test(targetUrl.trim())) return;
    setIsProbing(true);
    setProbeResult(null);

    const resolved = resolveUniversalLink(targetUrl);
    try {
      const res = await downloadManager.probe(resolved.resolvedUrl, resolved.suggestedHeaders);
      if (res) {
        setProbeResult(res);
        if (res.content_length) {
          if (res.content_length > 500 * 1024 * 1024) setSegments(16);
          else if (res.content_length > 20 * 1024 * 1024) setSegments(8);
          else setSegments(4);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsProbing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    haptics.heavy();
    const resolved = resolveUniversalLink(inputUrl.trim());
    onAddDownload(
      resolved.resolvedUrl,
      probeResult?.suggested_filename,
      segments,
      undefined,
      resolved.suggestedHeaders
    );
    onNavigateToDownloads();
  };

  const resolved = inputUrl ? resolveUniversalLink(inputUrl) : null;

  return (
    <div className="space-y-4 max-w-md mx-auto animate-fade-in pb-20">
      {/* Title Banner */}
      <div className="bg-[#0c0e14] border border-[#1e2230] rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-2.5 text-white font-bold text-sm mb-1">
          <Sparkles className="w-5 h-5 text-[#00e599]" />
          <span>{isAr ? 'اللاقط الذكي وتحليل الروابط' : 'Smart Link Sniffer & Resolver'}</span>
        </div>
        <p className="text-xs text-neutral-400">
          {isAr
            ? 'يقوم بتحويل روابط التخزين السحابي (Google Drive, Dropbox, GitHub) لروابط تنزيل مباشرة، وتجاوز قيود التحويل.'
            : 'Converts cloud storage links into direct streams, resolving redirect chains.'}
        </p>

        {/* Auto Clipboard Detection Pill */}
        {detectedClipboard && inputUrl !== detectedClipboard && (
          <div className="mt-4 p-3 rounded-2xl bg-[#00e599]/10 border border-[#00e599]/30 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-mono text-[#00e599] block font-bold">
                {isAr ? 'تم اكتشاف رابط قابل للتنزيل بالحافظة ⚡' : 'Downloadable link in clipboard ⚡'}
              </span>
              <span className="text-xs text-white truncate block font-mono">
                {detectedClipboard}
              </span>
            </div>
            <button
              onClick={handleApplyClipboard}
              className="px-3 py-1.5 rounded-xl bg-[#00e599] text-[#08090c] font-bold text-xs font-mono shrink-0 transition-transform active:scale-95"
            >
              {isAr ? 'استخدام' : 'Use'}
            </button>
          </div>
        )}
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="bg-[#0c0e14] border border-[#1e2230] rounded-3xl p-5 shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-mono text-neutral-300 mb-1.5">
            {isAr ? 'أدخل رابط التنزيل' : 'Enter Download URL'}
          </label>
          <div className="relative">
            <input
              type="url"
              required
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                handleProbe(e.target.value);
              }}
              placeholder="https://example.com/file.zip"
              className="w-full bg-[#08090c] border border-[#1e2230] focus:border-[#00e599] rounded-2xl px-4 py-3 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) {
                    setInputUrl(text.trim());
                    handleProbe(text.trim());
                  }
                } catch {}
              }}
              className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#00e599]"
            >
              <Clipboard className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resolved Host Badge */}
        {resolved?.isSpecialHost && (
          <div className="p-2.5 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center gap-2 text-xs font-mono text-cyan-300">
            <Globe className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>
              {isAr ? `تم التعرف على سيرفر: ${resolved.serviceName} وتحويله لرابط تنزيل مباشر ✓` : `Resolved: ${resolved.serviceName} direct stream ✓`}
            </span>
          </div>
        )}

        {/* Probe Telemetry */}
        {isProbing && (
          <div className="text-[11px] font-mono text-[#00e599] animate-pulse flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'جاري فحص السيرفر وسعة الملف...' : 'Probing remote headers...'}</span>
          </div>
        )}

        {probeResult && (
          <div className="p-3 rounded-2xl bg-[#08090c] border border-[#1e2230] text-xs font-mono flex items-center justify-between">
            <span className="text-neutral-400">{isAr ? 'الحجم المكتشف:' : 'Detected Size:'}</span>
            <span className="text-white font-bold">
              {probeResult.content_length ? formatBytes(probeResult.content_length) : 'Unknown'}
            </span>
          </div>
        )}

        {/* Parallel Streams Selector */}
        <div>
          <label className="block text-xs font-mono text-neutral-300 mb-1.5">
            {isAr ? 'عدد المسارات المتزامنة' : 'Concurrent Streams'}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[2, 4, 8, 16].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => {
                  haptics.light();
                  setSegments(count);
                }}
                className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  segments === count
                    ? 'bg-[#00e599]/20 text-[#00e599] border border-[#00e599]/40 shadow-sm'
                    : 'bg-[#08090c] text-neutral-400 border border-[#1e2230]'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Layers className="w-3 h-3" />
                  <span>{count}x</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#00e599] text-[#08090c] font-bold text-xs font-mono shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-transform active:scale-95"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>{isAr ? 'بدء التنزيل المسرّع الآن' : 'Start Accelerated Download'}</span>
        </button>
      </form>
    </div>
  );
};
