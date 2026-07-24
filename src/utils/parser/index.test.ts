import { describe, expect, it } from 'vitest';
import { SAMPLE_ROSTER } from '../../constants';
import { balancePlayers } from '../balance';
import { parseLineToPlayer, parseMultipleLines } from './index';

const RECENT_PARTICIPANTS = `
**바비호바**역할 아이콘, 막시밀리앙 — **어제 오후 8:20**
뾱뾱이#31226 그마3 / 마2 / 그마5
**모노** [GI], 역할 아이콘, 다이아 — **어제 오후 8:21**
모노#31832 다4? / 다4! / 다5!
**선물**역할 아이콘, 플래티넘 — **어제 오후 8:21**
one#35119 다3!/플3?/미배치(복귀)
**우람한오크#3390**역할 아이콘, 내전 총관리자 — **어제 오후 8:22**
우람한오크#3390 골3?/플5/플1!
**피셔** [ᴍᴏᴏɴ], 역할 아이콘, 다이아 — **어제 오후 8:22**
TWO#31166 플3/플5/플4
**맹물**역할 아이콘, 다이아 — **어제 오후 8:22**
둥댕#3222 (예상 다5)?/ 다3? / 마3!
**showdown**역할 아이콘, 신참 — **어제 오후 8:23**
내가하늘에서겠다#3375 챔5 / 그마2 / 그마2
**라솔메**역할 아이콘, 플래티넘 — **어제 오후 8:23**
라솔메#3898 플3? 플2! 플3 X (노트북이슈)
**미누**역할 아이콘, 브론즈 — **어제 오후 8:24**
K200#31384 탱 다2! / 딜 다5/ 힐 다3?
**minha**역할 아이콘, 다이아 — **어제 오후 8:27**
QUASAR#31909 마5?/마5/마1!
**유진**역할 아이콘, 다이아 — **어제 오후 9:16**
Venom#33519 다1?/마1/챔5
**톱질대장**역할 아이콘, 다이아 — **어제 오후 7:27**
TIMEWILLTELL#31107 플4 / 플1 / 다5 (주로 힐러 아나 미즈키 합니다.)
**모노** [GI], 역할 아이콘, 다이아 — **어제 오후 3:15**
모노#31832 다4? / 다4! / 다5!
**우람한오크#3390**역할 아이콘, 내전 총관리자 — **어제 오후 3:16**
우람한오크#3390 골3?/플5/플1!
**왕감자**역할 아이콘, 다이아 — **어제 오후 3:17**
햄스터밥주는사람#3409 플4 ? / 플2(?) / 다2!
**김현석**역할 아이콘, 연습생 (20LVL+) — **어제 오후 3:18**
고영례#3286 그4!/마5!/마2!
**연화** [𝜗ৎ], 역할 아이콘, {핑크 메르시} — **어제 오후 3:20**
BaekGoving#3820 플4?/다5!/다5!
**에어맨이 쓰러지지 않아**역할 아이콘, 숙달자 (40LVL+) — **어제 오후 3:21**
가면요루#3833 플5 / 플3 / 실? (마이크x)
**용이** [운명.ଓ], 역할 아이콘, 신참 — **어제 오후 3:22**
IlIllIlI#31213 탱!(정커퀸 해저드) 예상 골2 / 딜? 골4 / 힐 예상 실1
**yog\\_1952** [오버워치], 역할 아이콘, 초보자 (25LVL+) — **어제 오후 3:23**
kimjungun#11853 마4/마1!/마5
**뽕뽕** [୨୧], 역할 아이콘, 지망생 (15LVL+) — **어제 오후 3:23**
zzuzzu#31457 플(배치X) ? / 골(배치X) ? / 마4! (복귀유저)
**맹물**역할 아이콘, 다이아 — **어제 오후 3:24**
둥댕#3222 (예상 다5)?/ 다3? / 마3!
`;

