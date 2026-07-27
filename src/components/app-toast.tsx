import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ToastState } from '../hooks/use-toast';

interface AppToastProps {
    onDismiss: () => void;
    toast: ToastState;
}

/**
 * @description 성공·오류·안내 메시지와 선택적 후속 동작을 화면 우측 상단에 표시한다.
 */
export const AppToast = ({ onDismiss, toast }: AppToastProps) => (
    <motion.div
        initial={{ opacity: 0, x: 16, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 12, scale: 0.97 }}
        className={`fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-[105] flex w-[min(420px,calc(100vw-2rem))] items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur ${
            toast.type === 'error'
                ? 'border-rose-500/30 bg-rose-950/90 text-rose-100'
                : toast.type === 'info'
                    ? 'border-sky-500/30 bg-sky-950/90 text-sky-100'
                    : 'border-emerald-500/30 bg-emerald-950/90 text-emerald-100'
        }`}
        role="status"
        aria-live="polite"
    >
        {toast.type === 'error'
            ? <AlertCircle size={16} aria-hidden="true" />
            : toast.type === 'info'
                ? <Info size={16} aria-hidden="true" />
                : <CheckCircle2 size={16} aria-hidden="true" />}
        <span className="min-w-0 break-words">{toast.message}</span>
        {toast.action && (
            <button
                type="button"
                onClick={() => {
                    const action = toast.action;
                    if (!action) return;
                    onDismiss();
                    action.onClick();
                }}
                className="ml-auto min-h-8 shrink-0 whitespace-nowrap rounded-md border border-current/30 px-2.5 text-xs font-semibold transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
                {toast.action.label}
            </button>
        )}
    </motion.div>
);
