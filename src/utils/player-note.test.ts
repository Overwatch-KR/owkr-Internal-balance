import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    clearPlayerNoteCache,
    fetchPlayerNote,
    getCachedPlayerNote,
    invalidatePlayerNoteCache,
    savePlayerNote,
    subscribePlayerNote,
} from './player-note';

const reference = {
    battleTag: 'Player#1234',
    entryId: 'sheet-row-1',
};
const note = {
    battleTag: 'Player#1234',
    entryId: 'sheet-row-1',
    content: '개인 참고',
    authorName: '관리자',
    updatedAt: 1,
};

class FakeBroadcastChannel {
    static instances: FakeBroadcastChannel[] = [];
    readonly postMessage = vi.fn();
    private listener?: (event: MessageEvent<unknown>) => void;

    constructor(readonly name: string) {
        FakeBroadcastChannel.instances.push(this);
    }

    addEventListener(
        type: string,
        listener: (event: MessageEvent<unknown>) => void,
    ): void {
        if (type === 'message') this.listener = listener;
    }

    close(): void {
        this.listener = undefined;
    }

    emit(data: unknown): void {
        this.listener?.({ data } as MessageEvent<unknown>);
    }
}

afterEach(() => {
    clearPlayerNoteCache();
    FakeBroadcastChannel.instances = [];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('player note API', () => {
    it('행 ID를 포함해 로그인 사용자 본인의 개인 운영 메모를 조회한다', async () => {
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(
            JSON.stringify({ note }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        )));
        vi.stubGlobal('fetch', fetchMock);

        await expect(fetchPlayerNote(reference, {
            cacheScope: 'session-1',
        })).resolves.toEqual(note);
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/notes?battleTag=Player%231234&entryId=sheet-row-1',
            { credentials: 'same-origin' },
        );
    });

    it('동일 메모의 동시에 진행 중인 조회 요청을 하나로 합친다', async () => {
        let resolveResponse: ((response: Response) => void) | undefined;
        const fetchMock = vi.fn().mockReturnValue(new Promise<Response>((resolve) => {
            resolveResponse = resolve;
        }));
        vi.stubGlobal('fetch', fetchMock);

        const first = fetchPlayerNote(reference, { cacheScope: 'session-1' });
        const second = fetchPlayerNote(reference, { cacheScope: 'session-1' });
        expect(fetchMock).toHaveBeenCalledOnce();

        resolveResponse?.(new Response(
            JSON.stringify({ note }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        ));
        await expect(Promise.all([first, second])).resolves.toEqual([note, note]);
    });

    it('캐시된 메모는 모달 재진입에서도 추가 요청 없이 반환한다', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ note }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        ));
        vi.stubGlobal('fetch', fetchMock);

        await fetchPlayerNote(reference, { cacheScope: 'session-1' });
        await fetchPlayerNote(reference, { cacheScope: 'session-1' });

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(getCachedPlayerNote(reference, 'session-1')?.note).toEqual(note);
    });

    it('TTL이 지난 캐시는 즉시 반환하면서 백그라운드 재검증한다', async () => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(
            JSON.stringify({ note }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        )));
        vi.stubGlobal('fetch', fetchMock);
        await fetchPlayerNote(reference, { cacheScope: 'session-1' });

        now.mockReturnValue(61_001);
        await expect(fetchPlayerNote(reference, {
            cacheScope: 'session-1',
        })).resolves.toEqual(note);

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('수동 무효화 후에는 메모를 다시 조회한다', async () => {
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(
            JSON.stringify({ note }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        )));
        vi.stubGlobal('fetch', fetchMock);

        await fetchPlayerNote(reference, { cacheScope: 'session-1' });
        invalidatePlayerNoteCache(reference, 'session-1');
        await fetchPlayerNote(reference, {
            cacheScope: 'session-1',
            force: true,
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('개인 메모만 저장하고 성공 응답으로 캐시를 즉시 갱신한다', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ note }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        ));
        vi.stubGlobal('fetch', fetchMock);

        await savePlayerNote(reference, '개인 참고', 'csrf-token');

        expect(fetchMock).toHaveBeenCalledWith('/api/notes', expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-token' }),
            body: JSON.stringify({
                battleTag: 'Player#1234',
                entryId: 'sheet-row-1',
                content: '개인 참고',
            }),
        }));
        expect(getCachedPlayerNote(reference, 'csrf-token')?.note).toEqual(note);
    });

    it('다른 탭의 저장값을 같은 사용자 캐시와 구독 화면에 즉시 반영한다', () => {
        vi.stubGlobal('window', { BroadcastChannel: FakeBroadcastChannel });
        const listener = vi.fn();
        const unsubscribe = subscribePlayerNote(reference, 'user-1', listener);
        const remoteNote = { ...note, content: '다른 탭 저장값', updatedAt: 2 };

        FakeBroadcastChannel.instances[0].emit({
            type: 'UPDATE',
            version: 1,
            sourceId: 'another-tab',
            cacheScope: 'user-1',
            referenceKey: 'entry:sheet-row-1',
            note: remoteNote,
        });

        expect(listener).toHaveBeenCalledWith(remoteNote);
        expect(getCachedPlayerNote(reference, 'user-1')?.note).toEqual(remoteNote);
        unsubscribe();
    });

    it('다른 탭 저장 전에 시작한 오래된 조회 응답이 최신 캐시를 덮지 않는다', async () => {
        vi.stubGlobal('window', { BroadcastChannel: FakeBroadcastChannel });
        let resolveResponse: ((response: Response) => void) | undefined;
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>((resolve) => {
            resolveResponse = resolve;
        })));
        const pending = fetchPlayerNote(reference, { cacheScope: 'user-1' });
        const remoteNote = { ...note, content: '최신 탭 저장값', updatedAt: 3 };

        FakeBroadcastChannel.instances[0].emit({
            type: 'UPDATE',
            version: 1,
            sourceId: 'another-tab',
            cacheScope: 'user-1',
            referenceKey: 'entry:sheet-row-1',
            note: remoteNote,
        });
        resolveResponse?.(new Response(
            JSON.stringify({ note }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        ));

        await expect(pending).resolves.toEqual(remoteNote);
        expect(getCachedPlayerNote(reference, 'user-1')?.note).toEqual(remoteNote);
    });
});
