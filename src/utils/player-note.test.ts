import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPlayerNote, savePlayerNote } from './player-note';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('player note API', () => {
    it('로그인 사용자 본인의 개인 운영 메모를 조회한다', async () => {
        const note = {
            battleTag: 'Player#1234',
            content: '개인 참고',
            authorName: '관리자',
            updatedAt: 1,
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ note }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        )));

        await expect(fetchPlayerNote('Player#1234')).resolves.toEqual(note);
    });

    it('공개 범위 없이 개인 운영 메모만 저장한다', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
        vi.stubGlobal('fetch', fetchMock);

        await savePlayerNote('Player#1234', '개인 참고', 'csrf-token');

        expect(fetchMock).toHaveBeenCalledWith('/api/notes', expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-token' }),
            body: JSON.stringify({
                battleTag: 'Player#1234',
                content: '개인 참고',
            }),
        }));
    });
});
