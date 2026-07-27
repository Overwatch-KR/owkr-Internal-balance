import { useState } from 'react';
import {
    AlertCircle,
    Loader2,
    MessageSquareText,
    Pencil,
    Save,
    Shield,
    Swords,
    UserRound,
    X,
} from 'lucide-react';
import {
    cleanUserSheetRank,
    updateUserSheetEntry,
    validateUserSheetEntries,
    type UserSheetDraftEntry,
    type UserSheetEntry,
} from '../../utils/user-sheet';
import { getErrorMessage } from '../../utils/api';
import { BattleTagCopyButton } from '../player/battle-tag-copy-button';

interface UserSheetEntryViewProps {
    csrfToken: string;
    entries: UserSheetEntry[];
    entry: UserSheetEntry;
    isCurrentParticipant: boolean;
    onSaveError: (message: string) => void;
    onSaved: (entries: UserSheetEntry[], message: string) => void;
}

type EntryField = 'discordName' | 'battleTag' | 'tank' | 'dps' | 'support' | 'note';

const ROLE_FIELDS: ReadonlyArray<{
    field: 'tank' | 'dps' | 'support';
    icon: typeof Shield;
    label: string;
}> = [
    { field: 'tank', label: '탱커', icon: Shield },
    { field: 'dps', label: '딜러', icon: Swords },
    { field: 'support', label: '힐러', icon: UserRound },
];

/**
 * @description 선택한 유저의 정보를 조회하고 같은 상세 화면에서 바로 수정한다.
 */
