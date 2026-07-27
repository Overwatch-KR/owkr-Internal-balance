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

const sortEntries = (entries: StoredUserSheetEntry[]): StoredUserSheetEntry[] => (
    entries
        .map(cleanStoredEntry)
        .sort((a, b) => (
            a.discordName.localeCompare(b.discordName, 'ko')
            || a.battleTag.localeCompare(b.battleTag)
        ))
);

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
                entries: sortEntries(currentEntries),
            });
        }

        if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'POST') {
            if (!hasValidCsrfToken(req, user)) {
                return res.status(403).json({ error: '유저 시트 저장 요청을 확인할 수 없습니다.' });
            }
        }

        if (req.method === 'PUT') {
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

        if (req.method === 'POST') {
            const body = req.body as { entries?: unknown } | undefined;
            if (!Array.isArray(body?.entries) || body.entries.length > MAX_ENTRIES) {
                return res.status(400).json({ error: '추가할 Discord 명단을 확인해 주세요.' });
            }
            const existingBattleTags = new Set(
                currentEntries.map(entry => normalizeBattleTag(entry.battleTag)),
            );
            const entries = [...currentEntries];
            const now = Date.now();
            let addedCount = 0;

            for (const raw of body.entries) {
                if (!raw || typeof raw !== 'object') {
                    return res.status(400).json({ error: '추가할 유저 정보를 확인해 주세요.' });
                }
                const source = raw as Partial<StoredUserSheetEntry>;
                const battleTag = sanitizeText(source.battleTag, 100);
                if (!battleTag.includes('#')) {
                    return res.status(400).json({
                        error: 'Discord 명단의 배틀태그 형식을 확인해 주세요.',
                    });
                }
                const normalizedBattleTag = normalizeBattleTag(battleTag);
                if (existingBattleTags.has(normalizedBattleTag)) continue;

                entries.push({
                    id: randomUUID(),
                    discordName: sanitizeText(source.discordName, 100),
                    battleTag,
                    tank: sanitizeRank(source.tank),
                    dps: sanitizeRank(source.dps),
                    support: sanitizeRank(source.support),
                    note: '',
                    createdAt: now,
                    updatedAt: now,
                    updatedByName: user.globalName ?? user.username,
                });
                existingBattleTags.add(normalizedBattleTag);
                addedCount += 1;
            }

            if (addedCount > 0) await redis.set(USER_SHEET_KEY, entries);
            return res.status(200).json({
                addedCount,
                entries: sortEntries(entries),
            });
        }

        if (req.method === 'PATCH') {
            const body = req.body as { entry?: unknown } | undefined;
            if (!body?.entry || typeof body.entry !== 'object') {
                return res.status(400).json({ error: '수정할 유저 정보를 확인해 주세요.' });
            }
            const source = body.entry as Partial<StoredUserSheetEntry>;
            const targetIndex = currentEntries.findIndex(entry => entry.id === source.id);
            if (targetIndex < 0) {
                return res.status(404).json({
                    error: '수정할 유저를 찾지 못했습니다. 시트를 새로고침해 주세요.',
                });
            }
            const battleTag = sanitizeText(source.battleTag, 100);
            if (!battleTag.includes('#')) {
                return res.status(400).json({
                    error: '배틀태그에 #과 숫자 태그를 포함해 주세요. 예: Player#1234',
                });
            }
            const normalizedBattleTag = normalizeBattleTag(battleTag);
            const isDuplicate = currentEntries.some((entry, index) => (
                index !== targetIndex
                && normalizeBattleTag(entry.battleTag) === normalizedBattleTag
            ));
            if (isDuplicate) {
                return res.status(409).json({ error: '같은 배틀태그가 이미 등록되어 있습니다.' });
            }

            const current = currentEntries[targetIndex];
            const nextEntry: StoredUserSheetEntry = {
                ...current,
                discordName: sanitizeText(source.discordName, 100),
                battleTag,
                tank: sanitizeRank(source.tank),
                dps: sanitizeRank(source.dps),
                support: sanitizeRank(source.support),
                note: sanitizeText(source.note, MAX_NOTE_LENGTH),
                updatedAt: Date.now(),
                updatedByName: user.globalName ?? user.username,
            };
            const entries = currentEntries.map((entry, index) => (
                index === targetIndex ? nextEntry : entry
            ));
            await redis.set(USER_SHEET_KEY, entries);
            return res.status(200).json({ entries: sortEntries(entries) });
        }

        res.setHeader('Allow', 'GET, PUT, PATCH, POST');
        return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
    } catch (error) {
        return sendUnexpectedError(res, error, '유저 시트 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
}
