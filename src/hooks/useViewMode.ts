import { useState, useEffect } from 'react';

export type ViewMode = 'desktop' | 'mobile';

export function useViewMode() {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  const [overrideMode, setOverrideMode] = useState<ViewMode | 'auto'>('auto');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeMode: ViewMode =
    overrideMode === 'auto'
      ? isMobile
        ? 'mobile'
        : 'desktop'
      : overrideMode;

  return {
    isMobile: activeMode === 'mobile',
    activeMode,
    overrideMode,
    setOverrideMode
  };
}
