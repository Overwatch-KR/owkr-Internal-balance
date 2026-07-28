import { requestJson } from './api';

export interface PlayerNote {
    battleTag: string;
    content: string;
    authorName: string;
    updatedAt: number;
}

interface PlayerNoteResponse {
    note: PlayerNote | null;
}

/**
 * @description 로그인한 운영자 본인만 볼 수 있는 개인 운영 메모를 조회한다.
 */
export const fetchPlayerNote = async (battleTag: string): Promise<PlayerNote | null> => {
    const response = await requestJson<PlayerNoteResponse>(`/api/notes?battleTag=${encodeURIComponent(battleTag)}`, {
        credentials: 'same-origin',
    });
    return response.note;
};

/**
 * @description CSRF 검증을 포함해 로그인한 운영자의 개인 운영 메모를 저장한다.
 */
export const savePlayerNote = async (
    battleTag: string,
    content: string,
    csrfToken: string,
): Promise<void> => {
    await requestJson('/api/notes', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ battleTag, content }),
    });
};
