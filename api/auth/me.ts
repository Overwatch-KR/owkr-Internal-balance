import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionUser } from '../_lib/auth.js';
import { disableResponseCache } from '../_lib/http.js';
import { sendUnexpectedError } from '../_lib/error.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
    disableResponseCache(res);
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
    }

    try {
        const user = getSessionUser(req);
        if (!user) return res.status(200).json({ loggedIn: false });

        return res.status(200).json({
            loggedIn: true,
            user: {
                id: user.id,
                username: user.username,
                globalName: user.globalName,
            },
            csrfToken: user.csrfToken,
        });
    } catch (error) {
        return sendUnexpectedError(res, error, '로그인 설정을 확인하지 못했습니다.');
    }
}
