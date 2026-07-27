import { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    FileSpreadsheet,
    Loader2,
    MessageSquareText,
    Pencil,
    Plus,
    RefreshCcw,
    Search,
    UserRound,
    X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    formatUserSheetChangeSummary,
    getUserSheetChangeSummary,
    normalizeUserSheetBattleTag,
    type UserSheetEntry,
} from '../../utils/user-sheet';
import { UserSheetEditor } from './user-sheet-editor';
import { UserSheetEntryView } from './user-sheet-entry-view';

interface UserSheetModalProps {
    csrfToken: string;
    entries: UserSheetEntry[];
    error: string | null;
    initialBattleTag?: string;
    isLoading: boolean;
    participantBattleTags: Set<string>;
    onClose: () => void;
    onEntriesChange: (entries: UserSheetEntry[], message: string) => void;
    onRetry: () => void;
    onSaveError: (message: string) => void;
}

type UserSheetMode = 'BROWSE' | 'EDIT';

/**
 * @description 유저 목록 조회와 전체 시트 편집을 분리한 관리 화면을 제공한다.
 */
export function UserSheetModal({
    csrfToken,
    entries,
    error,
    initialBattleTag,
    isLoading,
    participantBattleTags,
    onClose,
    onEntriesChange,
    onRetry,
    onSaveError,
}: UserSheetModalProps) {
    const initialEntry = initialBattleTag
        ? entries.find(entry => (
            normalizeUserSheetBattleTag(entry.battleTag)
            === normalizeUserSheetBattleTag(initialBattleTag)
        ))
        : entries[0];
    const [mode, setMode] = useState<UserSheetMode>('BROWSE');
    const [selectedId, setSelectedId] = useState<string | null>(initialEntry?.id ?? null);
    const [editorTarget, setEditorTarget] = useState<'ALL' | 'NEW'>('ALL');
    const [query, setQuery] = useState('');
    const selectedEntry = entries.find(entry => entry.id === selectedId)
        ?? (initialBattleTag
            ? entries.find(entry => (
                normalizeUserSheetBattleTag(entry.battleTag)
                === normalizeUserSheetBattleTag(initialBattleTag)
            ))
            : entries[0])
        ?? null;

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const filteredEntries = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return entries;
        return entries.filter(entry => (
            entry.discordName.toLowerCase().includes(normalizedQuery)
            || entry.battleTag.toLowerCase().includes(normalizedQuery)
            || entry.note.toLowerCase().includes(normalizedQuery)
            || entry.tank.toLowerCase().includes(normalizedQuery)
            || entry.dps.toLowerCase().includes(normalizedQuery)
            || entry.support.toLowerCase().includes(normalizedQuery)
        ));
    }, [entries, query]);

    const showMobileDetail = mode === 'EDIT' || Boolean(selectedEntry);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 p-2 backdrop-blur-sm md:p-5"
            role="presentation"
            onMouseDown={event => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <motion.section
                initial={{ opacity: 0, y: 16, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.99 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="user-sheet-title"
                className="flex h-[calc(100dvh-1rem)] w-full max-w-[1560px] flex-col overflow-hidden rounded-2xl border border-slate-700/70 bg-surface-elevated shadow-2xl md:h-[calc(100dvh-2.5rem)]"
            >
                <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 px-4 py-3 md:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                            <FileSpreadsheet size={20} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 id="user-sheet-title" className="font-semibold text-white">유저 시트</h1>
                                <span className="whitespace-nowrap rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                                    {entries.length}명
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                                배틀태그를 기준으로 유저 정보와 특이사항을 관리합니다.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {showMobileDetail && mode === 'BROWSE' && (
                            <button
                                type="button"
                                onClick={() => setSelectedId(null)}
                                className="min-h-9 rounded-lg px-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white sm:hidden"
                            >
                                목록
                            </button>
                        )}
                        {mode === 'BROWSE' && (
                            <button
                                type="button"
                                onClick={onRetry}
                                disabled={isLoading}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white disabled:cursor-wait disabled:opacity-50"
                                aria-label="유저 시트 최신 데이터 불러오기"
                                title="최신 데이터 불러오기"
                            >
                                {isLoading
                                    ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                                    : <RefreshCcw size={15} aria-hidden="true" />}
                                <span className="hidden md:inline">새로고침</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white"
                            aria-label="유저 시트 닫기"
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200 md:px-6" role="alert">
                        <span className="inline-flex items-center gap-2">
                            <AlertCircle size={14} aria-hidden="true" />
                            {error}
                        </span>
                        <button
                            type="button"
                            onClick={onRetry}
                            disabled={isLoading}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 font-medium hover:bg-amber-500/10 disabled:opacity-50"
                        >
                            {isLoading
                                ? <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                                : <RefreshCcw size={12} aria-hidden="true" />}
                            다시 불러오기
                        </button>
                    </div>
                )}

                {isLoading && entries.length === 0 ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center gap-2 text-sm text-slate-500">
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                        유저 시트를 불러오는 중
                    </div>
                ) : mode === 'EDIT' ? (
                    <UserSheetEditor
                        key={editorTarget}
                        appendEmptyRow={editorTarget === 'NEW'}
                        csrfToken={csrfToken}
                        entries={entries}
                        onCancel={() => setMode('BROWSE')}
                        onSaveError={onSaveError}
                        onSaved={(savedEntries) => {
                            onEntriesChange(
                                savedEntries,
                                formatUserSheetChangeSummary(
                                    getUserSheetChangeSummary(entries, savedEntries),
                                ),
                            );
                            const previousIndex = selectedEntry
                                ? entries.findIndex(entry => entry.id === selectedEntry.id)
                                : -1;
                            const nextSelected = editorTarget === 'NEW'
                                ? savedEntries[savedEntries.length - 1]
                                : previousIndex >= 0
                                    ? savedEntries[previousIndex]
                                    : savedEntries[0];
                            setSelectedId(nextSelected?.id ?? null);
                            setMode('BROWSE');
                        }}
                    />
                ) : (
                    <div className="flex min-h-0 flex-1">
                        <aside className={`${showMobileDetail ? 'hidden' : 'flex'} w-full shrink-0 flex-col border-r border-slate-800 sm:flex sm:w-80 lg:w-96`}>
                            <div className="grid gap-2 border-b border-slate-800 p-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditorTarget('NEW');
                                            setMode('EDIT');
                                        }}
                                        className="btn-primary inline-flex min-h-10 items-center justify-center gap-1.5"
                                    >
                                        <Plus size={14} aria-hidden="true" />
                                        유저 추가
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditorTarget('ALL');
                                            setMode('EDIT');
                                        }}
                                        className="btn-ghost inline-flex min-h-10 items-center justify-center gap-1.5 border border-slate-700/70"
                                    >
                                        <Pencil size={14} aria-hidden="true" />
                                        전체 편집
                                    </button>
                                </div>
                                <label className="relative">
                                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" aria-hidden="true" />
                                    <span className="sr-only">유저 검색</span>
                                    <input
                                        value={query}
                                        onChange={event => setQuery(event.target.value)}
                                        placeholder="이름·배틀태그·특이사항 검색"
                                        className="h-9 w-full rounded-lg border border-slate-800 bg-surface pl-9 pr-9 text-xs text-slate-200 outline-none focus:border-cyan-400"
                                    />
                                    {query && (
                                        <button
                                            type="button"
                                            onClick={() => setQuery('')}
                                            className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-600 hover:bg-white/5 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                                            aria-label="검색어 지우기"
                                        >
                                            <X size={13} aria-hidden="true" />
                                        </button>
                                    )}
                                </label>
                                <p className="px-1 text-[11px] text-slate-600">
                                    {query.trim() ? `${filteredEntries.length}명 검색됨` : `총 ${entries.length}명 저장됨`}
                                </p>
                            </div>
                            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
                                {filteredEntries.length === 0 ? (
                                    <p className="px-3 py-8 text-center text-xs leading-relaxed text-slate-600">
                                        {entries.length === 0 ? '저장된 유저가 없습니다. 유저 추가를 눌러 등록해 주세요.' : '검색 결과가 없습니다.'}
                                    </p>
                                ) : filteredEntries.map(entry => {
                                    const isParticipant = participantBattleTags.has(
                                        normalizeUserSheetBattleTag(entry.battleTag),
                                    );
                                    return (
                                        <button
                                            key={entry.id}
                                            type="button"
                                            onClick={() => setSelectedId(entry.id)}
                                            className={`mb-1 w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                                                selectedEntry?.id === entry.id
                                                    ? 'border-cyan-500/30 bg-cyan-500/[0.08]'
                                                    : 'border-transparent hover:border-slate-800 hover:bg-white/[0.03]'
                                            }`}
                                        >
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="truncate text-sm font-medium text-slate-200">
                                                    {entry.discordName || entry.battleTag}
                                                </span>
                                                {isParticipant && (
                                                    <span className="shrink-0 rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-300">참가 중</span>
                                                )}
                                            </span>
                                            <span className="mt-1 block truncate font-mono text-[11px] text-slate-600">{entry.battleTag}</span>
                                            <span className="mt-2 flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500">
                                                <span className="rounded bg-slate-800/80 px-1.5 py-0.5">탱 {entry.tank || '-'}</span>
                                                <span className="rounded bg-slate-800/80 px-1.5 py-0.5">딜 {entry.dps || '-'}</span>
                                                <span className="rounded bg-slate-800/80 px-1.5 py-0.5">힐 {entry.support || '-'}</span>
                                                {entry.note && (
                                                    <span
                                                        className="ml-auto inline-flex min-w-0 items-center gap-1 text-emerald-400/70"
                                                        title={entry.note}
                                                    >
                                                        <MessageSquareText size={11} className="shrink-0" aria-hidden="true" />
                                                        <span className="max-w-20 truncate">메모</span>
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </aside>

                        <div className={`${showMobileDetail ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col sm:flex`}>
                            {selectedEntry ? (
                                <UserSheetEntryView
                                    key={selectedEntry.id}
                                    csrfToken={csrfToken}
                                    entries={entries}
                                    entry={selectedEntry}
                                    isCurrentParticipant={participantBattleTags.has(
                                        normalizeUserSheetBattleTag(selectedEntry.battleTag),
                                    )}
                                    onSaveError={onSaveError}
                                    onSaved={onEntriesChange}
                                />
                            ) : (
                                <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                                    <UserRound size={32} className="mb-3 text-slate-700" aria-hidden="true" />
                                    <p className="text-sm font-medium text-slate-400">조회할 유저를 선택해 주세요</p>
                                    <p className="mt-1 text-xs text-slate-600">유저를 선택하면 상세 정보에서 바로 수정할 수 있습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </motion.section>
        </motion.div>
    );
}
