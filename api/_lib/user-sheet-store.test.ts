import type { Redis } from '@upstash/redis';
import { describe, expect, it, vi } from 'vitest';
import {
    getUserSheetBattleTagHistory,
    replaceUserSheet,
    updateUserSheetEntry,
    type StoredUserSheetEntry,
} from './user-sheet-store';

const storedEntry: StoredUserSheetEntry = {
    id: 'sheet-1',
    discordName: '유저',
    battleTag: 'Player#1234',
    tank: '다3',
    dps: '플2',
    support: '마5',
    note: '공유 메모',
    createdAt: 1,
    updatedAt: 10,
    updatedByName: '관리자 A',
    battleTagHistory: ['Legacy#1111', 'Player#1234'],
};

const createRedis = () => ({
    eval: vi.fn(),
    hget: vi.fn(),
}) as unknown as Redis;

describe('user sheet atomic store', () => {
    it('전체 저장에서 기대 시트 버전이 다르면 교체하지 않는다', async () => {
        const redis = createRedis();
        vi.mocked(redis.eval)
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce({
                entries: [storedEntry],
                sheetVersion: 4,
            })
            .mockResolvedValueOnce({ status: 'CONFLICT' });

        const result = await replaceUserSheet(
            redis,
            [storedEntry],
            3,
            '관리자 B',
        );

        expect(result).toEqual({ status: 'CONFLICT' });
        expect(redis.eval).toHaveBeenCalledTimes(3);
        expect(vi.mocked(redis.eval).mock.calls[2]?.[2]?.[0]).toBe('3');
    });

    it('행 수정에서 기대 updatedAt을 원자 스크립트에 전달한다', async () => {
        const redis = createRedis();
        vi.mocked(redis.eval)
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce({ status: 'CONFLICT' });
        vi.mocked(redis.hget).mockResolvedValue(storedEntry);

        const result = await updateUserSheetEntry(
            redis,
            { ...storedEntry, note: '새 공유 메모' },
            storedEntry.updatedAt,
            '관리자 B',
        );

        expect(result).toEqual({ status: 'CONFLICT' });
        expect(vi.mocked(redis.eval).mock.calls[1]?.[2]?.slice(0, 3)).toEqual([
            storedEntry.id,
            String(storedEntry.updatedAt),
            'player#1234',
        ]);
    });

    it('행 ID 메모 이관을 위해 현재와 과거 BattleTag를 함께 반환한다', async () => {
        const redis = createRedis();
        vi.mocked(redis.eval).mockResolvedValue(0);
        vi.mocked(redis.hget).mockResolvedValue(storedEntry);

        const history = await getUserSheetBattleTagHistory(
            redis,
            storedEntry.id,
            'Renamed#9999',
        );

        expect(history).toEqual([
            'Legacy#1111',
            'Player#1234',
            'Renamed#9999',
        ]);
    });
});
