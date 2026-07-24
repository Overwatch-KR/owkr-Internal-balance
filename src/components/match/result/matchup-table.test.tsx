import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MatchResultData, Player, Rank } from '../../../types';
import MatchupTable from './matchup-table';

const createRank = (
    tier: Rank['tier'],
    div: number,
    state: Partial<Pick<Rank, 'isPreferred' | 'isAvoided'>> = {},
): Rank => ({
    tier,
    div,
    score: tier === 'UNRANKED' ? 0 : 2000,
    isPreferred: state.isPreferred ?? false,
    isAvoided: state.isAvoided ?? false,
});

const createPlayer = (id: number): Player => ({
    id,
    name: `VeryLongBattleTag${id}#12345`,
    discordName: `아주 긴 디스코드 닉네임 ${id}`,
    tank: createRank('BRONZE', 1, id === 1 ? { isPreferred: true } : {}),
    dps: createRank('DIAMOND', 3, id === 3 ? { isAvoided: true } : {}),
    sup: createRank('UNRANKED', 0),
    noMic: id === 1,
});

const players = Array.from({ length: 10 }, (_, index) => createPlayer(index + 1));

const matchResult: MatchResultData = {
    teamA: {
        name: 'TEAM 1',
        assignment: {
            TANK: [players[0]],
            DPS: [players[1], players[2]],
            SUPPORT: [players[3], players[4]],
        },
        realScore: 10000,
    },
    teamB: {
        name: 'TEAM 2',
        assignment: {
            TANK: [players[5]],
            DPS: [players[6], players[7]],
            SUPPORT: [players[8], players[9]],
        },
        realScore: 10000,
    },
    diff: 0,
};

const countMatches = (value: string, pattern: RegExp): number => value.match(pattern)?.length ?? 0;

describe('MatchupTable', () => {
    it('스위치가 꺼지면 플레이어마다 현재 배정 티어 하나만 표시한다', () => {
        const markup = renderToStaticMarkup(
            <MatchupTable
                matchResult={matchResult}
                onSlotClick={() => undefined}
                swapSource={null}
            />,
        );

        expect(markup).not.toContain('현재 배정');
        expect(countMatches(markup, /<img /g)).toBe(12);
        expect(countMatches(markup, /data-tier-icon="unranked"/g)).toBe(8);
        expect(markup).toContain('미배치');
        expect(markup).toContain('sm:hidden');
        expect(markup).toContain('hidden w-full min-w-0');
        expect(markup).toContain('aria-label="마이크 미사용"');
        expect(markup).toContain('id="matchup-table"');
        expect(markup).toContain('id="matchup-tank-row"');
        expect(countMatches(markup, /data-match-player-id=/g)).toBe(10);
        expect(countMatches(markup, /data-match-team="1"/g)).toBe(5);
        expect(countMatches(markup, /data-match-team="2"/g)).toBe(5);
    });

    it('전체 티어를 탱커, 딜러, 지원 순서로 표시하고 현재 배정 역할만 강조한다', () => {
        const markup = renderToStaticMarkup(
            <MatchupTable
                matchResult={matchResult}
                onSlotClick={() => undefined}
                swapSource={null}
                showAllRanks
            />,
        );

        expect(markup).toMatch(/title="탱커 [^"]+"[\s\S]*title="딜러 [^"]+"[\s\S]*title="힐러 [^"]+"/);
        expect(countMatches(markup, /title="탱커 /g)).toBe(10);
        expect(countMatches(markup, /title="딜러 /g)).toBe(10);
        expect(countMatches(markup, /title="힐러 /g)).toBe(10);
        expect(countMatches(markup, /· 현재 배정"/g)).toBe(10);
        expect(countMatches(markup, /border-cyan-400\/40/g)).toBe(6);
        expect(countMatches(markup, /ring-slate-300\/40/g)).toBe(4);
        expect(countMatches(markup, /data-tier="UNRANKED"/g)).toBe(10);
        expect(countMatches(markup, /<img /g)).toBe(0);
    });

    it('선호·비선호·미배치·마이크 상태와 긴 이름을 전체 티어 모드에 유지한다', () => {
        const markup = renderToStaticMarkup(
            <MatchupTable
                matchResult={matchResult}
                onSlotClick={() => undefined}
                swapSource={null}
                showAllRanks
            />,
        );

        expect(markup).toContain('title="탱커 브1★ · 현재 배정"');
        expect(markup).toContain('title="딜러 다3? · 현재 배정"');
        expect(markup).toContain('title="힐러 미배치');
        expect(markup).toContain('aria-label="마이크 미사용"');
        expect(markup).toContain('아주 긴 디스코드 닉네임 1');
        expect(markup).toContain('VeryLongBattleTag1#12345');
    });
});
