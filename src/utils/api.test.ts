import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestJson } from './api';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('requestJson', () => {
    it('네트워크 실패를 재시도 가능한 공통 오류로 변환한다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network failed')));

        await expect(requestJson('/api/test')).rejects.toMatchObject({
            name: 'ApiError',
            status: 0,
            retryable: true,
        });
    });

    it('서버가 제공한 안전한 오류 메시지와 상태 코드를 보존한다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ error: '권한이 없습니다.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } },
        )));

        await expect(requestJson('/api/test')).rejects.toEqual(
            expect.objectContaining({
                message: '권한이 없습니다.',
                name: 'ApiError',
                status: 403,
                retryable: false,
            }),
        );
    });
});
