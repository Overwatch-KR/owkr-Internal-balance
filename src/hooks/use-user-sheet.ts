import { useCallback, useEffect, useState } from 'react';
import { ApiError, getErrorMessage } from '../utils/api';
import { fetchUserSheet, type UserSheetEntry } from '../utils/user-sheet';

/**
 * @description 공유 유저 시트의 로딩·재시도와 모달 진입 상태를 한곳에서 관리한다.
 */
export const useUserSheet = () => {
    const [entries, setEntries] = useState<UserSheetEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedBattleTag, setSelectedBattleTag] = useState<string | undefined>();

    const retry = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            setEntries(await fetchUserSheet());
        } catch (loadError) {
            setError(getErrorMessage(loadError, '유저 시트를 불러오지 못했습니다.'));
            if (loadError instanceof ApiError && loadError.status === 401) {
                window.location.reload();
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;
        void fetchUserSheet()
            .then(data => {
                if (active) setEntries(data);
            })
            .catch(loadError => {
                if (active) {
                    setError(getErrorMessage(loadError, '유저 시트를 불러오지 못했습니다.'));
                }
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const open = useCallback((battleTag?: string) => {
        setSelectedBattleTag(battleTag);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
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
        retry,
        selectedBattleTag,
        updateEntries,
    };
};
