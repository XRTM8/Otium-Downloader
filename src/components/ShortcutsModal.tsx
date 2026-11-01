import React from 'react';
import { X, Command } from 'lucide-react';
import { OtiumLogo } from './OtiumLogo';

interface ShortcutsModalProps {
  isOpen: boolean;
  lang: 'ar' | 'en';
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  lang,
  onClose
}) => {
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  const shortcuts = [
    {
      keys: ['⌘', 'N'],
      altKeys: ['Ctrl', 'N'],
      label: isAr ? 'إضافة تنزيل جديد' : 'New Download'
    },
    {
      keys: ['⌘', 'V'],
      altKeys: ['Ctrl', 'V'],
      label: isAr ? 'لصق وكشف الروابط من الحافظة في أي مكان' : 'Universal Paste Link from Clipboard'
    },
    {
      keys: ['⌘', ','],
      altKeys: ['Ctrl', ','],
      label: isAr ? 'فتح لوحة الإعدادات' : 'Open Settings'
    },
    {
      keys: ['/'],
      label: isAr ? 'التركيز الفوري على شريط البحث' : 'Focus Quick Search'
    },
    {
      keys: ['Esc'],
      label: isAr ? 'إغلاق النوافذ المنبثقة' : 'Close Active Modal'
    },
    {
      keys: ['?'],
      label: isAr ? 'عرض قائمة الاختصارات السريعة' : 'Toggle Keyboard Shortcuts'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in-fade">
      <div className="bg-[#0f1118] border border-white/[0.08] rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 font-semibold text-sm text-zinc-100">
            <Command className="w-4 h-4 text-[#00e599]" />
            <span>{isAr ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="mt-4 divide-y divide-white/[0.04] text-xs font-mono">
          {shortcuts.map((sc, i) => (
            <div key={i} className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-zinc-300 font-sans text-xs">{sc.label}</span>
              <div className="flex items-center gap-1 shrink-0">
                {sc.keys.map((k, ki) => (
                  <kbd
                    key={ki}
                    className="px-2 py-0.5 rounded-md bg-[#141722] border border-white/[0.08] text-zinc-200 text-[11px] font-semibold shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-1.5">
            <OtiumLogo className="w-3.5 h-3.5 text-[#00e599]" />
            <span>Otium Cockpit</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
