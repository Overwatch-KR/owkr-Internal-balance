import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionUser, hasValidCsrfToken } from '../_lib/auth.js';
import { sendUnexpectedError } from '../_lib/error.js';
import { disableResponseCache } from '../_lib/http.js';
import { getRedis } from '../_lib/redis.js';
import { getUserSheetBattleTagHistory } from '../_lib/user-sheet-store.js';

interface StoredNote {
    battleTag: string;
    content: string;
    entryId?: string;
    authorId: string;
    authorName: string;
    updatedAt: number;
}

const MAX_NOTE_LENGTH = 1000;
const MAX_ENTRY_ID_LENGTH = 200;

const MIGRATE_PRIVATE_NOTE_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current then
    local note = cjson.decode(current)
    note.entryId = ARGV[1]
    note.battleTag = ARGV[2]
    local encoded = cjson.encode(note)
    redis.call('SET', KEYS[1], encoded)
    for deleteIndex = 2, #KEYS do
        redis.call('DEL', KEYS[deleteIndex])
    end
    return encoded
end

for index = 2, #KEYS do
    local legacy = redis.call('GET', KEYS[index])
    if legacy then
        local note = cjson.decode(legacy)
        note.entryId = ARGV[1]
        note.battleTag = ARGV[2]
        local encoded = cjson.encode(note)
        redis.call('SET', KEYS[1], encoded)
        for deleteIndex = 2, #KEYS do
            redis.call('DEL', KEYS[deleteIndex])
        end
        return encoded
    end
end
return false
`;

const SAVE_PRIVATE_NOTE_SCRIPT = `
if ARGV[1] == '' then
    for index = 1, #KEYS do
        redis.call('DEL', KEYS[index])
    end
    return false
end

redis.call('SET', KEYS[1], ARGV[1])
for index = 2, #KEYS do
    redis.call('DEL', KEYS[index])
end
return ARGV[1]
`;

const normalizeBattleTag = (value: string): string => value.trim().toLowerCase();

const legacyPrivateKey = (userId: string, battleTag: string): string => (
    `player-note:private:${userId}:${encodeURIComponent(normalizeBattleTag(battleTag))}`
);

const entryPrivateKey = (userId: string, entryId: string): string => (
    `player-note:private:v2:${encodeURIComponent(userId)}:${encodeURIComponent(entryId)}`
);

const readEntryId = (value: unknown): string => (
    typeof value === 'string' ? value.trim().slice(0, MAX_ENTRY_ID_LENGTH) : ''
);

const getPrivateNoteKeys = async (
    userId: string,
    entryId: string,
    battleTag: string,
    redis: NonNullable<ReturnType<typeof getRedis>>,
): Promise<string[]> => {
    const history = await getUserSheetBattleTagHistory(redis, entryId, battleTag);
    return [
        entryPrivateKey(userId, entryId),
        ...history.map(tag => legacyPrivateKey(userId, tag)),
    ];
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    disableResponseCache(res);
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ error: '로그인이 필요합니다.' });

    const redis = getRedis();
    if (!redis) return res.status(503).json({ error: '개인 운영 메모 저장소가 아직 설정되지 않았습니다.' });

    try {
        if (req.method === 'GET') {
            const battleTag = typeof req.query.battleTag === 'string' ? req.query.battleTag : '';
            const entryId = readEntryId(req.query.entryId);
            if (!battleTag.includes('#')) {
                return res.status(400).json({ error: '올바른 배틀태그가 필요합니다.' });
            }

            if (!entryId) {
                const note = await redis.get<StoredNote>(legacyPrivateKey(user.id, battleTag));
                return res.status(200).json({ note });
            }

            const keys = await getPrivateNoteKeys(user.id, entryId, battleTag, redis);
            const note = await redis.eval<string[], StoredNote | false>(
                MIGRATE_PRIVATE_NOTE_SCRIPT,
                keys,
                [entryId, battleTag],
            );
            return res.status(200).json({ note: note || null });
        }

        if (req.method === 'PUT') {
            if (!hasValidCsrfToken(req, user)) {
                return res.status(403).json({ error: '개인 운영 메모 저장 요청을 확인할 수 없습니다.' });
            }

            const body = req.body as Partial<StoredNote> | undefined;
            const battleTag = typeof body?.battleTag === 'string' ? body.battleTag.trim() : '';
            const entryId = readEntryId(body?.entryId);
            const content = typeof body?.content === 'string' ? body.content.trim() : '';
            if (!battleTag.includes('#')) {
                return res.status(400).json({ error: '올바른 배틀태그가 필요합니다.' });
            }
            if (content.length > MAX_NOTE_LENGTH) {
                return res.status(400).json({
                    error: `개인 운영 메모는 ${MAX_NOTE_LENGTH}자까지 입력할 수 있습니다.`,
                });
            }

            if (!entryId) {
                const key = legacyPrivateKey(user.id, battleTag);
                if (!content) {
                    await redis.del(key);
                    return res.status(200).json({ note: null });
                }
                const note: StoredNote = {
                    battleTag,
                    content,
                    authorId: user.id,
                    authorName: user.globalName ?? user.username,
                    updatedAt: Date.now(),
                };
                await redis.set(key, note);
                return res.status(200).json({ note });
            }

            const keys = await getPrivateNoteKeys(user.id, entryId, battleTag, redis);
            const note: StoredNote | null = content
                ? {
                    entryId,
                    battleTag,
                    content,
                    authorId: user.id,
                    authorName: user.globalName ?? user.username,
                    updatedAt: Date.now(),
                }
                : null;
            const savedNote = await redis.eval<string[], StoredNote | false>(
                SAVE_PRIVATE_NOTE_SCRIPT,
                keys,
                [note ? JSON.stringify(note) : ''],
            );
            return res.status(200).json({ note: savedNote || null });
        }

        res.setHeader('Allow', 'GET, PUT');
        return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
    } catch (error) {
        return sendUnexpectedError(
            res,
            error,
            '개인 운영 메모 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        );
    }
}
