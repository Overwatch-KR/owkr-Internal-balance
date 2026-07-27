import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, LockKeyhole, RefreshCcw, Save, Users } from 'lucide-react';
import {
    fetchPlayerNotes,
    savePlayerNote,
    type NoteVisibility,
    type PlayerNote,
} from '../../../utils/player-note';
import { getErrorMessage } from '../../../utils/api';

interface PlayerNoteEditorProps {
    battleTag: string;
    csrfToken: string;
}

/**
 * @description BattleTag에 연결된 운영자 개인 메모와 관리자 공유 메모를 조회·저장한다.
 */
export const PlayerNoteEditor = ({ battleTag, csrfToken }: PlayerNoteEditorProps) => {
    const [visibility, setVisibility] = useState<NoteVisibility>('PRIVATE');
    const [privateNote, setPrivateNote] = useState<PlayerNote | null>(null);
    const [sharedNote, setSharedNote] = useState<PlayerNote | null>(null);
    const [draft, setDraft] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        void fetchPlayerNotes(battleTag)
            .then((notes) => {
                if (!active) return;
                setPrivateNote(notes.privateNote);
                setSharedNote(notes.sharedNote);
                setDraft(notes.privateNote?.content ?? '');
                setLoadError(null);
            })
            .catch((error: unknown) => {
                if (!active) return;
                setLoadError(getErrorMessage(error, '메모를 불러오지 못했습니다.'));
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });
        return () => {
            active = false;
        };
    }, [battleTag]);

    const selectVisibility = (next: NoteVisibility) => {
        setVisibility(next);
        setDraft(next === 'PRIVATE' ? privateNote?.content ?? '' : sharedNote?.content ?? '');
        setMessage('');
    };

    const retryLoad = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const notes = await fetchPlayerNotes(battleTag);
            setPrivateNote(notes.privateNote);
            setSharedNote(notes.sharedNote);
            setDraft(notes.privateNote?.content ?? '');
        } catch (error) {
            setLoadError(getErrorMessage(error, '메모를 불러오지 못했습니다.'));
        } finally {
            setIsLoading(false);
        }
    };

    const save = async () => {
        setIsSaving(true);
        setMessage('');
        try {
            await savePlayerNote(battleTag, draft, visibility, csrfToken);
            const updatedNote = draft.trim()
                ? {
                    battleTag,
                    content: draft.trim(),
                    visibility,
                    authorName: '',
                    updatedAt: Date.now(),
                } satisfies PlayerNote
                : null;
            if (visibility === 'PRIVATE') setPrivateNote(updatedNote);
            else setSharedNote(updatedNote);
            setMessage(draft.trim() ? '메모를 저장했습니다.' : '메모를 삭제했습니다.');
        } catch (error) {
            setMessage(getErrorMessage(error, '메모를 저장하지 못했습니다.'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-950/40 px-3 py-3 text-xs text-slate-500">
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                메모를 불러오고 있습니다
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200" role="alert">
                <span className="inline-flex items-center gap-2">
                    <AlertCircle size={13} aria-hidden="true" />
                    {loadError}
                </span>
                <button
                    type="button"
                    onClick={() => void retryLoad()}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 font-medium hover:bg-amber-500/10"
                >
                    <RefreshCcw size={12} aria-hidden="true" />
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div className="mt-2 rounded-lg border border-slate-700/60 bg-slate-950/45 p-3">
            <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-surface p-1">
                <button
                    type="button"
                    onClick={() => selectVisibility('PRIVATE')}
                    className={`flex min-h-8 items-center justify-center gap-1 rounded-md px-2 text-xs ${
                        visibility === 'PRIVATE' ? 'bg-cyan-500/15 text-cyan-200' : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                    <LockKeyhole size={12} aria-hidden="true" />
                    나만 보기
                </button>
                <button
                    type="button"
                    onClick={() => selectVisibility('ADMINS')}
                    className={`flex min-h-8 items-center justify-center gap-1 rounded-md px-2 text-xs ${
                        visibility === 'ADMINS' ? 'bg-violet-500/15 text-violet-200' : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                    <Users size={12} aria-hidden="true" />
                    관리자 공유
                </button>
            </div>
            <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={1000}
                className="input-base h-24 resize-none text-xs leading-relaxed"
                placeholder={visibility === 'PRIVATE'
                    ? '이 메모는 내 계정에서만 보입니다.'
                    : '등록된 관리자에게 공유할 특이사항을 적으세요.'}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[11px] text-slate-500" role="status">{message}</p>
                <button
                    type="button"
                    onClick={() => void save()}
                    disabled={isSaving || !csrfToken}
                    className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md bg-cyan-500/15 px-2.5 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:opacity-40"
                >
                    {isSaving ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Save size={12} aria-hidden="true" />}
                    저장
                </button>
            </div>
        </div>
    );
};

export default PlayerNoteEditor;
