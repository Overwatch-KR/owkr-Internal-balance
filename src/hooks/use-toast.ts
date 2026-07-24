import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ToastState {
    type: 'success' | 'error' | 'info';
    message: string;
    action?: ToastAction;
}

/**
 * @description 토스트 표시 상태와 자동 해제 타이머를 한곳에서 관리한다.
 */
export const useToast = () => {
    const [toast, setToast] = useState<ToastState | null>(null);
    const timerRef = useRef<number | null>(null);

    const dismissToast = useCallback(() => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = null;
        setToast(null);
    }, []);

    const showToast = useCallback((
        type: ToastState['type'],
        message: string,
        action?: ToastAction,
    ) => {
        setToast({ type, message, action });
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(
            () => setToast(null),
            action ? 8000 : 2800,
        );
    }, []);

    useEffect(() => () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
    }, []);

    return { dismissToast, showToast, toast };
};
