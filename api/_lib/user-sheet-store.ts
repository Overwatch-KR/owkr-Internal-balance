import { randomUUID } from 'node:crypto';
import type { Redis } from '@upstash/redis';

export interface StoredUserSheetEntry {
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
    battleTagHistory: string[];
}

export type PublicUserSheetEntry = Omit<StoredUserSheetEntry, 'battleTagHistory'>;

export interface UserSheetSnapshot {
    entries: PublicUserSheetEntry[];
    sheetVersion: number;
}

export type UserSheetMutationResult =
    | { status: 'OK'; snapshot: UserSheetSnapshot; addedCount?: number }
    | { status: 'CONFLICT' | 'DUPLICATE' | 'INVALID' | 'NOT_FOUND' };

const LEGACY_USER_SHEET_KEY = 'user-sheet:v1';
const USER_SHEET_ENTRIES_KEY = 'user-sheet:v2:entries';
const USER_SHEET_BATTLE_TAGS_KEY = 'user-sheet:v2:battle-tags';
const USER_SHEET_VERSION_KEY = 'user-sheet:v2:version';
const MAX_ENTRIES = 1000;
const MAX_NOTE_LENGTH = 500;

const MIGRATE_USER_SHEET_SCRIPT = `
if redis.call('EXISTS', KEYS[4]) == 1 then
    redis.call('DEL', KEYS[1])
    return 0
end

local legacy = redis.call('GET', KEYS[1])
local count = 0
if legacy then
    local decoded = cjson.decode(legacy)
    for _, entry in ipairs(decoded) do
        if entry.id and entry.battleTag then
            entry.battleTagHistory = entry.battleTagHistory or { entry.battleTag }
            local normalized = string.lower(string.gsub(entry.battleTag, '^%s*(.-)%s*$', '%1'))
            redis.call('HSET', KEYS[2], entry.id, cjson.encode(entry))
            redis.call('HSET', KEYS[3], normalized, entry.id)
            count = count + 1
        end
    end
end

redis.call('SET', KEYS[4], count > 0 and 1 or 0)
redis.call('DEL', KEYS[1])
return count
`;

const READ_USER_SHEET_SCRIPT = `
local values = redis.call('HVALS', KEYS[1])
local entries = {}
for _, value in ipairs(values) do
    table.insert(entries, cjson.decode(value))
end
local version = tonumber(redis.call('GET', KEYS[2]) or '0')
return cjson.encode({ entries = entries, sheetVersion = version })
`;

const REPLACE_USER_SHEET_SCRIPT = `
local currentVersion = tonumber(redis.call('GET', KEYS[3]) or '0')
if currentVersion ~= tonumber(ARGV[1]) then
    return cjson.encode({ status = 'CONFLICT' })
end

local entries = cjson.decode(ARGV[2])
redis.call('DEL', KEYS[1])
redis.call('DEL', KEYS[2])
for _, entry in ipairs(entries) do
    redis.call('HSET', KEYS[1], entry.id, cjson.encode(entry))
    local normalized = string.lower(string.gsub(entry.battleTag, '^%s*(.-)%s*$', '%1'))
    redis.call('HSET', KEYS[2], normalized, entry.id)
end
local nextVersion = redis.call('INCR', KEYS[3])
return cjson.encode({ status = 'OK', sheetVersion = nextVersion })
`;

const UPDATE_USER_SHEET_ENTRY_SCRIPT = `
local currentJson = redis.call('HGET', KEYS[1], ARGV[1])
if not currentJson then
    return cjson.encode({ status = 'NOT_FOUND' })
end

local current = cjson.decode(currentJson)
if tonumber(current.updatedAt) ~= tonumber(ARGV[2]) then
    return cjson.encode({ status = 'CONFLICT' })
end

local duplicateId = redis.call('HGET', KEYS[2], ARGV[3])
if duplicateId and duplicateId ~= ARGV[1] then
    return cjson.encode({ status = 'DUPLICATE' })
end

local previousNormalized = string.lower(string.gsub(current.battleTag, '^%s*(.-)%s*$', '%1'))
if previousNormalized ~= ARGV[3] then
    redis.call('HDEL', KEYS[2], previousNormalized)
end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[4])
redis.call('HSET', KEYS[2], ARGV[3], ARGV[1])
local nextVersion = redis.call('INCR', KEYS[3])
return cjson.encode({ status = 'OK', sheetVersion = nextVersion })
`;