describe('가이드 예시 명단', () => {
    it('선호·비선호·무표시·미배치가 섞인 참가자 10명을 파싱한다', () => {
        const result = parseMultipleLines(SAMPLE_ROSTER);
        const ranks = result.players.flatMap(player => [
            player.tank,
            player.dps,
            player.sup,
        ]);
        const playersWithoutIntent = result.players.filter(player => (
            [player.tank, player.dps, player.sup].every(rank => (
                !rank.isPreferred && !rank.isAvoided
            ))
        ));
        const playersWithPreference = result.players.filter(player => (
            [player.tank, player.dps, player.sup].some(rank => rank.isPreferred)
        ));
        const playersWithAvoidance = result.players.filter(player => (
            [player.tank, player.dps, player.sup].some(rank => rank.isAvoided)
        ));
        const playersWithUnrankedRole = result.players.filter(player => (
            [player.tank, player.dps, player.sup].some(rank => rank.tier === 'UNRANKED')
        ));

        expect(result.players).toHaveLength(10);
        expect(result.failedLines).toHaveLength(0);
        expect(result.players.at(-1)?.noMic).toBe(true);
        expect(ranks).toHaveLength(30);
        expect(playersWithPreference).toHaveLength(5);
        expect(playersWithAvoidance).toHaveLength(4);
        expect(playersWithUnrankedRole).toHaveLength(1);
        expect(playersWithoutIntent).toHaveLength(5);
    });

    it('예시 매칭 결과에서 배정 예외 3종의 대상이 실제로 생긴다', () => {
        const { players } = parseMultipleLines(SAMPLE_ROSTER);
        const { result } = balancePlayers(players);

        expect(result.metrics).toMatchObject({
            preferenceViolations: 1,
            avoidedAssignments: 1,
            unrankedAssignments: 1,
        });
    });
});

describe('parseMultipleLines', () => {
    it('디스코드 헤더, 설명, 예상 티어와 마이크 표기를 함께 파싱한다', () => {
        const { players, failedLines } = parseMultipleLines(RECENT_PARTICIPANTS);

        expect(failedLines).toEqual([]);
        expect(players).toHaveLength(19);

        const byBattleTag = new Map(players.map((player) => [player.name, player]));
        expect(byBattleTag.get('뾱뾱이#31226')).toMatchObject({
            discordName: '바비호바',
            tank: { tier: 'GRANDMASTER', div: 3 },
            dps: { tier: 'MASTER', div: 2 },
            sup: { tier: 'GRANDMASTER', div: 5 },
        });
        expect(byBattleTag.get('둥댕#3222')).toMatchObject({
            discordName: '맹물',
            tank: { tier: 'DIAMOND', div: 5, isAvoided: true },
        });
        expect(byBattleTag.get('라솔메#3898')?.noMic).toBe(true);
        expect(byBattleTag.get('가면요루#3833')).toMatchObject({
            discordName: '에어맨이 쓰러지지 않아',
            noMic: true,
            sup: { tier: 'SILVER', div: 3, isAvoided: true },
        });
        expect(byBattleTag.get('IlIllIlI#31213')).toMatchObject({
            discordName: '용이',
            tank: { tier: 'GOLD', div: 2, isPreferred: true },
            dps: { tier: 'GOLD', div: 4, isAvoided: true },
            sup: { tier: 'SILVER', div: 1 },
        });
        expect(byBattleTag.get('zzuzzu#31457')).toMatchObject({
            discordName: '뽕뽕',
            tank: { tier: 'PLATINUM', div: 3, isAvoided: true },
            dps: { tier: 'GOLD', div: 3, isAvoided: true },
            sup: { tier: 'MASTER', div: 4, isPreferred: true },
        });
    });
});

describe('parseLineToPlayer', () => {
    it('두 포지션이 비선호이면 남은 포지션을 선호로 변경한다', () => {
        const player = parseLineToPlayer('Tester#1234 다3? / 플2? / 골1');

        expect(player).toMatchObject({
            tank: { isPreferred: false, isAvoided: true },
            dps: { isPreferred: false, isAvoided: true },
            sup: { isPreferred: true, isAvoided: false },
        });
    });
});
