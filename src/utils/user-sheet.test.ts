import { describe, expect, it } from 'vitest';
import { getTierScore } from '../constants';
import type { Player, Rank, Tier } from '../types';
import {
    formatUserSheetChangeSummary,
    getUserSheetChangeSummary,
    mergeDiscordPlayersIntoUserSheet,
    normalizeUserSheetBattleTag,
    parseUserSheetRows,
    validateUserSheetEntries,
    type UserSheetDraftEntry,
} from './user-sheet';

const rank = (
    tier: Tier,
    div: number,
    isPreferred = false,
    isAvoided = false,
): Rank => ({
    tier,
    div,
    score: getTierScore(tier, div),
    isPreferred,
    isAvoided,
});

const player = (name: string, discordName?: string): Player => ({
    id: 1,
    name,
    discordName,
    tank: rank('DIAMOND', 3, true),
    dps: rank('PLATINUM', 2, false, true),
    sup: rank('MASTER', 5),
});

describe('parseUserSheetRows', () => {
    it('헤더가 포함된 Google Sheets 6열을 유저 행으로 변환한다', () => {
        const rows = parseUserSheetRows([
            '디스코드 이름\t배틀태그\t탱커\t딜러\t힐러\t특이사항',
            '상민\tPlayer#1234\t다3\t플2\t마5\t마이크X',
        ].join('\n'));
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            discordName: '상민',
            battleTag: 'Player#1234',
            tank: '다3',
            dps: '플2',
            support: '마5',
            note: '마이크X',
        });
    });

    it('배틀태그 연결 시 대소문자와 바깥 공백을 무시한다', () => {
        expect(normalizeUserSheetBattleTag(' Player#1234 ')).toBe('player#1234');
    });

    it('시트 역할 티어에서는 선호·비선호 기호를 제거한다', () => {
        const rows = parseUserSheetRows('상민\tPlayer#1234\t다3!\t플2?\t마5★\t메모');
        expect(rows[0]).toMatchObject({ tank: '다3', dps: '플2', support: '마5' });
    });
});

describe('mergeDiscordPlayersIntoUserSheet', () => {
    it('신규 BattleTag는 빈 행을 재사용해 추가한다', () => {
        const blank: UserSheetDraftEntry = {
            id: 'blank',
            discordName: '',
            battleTag: '',
            tank: '',
            dps: '',
            support: '',
            note: '',
        };
        const result = mergeDiscordPlayersIntoUserSheet([blank], [player('New#1234', '새유저')]);

        expect(result).toMatchObject({ addedCount: 1, updatedCount: 0 });
        expect(result.rows[0]).toEqual({
            id: 'blank',
            discordName: '새유저',
            battleTag: 'New#1234',
            tank: '다3',
            dps: '플2',
            support: '마5',
            note: '',
        });
    });

    it('중복 BattleTag는 티어를 갱신하고 기존 특이사항을 보존한다', () => {
        const current: UserSheetDraftEntry = {
            id: 'existing',
            discordName: '옛이름',
            battleTag: 'Player#1234',
            tank: '골1',
            dps: '골2',
            support: '골3',
            note: '기존 중요 메모',
        };
        const result = mergeDiscordPlayersIntoUserSheet(
            [current],
            [player('player#1234', '새이름')],
        );

        expect(result).toMatchObject({ addedCount: 0, updatedCount: 1 });
        expect(result.rows[0]).toMatchObject({
            id: 'existing',
            discordName: '새이름',
            battleTag: 'player#1234',
            tank: '다3',
            dps: '플2',
            support: '마5',
            note: '기존 중요 메모',
        });
    });

    it('Discord 이름이 없으면 중복 행의 기존 이름을 유지한다', () => {
        const current: UserSheetDraftEntry = {
            id: 'existing',
            discordName: '유지할이름',
            battleTag: 'Player#1234',
            tank: '',
            dps: '',
            support: '',
            note: '',
        };
        const result = mergeDiscordPlayersIntoUserSheet([current], [player('Player#1234')]);
        expect(result.rows[0].discordName).toBe('유지할이름');
    });
});

describe('validateUserSheetEntries', () => {
    const draft = (id: string, battleTag: string): UserSheetDraftEntry => ({
        id,
        discordName: '유저',
        battleTag,
        tank: '',
        dps: '',
        support: '',
        note: '',
    });

    it('배틀태그 형식 오류와 대소문자를 무시한 중복을 구분한다', () => {
        const result = validateUserSheetEntries([
            draft('invalid', 'Player1234'),
            draft('duplicate-a', 'Player#1234'),
            draft('duplicate-b', ' player#1234 '),
        ]);

        expect(result.errors.get('invalid')).toBe('INVALID_BATTLE_TAG');
        expect(result.errors.get('duplicate-a')).toBe('DUPLICATE_BATTLE_TAG');
        expect(result.errors.get('duplicate-b')).toBe('DUPLICATE_BATTLE_TAG');
    });

    it('완전히 빈 행은 저장 대상과 오류 검사에서 제외한다', () => {
        const blank = draft('blank', '');
        blank.discordName = '';

        const result = validateUserSheetEntries([blank]);

        expect(result.activeRows).toHaveLength(0);
        expect(result.errors.size).toBe(0);
    });
});

describe('getUserSheetChangeSummary', () => {
    const draft = (
        id: string,
        battleTag: string,
        discordName = '유저',
    ): UserSheetDraftEntry => ({
        id,
        discordName,
        battleTag,
        tank: '다3',
        dps: '플2',
        support: '마5',
        note: '',
    });

    it('전체 인원수가 아닌 실제 추가·수정·삭제 건수를 계산한다', () => {
        const summary = getUserSheetChangeSummary(
            [
                draft('1', 'Keep#1111'),
                draft('2', 'Update#2222', '이전 이름'),
                draft('3', 'Remove#3333'),
            ],
            [
                draft('1', 'Keep#1111'),
                draft('2', 'update#2222', '새 이름'),
                draft('4', 'Add#4444'),
            ],
        );

        expect(summary).toEqual({
            addedCount: 1,
            updatedCount: 1,
            removedCount: 1,
        });
        expect(formatUserSheetChangeSummary(summary)).toBe(
            '유저 시트를 저장했습니다. (추가 1명 · 수정 1명 · 삭제 1명)',
        );
    });

    it('실제 변경이 없으면 변경 없음으로 안내한다', () => {
        const entries = [draft('1', 'Keep#1111')];
        const summary = getUserSheetChangeSummary(entries, entries);

        expect(formatUserSheetChangeSummary(summary)).toBe('변경된 내용이 없습니다.');
    });
});
