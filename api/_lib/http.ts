import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * @description 프록시 헤더를 반영해 현재 요청의 공개 origin을 계산한다.
 */
export const getRequestOrigin = (req: VercelRequest): string => {
    const configuredOrigin = process.env.APP_ORIGIN?.replace(/\/$/, '');
    if (configuredOrigin) return configuredOrigin;

    const protocolHeader = req.headers['x-forwarded-proto'];
    const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : protocolHeader || 'http';
    const host = req.headers.host;
    if (!host) throw new Error('요청 host를 확인할 수 없습니다.');
    return `${protocol}://${host}`;
};

/**
 * @description API 응답이 브라우저나 중간 캐시에 저장되지 않도록 설정한다.
 */
export const disableResponseCache = (res: VercelResponse): void => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
};