const ADD_USER_SHEET_ENTRIES_SCRIPT = `
local candidates = cjson.decode(ARGV[1])
local addedCount = 0
for _, candidate in ipairs(candidates) do
    if not redis.call('HGET', KEYS[2], candidate.normalizedBattleTag) then
        redis.call('HSET', KEYS[1], candidate.entry.id, cjson.encode(candidate.entry))
        redis.call('HSET', KEYS[2], candidate.normalizedBattleTag, candidate.entry.id)
        addedCount = addedCount + 1
    end
end

local version = tonumber(redis.call('GET', KEYS[3]) or '0')
if addedCount > 0 then
    version = redis.call('INCR', KEYS[3])
end
return cjson.encode({ status = 'OK', addedCount = addedCount, sheetVersion = version })
`;

const normalizeBattleTag = (value: string): string => value.trim().toLowerCase();

const sanitizeText = (value: unknown, maxLength: number): string => (
    typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

const sanitizeRank = (value: unknown): string => (
    sanitizeText(value, 50).replace(/[!★?？]/g, '').trim()
);

const uniqueBattleTags = (values: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
        const battleTag = sanitizeText(value, 100);
        const normalized = normalizeBattleTag(battleTag);
        if (!battleTag || seen.has(normalized)) continue;
        seen.add(normalized);
        result.push(battleTag);
    }
    return result;
};

const cleanStoredEntry = (entry: StoredUserSheetEntry): StoredUserSheetEntry => ({
    ...entry,
    tank: sanitizeRank(entry.tank),
    dps: sanitizeRank(entry.dps),
    support: sanitizeRank(entry.support),
    battleTagHistory: uniqueBattleTags([
        ...(Array.isArray(entry.battleTagHistory) ? entry.battleTagHistory : []),
        entry.battleTag,
    ]),
});

const toPublicEntry = (entry: StoredUserSheetEntry): PublicUserSheetEntry => ({
    id: entry.id,
    discordName: entry.discordName,
    battleTag: entry.battleTag,
    tank: entry.tank,
    dps: entry.dps,
    support: entry.support,
    note: entry.note,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    updatedByName: entry.updatedByName,
});

const sortEntries = (entries: StoredUserSheetEntry[]): StoredUserSheetEntry[] => (
    entries
        .map(cleanStoredEntry)
        .sort((a, b) => (
            a.discordName.localeCompare(b.discordName, 'ko')
            || a.battleTag.localeCompare(b.battleTag)
        ))
);

const toPublicSnapshot = (
    entries: StoredUserSheetEntry[],
    sheetVersion: number,
): UserSheetSnapshot => ({
    entries: sortEntries(entries).map(toPublicEntry),
    sheetVersion,
});

const hasSameEditableFields = (
    current: StoredUserSheetEntry,
    next: Pick<
        StoredUserSheetEntry,
        'discordName' | 'battleTag' | 'tank' | 'dps' | 'support' | 'note'
    >,
): boolean => (
    current.discordName === next.discordName
    && current.battleTag === next.battleTag
    && current.tank === next.tank
    && current.dps === next.dps
    && current.support === next.support
    && current.note === next.note
);

const parseReplacementEntries = (
    value: unknown,
    currentEntries: StoredUserSheetEntry[],
    actorName: string,
): StoredUserSheetEntry[] | null => {
    if (!Array.isArray(value) || value.length > MAX_ENTRIES) return null;
    const currentById = new Map(currentEntries.map(entry => [entry.id, entry]));
    const currentByBattleTag = new Map(
        currentEntries.map(entry => [normalizeBattleTag(entry.battleTag), entry]),
    );
    const seenBattleTags = new Set<string>();
    const seenIds = new Set<string>();
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

        const sourceId = sanitizeText(source.id, 200);
        const current = currentById.get(sourceId) ?? currentByBattleTag.get(normalized);
        const id = current?.id ?? randomUUID();
        if (seenIds.has(id)) return null;
        seenIds.add(id);

        const editableFields = {
            discordName: sanitizeText(source.discordName, 100),
            battleTag,
            tank: sanitizeRank(source.tank),
            dps: sanitizeRank(source.dps),
            support: sanitizeRank(source.support),
            note: sanitizeText(source.note, MAX_NOTE_LENGTH),
        };
        const unchanged = current ? hasSameEditableFields(current, editableFields) : false;
        entries.push({
            id,
            ...editableFields,
            createdAt: current?.createdAt ?? now,
            updatedAt: unchanged && current
                ? current.updatedAt
                : Math.max(now, (current?.updatedAt ?? 0) + 1),
            updatedByName: unchanged && current ? current.updatedByName : actorName,
            battleTagHistory: uniqueBattleTags([
                ...(current?.battleTagHistory ?? []),
                ...(current ? [current.battleTag] : []),
                battleTag,
            ]),
        });
    }
    return entries;
};

