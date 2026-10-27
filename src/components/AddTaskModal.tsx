import React, { useState } from 'react';
import { X, ArrowDownToLine, Layers, ShieldCheck, Link2 } from 'lucide-react';
import { extractFilename } from '../core/segmentation';

interface AddTaskModalProps {
  isOpen: boolean;
  lang: 'ar' | 'en';
  onClose: () => void;
  onAdd: (url: string, filename?: string, segmentCount?: number) => void;
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

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    if (!filename && newUrl.trim()) {
      setFilename(extractFilename(newUrl));
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.startsWith('http')) {
        handleUrlChange(text.trim());
      }
    } catch {
      // Clipboard permissions
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    onAdd(url.trim(), filename.trim() || undefined, segments);
    setUrl('');
    setFilename('');
    setChecksum('');
    onClose();
  };

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
            <label className="block text-xs font-mono text-neutral-300 mb-1.5">
              {isAr ? 'رابط الملف (URL)' : 'Download URL'}
            </label>
            <div className="relative">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://example.com/archive.zip"
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
          </div>

          {/* Filename Override */}
          <div>
            <label className="block text-xs font-mono text-neutral-300 mb-1.5">
              {isAr ? 'اسم الحفظ (اختياري)' : 'Filename (Optional)'}
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="archive.zip"
              className="w-full bg-[#08090c] border border-[#1e2230] focus:border-[#00e599] rounded-xl px-4 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none"
            />
          </div>

          {/* Parallel Stream Segment Count */}
          <div>
            <label className="block text-xs font-mono text-neutral-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00e599]" />
                {isAr ? 'عدد المسارات المتزامنة' : 'Parallel Segment Threads'}
              </span>
              <span className="text-[#00e599] font-bold">{segments} {isAr ? 'مسارات' : 'Streams'}</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 4, 8, 16].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setSegments(num)}
                  className={`py-2 rounded-xl text-xs font-mono border transition-all ${
                    segments === num
                      ? 'border-[#00e599] bg-[#00e599]/10 text-[#00e599] font-bold shadow-[0_0_10px_rgba(0,229,153,0.2)]'
                      : 'border-[#1e2230] bg-[#08090c] text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {num}x
                </button>
              ))}
            </div>
          </div>

          {/* Checksum SHA256 Optional */}
          <div>
            <label className="block text-xs font-mono text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
              {isAr ? 'تجزئة التحقق SHA-256 (اختياري)' : 'Integrity Hash SHA-256 (Optional)'}
            </label>
            <input
              type="text"
              value={checksum}
              onChange={(e) => setChecksum(e.target.value)}
              placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              className="w-full bg-[#08090c] border border-[#1e2230] focus:border-[#00e599] rounded-xl px-4 py-2 text-[11px] font-mono text-white placeholder-neutral-600 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-neutral-400 hover:text-white transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00e599] text-[#08090c] hover:bg-[#00e599]/90 shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all"
            >
              {isAr ? 'بدء التنزيل الآن' : 'Start Download'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
