'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  type?: ToastType;
  message: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  message,
  isOpen,
  onClose,
  className,
}) => {
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => onClose(), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#30D158]" />,
    error: <AlertCircle className="w-5 h-5 text-[#FF453A]" />,
    info: <Info className="w-5 h-5 text-[#0A84FF]" />,
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 transition-all duration-300 transform scale-100">
      <div
        className={cn(
          'flex items-center gap-3 bg-[#161618]/90 backdrop-blur-xl border border-white/[0.1] text-white px-4 py-3 rounded-xl shadow-2xl min-w-[280px] max-w-md',
          className
        )}
      >
        <div className="shrink-0">{icons[type]}</div>
        <p className="text-sm font-medium text-white flex-1">{message}</p>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#8E8E93] hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
