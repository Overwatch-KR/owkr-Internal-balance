import { describe, expect, it, vi } from 'vitest';
import type { UserSheetDraftEntry, UserSheetEntry } from './user-sheet';
import { saveUserSheetEntryWithPrivateNote } from './user-sheet-entry-save';

const entry: UserSheetDraftEntry = {
    id: 'sheet-1',
    discordName: '테스터',
    battleTag: 'Player#1234',
    tank: '다3',
    dps: '플2',
    support: '골1',
    note: '공유 참고',
};

const savedEntries: UserSheetEntry[] = [{
    ...entry,
    createdAt: 1,
    updatedAt: 2,
    updatedByName: '관리자',
}];

describe('saveUserSheetEntryWithPrivateNote', () => {
    it('변경된 시트 정보와 개인 운영 메모를 함께 저장한다', async () => {
        const updateEntry = vi.fn().mockResolvedValue(savedEntries);
        const saveNote = vi.fn().mockResolvedValue(undefined);

        const result = await saveUserSheetEntryWithPrivateNote({
            csrfToken: 'csrf-token',
            entry,
            previousBattleTag: entry.battleTag,
            previousPrivateNoteContent: '이전 메모',
            privateNoteContent: '  새 메모  ',
        }, { saveNote, updateEntry });

        expect(updateEntry).toHaveBeenCalledWith(entry, 'csrf-token');
        expect(saveNote).toHaveBeenCalledWith(entry.battleTag, '새 메모', 'csrf-token');
        expect(result).toEqual({
            entries: savedEntries,
            privateNoteContent: '새 메모',
        });
    });

    it('개인 운영 메모가 바뀌지 않았으면 시트 정보만 저장한다', async () => {
        const updateEntry = vi.fn().mockResolvedValue(savedEntries);
        const saveNote = vi.fn().mockResolvedValue(undefined);

        await saveUserSheetEntryWithPrivateNote({
            csrfToken: 'csrf-token',
            entry,
            previousBattleTag: entry.battleTag,
            previousPrivateNoteContent: '같은 메모',
            privateNoteContent: '같은 메모',
        }, { saveNote, updateEntry });

        expect(updateEntry).toHaveBeenCalledOnce();
        expect(saveNote).not.toHaveBeenCalled();
    });

    it('배틀태그가 바뀌면 개인 메모를 새 배틀태그로 옮기고 이전 메모를 지운다', async () => {
        const updateEntry = vi.fn().mockResolvedValue(savedEntries);
        const saveNote = vi.fn().mockResolvedValue(undefined);

        await saveUserSheetEntryWithPrivateNote({
            csrfToken: 'csrf-token',
            entry: { ...entry, battleTag: 'Renamed#5678' },
            previousBattleTag: entry.battleTag,
            previousPrivateNoteContent: '개인 메모',
            privateNoteContent: '개인 메모',
        }, { saveNote, updateEntry });

        expect(saveNote).toHaveBeenNthCalledWith(1, 'Renamed#5678', '개인 메모', 'csrf-token');
        expect(saveNote).toHaveBeenNthCalledWith(2, entry.battleTag, '', 'csrf-token');
    });
});
