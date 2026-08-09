import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'info' | 'error' | 'warning' | 'success';
  title?: string;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => {
        const getIcon = () => {
          switch (toast.type) {
            case 'error':
            case 'warning':
              return <AlertCircle className="w-4 h-4 text-zinc-300 shrink-0" />;
            case 'success':
              return <CheckCircle2 className="w-4 h-4 text-zinc-300 shrink-0" />;
            default:
              return <Info className="w-4 h-4 text-zinc-300 shrink-0" />;
          }
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 bg-[#ede5d8] border border-stone-300 rounded-full text-stone-900 shadow-lg animate-in fade-in slide-in-from-bottom-3 duration-200"
          >
            <div className="mt-0.5">{getIcon()}</div>
            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <div className="text-xs font-semibold text-stone-900 leading-snug">
                  {toast.title}
                </div>
              )}
              <div className="text-xs text-stone-700 leading-relaxed break-words">
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-full text-stone-500 hover:text-stone-900 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
