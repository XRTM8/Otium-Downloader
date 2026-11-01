import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowDownToLine,
  Layers,
  Link2,
  ChevronDown,
  ChevronUp,
  Sliders,
  ListPlus
} from 'lucide-react';
import { extractFilename, formatBytes } from '../core/segmentation';
import { resolveUniversalLink, isLikelyDownloadUrl } from '../core/linkResolver';
import { downloadManager, type ProbeResult } from '../core/downloadManager';

interface AddTaskModalProps {
  isOpen: boolean;
  lang: 'ar' | 'en';
  onClose: () => void;
  onAdd: (
    url: string,
    filename?: string,
    segmentCount?: number,
    sha256?: string,
    headers?: Record<string, string>
  ) => void;
  onAddBatch?: (urls: string[], segmentCount?: number) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  lang,
  onClose,
  onAdd,
  onAddBatch
}) => {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [url, setUrl] = useState('');
  const [batchText, setBatchText] = useState('');
  const [filename, setFilename] = useState('');
  const [segments, setSegments] = useState<number>(8);
  const [checksum, setChecksum] = useState('');
  const [cookie, setCookie] = useState('');
  const [referer, setReferer] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [probeData, setProbeData] = useState<ProbeResult | null>(null);
  const probeTimeoutRef = useRef<number | null>(null);

  const isAr = lang === 'ar';

  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setBatchText('');
      setFilename('');
      setChecksum('');
      setCookie('');
      setReferer('');
      setShowAdvanced(false);
      setProbeData(null);
      setIsProbing(false);
      setMode('single');
      return;
    }

    // Try auto-detecting link from clipboard
    navigator.clipboard?.readText?.().then((text) => {
      if (text && isLikelyDownloadUrl(text)) {
        handleUrlChange(text.trim());
      }
    }).catch(() => {});
  }, [isOpen]);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setProbeData(null);

    if (!newUrl.trim()) return;

    const resolved = resolveUniversalLink(newUrl.trim());

    if (!filename) {
      setFilename(extractFilename(resolved.resolvedUrl));
    }

    if (probeTimeoutRef.current) {
      window.clearTimeout(probeTimeoutRef.current);
    }

    if (/^https?:\/\/.+/i.test(resolved.resolvedUrl)) {
      setIsProbing(true);
      probeTimeoutRef.current = window.setTimeout(async () => {
        try {
          const customHeaders: Record<string, string> = {
            ...(resolved.suggestedHeaders || {})
          };
          if (cookie.trim()) customHeaders['Cookie'] = cookie.trim();
          if (referer.trim()) customHeaders['Referer'] = referer.trim();

          const res = await downloadManager.probe(
            resolved.resolvedUrl,
            Object.keys(customHeaders).length ? customHeaders : undefined
          );
          if (res) {
            setProbeData(res);
            if (res.suggested_filename && (!filename || filename === extractFilename(resolved.resolvedUrl))) {
              setFilename(res.suggested_filename);
            }
            if (res.content_length) {
              if (res.content_length > 500 * 1024 * 1024) setSegments(16);
              else if (res.content_length > 20 * 1024 * 1024) setSegments(8);
              else setSegments(4);
            }
          }
        } catch {
          // Probe fallback
        } finally {
          setIsProbing(false);
        }
      }, 350);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (mode === 'single') {
          handleUrlChange(text.trim());
        } else {
          setBatchText((prev) => (prev ? prev + '\n' + text.trim() : text.trim()));
        }
      }
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'batch') {
      const urls = batchText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /^https?:\/\/.+/i.test(l));

      if (urls.length === 0) return;

      if (onAddBatch) {
        onAddBatch(urls, segments);
      } else {
        urls.forEach((u) => onAdd(u, undefined, segments));
      }
      onClose();
      return;
    }

    if (!url.trim()) return;

    const resolved = resolveUniversalLink(url.trim());
    const headers: Record<string, string> = {
      ...(resolved.suggestedHeaders || {})
    };
    if (cookie.trim()) headers['Cookie'] = cookie.trim();
    if (referer.trim()) headers['Referer'] = referer.trim();

    onAdd(
      resolved.resolvedUrl,
      filename.trim() || undefined,
      segments,
      checksum.trim() || undefined,
      Object.keys(headers).length > 0 ? headers : undefined
    );
    onClose();
  };

  const parsedBatchUrls = batchText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\/.+/i.test(l));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f1118] border border-[#1e2230] rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2230]">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <ArrowDownToLine className="w-4 h-4 text-[#00e599]" />
            <span>{isAr ? 'تنزيل جديد' : 'New Download'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-1.5 mt-4 p-1 rounded-lg bg-[#090a0f] border border-[#1e2230] text-xs font-mono">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`py-1.5 rounded-md font-semibold transition-all ${
              mode === 'single'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'رابط فردي' : 'Single URL'}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode('batch')}
            className={`py-1.5 rounded-md font-semibold transition-all ${
              mode === 'batch'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <ListPlus className="w-3.5 h-3.5" />
              <span>{isAr ? 'روابط متعددة' : 'Batch List'}</span>
            </span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs font-mono">
          {mode === 'single' ? (
            <>
              {/* URL Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-neutral-300">
                  <label>{isAr ? 'رابط الملف' : 'Download URL'}</label>
                  {isProbing && (
                    <span className="text-[#00e599] text-[10px]">
                      {isAr ? 'جاري فحص السيرفر...' : 'Probing server...'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://example.com/file.zip"
                    className="w-full bg-[#090a0f] border border-[#1e2230] focus:border-[#00e599] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
                    title={isAr ? 'لصق من الحافظة' : 'Paste'}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Probe Feedback Pill */}
                {probeData && (
                  <div className="mt-2 p-2 rounded-lg bg-[#090a0f] border border-[#1e2230] flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">
                      {isAr ? 'الحجم:' : 'Size:'}{' '}
                      <strong className="text-white">
                        {probeData.content_length ? formatBytes(probeData.content_length) : 'Unknown'}
                      </strong>
                    </span>
                    <span className={probeData.accept_ranges ? 'text-[#00e599]' : 'text-amber-400'}>
                      {probeData.accept_ranges
                        ? isAr ? 'يدعم التقسيم ✓' : 'Ranges supported ✓'
                        : isAr ? 'مسار فردي' : 'Single stream'}
                    </span>
                  </div>
                )}
              </div>

              {/* Filename Input */}
              <div>
                <label className="block text-neutral-300 mb-1">
                  {isAr ? 'اسم الملف (اختياري)' : 'Filename (Optional)'}
                </label>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="archive.zip"
                  className="w-full bg-[#090a0f] border border-[#1e2230] focus:border-[#00e599] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none"
                />
              </div>

              {/* Parallel Streams Selector */}
              <div>
                <label className="block text-neutral-300 mb-1">
                  {isAr ? 'عدد المسارات المتزامنة' : 'Concurrent Streams'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 8, 16].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setSegments(count)}
                      className={`py-1.5 rounded-lg border text-center font-bold transition-all ${
                        segments === count
                          ? 'border-[#00e599] text-[#00e599] bg-[#00e599]/10'
                          : 'border-[#1e2230] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>{count}x</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Expander */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-xs transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{isAr ? 'خيارات متقدمة (كوكيز وترويسات وبصمة)' : 'Advanced Options'}</span>
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showAdvanced && (
                  <div className="mt-2.5 p-3 rounded-xl bg-[#090a0f] border border-[#1e2230] space-y-2.5 animate-fade-in">
                    <div>
                      <label className="block text-neutral-400 text-[10px] mb-1">
                        {isAr ? 'بصمة SHA-256 للمطابقة' : 'Expected SHA-256 Hash'}
                      </label>
                      <input
                        type="text"
                        value={checksum}
                        onChange={(e) => setChecksum(e.target.value)}
                        placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                        className="w-full bg-[#151822] border border-[#1e2230] rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 text-[10px] mb-1">
                        {isAr ? 'كوكيز الجلسة (Cookie)' : 'Cookie Header'}
                      </label>
                      <input
                        type="text"
                        value={cookie}
                        onChange={(e) => setCookie(e.target.value)}
                        placeholder="session=xyz; token=123"
                        className="w-full bg-[#151822] border border-[#1e2230] rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 text-[10px] mb-1">
                        {isAr ? 'رابط الإحالة (Referer)' : 'Referer URL'}
                      </label>
                      <input
                        type="url"
                        value={referer}
                        onChange={(e) => setReferer(e.target.value)}
                        placeholder="https://example.com/download-page"
                        className="w-full bg-[#151822] border border-[#1e2230] rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Batch Mode */
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5 text-neutral-300">
                  <label>{isAr ? 'قائمة الروابط (رابط في كل سطر)' : 'Batch URLs'}</label>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="text-[#00e599] hover:underline text-[11px]"
                  >
                    {isAr ? 'لصق' : 'Paste'}
                  </button>
                </div>
                <textarea
                  rows={5}
                  required
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder={`https://example.com/file1.zip\nhttps://example.com/file2.iso`}
                  className="w-full bg-[#090a0f] border border-[#1e2230] focus:border-[#00e599] rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none resize-none"
                />
                <div className="mt-1 text-[11px] text-neutral-400">
                  {isAr ? 'الروابط المكتشفة:' : 'Valid links:'}{' '}
                  <strong className="text-[#00e599]">{parsedBatchUrls.length}</strong>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">
                  {isAr ? 'المسارات لكل ملف' : 'Streams per file'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 8, 16].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setSegments(count)}
                      className={`py-1.5 rounded-lg border text-center font-bold transition-all ${
                        segments === count
                          ? 'border-[#00e599] text-[#00e599] bg-[#00e599]/10'
                          : 'border-[#1e2230] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {count}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1e2230]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-neutral-400 hover:text-white transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={mode === 'batch' && parsedBatchUrls.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg font-semibold bg-[#00e599] text-[#090a0f] hover:bg-[#00e599]/90 disabled:opacity-40 transition-all active:scale-95"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>
                {mode === 'batch'
                  ? isAr ? `إضافة (${parsedBatchUrls.length})` : `Add (${parsedBatchUrls.length})`
                  : isAr ? 'بدء التنزيل' : 'Start Download'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
