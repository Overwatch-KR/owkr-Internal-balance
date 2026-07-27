import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    createClearedAuthCookies,
    getSessionUser,
    hasValidCsrfToken,
} from '../_lib/auth.js';
import { disableResponseCache } from '../_lib/http.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
    disableResponseCache(res);
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
    }

    const user = getSessionUser(req);
    if (!user || !hasValidCsrfToken(req, user)) {
        return res.status(403).json({ error: '로그아웃 요청을 확인할 수 없습니다.' });
    }

    res.setHeader('Set-Cookie', createClearedAuthCookies(req));
    return res.status(200).json({ success: true });
}
