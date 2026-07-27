export type NoteVisibility = 'PRIVATE' | 'ADMINS';

export interface PlayerNote {
    battleTag: string;
    content: string;
    visibility: NoteVisibility;
    authorName: string;
    updatedAt: number;
}

interface PlayerNoteResponse {
    privateNote: PlayerNote | null;
    sharedNote: PlayerNote | null;
}

/**
 * @description 로그인한 운영자가 볼 수 있는 개인·공유 메모를 조회한다.
 */
export const fetchPlayerNotes = async (battleTag: string): Promise<PlayerNoteResponse> => {
    return requestJson<PlayerNoteResponse>(`/api/notes?battleTag=${encodeURIComponent(battleTag)}`, {
        credentials: 'same-origin',
    });
};

/**
 * @description CSRF 검증을 포함해 개인 또는 관리자 공유 메모를 저장한다.
 */
export const savePlayerNote = async (
    battleTag: string,
    content: string,
    visibility: NoteVisibility,
    csrfToken: string,
): Promise<void> => {
    await requestJson('/api/notes', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ battleTag, content, visibility }),
    });
};
import { requestJson } from './api';
