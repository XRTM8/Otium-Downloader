import React, { useState, useEffect } from 'react';
import {
  Link2,
  ArrowDownToLine,
  ChevronDown,
  ChevronUp,
  Clipboard,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { resolveMediaDownloadUrl, detectPlatform } from '../core/mediaResolver';

interface QuickAddBarProps {
  lang: 'ar' | 'en';
  onAdd: (url: string, filename?: string, segments?: number) => void;
  detectedClipboardUrl?: string | null;
  onClearClipboardUrl?: () => void;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  lang,
  onAdd,
  detectedClipboardUrl,
  onClearClipboardUrl
}) => {
  const isAr = lang === 'ar';
  const [url, setUrl] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [segments, setSegments] = useState(16);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If a clipboard URL was sniffed externally
  useEffect(() => {
    if (detectedClipboardUrl && !url) {
      setUrl(detectedClipboardUrl);
    }
  }, [detectedClipboardUrl]);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard?.readText?.();
      if (text && /^https?:\/\/.+/i.test(text.trim())) {
        setUrl(text.trim());
        setErrorMessage(null);
      }
    } catch {
      // Clipboard denied
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('magnet:')) {
      setErrorMessage(
        isAr
          ? 'يرجى إدخال رابط يبدأ بـ http:// أو https:// أو magnet:'
          : 'Please enter a valid HTTP, HTTPS, or magnet URL'
      );
      return;
    }

    setErrorMessage(null);
    setIsResolving(true);

    try {
      const platform = detectPlatform(cleanUrl);
      let targetDownloadUrl = cleanUrl;
      let targetFilename = customFilename.trim() || undefined;

      // If social platform, attempt resolution
      if (platform !== 'direct' && platform !== 'other' && !cleanUrl.startsWith('magnet:')) {
        try {
          const res = await resolveMediaDownloadUrl(cleanUrl);
          if (res.downloadUrl) {
            targetDownloadUrl = res.downloadUrl;
            if (res.suggestedFilename && !targetFilename) {
              targetFilename = res.suggestedFilename;
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setErrorMessage(msg);
          setIsResolving(false);
          return;
        }
      }

      onAdd(targetDownloadUrl, targetFilename, segments);
      setUrl('');
      setCustomFilename('');
      setShowAdvanced(false);
      onClearClipboardUrl?.();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'حدث خطأ في معالجة الرابط');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="w-full bg-[#0b0d13] border border-white/[0.08] hover:border-white/[0.12] rounded-2xl p-3 sm:p-4 shadow-xl transition-all">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Main Input Row */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-zinc-500 absolute left-3.5 rtl:right-3.5 rtl:left-auto top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={
                isAr
                  ? 'الصق رابط التحميل المباشر هنا (ملفات، وسائط، تيك توك، روابط مضغوطة)...'
                  : 'Paste direct download link here (files, media, TikTok, archives)...'
              }
              className="w-full bg-[#06070a] border border-white/[0.08] focus:border-[#00e599]/60 rounded-xl pl-9 rtl:pr-9 rtl:pl-24 pr-24 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#00e599]/30 transition-all font-mono"
            />

            {/* Quick Paste inside Input button */}
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="absolute right-2 rtl:left-2 rtl:right-auto top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 text-xs font-mono flex items-center gap-1 transition-all border border-white/[0.05]"
              title={isAr ? 'لصق من الحافظة' : 'Paste from clipboard'}
            >
              <Clipboard className="w-3 h-3 text-[#00e599]" />
              <span className="hidden sm:inline text-[11px]">{isAr ? 'لصق' : 'Paste'}</span>
            </button>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={!url.trim() || isResolving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-[#00e599] text-[#060709] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,229,153,0.3)] disabled:opacity-40 disabled:pointer-events-none shrink-0"
          >
            {isResolving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جاري الفحص...' : 'Resolving...'}</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-4 h-4 stroke-[2.5]" />
                <span>{isAr ? 'بدء التنزيل ⚡' : 'Download ⚡'}</span>
              </>
            )}
          </button>
        </div>

        {/* Inline Error Notice if any */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2 text-rose-300 text-xs font-mono animate-in-fade">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Advanced Options Toggle */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
          >
            <span>{isAr ? 'خيارات متقدمة (اسم الملف، المسارات)' : 'Advanced (filename, threads)'}</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <span className="text-[10px] font-mono text-zinc-400">
            {isAr ? 'تسريع فائق x16' : '16x Parallel Streams'}
          </span>
        </div>

        {/* Expandable Advanced Options */}
        {showAdvanced && (
          <div className="pt-2 border-t border-white/[0.04] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono animate-in-fade">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">
                {isAr ? 'اسم ملف مخصص (اختياري):' : 'Custom Filename (optional):'}
              </label>
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="myfile.ext"
                className="w-full bg-[#06070a] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#00e599]/40"
              />
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">
                {isAr ? 'مسارات التسريع المتوازية:' : 'Parallel Streams:'}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[4, 8, 16, 32].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSegments(s)}
                    className={`py-1.5 rounded-lg border text-center font-bold text-xs transition-all ${
                      segments === s
                        ? 'border-[#00e599] text-[#060709] bg-[#00e599]'
                        : 'border-white/[0.06] text-zinc-400 hover:text-zinc-200 bg-white/[0.02]'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
