import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    Fingerprint,
    Link2,
    UserPlus,
    X,
} from 'lucide-react';
import type { Player } from '../../../types';
import type { UserSheetEntry } from '../../../utils/user-sheet';
import {
    cleanDiscordUserId,
    isValidDiscordUserId,
    normalizeDiscordName,
    suggestRosterIdentities,
    type RosterIdentitySuggestion,
} from '../../../utils/player-identity';

interface RosterIdentityResolverProps {
    entries: UserSheetEntry[];
    onCancel: () => void;
    onConfirm: (players: Player[]) => void;
    players: Player[];
}

interface ResolutionDraft extends RosterIdentitySuggestion {
    discordUserId: string;
    selectedEntryId: string;
}

const MATCH_LABELS: Record<RosterIdentitySuggestion['matchKind'], string> = {
    DISCORD_ID: 'Discord ID 일치',
    BATTLE_TAG_AND_NAME: '이름·배틀태그 일치',
    BATTLE_TAG: '배틀태그 일치',
    DISCORD_NAME: '이름으로 추천',
    AMBIGUOUS: '후보 확인 필요',
    NEW: '신규 유저',
};

const makeDrafts = (
    players: Player[],
    entries: UserSheetEntry[],
): ResolutionDraft[] => suggestRosterIdentities(players, entries).map(suggestion => {
    const selectedEntry = entries.find(entry => entry.id === suggestion.selectedEntryId);
    return {
        ...suggestion,
        discordUserId: selectedEntry?.discordUserId ?? suggestion.player.discordUserId ?? '',
        selectedEntryId: suggestion.selectedEntryId ?? '',
    };
});

/**
 * @description 신규·중복 참가자의 Discord ID를 순차 팝업 없이 한 화면에서 일괄 확정한다.
 */
