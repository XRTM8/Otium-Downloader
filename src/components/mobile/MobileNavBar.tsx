import React from 'react';
import { DownloadCloud, Gauge, Sparkles, Settings2 } from 'lucide-react';
import { haptics } from '../../core/haptics';

export type MobileTab = 'downloads' | 'stats' | 'sniffer' | 'settings';

interface MobileNavBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  activeCount: number;
  queuedCount: number;
  lang: 'ar' | 'en';
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeTab,
  onTabChange,
  activeCount,
  queuedCount,
  lang
}) => {
  const isAr = lang === 'ar';

  const handleSelect = (tab: MobileTab) => {
    haptics.light();
    onTabChange(tab);
  };

  const navItems = [
    {
      id: 'downloads' as const,
      icon: DownloadCloud,
      label: isAr ? 'التنزيلات' : 'Downloads',
      badge: activeCount > 0 ? activeCount : queuedCount > 0 ? `${queuedCount}Q` : null
    },
    {
      id: 'stats' as const,
      icon: Gauge,
      label: isAr ? 'السرعة' : 'Telemetry',
      badge: null
    },
    {
      id: 'sniffer' as const,
      icon: Sparkles,
      label: isAr ? 'اللاقط' : 'Catch Link',
      badge: null
    },
    {
      id: 'settings' as const,
      icon: Settings2,
      label: isAr ? 'الإعدادات' : 'Settings',
      badge: null
    }
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0c0e14]/95 backdrop-blur-xl border-t border-[#1e2230] px-3 py-2 pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all duration-200 relative ${
                isActive
                  ? 'text-[#00e599] font-bold bg-[#00e599]/10 shadow-[0_0_12px_rgba(0,229,153,0.15)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 min-w-4 text-center rounded-full bg-[#00e599] text-[#08090c] text-[9px] font-mono font-bold shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#00e599] mt-0.5 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