const readStoredUserSheet = async (
    redis: Redis,
): Promise<{ entries: StoredUserSheetEntry[]; sheetVersion: number }> => {
    const snapshot = await redis.eval<[], {
        entries: StoredUserSheetEntry[];
        sheetVersion: number;
    }>(
        READ_USER_SHEET_SCRIPT,
        [USER_SHEET_ENTRIES_KEY, USER_SHEET_VERSION_KEY],
        [],
    );
    return {
        entries: Array.isArray(snapshot.entries) ? snapshot.entries.map(cleanStoredEntry) : [],
        sheetVersion: Number(snapshot.sheetVersion) || 0,
    };
};

/**
 * @description 기존 배열 저장소를 행 단위 Hash와 버전 키로 한 번만 원자 이관한다.
 */
export const ensureUserSheetStorage = async (redis: Redis): Promise<void> => {
    await redis.eval(
        MIGRATE_USER_SHEET_SCRIPT,
        [
            LEGACY_USER_SHEET_KEY,
            USER_SHEET_ENTRIES_KEY,
            USER_SHEET_BATTLE_TAGS_KEY,
            USER_SHEET_VERSION_KEY,
        ],
        [],
    );
};

/**
 * @description 공용 시트의 행 목록과 전체 편집 충돌 감지용 버전을 같은 시점에 읽는다.
 */
export const readUserSheetSnapshot = async (redis: Redis): Promise<UserSheetSnapshot> => {
    await ensureUserSheetStorage(redis);
    const snapshot = await readStoredUserSheet(redis);
    return toPublicSnapshot(snapshot.entries, snapshot.sheetVersion);
};

/**
 * @description 전체 시트를 기대 버전이 일치할 때만 원자 교체한다.
 */
export const replaceUserSheet = async (
    redis: Redis,
    value: unknown,
    expectedSheetVersion: unknown,
    actorName: string,
): Promise<UserSheetMutationResult> => {
    if (
        typeof expectedSheetVersion !== 'number'
        || !Number.isSafeInteger(expectedSheetVersion)
        || expectedSheetVersion < 0
    ) {
        return { status: 'INVALID' };
    }
    await ensureUserSheetStorage(redis);
    const current = await readStoredUserSheet(redis);
    const entries = parseReplacementEntries(value, current.entries, actorName);
    if (!entries) return { status: 'INVALID' };

    const result = await redis.eval<string[], { status: 'CONFLICT' | 'OK' }>(
        REPLACE_USER_SHEET_SCRIPT,
        [USER_SHEET_ENTRIES_KEY, USER_SHEET_BATTLE_TAGS_KEY, USER_SHEET_VERSION_KEY],
        [String(expectedSheetVersion), JSON.stringify(entries)],
    );
    if (result.status !== 'OK') return { status: result.status };
    return { status: 'OK', snapshot: await readUserSheetSnapshot(redis) };
};

/**
 * @description 한 행을 기대 수정 시각이 일치할 때만 원자 갱신한다.
 */
