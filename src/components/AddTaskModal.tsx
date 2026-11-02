import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Layers,
  Link2,
  ChevronDown,
  ChevronUp,
  Sliders,
  ListPlus,
  Clipboard,
  ArrowDownToLine,
  Film,
  Check
} from 'lucide-react';
import { OtiumLogo } from './OtiumLogo';
import { extractFilename, formatBytes } from '../core/segmentation';
import { resolveUniversalLink, isLikelyDownloadUrl } from '../core/linkResolver';
import { downloadManager, type ProbeResult } from '../core/downloadManager';
import { isMagnetUri, parseMagnetUri, parseTorrentFile, type TorrentMetadata } from '../core/torrent';
import {
  detectPlatform,
  fetchMediaMetadata,
  resolveMediaDownloadUrl,
  type MediaPreview,
  type MediaFormatOption
} from '../core/mediaResolver';
import type { MediaMetadata } from '../types/downloader';

interface AddTaskModalProps {
  isOpen: boolean;
  lang: 'ar' | 'en';
  initialUrl?: string;
  initialBatchText?: string;
  onClose: () => void;
  onAdd: (
    url: string,
    filename?: string,
    segmentCount?: number,
    sha256?: string,
    headers?: Record<string, string>,
    mediaInfo?: MediaMetadata
  ) => void;
  onAddBatch?: (urls: string[], segmentCount?: number) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  lang,
  initialUrl,
  initialBatchText,
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
  const [torrentMeta, setTorrentMeta] = useState<TorrentMetadata | null>(null);

