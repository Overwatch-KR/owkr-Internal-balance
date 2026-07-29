import type { Redis } from '@upstash/redis';
import { describe, expect, it, vi } from 'vitest';
import { HEROES } from '../../src/constants/hero';
import type { HeroVote, ScrimRecord } from '../../src/types/scrim';
import {
    getSuggestedBanDecision,
    resolveTiedBansRandomly,
} from './scrim-store';

const createRecord = (votes: HeroVote[]): ScrimRecord => ({
    id: 'scrim-1',
    date: '2026-07-30',
    startTime: '21:00',
    customGameStartsAt: Date.now() + 60_000,
    satisfactionExpiresAt: Date.now() + 86_400_000,
    createdAt: Date.now(),
    createdBy: '관리자',
    rosterSnapshot: [],
    usedBanHeroIds: [],
    votes,
    satisfactionResponses: [],
});

const createVote = (participant: string, heroIds: string[]): HeroVote => ({
    rosterParticipantId: participant,
    heroIds,
    submittedAt: Date.now(),
});

const createRedis = (records: ScrimRecord[]) => {
    let storedRecords = structuredClone(records);
    const redis = {
        get: vi.fn(async () => structuredClone(storedRecords)),
        set: vi.fn(async (_key: string, value: ScrimRecord[]) => {
            storedRecords = structuredClone(value);
            return 'OK';
        }),
    } as unknown as Redis;
    return { redis, read: () => storedRecords };
};

describe('scrim hero ban decision', () => {
    it('첫 번째 영웅과 같은 역할군을 제외하고 두 번째 영웅을 자동 선정한다', () => {
        const record = createRecord([
            createVote('1', ['ana', 'juno', 'tracer']),
            createVote('2', ['ana', 'juno', 'tracer']),
            createVote('3', ['ana', 'juno', 'dva']),
            createVote('4', ['ana', 'tracer', 'dva']),
        ]);

        expect(getSuggestedBanDecision(record)).toMatchObject({
            heroIds: ['ana', 'tracer'],
            automaticallySelected: true,
            hasTie: false,
            resolvedBy: 'automatic',
        });
    });

    it('동점 랜덤 추첨도 서로 다른 역할군의 영웅 두 명만 확정한다', async () => {
        const record = createRecord([
            createVote('1', ['ana', 'tracer']),
            createVote('2', ['ana', 'tracer']),
            createVote('3', ['juno', 'dva']),
            createVote('4', ['juno', 'dva']),
        ]);
        const { redis, read } = createRedis([record]);

        const result = await resolveTiedBansRandomly(redis, record.id);
        const heroIds = result?.finalBanDecision?.heroIds ?? [];
        const roles = heroIds.map(heroId => HEROES.find(hero => hero.id === heroId)?.role);

        expect(heroIds).toHaveLength(2);
        expect(new Set(roles).size).toBe(2);
        expect(result?.finalBanDecision).toMatchObject({
            automaticallySelected: false,
            hasTie: true,
            resolvedBy: 'random',
        });
        expect(read()[0].finalBanDecision).toEqual(result?.finalBanDecision);
    });
});
