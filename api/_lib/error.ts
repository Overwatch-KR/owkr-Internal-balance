import type { VercelResponse } from '@vercel/node';

/**
 * @description 예상하지 못한 서버 오류는 로그에 남기고 클라이언트에는 안전한 메시지만 반환한다.
 */
export const sendUnexpectedError = (
    res: VercelResponse,
    error: unknown,
    message: string,
): VercelResponse => {
    console.error(message, error);
    return res.status(500).json({ error: message });
};