export const updateUserSheetEntry = async (
    redis: Redis,
    value: unknown,
    expectedUpdatedAt: unknown,
    actorName: string,
): Promise<UserSheetMutationResult> => {
    if (
        !value
        || typeof value !== 'object'
        || typeof expectedUpdatedAt !== 'number'
        || !Number.isSafeInteger(expectedUpdatedAt)
    ) {
        return { status: 'INVALID' };
    }
    const source = value as Partial<StoredUserSheetEntry>;
    const id = sanitizeText(source.id, 200);
    const battleTag = sanitizeText(source.battleTag, 100);
    if (!id || !battleTag.includes('#')) return { status: 'INVALID' };

    await ensureUserSheetStorage(redis);
    const current = await redis.hget<StoredUserSheetEntry>(USER_SHEET_ENTRIES_KEY, id);
    if (!current) return { status: 'NOT_FOUND' };

    const nextEntry: StoredUserSheetEntry = {
        ...cleanStoredEntry(current),
        discordName: sanitizeText(source.discordName, 100),
        battleTag,
        tank: sanitizeRank(source.tank),
        dps: sanitizeRank(source.dps),
        support: sanitizeRank(source.support),
        note: sanitizeText(source.note, MAX_NOTE_LENGTH),
        updatedAt: Math.max(Date.now(), current.updatedAt + 1),
        updatedByName: actorName,
        battleTagHistory: uniqueBattleTags([
            ...current.battleTagHistory,
            current.battleTag,
            battleTag,
        ]),
    };
    const result = await redis.eval<string[], {
        status: 'CONFLICT' | 'DUPLICATE' | 'NOT_FOUND' | 'OK';
    }>(
        UPDATE_USER_SHEET_ENTRY_SCRIPT,
        [USER_SHEET_ENTRIES_KEY, USER_SHEET_BATTLE_TAGS_KEY, USER_SHEET_VERSION_KEY],
        [
            id,
            String(expectedUpdatedAt),
            normalizeBattleTag(battleTag),
            JSON.stringify(nextEntry),
        ],
    );
    if (result.status !== 'OK') return { status: result.status };
    return { status: 'OK', snapshot: await readUserSheetSnapshot(redis) };
};

/**
 * @description 현재 없는 BattleTag만 행 Hash와 인덱스에 원자 추가한다.
 */
export const addMissingUserSheetEntries = async (
    redis: Redis,
    value: unknown,
    actorName: string,
): Promise<UserSheetMutationResult> => {
    if (!Array.isArray(value) || value.length > MAX_ENTRIES) return { status: 'INVALID' };
    const now = Date.now();
    const candidates: Array<{
        entry: StoredUserSheetEntry;
        normalizedBattleTag: string;
    }> = [];
    for (const raw of value) {
        if (!raw || typeof raw !== 'object') return { status: 'INVALID' };
        const source = raw as Partial<StoredUserSheetEntry>;
        const battleTag = sanitizeText(source.battleTag, 100);
        if (!battleTag.includes('#')) return { status: 'INVALID' };
        candidates.push({
            normalizedBattleTag: normalizeBattleTag(battleTag),
            entry: {
                id: randomUUID(),
                discordName: sanitizeText(source.discordName, 100),
                battleTag,
                tank: sanitizeRank(source.tank),
                dps: sanitizeRank(source.dps),
                support: sanitizeRank(source.support),
                note: '',
                createdAt: now,
                updatedAt: now,
                updatedByName: actorName,
                battleTagHistory: [battleTag],
            },
        });
    }

    await ensureUserSheetStorage(redis);
    const result = await redis.eval<string[], {
        addedCount: number;
        status: 'OK';
    }>(
        ADD_USER_SHEET_ENTRIES_SCRIPT,
        [USER_SHEET_ENTRIES_KEY, USER_SHEET_BATTLE_TAGS_KEY, USER_SHEET_VERSION_KEY],
        [JSON.stringify(candidates)],
    );
    return {
        status: 'OK',
        addedCount: Number(result.addedCount) || 0,
        snapshot: await readUserSheetSnapshot(redis),
    };
};

/**
 * @description 개인 메모의 행 ID 이관에 사용할 현재·과거 BattleTag를 조회한다.
 */
export const getUserSheetBattleTagHistory = async (
    redis: Redis,
    entryId: string,
    currentBattleTag: string,
): Promise<string[]> => {
    await ensureUserSheetStorage(redis);
    const entry = await redis.hget<StoredUserSheetEntry>(
        USER_SHEET_ENTRIES_KEY,
        sanitizeText(entryId, 200),
    );
    return uniqueBattleTags([
        ...(entry?.battleTagHistory ?? []),
        ...(entry ? [entry.battleTag] : []),
        currentBattleTag,
    ]);
};
