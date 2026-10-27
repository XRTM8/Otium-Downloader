import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowDownToLine, Layers, ShieldCheck, Link2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { extractFilename, formatBytes } from '../core/segmentation';
import { downloadManager, type ProbeResult } from '../core/downloadManager';

interface AddTaskModalProps {
  isOpen: boolean;
  lang: 'ar' | 'en';
  onClose: () => void;
  onAdd: (url: string, filename?: string, segmentCount?: number, sha256?: string) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  lang,
  onClose,
  onAdd
}) => {
  const [url, setUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [segments, setSegments] = useState<number>(8);
  const [checksum, setChecksum] = useState('');
  const [isProbing, setIsProbing] = useState(false);
  const [probeData, setProbeData] = useState<ProbeResult | null>(null);
  const probeTimeoutRef = useRef<number | null>(null);

  const isAr = lang === 'ar';

  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setFilename('');
      setChecksum('');
      setProbeData(null);
      setIsProbing(false);
      return;
    }

    // Try auto-detecting link from clipboard
    navigator.clipboard?.readText?.().then((text) => {
      if (text && /^https?:\/\/.+/i.test(text.trim())) {
        handleUrlChange(text.trim());
      }
    }).catch(() => {});
  }, [isOpen]);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setProbeData(null);

    if (!newUrl.trim()) return;

    if (!filename) {
      setFilename(extractFilename(newUrl));
    }

    if (probeTimeoutRef.current) {
      window.clearTimeout(probeTimeoutRef.current);
    }

    if (/^https?:\/\/.+/i.test(newUrl.trim())) {
      setIsProbing(true);
      probeTimeoutRef.current = window.setTimeout(async () => {
        try {
          const res = await downloadManager.probe(newUrl.trim());
          if (res) {
            setProbeData(res);
            if (res.suggested_filename && (!filename || filename === extractFilename(newUrl))) {
              setFilename(res.suggested_filename);
            }
            if (res.content_length) {
              if (res.content_length > 500 * 1024 * 1024) setSegments(16);
              else if (res.content_length > 20 * 1024 * 1024) setSegments(8);
              else setSegments(4);
            }
          }
        } catch {
          // Probe failure fallback
        } finally {
          setIsProbing(false);
        }
      }, 400);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && /^https?:\/\/.+/i.test(text.trim())) {
        handleUrlChange(text.trim());
      }
    } catch {
      // Clipboard permissions
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    onAdd(url.trim(), filename.trim() || undefined, segments, checksum.trim() || undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0c0e14] border border-[#1e2230] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1e2230]">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <ArrowDownToLine className="w-5 h-5 text-[#00e599]" />
            <span>{isAr ? 'بدء تنزيل مسرّع جديد' : 'New Accelerated Download'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-neutral-300">
                {isAr ? 'رابط الملف (URL)' : 'Download URL'}
              </label>
              {isProbing && (
                <span className="text-[10px] font-mono text-[#00e599] flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  {isAr ? 'جاري الفحص المباشر للسيرفر...' : 'Probing remote server...'}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://example.com/archive.iso"
                className="w-full bg-[#08090c] border border-[#1e2230] focus:border-[#00e599] rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#00e599]"
              />
              <button
                type="button"
                onClick={handlePasteClipboard}
                title={isAr ? 'لصق من الحافظة' : 'Paste from clipboard'}
                className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-[#00e599] transition-colors"
              >
                <Link2 className="w-4 h-4" />
              </button>
            </div>

            {/* Probe Telemetry Banner */}
            {probeData && (
              <div className="mt-2 p-2.5 rounded-xl bg-[#08090c] border border-[#1e2230] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">{isAr ? 'الحجم:' : 'Size:'}</span>
                  <span className="text-white font-bold">
                    {probeData.content_length ? formatBytes(probeData.content_length) : 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {probeData.accept_ranges ? (
                    <span className="text-[#00e599] flex items-center gap-1 text-[11px] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isAr ? 'دعم تقسيم المسارات متاح' : 'Range Streams Supported'}
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {isAr ? 'مسار فردي فقط' : 'Single Stream Only'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filename Override */}
          <div>
            <label className="block text-xs font-mono text-neutral-300 mb-1.5">
              {isAr ? 'اسم الملف (اختياري)' : 'Filename (Optional)'}
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="archive.zip"
              className="w-full bg-[#08090c] border border-[#1e2230] focus:border-[#00e599] rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#00e599]"
            />
          </div>

          {/* Parallel Stream Count Selector */}
          <div>
            <label className="block text-xs font-mono text-neutral-300 mb-1.5">
              {isAr ? 'عدد المسارات المتزامنة' : 'Parallel Stream Count'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 4, 8, 16].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSegments(count)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                    segments === count
                      ? 'bg-[#00e599]/15 text-[#00e599] border border-[#00e599]/40 shadow-[0_0_10px_rgba(0,229,153,0.2)]'
                      : 'bg-[#08090c] text-neutral-400 border border-[#1e2230] hover:border-neutral-500'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{count}x</span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-neutral-500 font-mono">
              {isAr
                ? 'تقسيم الملف يضاعف سرعة التنزيل ويتجاوز قيود الخوادم الفردية.'
                : 'Splits requests across multiple byte-ranges for maximum saturation.'}
            </p>
          </div>

          {/* SHA-256 Checksum (Optional) */}
          <div>
            <label className="block text-xs font-mono text-neutral-300 mb-1.5 flex items-center justify-between">
              <span>{isAr ? 'بصمة SHA-256 للمطابقة (اختياري)' : 'Expected SHA-256 Hash (Optional)'}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
            </label>
            <input
              type="text"
              value={checksum}
              onChange={(e) => setChecksum(e.target.value)}
              placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              className="w-full bg-[#08090c] border border-[#1e2230] focus:border-[#00e599] rounded-xl px-4 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#00e599]"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e2230]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-neutral-400 hover:text-white transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00e599] text-[#08090c] hover:bg-[#00e599]/90 shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all transform active:scale-95"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>{isAr ? 'بدء التنزيل الآن' : 'Start Download'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
