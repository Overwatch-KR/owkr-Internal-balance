import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, getErrorMessage } from '../utils/api';
import { fetchUserSheet, type UserSheetEntry } from '../utils/user-sheet';

const USER_SHEET_SESSION_KEY = 'owkr_user_sheet_modal';
const USER_SHEET_REFRESH_INTERVAL_MS = 60_000;

interface StoredUserSheetModalState {
    battleTag?: string;
    isOpen: boolean;
}

const readStoredModalState = (): StoredUserSheetModalState => {
    try {
        const value = sessionStorage.getItem(USER_SHEET_SESSION_KEY);
        if (!value) return { isOpen: false };
        const parsed = JSON.parse(value) as Partial<StoredUserSheetModalState>;
        return {
            isOpen: parsed.isOpen === true,
            battleTag: typeof parsed.battleTag === 'string' ? parsed.battleTag : undefined,
        };
    } catch {
        return { isOpen: false };
    }
};

/**
 * @description 공유 유저 시트의 로딩·재시도와 모달 진입 상태를 한곳에서 관리한다.
 */
export const useUserSheet = () => {
    const [storedModalState] = useState(readStoredModalState);
    const [entries, setEntries] = useState<UserSheetEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(storedModalState.isOpen);
    const [selectedBattleTag, setSelectedBattleTag] = useState<string | undefined>(
        storedModalState.battleTag,
    );
    const requestIdRef = useRef(0);

    const load = useCallback(async (showLoading: boolean) => {
        const requestId = ++requestIdRef.current;
        if (showLoading) setIsLoading(true);
        try {
            const nextEntries = await fetchUserSheet();
            if (requestId !== requestIdRef.current) return;
            setEntries(nextEntries);
            setError(null);
        } catch (loadError) {
            if (requestId !== requestIdRef.current) return;
            setError(getErrorMessage(loadError, '유저 시트를 불러오지 못했습니다.'));
            if (loadError instanceof ApiError && loadError.status === 401) {
                window.location.reload();
            }
        } finally {
            if (requestId === requestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    const retry = useCallback(async () => load(true), [load]);
    const revalidate = useCallback(async () => load(false), [load]);

    useEffect(() => {
        void retry();
        return () => {
            requestIdRef.current += 1;
        };
    }, [retry]);

    useEffect(() => {
        if (!isOpen) return;

        const refreshVisibleSheet = () => {
            if (document.visibilityState === 'visible') void revalidate();
        };
        void revalidate();
        const intervalId = window.setInterval(
            refreshVisibleSheet,
            USER_SHEET_REFRESH_INTERVAL_MS,
        );
        window.addEventListener('focus', refreshVisibleSheet);
        document.addEventListener('visibilitychange', refreshVisibleSheet);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', refreshVisibleSheet);
            document.removeEventListener('visibilitychange', refreshVisibleSheet);
        };
    }, [isOpen, revalidate]);

    const open = useCallback((battleTag?: string) => {
        sessionStorage.setItem(USER_SHEET_SESSION_KEY, JSON.stringify({
            isOpen: true,
            battleTag,
        } satisfies StoredUserSheetModalState));
        setSelectedBattleTag(battleTag);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        sessionStorage.removeItem(USER_SHEET_SESSION_KEY);
        setIsOpen(false);
        setSelectedBattleTag(undefined);
    }, []);

    const updateEntries = useCallback((nextEntries: UserSheetEntry[]) => {
        setEntries(nextEntries);
        setError(null);
    }, []);

    return {
        close,
        entries,
        error,
        isLoading,
        isOpen,
        open,
        revalidate,
        retry,
        selectedBattleTag,
        updateEntries,
    };
};
