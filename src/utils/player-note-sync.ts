export interface PlayerNoteSyncEvent<T> {
    cacheScope: string;
    note?: T | null;
    referenceKey?: string;
    type: 'CLEAR' | 'INVALIDATE' | 'UPDATE';
}

interface PlayerNoteSyncEnvelope<T> extends PlayerNoteSyncEvent<T> {
    sourceId: string;
    version: 1;
}

export interface PlayerNoteSync<T> {
    close: () => void;
    ensure: () => void;
    publish: (event: PlayerNoteSyncEvent<T>) => void;
}

const PLAYER_NOTE_SYNC_CHANNEL = 'owkr-player-note-cache:v1';

/**
 * @description 개인 메모 캐시 이벤트를 같은 출처의 다른 브라우저 탭으로 전달한다.
 */
export const createPlayerNoteSync = <T>(
    onMessage: (event: PlayerNoteSyncEvent<T>) => void,
): PlayerNoteSync<T> => {
    const sourceId = Math.random().toString(36).slice(2);
    let channel: BroadcastChannel | null = null;

    const handleMessage = (event: MessageEvent<unknown>): void => {
        const message = event.data as Partial<PlayerNoteSyncEnvelope<T>> | null;
        if (
            !message
            || message.version !== 1
            || message.sourceId === sourceId
            || typeof message.cacheScope !== 'string'
            || (
                message.type !== 'CLEAR'
                && message.type !== 'INVALIDATE'
                && message.type !== 'UPDATE'
            )
        ) {
            return;
        }
        if (
            message.type !== 'CLEAR'
            && typeof message.referenceKey !== 'string'
        ) {
            return;
        }
        onMessage({
            type: message.type,
            cacheScope: message.cacheScope,
            referenceKey: message.referenceKey,
            note: message.note,
        });
    };

    const close = (): void => {
        channel?.close();
        channel = null;
    };

    const ensure = (): void => {
        if (channel || typeof window === 'undefined' || !window.BroadcastChannel) return;
        try {
            channel = new window.BroadcastChannel(PLAYER_NOTE_SYNC_CHANNEL);
            channel.addEventListener('message', handleMessage);
        } catch {
            close();
        }
    };

    const publish = (event: PlayerNoteSyncEvent<T>): void => {
        ensure();
        try {
            channel?.postMessage({
                ...event,
                sourceId,
                version: 1,
            } satisfies PlayerNoteSyncEnvelope<T>);
        } catch {
            close();
        }
    };

    return { close, ensure, publish };
};
