import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { getSessionUser, hasValidCsrfToken } from '../_lib/auth.js';
import { disableResponseCache } from '../_lib/http.js';
import { getRedis } from '../_lib/redis.js';
import { sendUnexpectedError } from '../_lib/error.js';

interface StoredUserSheetEntry {
    id: string;
    discordName: string;
    battleTag: string;
    tank: string;
    dps: string;
    support: string;
    note: string;
    createdAt: number;
    updatedAt: number;
    updatedByName: string;
}

const USER_SHEET_KEY = 'user-sheet:v1';
const MAX_ENTRIES = 1000;
const MAX_NOTE_LENGTH = 500;

const normalizeBattleTag = (value: string): string => value.trim().toLowerCase();

const sanitizeText = (value: unknown, maxLength: number): string => (
    typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

const sanitizeRank = (value: unknown): string => (
    sanitizeText(value, 50).replace(/[!★?？]/g, '').trim()
);

const cleanStoredEntry = (entry: StoredUserSheetEntry): StoredUserSheetEntry => ({
    ...entry,
    tank: sanitizeRank(entry.tank),
    dps: sanitizeRank(entry.dps),
    support: sanitizeRank(entry.support),
});

const parseEntries = (
    value: unknown,
    currentEntries: StoredUserSheetEntry[],
    actorName: string,
): StoredUserSheetEntry[] | null => {
    if (!Array.isArray(value) || value.length > MAX_ENTRIES) return null;
    const currentByBattleTag = new Map(
        currentEntries.map(entry => [normalizeBattleTag(entry.battleTag), entry]),
    );
    const seenBattleTags = new Set<string>();
    const now = Date.now();
    const entries: StoredUserSheetEntry[] = [];

    for (const raw of value) {
        if (!raw || typeof raw !== 'object') return null;
        const source = raw as Partial<StoredUserSheetEntry>;
        const battleTag = sanitizeText(source.battleTag, 100);
        if (!battleTag.includes('#')) return null;
        const normalized = normalizeBattleTag(battleTag);
        if (seenBattleTags.has(normalized)) return null;
        seenBattleTags.add(normalized);
        const current = currentByBattleTag.get(normalized);
        entries.push({
            id: current?.id ?? randomUUID(),
            discordName: sanitizeText(source.discordName, 100),
            battleTag,
            tank: sanitizeRank(source.tank),
            dps: sanitizeRank(source.dps),
            support: sanitizeRank(source.support),
            note: sanitizeText(source.note, MAX_NOTE_LENGTH),
            createdAt: current?.createdAt ?? now,
            updatedAt: now,
            updatedByName: actorName,
        });
    }
    return entries;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    disableResponseCache(res);
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ error: '로그인이 필요합니다.' });
    const redis = getRedis();
    if (!redis) return res.status(503).json({ error: '유저 시트 저장소가 아직 설정되지 않았습니다.' });

    try {
        const currentEntries = await redis.get<StoredUserSheetEntry[]>(USER_SHEET_KEY) ?? [];
        if (req.method === 'GET') {
            return res.status(200).json({
                entries: currentEntries
                    .map(cleanStoredEntry)
                    .sort((a, b) => (
                        a.discordName.localeCompare(b.discordName, 'ko')
                        || a.battleTag.localeCompare(b.battleTag)
                    )),
            });
        }

        if (req.method === 'PUT') {
            if (!hasValidCsrfToken(req, user)) {
                return res.status(403).json({ error: '유저 시트 저장 요청을 확인할 수 없습니다.' });
            }
            const body = req.body as { entries?: unknown } | undefined;
            const entries = parseEntries(
                body?.entries,
                currentEntries,
                user.globalName ?? user.username,
            );
            if (!entries) {
                return res.status(400).json({
                    error: '중복되지 않은 올바른 배틀태그로 유저 시트를 작성해 주세요.',
                });
            }
            await redis.set(USER_SHEET_KEY, entries);
            return res.status(200).json({ entries });
        }

        res.setHeader('Allow', 'GET, PUT');
        return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
    } catch (error) {
        return sendUnexpectedError(res, error, '유저 시트 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
}
