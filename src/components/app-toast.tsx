import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ToastState } from '../hooks/use-toast';

interface AppToastProps {
    onDismiss: () => void;
    toast: ToastState;
}

/**
 * @description 성공·오류·안내 메시지와 선택적 실행 취소 동작을 화면 하단에 표시한다.
 */
export const AppToast = ({ onDismiss, toast }: AppToastProps) => (
    <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.96 }}
        className={`fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-[95] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur ${
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
                className="ml-2 min-h-8 shrink-0 rounded-md border border-current/30 px-2.5 text-xs font-semibold transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
                {toast.action.label}
            </button>
        )}
    </motion.div>
);
