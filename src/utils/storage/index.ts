/**
 * @description 만료 시간을 포함해 localStorage를 읽고 쓰는 유틸리티.
 */

interface StorageItem<T> {
    data: T;
    expiry: number;
}

const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24시간

/**
 * @description 데이터와 만료 시점을 함께 저장한다.
 * @param key - 저장 키
 * @param data - 저장할 데이터
 * @param expiryMs - 만료 시간 (밀리초, 기본값: 24시간)
 */
export const setWithExpiry = <T>(key: string, data: T, expiryMs: number = DEFAULT_EXPIRY_MS): void => {
    const item: StorageItem<T> = {
        data,
        expiry: Date.now() + expiryMs
    };
    localStorage.setItem(key, JSON.stringify(item));
};

/**
 * @description 만료 여부를 확인하면서 저장된 데이터를 읽는다.
 * @param key - 저장 키
 * @returns 데이터 또는 만료/없음 시 null
 */
export const getWithExpiry = <T>(key: string): T | null => {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    try {
        const item: StorageItem<T> = JSON.parse(itemStr);

        // 만료 체크
        if (Date.now() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }

        return item.data;
    } catch {
        // 기존 형식 데이터 호환 (마이그레이션)
        localStorage.removeItem(key);
        return null;
    }
};

/**
 * @description 지정 키의 항목을 삭제한다.
 * @param key - 삭제할 키
 */
export const removeItem = (key: string): void => {
    localStorage.removeItem(key);
};

/**
 * @description 알려진 키들을 순회하며 만료된 항목을 제거한다.
 */
export const cleanupExpired = (): void => {
    const keysToCheck = [
        'owkr_players',
        'owkr_result',
        'owkr_participant_mentions',
        'owkr_guide_progress',
    ];

    keysToCheck.forEach(key => {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return;

        try {
            const item = JSON.parse(itemStr);
            if (item.expiry && Date.now() > item.expiry) {
                localStorage.removeItem(key);
            }
        } catch {
            // 파싱 실패 시 삭제
            localStorage.removeItem(key);
        }
    });
};
