import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { MatchResultData, Player, Rank } from '../../../types';
import MatchResult from './index';

const rank: Rank = {
    tier: 'GOLD',
    div: 3,
    score: 1400,
    isPreferred: false,
    isAvoided: false,
};

const createPlayer = (id: number): Player => ({
    id,
    name: `Player${id}#1234`,
    tank: {
        ...rank,
        score: id === 1 ? 1700 : id === 6 ? 1400 : rank.score,
        isPreferred: id === 2,
    },
    dps: { ...rank, score: id === 7 || id === 8 ? 1600 : rank.score },
    sup: { ...rank },
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
    metrics: {
        totalDiff: 0,
        roleDiffs: { tank: 20, dps: 40, support: 60 },
        teamStdDevs: [120, 140],
        preferenceViolations: 1,
        avoidedAssignments: 0,
        unrankedAssignments: 0,
    },
};

describe('MatchResult', () => {
    it('탱·딜·힐 티어 스위치를 OFF로 시작하고 화면 영역을 이미지 복사 대상으로 사용한다', () => {
        const markup = renderToStaticMarkup(
            <MatchResult
                matchResult={matchResult}
                onSlotClick={vi.fn()}
                swapSource={null}
            />,
        );

        expect(markup).toContain('role="switch"');
        expect(markup).toContain('aria-checked="false"');
        expect(markup).toContain('탱·딜·힐 티어 표시');
        expect(markup).toContain('밸런스 요약');
        expect(markup).toContain('선호 역할 이탈 1명');
        expect(markup).toContain('Player2#1234');
        expect(markup).toContain('1팀 · 딜러');
        expect(markup).toContain('비선호 배정');
        expect(markup).not.toContain('data-export-render');
        expect(markup).not.toContain('data-display-mode');
    });

    it('역할별 티어 점수 차이를 밸런스 요약에 함께 표시한다', () => {
        const markup = renderToStaticMarkup(
            <MatchResult
                matchResult={matchResult}
                onSlotClick={vi.fn()}
                swapSource={null}
            />,
        );

        expect(markup).not.toContain('포지션별 티어 차이');
        expect(markup).toContain('탱커');
        expect(markup).toContain('1팀 +300점');
        expect(markup).toContain('딜러');
        expect(markup).toContain('2팀 +200점');
        expect(markup).toContain('힐러');
        expect(markup).toContain('동일');
        expect(markup.match(/밸런스 요약/g)).toHaveLength(1);
        expect(markup).toContain('data-capture-content="true"');
    });

    it('교체할 플레이어를 선택하면 다음 행동과 취소 버튼을 바로 보여준다', () => {
        const markup = renderToStaticMarkup(
            <MatchResult
                matchResult={matchResult}
                onSlotClick={vi.fn()}
                swapSource={{ teamIdx: 0, role: 'TANK', index: 0 }}
                onCancelSwap={vi.fn()}
            />,
        );

        expect(markup).toContain('Player1#1234</span> 선택됨 · 바꿀 플레이어를 선택하세요');
        expect(markup).toContain('선택 취소');
        expect(markup).toContain('aria-pressed="true"');
    });

    it('비선호와 미배치 역할에 배정된 대상도 이름과 배정 위치로 알려준다', () => {
        const avoidedPlayer: Player = {
            ...players[2],
            dps: { ...players[2].dps, isAvoided: true },
        };
        const unrankedPlayer: Player = {
            ...players[3],
            sup: {
                ...players[3].sup,
                tier: 'UNRANKED',
                div: 0,
                score: 0,
            },
        };
        const resultWithExceptions: MatchResultData = {
            ...matchResult,
            teamA: {
                ...matchResult.teamA,
                assignment: {
                    ...matchResult.teamA.assignment,
                    DPS: [players[1], avoidedPlayer],
                    SUPPORT: [unrankedPlayer, players[4]],
                },
            },
        };
        const markup = renderToStaticMarkup(
            <MatchResult
                matchResult={resultWithExceptions}
                onSlotClick={vi.fn()}
                swapSource={null}
            />,
        );

        expect(markup).toContain('비선호 배정 1명');
        expect(markup).toContain('Player3#1234');
        expect(markup).toContain('미배치 역할 1명');
        expect(markup).toContain('Player4#1234');
        expect(markup).toContain('1팀 · 힐러');
    });
});
