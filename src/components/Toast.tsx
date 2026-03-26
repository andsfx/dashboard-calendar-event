import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const iconMap = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

const bgMap = {
  success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
  error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
};

const titleMap = {
  success: 'text-emerald-800 dark:text-emerald-300',
  error: 'text-red-800 dark:text-red-300',
  info: 'text-blue-800 dark:text-blue-300',
};

const msgMap = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
};

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 4000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-sm animate-slide-in ${bgMap[toast.type]}`}
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      <div className="flex-shrink-0 mt-0.5">{iconMap[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${titleMap[toast.type]}`}>{toast.title}</p>
        <p className={`text-xs mt-0.5 ${msgMap[toast.type]}`}>{toast.message}</p>
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <X className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}

export function toast({
  type,
  title,
  message,
}: {
  type: ToastMessage['type'];
  title: string;
  message: string;
}): ToastMessage {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    type,
    title,
    message,
  };
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={() => onRemove(t.id)} />
        </div>
      ))}
    </div>
  );
}
