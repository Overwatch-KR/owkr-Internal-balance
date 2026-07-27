import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionUser, hasValidCsrfToken } from '../_lib/auth.js';
import { disableResponseCache } from '../_lib/http.js';
import { getRedis } from '../_lib/redis.js';
import { sendUnexpectedError } from '../_lib/error.js';

type NoteVisibility = 'PRIVATE' | 'ADMINS';

interface StoredNote {
    battleTag: string;
    content: string;
    visibility: NoteVisibility;
    authorId: string;
    authorName: string;
    updatedAt: number;
}

const MAX_NOTE_LENGTH = 1000;

const normalizeBattleTag = (value: string): string => value.trim().toLowerCase();

const privateKey = (userId: string, battleTag: string): string => (
    `player-note:private:${userId}:${encodeURIComponent(normalizeBattleTag(battleTag))}`
);

const sharedKey = (battleTag: string): string => (
    `player-note:admins:${encodeURIComponent(normalizeBattleTag(battleTag))}`
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    disableResponseCache(res);
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ error: '로그인이 필요합니다.' });

    const redis = getRedis();
    if (!redis) return res.status(503).json({ error: '비공개 메모 저장소가 아직 설정되지 않았습니다.' });

    try {
        if (req.method === 'GET') {
            const battleTag = typeof req.query.battleTag === 'string' ? req.query.battleTag : '';
            if (!battleTag.includes('#')) return res.status(400).json({ error: '올바른 배틀태그가 필요합니다.' });

            const [privateNote, sharedNote] = await Promise.all([
                redis.get<StoredNote>(privateKey(user.id, battleTag)),
                redis.get<StoredNote>(sharedKey(battleTag)),
            ]);
            return res.status(200).json({ privateNote, sharedNote });
        }

        if (req.method === 'PUT') {
            if (!hasValidCsrfToken(req, user)) {
                return res.status(403).json({ error: '메모 저장 요청을 확인할 수 없습니다.' });
            }

            const body = req.body as Partial<StoredNote> | undefined;
            const battleTag = typeof body?.battleTag === 'string' ? body.battleTag.trim() : '';
            const content = typeof body?.content === 'string' ? body.content.trim() : '';
            const visibility: NoteVisibility = body?.visibility === 'ADMINS' ? 'ADMINS' : 'PRIVATE';
            if (!battleTag.includes('#')) return res.status(400).json({ error: '올바른 배틀태그가 필요합니다.' });
            if (content.length > MAX_NOTE_LENGTH) {
                return res.status(400).json({ error: `메모는 ${MAX_NOTE_LENGTH}자까지 입력할 수 있습니다.` });
            }
            const key = visibility === 'PRIVATE'
                ? privateKey(user.id, battleTag)
                : sharedKey(battleTag);
            if (!content) {
                await redis.del(key);
                return res.status(200).json({ note: null });
            }

            const note: StoredNote = {
                battleTag,
                content,
                visibility,
                authorId: user.id,
                authorName: user.globalName ?? user.username,
                updatedAt: Date.now(),
            };
            await redis.set(key, note);
            return res.status(200).json({ note });
        }

        res.setHeader('Allow', 'GET, PUT');
        return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
    } catch (error) {
        return sendUnexpectedError(res, error, '메모 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
}
