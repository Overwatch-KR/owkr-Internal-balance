import type { VercelRequest, VercelResponse } from '@vercel/node';
import { disableResponseCache } from '../_lib/http.js';
import { getRedis } from '../_lib/redis.js';
import { getPublicScrims, submitSatisfaction, submitVote } from '../_lib/scrim-store.js';

const errorForResult = (result: string): string => ({
    INVALID: '입력 내용을 확인해 주세요.', CLOSED: '참여 가능 시간이 지났거나 아직 시작되지 않았습니다.', DUPLICATE: '이미 영웅 밴 투표를 제출했습니다.', NOT_FOUND: '유효하지 않거나 비활성화된 참여 링크입니다.',
}[result] ?? '요청을 처리하지 못했습니다.');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    disableResponseCache(res);
    const redis = getRedis();
    if (!redis) return res.status(503).json({ error: '참여 저장소가 아직 설정되지 않았습니다.' });
    const token = typeof req.query.token === 'string' ? req.query.token : typeof req.body?.token === 'string' ? req.body.token : '';
    if (!token) return res.status(400).json({ error: '참여 링크를 확인해 주세요.' });
    if (req.method === 'GET') {
        const participation = await getPublicScrims(redis, token);
        return participation ? res.status(200).json({ serverNow: Date.now(), ...participation }) : res.status(404).json({ error: '유효하지 않거나 비활성화된 참여 링크입니다.' });
    }
    if (req.method === 'POST') {
        const body = req.body as Record<string, unknown>;
        const result = body.action === 'vote'
            ? await submitVote(redis, token, String(body.scrimId ?? ''), body.participantId, body.heroIds)
            : body.action === 'satisfaction'
                ? await submitSatisfaction(redis, token, String(body.scrimId ?? ''), body.response)
                : 'INVALID';
        return result === 'OK' ? res.status(201).json({ ok: true, serverNow: Date.now() }) : res.status(result === 'NOT_FOUND' ? 404 : result === 'DUPLICATE' ? 409 : 400).json({ error: errorForResult(result) });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
}
