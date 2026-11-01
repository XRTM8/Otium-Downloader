import React from 'react';
import { ArrowDownToLine, Zap, Globe, Monitor } from 'lucide-react';
import { formatSpeed } from '../../core/segmentation';
import { haptics } from '../../core/haptics';

interface MobileHeaderProps {
  totalSpeed: number;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  onSwitchToDesktop?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  totalSpeed,
  lang,
  onToggleLang,
  onSwitchToDesktop
}) => {
  const isAr = lang === 'ar';

  const handleLangToggle = () => {
    haptics.light();
    onToggleLang();
  };

  const handleDesktopToggle = () => {
    haptics.medium();
    onSwitchToDesktop?.();
  };

  return (
    <header className="sticky top-0 z-30 bg-[#08090c]/90 backdrop-blur-md border-b border-[#1e2230] px-4 py-3">
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-xl bg-[#0c0e14] border border-[#00e599]/30 flex items-center justify-center shadow-[0_0_12px_rgba(0,229,153,0.2)]">
            <ArrowDownToLine className="w-4 h-4 text-[#00e599]" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00e599] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white tracking-wide">Otium</span>
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#00e599]/10 text-[#00e599] border border-[#00e599]/20">
                120Hz
              </span>
            </div>
          </div>
        </div>

        {/* Live speed pill */}
        {totalSpeed > 0 ? (
          <div className="flex items-center gap-1 bg-[#00e599]/10 border border-[#00e599]/30 rounded-xl px-2.5 py-1 text-[#00e599] font-mono font-bold text-xs shadow-sm animate-pulse">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{formatSpeed(totalSpeed)}</span>
          </div>
        ) : (
          <div className="text-[11px] font-mono text-neutral-500">
            {isAr ? 'في وضع الاستعداد' : 'Idle'}
          </div>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          {onSwitchToDesktop && (
            <button
              onClick={handleDesktopToggle}
              title={isAr ? 'عرض وضع الحاسوب' : 'Desktop view'}
              className="p-2 rounded-xl bg-[#0c0e14] border border-[#1e2230] text-neutral-400 hover:text-white transition-colors"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleLangToggle}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0c0e14] border border-[#1e2230] text-neutral-300 text-xs font-mono hover:border-[#00e599]/30 transition-colors"
          >
            <Globe className="w-3 h-3 text-[#00e599]" />
            <span>{isAr ? 'EN' : 'العربية'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