export function UserSheetEntryView({
    csrfToken,
    entries,
    entry,
    isCurrentParticipant,
    onSaveError,
    onSaved,
}: UserSheetEntryViewProps) {
    const [draft, setDraft] = useState<UserSheetDraftEntry>({ ...entry });
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');

    const updateField = (field: EntryField, value: string) => {
        const nextValue = field === 'tank' || field === 'dps' || field === 'support'
            ? cleanUserSheetRank(value)
            : value;
        setDraft(current => ({ ...current, [field]: nextValue }));
        setValidationMessage('');
    };

    const startEditing = () => {
        setDraft({ ...entry });
        setValidationMessage('');
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setDraft({ ...entry });
        setValidationMessage('');
        setIsEditing(false);
    };

    const handleSave = async () => {
        const rows = entries.map(current => current.id === entry.id ? draft : current);
        const error = validateUserSheetEntries(rows).errors.get(draft.id);
        if (error) {
            const message = error === 'DUPLICATE_BATTLE_TAG'
                ? '같은 배틀태그가 이미 등록되어 있습니다.'
                : '배틀태그에 #과 숫자 태그를 포함해 주세요. 예: Player#1234';
            setValidationMessage(message);
            return;
        }

        setIsSaving(true);
        setValidationMessage('');
        try {
            const savedEntries = await updateUserSheetEntry(draft, csrfToken);
            const savedEntry = savedEntries.find(saved => saved.id === entry.id);
            if (savedEntry) setDraft({ ...savedEntry });
            onSaved(
                savedEntries,
                `${savedEntry?.discordName || savedEntry?.battleTag || draft.battleTag} 정보를 수정했습니다.`,
            );
            setIsEditing(false);
        } catch (error) {
            const message = getErrorMessage(error, '유저 정보를 수정하지 못했습니다.');
            setValidationMessage(message);
            onSaveError(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 md:p-8" aria-labelledby="user-sheet-entry-title">
            <div className="mx-auto max-w-3xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            {isCurrentParticipant && (
                                <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-[11px] font-medium text-cyan-300">
                                    현재 참가자
                                </span>
                            )}
                            <span className="text-xs text-slate-600">
                                {entry.updatedByName} 수정 · {new Date(entry.updatedAt).toLocaleString('ko-KR')}
                            </span>
                        </div>
                        {isEditing ? (
                            <>
                                <h2 id="user-sheet-entry-title" className="sr-only">
                                    {entry.discordName || entry.battleTag} 정보 수정
                                </h2>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="grid gap-1.5 text-xs text-slate-500">
                                        디스코드 이름
                                        <input
                                            value={draft.discordName}
                                            onChange={event => updateField('discordName', event.target.value)}
                                            className="h-10 rounded-lg border border-slate-700 bg-surface px-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                                            autoComplete="off"
                                        />
                                    </label>
                                    <label className="grid gap-1.5 text-xs text-slate-500">
                                        배틀태그
                                        <input
                                            value={draft.battleTag}
                                            onChange={event => updateField('battleTag', event.target.value)}
                                            className={`h-10 rounded-lg border bg-surface px-3 font-mono text-sm text-slate-100 outline-none focus:border-cyan-400 ${
                                                validationMessage ? 'border-rose-400/70' : 'border-slate-700'
                                            }`}
                                            autoComplete="off"
                                            spellCheck={false}
                                            aria-invalid={Boolean(validationMessage)}
                                        />
                                    </label>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 id="user-sheet-entry-title" className="truncate text-xl font-semibold text-white">
                                    {entry.discordName || entry.battleTag}
                                </h2>
                                <div className="mt-1 flex items-center gap-1">
                                    <p className="min-w-0 break-all font-mono text-sm text-slate-400">{entry.battleTag}</p>
                                    <BattleTagCopyButton battleTag={entry.battleTag} />
                                </div>
                            </>
                        )}
                    </div>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={cancelEditing}
                                disabled={isSaving}
                                className="btn-ghost inline-flex min-h-9 items-center gap-2 disabled:opacity-40"
                            >
                                <X size={14} aria-hidden="true" />
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={isSaving}
                                className="btn-primary inline-flex min-h-9 items-center gap-2 disabled:opacity-40"
                            >
                                {isSaving
                                    ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                                    : <Save size={14} aria-hidden="true" />}
                                {isSaving ? '저장 중' : '저장'}
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={startEditing} className="btn-primary inline-flex min-h-9 items-center gap-2">
                            <Pencil size={14} aria-hidden="true" />
                            바로 수정
                        </button>
                    )}
                </div>

                {validationMessage && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/[0.08] px-3 py-2.5 text-xs text-rose-200" role="alert">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        {validationMessage}
                    </div>
                )}

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {ROLE_FIELDS.map(item => (
                        <div key={item.field} className="rounded-xl border border-slate-800 bg-surface p-4">
                            <label
                                htmlFor={`user-sheet-${item.field}`}
                                className="flex items-center gap-2 text-xs text-slate-500"
                            >
                                <item.icon size={14} aria-hidden="true" />
                                {item.label}
                            </label>
                            {isEditing ? (
                                <input
                                    id={`user-sheet-${item.field}`}
                                    value={draft[item.field]}
                                    onChange={event => updateField(item.field, event.target.value)}
                                    placeholder="예: 다3"
                                    className="mt-2 h-10 w-full rounded-lg border border-slate-700 bg-surface-elevated px-3 text-sm font-semibold text-slate-100 outline-none focus:border-cyan-400"
                                    autoComplete="off"
                                />
                            ) : (
                                <p className="mt-2 text-base font-semibold text-slate-200">{entry[item.field] || '미입력'}</p>
                            )}
                        </div>
                    ))}
                </div>

                <div className={`mt-4 rounded-xl border p-4 ${
                    entry.note || isEditing
                        ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                        : 'border-slate-800 bg-surface'
                }`}>
                    <label
                        htmlFor="user-sheet-note"
                        className={`flex items-center gap-2 text-xs ${
                            entry.note || isEditing ? 'text-emerald-300/80' : 'text-slate-500'
                        }`}
                    >
                        <MessageSquareText size={14} aria-hidden="true" />
                        특이사항
                    </label>
                    {isEditing ? (
                        <textarea
                            id="user-sheet-note"
                            value={draft.note}
                            onChange={event => updateField('note', event.target.value)}
                            placeholder="플레이 성향이나 참고할 내용을 적어 주세요."
                            maxLength={500}
                            rows={5}
                            className="mt-3 w-full resize-y rounded-lg border border-slate-700 bg-surface px-3 py-2.5 text-sm leading-relaxed text-slate-100 outline-none focus:border-cyan-400"
                        />
                    ) : (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                            {entry.note || '등록된 특이사항이 없습니다.'}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
