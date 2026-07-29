import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage, requestJson } from '../utils/api';

export interface AuthUser {
    id: string;
    username: string;
    globalName?: string;
}

interface AuthResponse {
    loggedIn: boolean;
    user?: AuthUser;
    csrfToken?: string;
}

/**
 * @description 서버 세션을 조회하고 안전한 로그아웃 요청을 제공한다.
 */
export const useAuth = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [csrfToken, setCsrfToken] = useState('');
    const [error, setError] = useState<string | null>(null);

    const loadSession = useCallback(async (signal?: AbortSignal) => {
        setError(null);
        try {
            const data = await requestJson<AuthResponse>('/api/auth/me', {
                credentials: 'same-origin',
                signal,
            });
            setUser(data.loggedIn ? data.user ?? null : null);
            setCsrfToken(data.loggedIn ? data.csrfToken ?? '' : '');
        } catch (loadError) {
            if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
            setUser(null);
            setCsrfToken('');
            setError(getErrorMessage(loadError, '로그인 상태를 확인하지 못했습니다.'));
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        void loadSession(controller.signal);
        return () => controller.abort();
    }, [loadSession]);

    const logout = useCallback(async () => {
        await requestJson('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'X-CSRF-Token': csrfToken },
        });
        setUser(null);
        setCsrfToken('');
    }, [csrfToken]);

    const retry = useCallback(() => {
        setIsLoading(true);
        void loadSession();
    }, [loadSession]);

    return { csrfToken, error, isLoading, logout, retry, user };
};
