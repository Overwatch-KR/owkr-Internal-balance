import { describe, expect, it } from 'vitest';
import type { UserSheetDraftEntry } from './user-sheet';
import { mergeUserSheetDrafts } from './user-sheet-merge';

const row = (
    id: string,
    values: Partial<UserSheetDraftEntry> = {},
): UserSheetDraftEntry => ({
    id,
    discordName: '유저',
    battleTag: 'Player#1234',
    tank: '다3',
    dps: '플2',
    support: '마5',
    note: '',
    ...values,
});

describe('mergeUserSheetDrafts', () => {
    it('Discord ID 변경도 다른 공용 필드처럼 병합한다', () => {
        const base = row('1', { discordUserId: '' });
        const draft = row('1', { discordUserId: '11111111111111111' });
        const latest = row('1', { note: '최신 특이사항' });

        const result = mergeUserSheetDrafts([base], [draft], [latest]);

        expect(result.conflicts).toHaveLength(0);
        expect(result.rows[0]).toMatchObject({
            discordUserId: '11111111111111111',
            note: '최신 특이사항',
        });
    });

    it('서로 다른 필드 변경은 자동 병합한다', () => {
        const base = row('1');
        const draft = row('1', { tank: '마3' });
        const latest = row('1', { note: '최신 특이사항' });

        const result = mergeUserSheetDrafts([base], [draft], [latest]);

        expect(result.conflicts).toHaveLength(0);
        expect(result.autoMergedCount).toBe(1);
        expect(result.rows[0]).toMatchObject({
            tank: '마3',
            note: '최신 특이사항',
        });
    });

    it('같은 필드의 서로 다른 변경만 충돌로 표시하고 선택값을 반영한다', () => {
        const base = row('1');
        const draft = row('1', { note: '내 초안' });
        const latest = row('1', { note: '최신 값' });
        const initial = mergeUserSheetDrafts([base], [draft], [latest]);

        expect(initial.conflicts).toEqual([
            expect.objectContaining({
                id: '1:note',
                baseValue: '',
                draftValue: '내 초안',
                latestValue: '최신 값',
            }),
        ]);
        expect(initial.rows[0].note).toBe('내 초안');

        const resolved = mergeUserSheetDrafts(
            [base],
            [draft],
            [latest],
            { '1:note': 'LATEST' },
        );
        expect(resolved.rows[0].note).toBe('최신 값');
    });

    it('내 삭제와 서버 수정이 겹치면 행 유지 여부를 선택하게 한다', () => {
        const base = row('1');
        const latest = row('1', { tank: '마1' });
        const initial = mergeUserSheetDrafts([base], [], [latest]);

        expect(initial.conflicts[0]).toMatchObject({
            id: '1:presence',
            draftValue: '행 삭제',
        });
        expect(initial.rows).toHaveLength(0);

        const resolved = mergeUserSheetDrafts(
            [base],
            [],
            [latest],
            { '1:presence': 'LATEST' },
        );
        expect(resolved.rows).toEqual([{ ...latest, discordUserId: '' }]);
    });

    it('서버 신규 행은 내 초안 뒤에 보존한다', () => {
        const base = row('1');
        const latestAdded = row('2', { battleTag: 'New#5678' });
        const result = mergeUserSheetDrafts(
            [base],
            [base],
            [base, latestAdded],
        );

        expect(result.conflicts).toHaveLength(0);
        expect(result.rows.map(entry => entry.id)).toEqual(['1', '2']);
    });
});
