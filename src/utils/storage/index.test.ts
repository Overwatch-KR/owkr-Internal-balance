import { afterEach, describe, expect, it, vi } from 'vitest';
import { getWithExpiry, setWithExpiry } from '.';

class MemoryStorage {
    private readonly values = new Map<string, string>();

    get length(): number {
        return this.values.size;
    }

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    key(index: number): string | null {
        return [...this.values.keys()][index] ?? null;
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('expiry storage', () => {
    it('참가자 리스트를 30분 뒤 만료하도록 기록할 수 있다', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1_000);
        const storage = new MemoryStorage();
        vi.stubGlobal('localStorage', storage);

        setWithExpiry('owkr_players:user-1', ['player'], 30 * 60 * 1000);

        expect(JSON.parse(storage.getItem('owkr_players:user-1') ?? '')).toMatchObject({
            expiry: 1_801_000,
            storedAt: 1_000,
            version: 2,
        });
    });

    it('기존 24시간 형식도 실제 저장 후 30분이 지났으면 복원하지 않는다', () => {
        const now = 3_000_000;
        const storedAt = now - 31 * 60 * 1000;
        const storage = new MemoryStorage();
        storage.setItem('owkr_players:user-1', JSON.stringify({
            data: ['old-player'],
            expiry: storedAt + 24 * 60 * 60 * 1000,
        }));
        vi.stubGlobal('localStorage', storage);
        vi.spyOn(Date, 'now').mockReturnValue(now);

        expect(getWithExpiry('owkr_players:user-1', 30 * 60 * 1000)).toBeNull();
        expect(storage.getItem('owkr_players:user-1')).toBeNull();
    });
});
