import { formatRank } from '../constants';
import type { Player } from '../types';
import { requestJson } from './api';

export interface UserSheetEntry {
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

export interface UserSheetChangeSummary {
    addedCount: number;
    removedCount: number;
    updatedCount: number;
}

export type UserSheetDraftEntry = Pick<
    UserSheetEntry,
    'id' | 'discordName' | 'battleTag' | 'tank' | 'dps' | 'support' | 'note'
>;

export type UserSheetValidationError = 'INVALID_BATTLE_TAG' | 'DUPLICATE_BATTLE_TAG';

const USER_SHEET_DRAFT_FIELDS: ReadonlyArray<keyof UserSheetDraftEntry> = [
    'discordName',
    'battleTag',
    'tank',
    'dps',
    'support',
    'note',
];

export const isActiveUserSheetEntry = (entry: UserSheetDraftEntry): boolean => (
    USER_SHEET_DRAFT_FIELDS.some(field => entry[field].trim())
);

/**
 * @description 저장 대상 행을 골라 배틀태그 형식과 중복 여부를 한 번에 검사한다.
 */
export const validateUserSheetEntries = (rows: UserSheetDraftEntry[]): {
    activeRows: UserSheetDraftEntry[];
    errors: Map<string, UserSheetValidationError>;
} => {
    const activeRows = rows.filter(isActiveUserSheetEntry);
    const counts = new Map<string, number>();
    for (const row of activeRows) {
        const key = normalizeUserSheetBattleTag(row.battleTag);
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const errors = new Map<string, UserSheetValidationError>();
    for (const row of activeRows) {
        if (!row.battleTag.includes('#')) {
            errors.set(row.id, 'INVALID_BATTLE_TAG');
        } else if ((counts.get(normalizeUserSheetBattleTag(row.battleTag)) ?? 0) > 1) {
            errors.set(row.id, 'DUPLICATE_BATTLE_TAG');
        }
    }

    return { activeRows, errors };
};

/**
 * @description 유저 시트 역할 티어에서 선호·비선호 기호를 제거한다.
 */
export const cleanUserSheetRank = (value: string): string => (
    value.replace(/[!★?？]/g, '').trim()
);

/**
 * @description 관리자들이 함께 사용하는 유저 정보 시트를 가져온다.
 */
export const fetchUserSheet = async (): Promise<UserSheetEntry[]> => {
    const body = await requestJson<{ entries: UserSheetEntry[] }>('/api/user-sheet', {
        credentials: 'same-origin',
    });
    return body.entries;
};

/**
 * @description 편집된 전체 유저 시트를 CSRF 검증과 함께 저장한다.
 */
export const saveUserSheet = async (
    entries: UserSheetDraftEntry[],
    csrfToken: string,
): Promise<UserSheetEntry[]> => {
    const body = await requestJson<{ entries: UserSheetEntry[] }>('/api/user-sheet', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ entries }),
    });
    return body.entries;
};

/**
 * @description 상세 화면에서 수정한 유저 한 명만 저장해 다른 행의 동시 변경을 보존한다.
 */
export const updateUserSheetEntry = async (
    entry: UserSheetDraftEntry,
    csrfToken: string,
): Promise<UserSheetEntry[]> => {
    const body = await requestJson<{ entries: UserSheetEntry[] }>('/api/user-sheet', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ entry }),
    });
    return body.entries;
};

/**
 * @description Google Sheets에서 복사한 6개 열을 유저 시트 행으로 변환한다.
 */
export const parseUserSheetRows = (text: string): UserSheetDraftEntry[] => {
    const lines = text.replace(/\r/g, '').split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    const headerAliases = ['디스코드', '배틀태그', '탱커', '딜러', '힐러', '특이사항'];
    const firstCells = lines[0].split('\t').map(cell => cell.trim().toLowerCase());
    const hasHeader = firstCells.some(cell => headerAliases.some(alias => cell.includes(alias)));
    return lines.slice(hasHeader ? 1 : 0).map((line, index) => {
        const [discordName = '', battleTag = '', tank = '', dps = '', support = '', note = ''] = line.split('\t');
        return {
            id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            discordName: discordName.trim(),
            battleTag: battleTag.trim(),
            tank: cleanUserSheetRank(tank),
            dps: cleanUserSheetRank(dps),
            support: cleanUserSheetRank(support),
            note: note.trim(),
        };
    });
};

export const normalizeUserSheetBattleTag = (value: string): string => value.trim().toLowerCase();

