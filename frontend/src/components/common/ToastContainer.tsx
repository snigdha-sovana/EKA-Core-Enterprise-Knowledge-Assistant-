import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'info' | 'purple';
  title: string;
  message?: string;
  timestamp?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto p-4 rounded-xl shadow-xl border backdrop-blur-md flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-bottom-5 ${
            t.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-white'
              : t.type === 'warning'
              ? 'bg-amber-950/90 border-amber-500/50 text-white'
              : t.type === 'purple'
              ? 'bg-purple-950/90 border-purple-500/50 text-white'
              : 'bg-slate-900/90 border-slate-700 text-white'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            {t.type === 'purple' && <Sparkles className="w-4 h-4 text-purple-400" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
          </div>

          <div className="flex-1 space-y-0.5">
            <div className="text-xs font-bold leading-tight">{t.title}</div>
            {t.message && (
              <div className="text-[11px] text-slate-300 leading-normal">{t.message}</div>
            )}
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 text-slate-400 hover:text-white p-0.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
