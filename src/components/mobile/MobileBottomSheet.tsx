import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { haptics } from '../../core/haptics';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    haptics.light();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Sheet Container */}
      <div className="relative z-10 w-full max-w-lg mx-auto bg-[#0c0e14] border-t border-x border-[#1e2230] rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up pb-safe">
        {/* Handle Bar */}
        <div className="pt-3 pb-1 flex justify-center cursor-grab">
          <div className="w-12 h-1.5 rounded-full bg-[#1e2230]" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2230]">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            {icon}
            <span>{title}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-white/5 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};
