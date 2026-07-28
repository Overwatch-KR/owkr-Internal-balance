import { savePlayerNote } from './player-note';
import {
    normalizeUserSheetBattleTag,
    updateUserSheetEntry,
    type UserSheetDraftEntry,
    type UserSheetEntry,
} from './user-sheet';

interface SaveUserSheetEntryWithPrivateNoteInput {
    csrfToken: string;
    entry: UserSheetDraftEntry;
    previousBattleTag: string;
    previousPrivateNoteContent: string;
    privateNoteContent: string;
}

interface SaveUserSheetEntryWithPrivateNoteDependencies {
    saveNote?: typeof savePlayerNote;
    updateEntry?: typeof updateUserSheetEntry;
}

export interface SaveUserSheetEntryWithPrivateNoteResult {
    entries: UserSheetEntry[];
    privateNoteContent: string;
}

/**
 * @description 유저 시트 한 행과 로그인 운영자의 개인 메모를 하나의 저장 동작으로 반영한다.
 */
export const saveUserSheetEntryWithPrivateNote = async (
    input: SaveUserSheetEntryWithPrivateNoteInput,
    dependencies: SaveUserSheetEntryWithPrivateNoteDependencies = {},
): Promise<SaveUserSheetEntryWithPrivateNoteResult> => {
    const updateEntry = dependencies.updateEntry ?? updateUserSheetEntry;
    const saveNote = dependencies.saveNote ?? savePlayerNote;
    const privateNoteContent = input.privateNoteContent.trim();
    const previousPrivateNoteContent = input.previousPrivateNoteContent.trim();
    const battleTagChanged = (
        normalizeUserSheetBattleTag(input.previousBattleTag)
        !== normalizeUserSheetBattleTag(input.entry.battleTag)
    );
    const privateNoteChanged = privateNoteContent !== previousPrivateNoteContent;

    const persistPrivateNote = async (): Promise<void> => {
        if (!privateNoteChanged && !battleTagChanged) return;
        await saveNote(input.entry.battleTag, privateNoteContent, input.csrfToken);
        if (battleTagChanged) {
            await saveNote(input.previousBattleTag, '', input.csrfToken);
        }
    };

    const [entries] = await Promise.all([
        updateEntry(input.entry, input.csrfToken),
        persistPrivateNote(),
    ]);

    return { entries, privateNoteContent };
};