  // VRKA-style Media Inspection State
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<MediaFormatOption | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const probeTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      setTorrentMeta(null);
      setMediaPreview(null);
      setSelectedFormat(null);
      setIsProbing(false);
      setIsLoadingMedia(false);
      setMode('single');
      return;
    }

    if (initialBatchText) {
      setMode('batch');
      setBatchText(initialBatchText);
      return;
    }

    if (initialUrl) {
      setMode('single');
      handleUrlChange(initialUrl.trim());
      return;
    }

    // Try auto-detecting link from clipboard
    navigator.clipboard?.readText?.().then((text) => {
      if (text && isLikelyDownloadUrl(text)) {
        handleUrlChange(text.trim());
      }
    }).catch(() => {});
  }, [isOpen, initialUrl, initialBatchText]);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setProbeData(null);
    setMediaPreview(null);
    setSelectedFormat(null);

    const trimmed = newUrl.trim();
    if (!trimmed) {
      setTorrentMeta(null);
      return;
    }

    // Magnet Link handling
    if (isMagnetUri(trimmed)) {
      const meta = parseMagnetUri(trimmed);
      setTorrentMeta(meta);
      if (meta?.name && (!filename || filename === extractFilename(trimmed))) {
        setFilename(meta.name);
      }
      setIsProbing(false);
      return;
    } else {
      setTorrentMeta(null);
    }

    const platform = detectPlatform(trimmed);
    const resolved = resolveUniversalLink(trimmed);

    // If media platform detected (YouTube, TikTok, Instagram, Twitter, direct video/audio)
    if (platform !== 'other') {
      setIsLoadingMedia(true);
      fetchMediaMetadata(trimmed)
        .then((preview) => {
          setMediaPreview(preview);
          if (preview.title) {
            setFilename(`${preview.title}.${preview.availableFormats[0]?.ext || 'mp4'}`);
          }
          if (preview.availableFormats.length > 0) {
            setSelectedFormat(preview.availableFormats[0]);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingMedia(false);
        });
    }

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

  const handleSelectFormat = (fmt: MediaFormatOption) => {
    setSelectedFormat(fmt);
    if (mediaPreview?.title) {
      setFilename(`${mediaPreview.title}.${fmt.ext}`);
    } else if (filename) {
      const stem = filename.substring(0, filename.lastIndexOf('.')) || filename;
      setFilename(`${stem}.${fmt.ext}`);
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

  const handleTorrentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const meta = await parseTorrentFile(buffer);
      setTorrentMeta(meta);
      setUrl(`torrent://${meta.infoHash}`);
      setFilename(meta.name);
      if (meta.totalLength > 500 * 1024 * 1024) setSegments(16);
      else if (meta.totalLength > 20 * 1024 * 1024) setSegments(8);
      else setSegments(4);
    } catch (err) {
      console.warn('Failed to parse .torrent file:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    let targetDownloadUrl = resolved.resolvedUrl;
    let targetFilename = filename.trim() || undefined;

    // Resolve direct media stream URL for social/video platforms
    if (mediaPreview && mediaPreview.platform !== 'direct' && mediaPreview.platform !== 'other') {
      try {
        const streamInfo = await resolveMediaDownloadUrl(url.trim(), selectedFormat || undefined);
        if (streamInfo.downloadUrl) {
          targetDownloadUrl = streamInfo.downloadUrl;
        }
        if (streamInfo.suggestedFilename && !targetFilename) {
          targetFilename = streamInfo.suggestedFilename;
        }
      } catch {
        // Fallback to original resolved link
      }
    }

    const mediaInfo: MediaMetadata | undefined = mediaPreview
      ? {
          title: mediaPreview.title,
          author: mediaPreview.author,
          thumbnail: mediaPreview.thumbnail,
          platform: mediaPreview.platform,
          quality: selectedFormat?.qualityBadge,
          isAudioOnly: selectedFormat?.isAudioOnly,
        }
      : undefined;

    onAdd(
      targetDownloadUrl,
      targetFilename,
      segments,
      checksum.trim() || undefined,
      Object.keys(headers).length > 0 ? headers : undefined,
      mediaInfo
    );
    onClose();
  };

  const parsedBatchUrls = batchText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\/.+/i.test(l));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in-fade">
      <div
        className="w-full sm:max-w-xl bg-[#07080b] border-t sm:border border-white/[0.08] rounded-t-3xl sm:rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in-slide-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Swipe Handle */}
        <div className="sm:hidden w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-zinc-700/60" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#0c0e14]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-[#00e599] shadow-[0_0_16px_rgba(0,229,153,0.15)]">
              <OtiumLogo className="w-4 h-4" glow />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-100">
                {isAr ? 'إضافة تنزيل فائق السرعة' : 'Add High-Speed Download'}
              </h3>
              <p className="text-[10px] font-mono text-zinc-400">
                {isAr ? 'نواة تسريع بـ 16 مسار متوازي + اقتناص الوسائط' : '16-segment accelerator + media extraction'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          {/* Mode Switch Tabs (Single vs Batch) */}
          <div className="flex rounded-xl bg-black/40 p-1 border border-white/[0.05]">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                mode === 'single'
                  ? 'bg-zinc-800 text-white shadow-sm border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'رابط مفرد / وسائط' : 'Single / Media'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                mode === 'batch'
                  ? 'bg-zinc-800 text-white shadow-sm border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>{isAr ? 'دفعة روابط' : 'Batch URLs'}</span>
            </button>
          </div>

          {/* URL Input Section */}
          {mode === 'single' ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 block font-medium">
                {isAr ? 'رابط التنزيل المباشر أو الوسائط (YouTube, TikTok, Files, Magnet)' : 'URL, Media Link, or Magnet URI'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://... أو magnet:?xt=..."
                  className="w-full bg-[#0d0f15] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono shadow-inner pr-20 rtl:pr-3.5 rtl:pl-20"
                />
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[10px] font-mono text-zinc-300 transition-colors flex items-center gap-1 border border-white/[0.05]"
                >
                  <Clipboard className="w-3 h-3 text-[#00e599]" />
                  <span>{isAr ? 'لصق' : 'Paste'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>{isAr ? 'قائمة الروابط (رابط في كل سطر)' : 'Batch URLs (one per line)'}</span>
                <span className="text-[#00e599] font-semibold">{parsedBatchUrls.length} {isAr ? 'روابط صالحة' : 'valid URLs'}</span>
              </div>
              <textarea
                rows={4}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder="https://domain.com/file1.zip&#10;https://domain.com/file2.zip"
                className="w-full bg-[#0d0f15] border border-white/[0.08] rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-all font-mono resize-none shadow-inner"
              />
            </div>
          )}

          {/* Torrent Info Pill */}
          {torrentMeta && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between text-xs font-mono text-purple-300">
              <span className="truncate font-semibold">{torrentMeta.name}</span>
              <span className="shrink-0 text-purple-400 font-bold ml-2 rtl:mr-2 rtl:ml-0">
                {formatBytes(torrentMeta.totalLength)}
              </span>
            </div>
          )}

          {/* Direct Probe Status Card */}
          {mode === 'single' && !mediaPreview && (isProbing || probeData) && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-3 text-xs font-mono space-y-1.5 animate-in-fade">
              {isProbing ? (
                <div className="flex items-center gap-2 text-zinc-400">
                  <div className="w-2 h-2 rounded-full bg-[#00e599] animate-ping" />
                  <span className="text-[11px]">{isAr ? 'جاري فحص خصائص الرابط وسرعة الاستجابة...' : 'Probing connection & range headers...'}</span>
                </div>
              ) : probeData ? (
                <>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-[11px] text-zinc-400">{isAr ? 'حجم الملف التقديري:' : 'File Size:'}</span>
                    <span className="text-[#00e599] font-bold">
                      {(probeData.content_length || 0) > 0 ? formatBytes((probeData.content_length || 0)) : (isAr ? 'دفق مستمر (حجم غير محدد مسبقاً)' : 'Continuous Stream')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>{isAr ? 'دعم تقسيم المسارات:' : 'Range Acceleration:'}</span>
                    <span className={probeData.accept_ranges ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                      {probeData.accept_ranges ? (isAr ? 'مدعوم (تسريع كامل بـ 16 مسار) ⚡' : 'Supported (16x Multi-Stream) ⚡') : (isAr ? 'غير مدعوم (مسار تدفق مفرد)' : 'Single Stream')}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* VRKA-Inspired Media Preview Card */}
          {isLoadingMedia && (
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/[0.05] flex items-center gap-3 animate-pulse">
              <div className="w-16 h-12 rounded-xl bg-white/[0.05]" />
              <div className="flex-1 space-y-1.5">
                <div className="w-3/4 h-3 bg-white/[0.08] rounded" />
                <div className="w-1/3 h-2.5 bg-white/[0.04] rounded" />
              </div>
            </div>
          )}

          {mediaPreview && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-3.5 space-y-3 shadow-lg">
              <div className="flex gap-3">
                {mediaPreview.thumbnail ? (
                  <div className="w-24 h-16 rounded-xl overflow-hidden bg-black shrink-0 border border-white/[0.06] relative">
                    <img
                      src={mediaPreview.thumbnail}
                      alt={mediaPreview.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/75 text-[8px] font-mono font-bold text-zinc-200">
                      {mediaPreview.platform.toUpperCase()}
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00e599] shrink-0">
                    <Film className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-[#00e599] border border-emerald-500/25">
                      {mediaPreview.platform}
                    </span>
                    {mediaPreview.author && (
                      <span className="text-[10px] text-zinc-400 truncate">
                        {mediaPreview.author}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-100 line-clamp-2 mt-1 leading-snug">
                    {mediaPreview.title}
                  </h4>
                </div>
              </div>

              {/* Format / Quality Selector Chips */}
              <div className="space-y-1.5 pt-1 border-t border-white/[0.04]">
                <label className="text-[10px] font-mono text-zinc-400 block font-medium">
                  {isAr ? 'اختر الجودة أو نوع الملف:' : 'Select Quality & Format:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {mediaPreview.availableFormats.map((fmt) => {
                    const isSelected = selectedFormat?.id === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => handleSelectFormat(fmt)}
                        className={`p-2 rounded-xl text-left rtl:text-right border transition-all flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-[#00e599]/15 border-[#00e599]/40 text-[#00e599] shadow-[0_0_12px_rgba(0,229,153,0.12)]'
                            : 'bg-white/[0.02] border-white/[0.05] text-zinc-300 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono font-bold truncate">
                            {isAr ? fmt.labelAr : fmt.label}
                          </div>
                          <div className="text-[9px] font-mono opacity-70">
                            {fmt.ext.toUpperCase()} • {fmt.qualityBadge}
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Filename & Segments (When Single Mode) */}
          {mode === 'single' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 block font-medium">
                {isAr ? 'اسم الملف المحفوظ' : 'Destination Filename'}
              </label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="filename.ext"
                className="w-full bg-[#0d0f15] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-all font-mono shadow-inner"
              />
            </div>
          )}

          {/* Acceleration Segments Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00e599]" />
                <span>{isAr ? 'مسارات التسريع المتوازية (Multi-Threaded Streams)' : 'Parallel Acceleration Streams'}</span>
              </span>
              <span className="text-[#00e599] font-bold">{segments} {isAr ? 'مسارات' : 'streams'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[4, 8, 16].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSegments(s)}
                  className={`py-2 rounded-xl text-xs font-mono font-semibold border transition-all ${
                    segments === s
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-[#00e599] shadow-[0_0_12px_rgba(0,229,153,0.15)]'
                      : 'bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  {s}x {isAr ? 'مسار' : 'Streams'} {s === 16 ? '⚡' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Accordion Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
            >
              <Sliders className="w-3 h-3 text-[#00e599]" />
              <span>{isAr ? 'إعدادات متقدمة (فحص SHA-256، ملف التورنت، كوكيز)' : 'Advanced Options (Checksum, Torrent, Headers)'}</span>
              {showAdvanced ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 rounded-2xl bg-black/40 border border-white/[0.05] space-y-3 animate-in-fade font-mono text-xs">
                {/* Upload .torrent File */}
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    {isAr ? 'تحميل ملف .torrent مباشر:' : 'Load .torrent file:'}
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".torrent"
                    onChange={handleTorrentFileUpload}
                    className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-white/[0.08] file:text-zinc-200 hover:file:bg-white/[0.15] cursor-pointer"
                  />
                </div>

                {/* Expected SHA-256 Checksum */}
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    {isAr ? 'بصمة SHA-256 للتحقق بعد الاكتمال:' : 'Expected SHA-256 checksum:'}
                  </label>
                  <input
                    type="text"
                    value={checksum}
                    onChange={(e) => setChecksum(e.target.value)}
                    placeholder="e.g. d93f192fe3133b7abf..."
                    className="w-full bg-[#0d0f15] border border-white/[0.06] rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-2 pb-safe sm:pb-0">
            <button
              type="submit"
              disabled={mode === 'single' ? !url.trim() : parsedBatchUrls.length === 0}
              className="w-full py-3 rounded-2xl bg-[#00e599] text-[#060709] font-bold text-xs sm:text-sm hover:bg-[#00e599]/90 active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(0,229,153,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <ArrowDownToLine className="w-4 h-4 stroke-[2.5]" />
              <span>
                {mode === 'single'
                  ? selectedFormat?.isAudioOnly
                    ? isAr ? 'استخراج وتحميل الصوت ⚡' : 'Extract & Download Audio ⚡'
                    : isAr ? 'بدء التنزيل فائق السرعة ⚡' : 'Start High-Speed Download ⚡'
                  : isAr ? `بدء تنزيل (${parsedBatchUrls.length}) ملفات متوازية ⚡` : `Start Batch Download (${parsedBatchUrls.length}) ⚡`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
