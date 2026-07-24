import { describe, expect, it } from 'vitest';
import type { Rank } from '../types';
import {
    formatRank,
    getTierScore,
    TIERS,
    TIER_OPTIONS,
} from './index';

const unrankedRank: Rank = {
    tier: 'UNRANKED',
    div: 0,
    score: 0,
    isPreferred: false,
    isAvoided: false,
};

describe('tier constants', () => {
    it('미배치를 점수 티어 목록과 분리해 선택 상태로만 제공한다', () => {
        expect(TIERS).not.toContain('UNRANKED');
        expect(TIER_OPTIONS).toContain('UNRANKED');
        expect(getTierScore('UNRANKED', 0)).toBe(0);
    });

    it('미배치는 디비전 없이 명시적인 라벨로 표시한다', () => {
        expect(formatRank(unrankedRank)).toBe('미배치');
    });
});