const USER_SHEET_COMPARISON_FIELDS: ReadonlyArray<
    keyof Pick<UserSheetDraftEntry, 'discordName' | 'battleTag' | 'tank' | 'dps' | 'support' | 'note'>
> = ['discordName', 'battleTag', 'tank', 'dps', 'support', 'note'];

/**
 * @description 저장 전후의 실제 추가·수정·삭제 건수를 계산한다.
 */
export const getUserSheetChangeSummary = (
    previousEntries: UserSheetDraftEntry[],
    nextEntries: UserSheetDraftEntry[],
): UserSheetChangeSummary => {
    const previousByBattleTag = new Map(
        previousEntries.map(entry => [normalizeUserSheetBattleTag(entry.battleTag), entry]),
    );
    const nextByBattleTag = new Map(
        nextEntries.map(entry => [normalizeUserSheetBattleTag(entry.battleTag), entry]),
    );
    let addedCount = 0;
    let removedCount = 0;
    let updatedCount = 0;

    for (const [battleTag, entry] of nextByBattleTag) {
        const previous = previousByBattleTag.get(battleTag);
        if (!previous) {
            addedCount += 1;
        } else if (USER_SHEET_COMPARISON_FIELDS.some(field => previous[field] !== entry[field])) {
            updatedCount += 1;
        }
    }
    for (const battleTag of previousByBattleTag.keys()) {
        if (!nextByBattleTag.has(battleTag)) removedCount += 1;
    }

    return { addedCount, removedCount, updatedCount };
};

/**
 * @description 시트 변경 건수를 저장 완료 토스트용 문장으로 바꾼다.
 */
export const formatUserSheetChangeSummary = ({
    addedCount,
    removedCount,
    updatedCount,
}: UserSheetChangeSummary): string => {
    const changes = [
        addedCount > 0 ? `추가 ${addedCount}명` : '',
        updatedCount > 0 ? `수정 ${updatedCount}명` : '',
        removedCount > 0 ? `삭제 ${removedCount}명` : '',
    ].filter(Boolean);
    return changes.length > 0
        ? `유저 시트를 저장했습니다. (${changes.join(' · ')})`
        : '변경된 내용이 없습니다.';
};

export interface UserSheetMergeResult {
    rows: UserSheetDraftEntry[];
    addedCount: number;
    updatedCount: number;
}

const isBlankDraftEntry = (entry: UserSheetDraftEntry): boolean => (
    !entry.discordName.trim()
    && !entry.battleTag.trim()
    && !entry.tank.trim()
    && !entry.dps.trim()
    && !entry.support.trim()
    && !entry.note.trim()
);

const rankToSheetText = (player: Player, role: 'tank' | 'dps' | 'sup'): string => (
    cleanUserSheetRank(formatRank(player[role]))
);

/**
 * @description Discord 파싱 결과를 BattleTag 기준으로 신규 추가하거나 기존 시트 행에 병합한다.
 */
export const mergeDiscordPlayersIntoUserSheet = (
    currentRows: UserSheetDraftEntry[],
    players: Player[],
): UserSheetMergeResult => {
    const rows = currentRows.map(row => ({ ...row }));
    const indexByBattleTag = new Map<string, number>();
    rows.forEach((row, index) => {
        const key = normalizeUserSheetBattleTag(row.battleTag);
        if (key) indexByBattleTag.set(key, index);
    });
    let addedCount = 0;
    let updatedCount = 0;

    for (const player of players) {
        const key = normalizeUserSheetBattleTag(player.name);
        const existingIndex = indexByBattleTag.get(key);
        const nextValues = {
            battleTag: player.name.trim(),
            tank: rankToSheetText(player, 'tank'),
            dps: rankToSheetText(player, 'dps'),
            support: rankToSheetText(player, 'sup'),
        };

        if (existingIndex !== undefined) {
            const current = rows[existingIndex];
            rows[existingIndex] = {
                ...current,
                ...nextValues,
                discordName: player.discordName?.trim() || current.discordName,
                note: current.note,
            };
            updatedCount += 1;
            continue;
        }

        const blankIndex = rows.findIndex(isBlankDraftEntry);
        const newEntry: UserSheetDraftEntry = {
            id: blankIndex >= 0
                ? rows[blankIndex].id
                : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            discordName: player.discordName?.trim() ?? '',
            ...nextValues,
            note: '',
        };
        if (blankIndex >= 0) rows[blankIndex] = newEntry;
        else rows.push(newEntry);
        indexByBattleTag.set(key, blankIndex >= 0 ? blankIndex : rows.length - 1);
        addedCount += 1;
    }

    return { rows, addedCount, updatedCount };
};
