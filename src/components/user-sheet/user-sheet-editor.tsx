import { useMemo, useState, type ClipboardEvent } from 'react';
import { AlertCircle, CheckCircle2, Info, Plus, Save, Trash2 } from 'lucide-react';
import {
    cleanUserSheetRank,
    isActiveUserSheetEntry,
    mergeDiscordPlayersIntoUserSheet,
    normalizeUserSheetBattleTag,
    parseUserSheetRows,
    saveUserSheet,
    validateUserSheetEntries,
    type UserSheetDraftEntry,
    type UserSheetEntry,
    type UserSheetValidationError,
} from '../../utils/user-sheet';
import { getErrorMessage } from '../../utils/api';
import { parseMultipleLines } from '../../utils/parser';
import {
    DiscordSheetImport,
    type DiscordSheetImportResult,
} from './discord-sheet-import';

interface UserSheetEditorProps {
    appendEmptyRow?: boolean;
    csrfToken: string;
    entries: UserSheetEntry[];
    focusBattleTag?: string;
    onCancel: () => void;
    onSaveError: (message: string) => void;
    onSaved: (entries: UserSheetEntry[]) => void;
}

type EntryField = 'discordName' | 'battleTag' | 'tank' | 'dps' | 'support' | 'note';

const FIELDS: readonly EntryField[] = ['discordName', 'battleTag', 'tank', 'dps', 'support', 'note'];
const COLUMNS: ReadonlyArray<{ field: EntryField; label: string; placeholder: string; width: string }> = [
    { field: 'discordName', label: '디스코드 이름', placeholder: '상민', width: 'min-w-40' },
    { field: 'battleTag', label: '배틀태그', placeholder: 'Player#1234', width: 'min-w-56' },
    { field: 'tank', label: '탱커', placeholder: '다3', width: 'min-w-28' },
    { field: 'dps', label: '딜러', placeholder: '플1', width: 'min-w-28' },
    { field: 'support', label: '힐러', placeholder: '마5', width: 'min-w-28' },
    { field: 'note', label: '특이사항', placeholder: '마이크X', width: 'min-w-72' },
];

const ERROR_LABELS: Record<UserSheetValidationError, string> = {
    INVALID_BATTLE_TAG: '형식 오류',
    DUPLICATE_BATTLE_TAG: '중복',
};

const ERROR_DETAILS: Record<UserSheetValidationError, string> = {
    INVALID_BATTLE_TAG: '배틀태그에 #과 숫자 태그를 포함해 주세요. 예: Player#1234',
    DUPLICATE_BATTLE_TAG: '같은 배틀태그가 시트에 두 번 입력되어 있습니다.',
};

const makeEmptyEntry = (): UserSheetDraftEntry => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    discordName: '',
    battleTag: '',
    tank: '',
    dps: '',
    support: '',
    note: '',
});

/**
 * @description 전체 유저 정보를 Google Sheets처럼 붙여넣고 한 화면에서 수정한다.
 */