export function RosterIdentityResolver({
    entries,
    onCancel,
    onConfirm,
    players,
}: RosterIdentityResolverProps) {
    const [drafts, setDrafts] = useState<ResolutionDraft[]>(() => makeDrafts(players, entries));
    const [bulkText, setBulkText] = useState('');
    const [bulkMessage, setBulkMessage] = useState('');
    const entriesById = useMemo(() => new Map(entries.map(entry => [entry.id, entry])), [entries]);
    const entriesByDiscordId = useMemo(() => new Map(
        entries.flatMap(entry => (
            entry.discordUserId ? [[entry.discordUserId, entry] as const] : []
        )),
    ), [entries]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onCancel]);

    const getResolvedEntry = useCallback((draft: ResolutionDraft): UserSheetEntry | undefined => {
        const discordUserId = cleanDiscordUserId(draft.discordUserId);
        return entriesByDiscordId.get(discordUserId)
            ?? entriesById.get(draft.selectedEntryId);
    }, [entriesByDiscordId, entriesById]);

    const duplicateIds = useMemo(() => {
        const counts = new Map<string, number>();
        drafts.forEach(draft => {
            const id = cleanDiscordUserId(draft.discordUserId);
            if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
        });
        return new Set(
            [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id),
        );
    }, [drafts]);
    const duplicateEntryIds = useMemo(() => {
        const counts = new Map<string, number>();
        drafts.forEach(draft => {
            const entryId = getResolvedEntry(draft)?.id;
            if (entryId) counts.set(entryId, (counts.get(entryId) ?? 0) + 1);
        });
        return new Set(
            [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id),
        );
    }, [drafts, getResolvedEntry]);

    const getDraftError = (draft: ResolutionDraft): string => {
        const discordUserId = cleanDiscordUserId(draft.discordUserId);
        const resolvedEntry = getResolvedEntry(draft);
        if (draft.requiresDiscordUserId && !discordUserId) {
            return '신규 또는 중복 후보는 Discord ID가 필요합니다.';
        }
        if (discordUserId && !isValidDiscordUserId(discordUserId)) {
            return 'Discord ID는 17~20자리 숫자여야 합니다.';
        }
        if (discordUserId && duplicateIds.has(discordUserId)) {
            return '같은 Discord ID가 이번 명단에 두 번 입력되었습니다.';
        }
        if (resolvedEntry && duplicateEntryIds.has(resolvedEntry.id)) {
            return '같은 기존 유저가 이번 명단에 두 번 연결되었습니다.';
        }
        if (
            resolvedEntry?.discordUserId
            && discordUserId
            && resolvedEntry.discordUserId !== discordUserId
        ) {
            return '선택한 기존 유저에 다른 Discord ID가 등록되어 있습니다.';
        }
        return '';
    };

    const errors = drafts.map(getDraftError);
    const unresolvedCount = errors.filter(Boolean).length;
    const newCount = drafts.filter(draft => !getResolvedEntry(draft)).length;
    const matchedCount = drafts.length - newCount;

    const updateDraft = (
        playerId: number,
        patch: Partial<Pick<ResolutionDraft, 'discordUserId' | 'selectedEntryId'>>,
    ) => {
        setDrafts(current => current.map(draft => (
            draft.player.id === playerId ? { ...draft, ...patch } : draft
        )));
        setBulkMessage('');
    };

    const selectEntry = (draft: ResolutionDraft, entryId: string) => {
        const entry = entriesById.get(entryId);
        updateDraft(draft.player.id, {
            selectedEntryId: entryId,
            discordUserId: entry?.discordUserId ?? draft.discordUserId,
        });
    };

    const applyBulkIds = () => {
        const parsed = bulkText
            .split(/\r?\n/)
            .map(line => {
                const id = cleanDiscordUserId(line.match(/(?:<@!?)?\d{17,20}>?/)?.[0] ?? '');
                const label = line.replace(/(?:<@!?)?\d{17,20}>?/, '').trim();
                return { id, label };
            })
            .filter(item => item.id);
        if (parsed.length === 0) {
            setBulkMessage('붙여넣은 내용에서 Discord ID를 찾지 못했습니다.');
            return;
        }

        setDrafts(current => {
            const next = current.map(draft => ({ ...draft }));
            const sequentialTargets = next.filter(draft => draft.requiresDiscordUserId);
            for (const [index, item] of parsed.entries()) {
                const normalizedLabel = normalizeDiscordName(item.label);
                const labeledTarget = normalizedLabel
                    ? next.find(draft => [
                        draft.player.discordName ?? '',
                        draft.player.name,
                        draft.player.name.split('#')[0],
                    ].some(value => normalizeDiscordName(value) === normalizedLabel))
                    : undefined;
                const target = labeledTarget ?? sequentialTargets[index];
                if (!target) continue;
                target.discordUserId = item.id;
                const existing = entriesByDiscordId.get(item.id);
                if (existing) target.selectedEntryId = existing.id;
            }
            return next;
        });
        setBulkMessage(`${parsed.length}개의 Discord ID를 입력란에 반영했습니다.`);
    };

    const confirm = () => {
        if (unresolvedCount > 0) return;
        onConfirm(drafts.map(draft => {
            const discordUserId = cleanDiscordUserId(draft.discordUserId);
            const resolvedEntry = getResolvedEntry(draft);
            return {
                ...draft.player,
                discordUserId: discordUserId || resolvedEntry?.discordUserId,
                userSheetEntryId: resolvedEntry?.id
                    ?? `local-sheet-player-${draft.player.id}`,
            };
        }));
    };

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-2 backdrop-blur-sm md:p-5"
            role="presentation"
            onMouseDown={event => {
                if (event.target === event.currentTarget) onCancel();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="roster-identity-title"
                className="flex h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-surface-elevated shadow-2xl md:h-[min(880px,calc(100dvh-2.5rem))]"
            >
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 px-4 py-4 md:px-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Fingerprint size={18} className="text-cyan-300" aria-hidden="true" />
                            <h2 id="roster-identity-title" className="font-semibold text-white">
                                참가자 식별 검토
                            </h2>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            기존 유저는 자동 연결하고, 신규·중복 후보에만 Discord 고유 ID를 입력합니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-200"
                        aria-label="식별 검토 닫기"
                    >
                        <X size={17} aria-hidden="true" />
                    </button>
                </header>

                <div className="grid shrink-0 grid-cols-3 gap-2 border-b border-slate-800 px-4 py-3 md:px-6">
                    <div className="rounded-lg bg-cyan-500/[0.08] px-3 py-2">
                        <p className="text-[10px] text-cyan-400/70">기존 연결</p>
                        <p className="mt-0.5 text-sm font-semibold text-cyan-200">{matchedCount}명</p>
                    </div>
                    <div className="rounded-lg bg-violet-500/[0.08] px-3 py-2">
                        <p className="text-[10px] text-violet-400/70">신규 생성</p>
                        <p className="mt-0.5 text-sm font-semibold text-violet-200">{newCount}명</p>
                    </div>
                    <div className={`rounded-lg px-3 py-2 ${
                        unresolvedCount > 0 ? 'bg-rose-500/[0.1]' : 'bg-emerald-500/[0.08]'
                    }`}>
                        <p className={`text-[10px] ${
                            unresolvedCount > 0 ? 'text-rose-400/70' : 'text-emerald-400/70'
                        }`}>확인 필요</p>
                        <p className={`mt-0.5 text-sm font-semibold ${
                            unresolvedCount > 0 ? 'text-rose-200' : 'text-emerald-200'
                        }`}>{unresolvedCount}명</p>
                    </div>
                </div>

                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
                    <div className="mb-4 rounded-xl border border-slate-800 bg-surface p-3">
                        <label htmlFor="bulk-discord-ids" className="text-xs font-medium text-slate-300">
                            Discord ID 한 번에 붙여넣기
                        </label>
                        <p className="mt-1 text-[11px] text-slate-600">
                            `별명 123456789012345678` 형식 또는 미해결 인원 순서대로 ID를 한 줄에 하나씩 입력하세요.
                        </p>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <textarea
                                id="bulk-discord-ids"
                                value={bulkText}
                                onChange={event => setBulkText(event.target.value)}
                                rows={3}
                                placeholder={'상민 123456789012345678\nPlayer#1234 234567890123456789'}
                                className="min-h-20 flex-1 resize-y rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 font-mono text-xs text-slate-200 outline-none focus:border-cyan-400"
                                spellCheck={false}
                            />
                            <button
                                type="button"
                                onClick={applyBulkIds}
                                className="btn-ghost min-h-10 shrink-0 border border-slate-700 sm:self-end"
                            >
                                일괄 반영
                            </button>
                        </div>
                        {bulkMessage && <p className="mt-2 text-[11px] text-cyan-300">{bulkMessage}</p>}
                    </div>

                    <div className="space-y-2.5">
                        {drafts.map((draft, index) => {
                            const error = errors[index];
                            const resolvedEntry = getResolvedEntry(draft);
                            const candidates = draft.candidateEntryIds
                                .map(id => entriesById.get(id))
                                .filter((entry): entry is UserSheetEntry => Boolean(entry));
                            if (
                                resolvedEntry
                                && !candidates.some(entry => entry.id === resolvedEntry.id)
                            ) {
                                candidates.unshift(resolvedEntry);
                            }
                            return (
                                <article
                                    key={draft.player.id}
                                    className={`rounded-xl border p-3 ${
                                        error
                                            ? 'border-rose-500/30 bg-rose-500/[0.045]'
                                            : 'border-slate-800 bg-surface'
                                    }`}
                                >
                                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.9fr)_minmax(210px,1fr)]">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                {resolvedEntry
                                                    ? <Link2 size={14} className="shrink-0 text-cyan-300" aria-hidden="true" />
                                                    : <UserPlus size={14} className="shrink-0 text-violet-300" aria-hidden="true" />}
                                                <p className="truncate text-sm font-medium text-slate-100">
                                                    {draft.player.discordName || draft.player.name}
                                                </p>
                                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                                                    draft.requiresDiscordUserId
                                                        ? 'bg-amber-500/10 text-amber-300'
                                                        : 'bg-cyan-500/10 text-cyan-300'
                                                }`}>
                                                    {MATCH_LABELS[draft.matchKind]}
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate font-mono text-[11px] text-slate-600">
                                                {draft.player.name}
                                            </p>
                                        </div>

                                        <label className="grid gap-1 text-[11px] text-slate-500">
                                            시트 연결
                                            <select
                                                value={resolvedEntry?.id ?? ''}
                                                onChange={event => selectEntry(draft, event.target.value)}
                                                className="h-10 min-w-0 rounded-lg border border-slate-700 bg-slate-950/50 px-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
                                            >
                                                <option value="">신규 유저로 생성</option>
                                                {candidates.map(entry => (
                                                    <option key={entry.id} value={entry.id}>
                                                        {entry.discordName || '이름 없음'} · {entry.battleTag}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="grid gap-1 text-[11px] text-slate-500">
                                            Discord 고유 ID
                                            <input
                                                value={draft.discordUserId}
                                                onChange={event => updateDraft(draft.player.id, {
                                                    discordUserId: cleanDiscordUserId(event.target.value),
                                                })}
                                                inputMode="numeric"
                                                placeholder={draft.requiresDiscordUserId
                                                    ? '필수 · 17~20자리 숫자'
                                                    : '기존 유저는 나중에 등록 가능'}
                                                className={`h-10 min-w-0 rounded-lg border bg-slate-950/50 px-3 font-mono text-xs outline-none ${
                                                    error
                                                        ? 'border-rose-400/60 text-rose-100 focus:border-rose-300'
                                                        : 'border-slate-700 text-slate-200 focus:border-cyan-400'
                                                }`}
                                                aria-invalid={Boolean(error)}
                                            />
                                        </label>
                                    </div>
                                    <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                                        {error ? (
                                            <>
                                                <AlertCircle size={12} className="shrink-0 text-rose-300" aria-hidden="true" />
                                                <span className="text-rose-200">{error}</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={12} className="shrink-0 text-emerald-300" aria-hidden="true" />
                                                <span className="text-emerald-300">
                                                    {resolvedEntry
                                                        ? `${resolvedEntry.discordName || resolvedEntry.battleTag} 기존 데이터에 연결`
                                                        : '새 유저 시트 행으로 추가'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>

                <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-800 px-4 py-3 md:px-6">
                    <p className="text-[11px] text-slate-600">
                        ID 조회로 기존 유저가 확인되면 티어·메모는 보존하고 이름과 배틀태그만 갱신합니다.
                    </p>
                    <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={onCancel} className="btn-ghost min-h-10">
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={confirm}
                            disabled={unresolvedCount > 0}
                            className="btn-primary min-h-10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {unresolvedCount > 0 ? `${unresolvedCount}명 확인 필요` : '식별 완료'}
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
}
