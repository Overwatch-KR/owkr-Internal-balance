import { useCallback, useEffect, useState } from 'react';
import { IS_LOCAL_REVIEW_MODE } from '../config/runtime';
import { getErrorMessage, requestJson } from '../utils/api';

export interface AuthUser {
    id: string;
    username: string;
    globalName?: string;
    avatar?: string;
}

interface AuthResponse {
    loggedIn: boolean;
    user?: AuthUser;
    csrfToken?: string;
}

const LOCAL_REVIEW_USER: AuthUser = {
    id: 'local-reviewer',
    username: 'local-reviewer',
    globalName: '로컬 검수',
};

/**
 * @description 운영에서는 서버 세션을 조회하고 로컬 검수 모드에서는 가상 관리자를 제공한다.
 */
export const useAuth = () => {
    const [isLoading, setIsLoading] = useState(!IS_LOCAL_REVIEW_MODE);
    const [user, setUser] = useState<AuthUser | null>(
        IS_LOCAL_REVIEW_MODE ? LOCAL_REVIEW_USER : null,
    );
    const [csrfToken, setCsrfToken] = useState(
        IS_LOCAL_REVIEW_MODE ? 'local-review-csrf-token' : '',
    );
    const [error, setError] = useState<string | null>(null);

    const loadSession = useCallback(async (signal?: AbortSignal) => {
        if (IS_LOCAL_REVIEW_MODE) {
            setUser(LOCAL_REVIEW_USER);
            setCsrfToken('local-review-csrf-token');
            setError(null);
            setIsLoading(false);
            return;
        }
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
        if (IS_LOCAL_REVIEW_MODE) return;
        const controller = new AbortController();
        void loadSession(controller.signal);
        return () => controller.abort();
    }, [loadSession]);

    const logout = useCallback(async () => {
        if (IS_LOCAL_REVIEW_MODE) return;
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