export function UserSheetEditor({
    appendEmptyRow = false,
    csrfToken,
    entries,
    focusBattleTag,
    onCancel,
    onSaveError,
    onSaved,
}: UserSheetEditorProps) {
    const [rows, setRows] = useState<UserSheetDraftEntry[]>(() => (
        entries.length > 0
            ? [
                ...entries.map(entry => ({ ...entry })),
                ...(appendEmptyRow ? [makeEmptyEntry()] : []),
            ]
            : Array.from({ length: 10 }, makeEmptyEntry)
    ));
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [isClearConfirming, setIsClearConfirming] = useState(false);
    const focusRowId = appendEmptyRow
        ? rows[rows.length - 1]?.id
        : rows.find(row => (
            focusBattleTag
            && normalizeUserSheetBattleTag(row.battleTag)
                === normalizeUserSheetBattleTag(focusBattleTag)
        ))?.id;

    const validation = useMemo(() => validateUserSheetEntries(rows), [rows]);
    const invalidRowNumbers = rows
        .map((row, index) => validation.errors.has(row.id) ? index + 1 : null)
        .filter((rowNumber): rowNumber is number => rowNumber !== null);

    const updateCell = (rowId: string, field: EntryField, value: string) => {
        const nextValue = field === 'tank' || field === 'dps' || field === 'support'
            ? cleanUserSheetRank(value)
            : value;
        setIsClearConfirming(false);
        setMessage('');
        setRows(current => current.map(row => row.id === rowId ? { ...row, [field]: nextValue } : row));
    };

    const handlePaste = (
        event: ClipboardEvent<HTMLInputElement>,
        startRowIndex: number,
        startColumnIndex: number,
    ) => {
        const text = event.clipboardData.getData('text/plain');
        if (!text.includes('\t') && !text.includes('\n')) return;
        event.preventDefault();
        const pastedRows = parseUserSheetRows(text);
        if (pastedRows.length === 0) return;

        setRows(current => {
            const next = [...current];
            while (next.length < startRowIndex + pastedRows.length) next.push(makeEmptyEntry());
            pastedRows.forEach((pasted, rowOffset) => {
                const target = { ...next[startRowIndex + rowOffset] };
                FIELDS.slice(startColumnIndex).forEach((field, fieldOffset) => {
                    const sourceField = FIELDS[fieldOffset];
                    if (sourceField) target[field] = pasted[sourceField];
                });
                next[startRowIndex + rowOffset] = target;
            });
            return next;
        });
        setIsClearConfirming(false);
        setMessage('');
    };

    const handleDiscordImport = (text: string): DiscordSheetImportResult | null => {
        const parsed = parseMultipleLines(text);
        if (parsed.players.length === 0) return null;
        const merged = mergeDiscordPlayersIntoUserSheet(rows, parsed.players);
        setRows(merged.rows);
        setIsClearConfirming(false);
        setMessage('');
        return {
            addedCount: merged.addedCount,
            updatedCount: merged.updatedCount,
            failedCount: parsed.failedLines.length,
            warningCount: parsed.avoidedRoleWarnings.length,
        };
    };

    const handleSave = async () => {
        setMessage('');
        if (validation.errors.size > 0) {
            const validationMessage = `배틀태그 오류 ${validation.errors.size}개를 먼저 확인해 주세요.`;
            setMessage(validationMessage);
            onSaveError(validationMessage);
            return;
        }
        setIsSaving(true);
        try {
            const saved = await saveUserSheet(validation.activeRows, csrfToken);
            onSaved(saved);
        } catch (error) {
            const errorMessage = getErrorMessage(error, '유저 시트를 저장하지 못했습니다.');
            setMessage(errorMessage);
            onSaveError(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="user-sheet-editor-title">
            <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-slate-800 bg-slate-900/70 px-4 py-3.5 md:px-6">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 id="user-sheet-editor-title" className="font-semibold text-white">전체 시트 편집</h2>
                        <span className="whitespace-nowrap rounded-full bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300">
                            {validation.activeRows.length}명 입력
                        </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Google Sheets의 6개 열을 첫 셀에 붙여넣거나 각 칸을 직접 수정하세요.
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Info size={12} className="shrink-0" aria-hidden="true" />
                        배틀태그는 Player#1234 형식 · 역할 티어의 !, ?, ★는 자동 제거
                    </p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={onCancel} className="btn-ghost min-h-9">취소</button>
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                        className="btn-primary inline-flex min-h-9 items-center gap-2 disabled:opacity-40"
                    >
                        <Save size={14} aria-hidden="true" />
                        {isSaving ? '저장 중' : '시트 저장'}
                    </button>
                </div>
            </header>

            <DiscordSheetImport onImport={handleDiscordImport} />

            {(validation.errors.size > 0 || message) && (
                <div
                    className="flex shrink-0 items-start gap-2 border-b border-rose-500/20 bg-rose-500/[0.08] px-4 py-2.5 text-xs leading-relaxed text-rose-200 md:px-6"
                    role="alert"
                    aria-live="polite"
                >
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-300" aria-hidden="true" />
                    <div>
                        {validation.errors.size > 0 && (
                            <p>
                                <strong className="font-semibold">{invalidRowNumbers.join(', ')}행</strong>의
                                배틀태그를 확인해 주세요. 오류 칸을 붉은색으로 표시했습니다.
                            </p>
                        )}
                        {message && <p>{message}</p>}
                    </div>
                </div>
            )}

            <div className="custom-scrollbar min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left text-xs">
                    <caption className="sr-only">
                        디스코드 이름, 배틀태그, 역할별 티어와 특이사항을 편집하는 유저 시트
                    </caption>
                    <thead className="sticky top-0 z-20 bg-slate-900">
                        <tr>
                            <th className="sticky left-0 z-30 w-12 border-b border-r border-slate-700 bg-slate-900 px-2 py-2.5 text-center font-medium text-slate-600">#</th>
                            {COLUMNS.map(column => (
                                <th key={column.field} className={`${column.width} border-b border-r border-slate-700 px-2.5 py-2.5 font-medium text-slate-400`}>
                                    {column.label}
                                </th>
                            ))}
                            <th className="sticky right-0 z-30 w-40 min-w-40 whitespace-nowrap border-b border-slate-700 bg-slate-900 px-3 py-2.5 font-medium text-slate-500">
                                상태
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIndex) => {
                            const error = validation.errors.get(row.id);
                            return (
                                <tr
                                    key={row.id}
                                    className={`group transition-colors hover:bg-white/[0.025] ${
                                        error ? 'bg-rose-500/[0.045]' : ''
                                    }`}
                                >
                                    <td className="sticky left-0 z-10 border-b border-r border-slate-800 bg-slate-900/95 px-2 py-1 text-center tabular-nums text-slate-600 group-hover:text-slate-400">
                                        {rowIndex + 1}
                                    </td>
                                    {COLUMNS.map((column, columnIndex) => (
                                        <td
                                            key={column.field}
                                            className={`border-b border-r p-0 ${
                                                error && column.field === 'battleTag'
                                                    ? 'border-rose-500/60 bg-rose-500/[0.08]'
                                                    : 'border-slate-800'
                                            }`}
                                        >
                                            <input
                                                value={row[column.field]}
                                                onChange={event => updateCell(row.id, column.field, event.target.value)}
                                                onPaste={event => handlePaste(event, rowIndex, columnIndex)}
                                                autoFocus={columnIndex === 0 && (
                                                    focusRowId
                                                        ? row.id === focusRowId
                                                        : rowIndex === 0
                                                )}
                                                autoComplete="off"
                                                spellCheck={false}
                                                placeholder={rowIndex === 0 ? column.placeholder : ''}
                                                aria-label={`${rowIndex + 1}행 ${column.label}`}
                                                aria-invalid={column.field === 'battleTag' && Boolean(error)}
                                                aria-describedby={column.field === 'battleTag' && error
                                                    ? `user-sheet-row-error-${row.id}`
                                                    : undefined}
                                                className={`h-11 w-full bg-transparent px-2.5 text-slate-200 outline-none placeholder:text-slate-700 focus:bg-cyan-500/[0.06] focus:ring-2 focus:ring-inset ${
                                                    error && column.field === 'battleTag'
                                                        ? 'text-rose-100 focus:ring-rose-400/80'
                                                        : 'focus:ring-cyan-400/70'
                                                } ${column.field === 'battleTag' ? 'font-mono' : ''}`}
                                            />
                                        </td>
                                    ))}
                                    <td className="sticky right-0 z-10 w-40 min-w-40 border-b border-slate-800 bg-slate-900/95 px-2 py-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span
                                                id={error ? `user-sheet-row-error-${row.id}` : undefined}
                                                title={error ? ERROR_DETAILS[error] : undefined}
                                                className={`inline-flex min-w-0 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-medium ${
                                                    error
                                                        ? 'bg-rose-500/15 text-rose-200'
                                                        : isActiveUserSheetEntry(row)
                                                            ? 'bg-emerald-500/10 text-emerald-300'
                                                            : 'text-slate-700'
                                                }`}
                                            >
                                                {error && <AlertCircle size={12} className="mr-1 shrink-0" aria-hidden="true" />}
                                                {!error && isActiveUserSheetEntry(row) && (
                                                    <CheckCircle2 size={12} className="mr-1 shrink-0" aria-hidden="true" />
                                                )}
                                                {error ? ERROR_LABELS[error] : isActiveUserSheetEntry(row) ? '준비 완료' : '빈 행'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setRows(current => current.filter(item => item.id !== row.id))}
                                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
                                                aria-label={`${rowIndex + 1}행 삭제`}
                                                title={`${rowIndex + 1}행 삭제`}
                                            >
                                                <Trash2 size={13} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/95 px-4 py-3 md:px-6">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-slate-400">
                        저장 대상 <strong className="font-semibold text-slate-200">{validation.activeRows.length}명</strong>
                    </span>
                    {validation.errors.size > 0 && (
                        <span className="whitespace-nowrap text-rose-300">오류 {validation.errors.size}개</span>
                    )}
                    <span className="hidden text-slate-600 sm:inline">가로 스크롤로 모든 열을 확인할 수 있습니다.</span>
                </div>
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={() => {
                            setIsClearConfirming(false);
                            setRows(current => [...current, ...Array.from({ length: 5 }, makeEmptyEntry)]);
                        }}
                        className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
                    >
                        <Plus size={13} aria-hidden="true" />
                        5행 추가
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (!isClearConfirming) {
                                setIsClearConfirming(true);
                                return;
                            }
                            setRows(Array.from({ length: 10 }, makeEmptyEntry));
                            setIsClearConfirming(false);
                            setMessage('');
                        }}
                        className={`inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs transition-colors ${
                            isClearConfirming
                                ? 'bg-rose-500/15 font-medium text-rose-200'
                                : 'text-slate-500 hover:bg-rose-500/10 hover:text-rose-300'
                        }`}
                    >
                        <Trash2 size={13} aria-hidden="true" />
                        {isClearConfirming ? '한 번 더 눌러 비우기' : '전체 비우기'}
                    </button>
                </div>
            </footer>
        </section>
    );
}
