import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, LockKeyhole, RefreshCcw, Save } from 'lucide-react';
import {
    fetchPlayerNote,
    savePlayerNote,
} from '../../../utils/player-note';
import { getErrorMessage } from '../../../utils/api';

interface PlayerNoteEditorProps {
    battleTag: string;
    csrfToken: string;
    isEditable?: boolean;
}

interface PlayerNoteFormProps {
    draft: string;
    isDisabled: boolean;
    isSaving: boolean;
    message: string;
    onChange: (value: string) => void;
    onSave: () => void;
}

interface PlayerNoteViewerProps {
    content: string;
}

/**
 * @description 저장된 개인 운영 메모를 입력 필드 없이 읽기 전용으로 표시한다.
 */
export const PlayerNoteViewer = ({ content }: PlayerNoteViewerProps) => (
    <p className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed ${
        content ? 'text-slate-300' : 'text-slate-600'
    }`}>
        {content || '등록된 개인 운영 메모가 없습니다.'}
    </p>
);

/**
 * @description 개인 운영 메모 입력과 현재 계정 전용 안내를 표시한다.
 */
export const PlayerNoteForm = ({
    draft,
    isDisabled,
    isSaving,
    message,
    onChange,
    onSave,
}: PlayerNoteFormProps) => (
    <div className="mt-2 rounded-lg border border-slate-700/60 bg-slate-950/45 p-3">
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-cyan-500/10 px-2.5 py-2 text-[11px] text-cyan-200">
            <LockKeyhole size={12} className="shrink-0" aria-hidden="true" />
            <span className="font-medium">나만 보기</span>
            <span className="text-slate-500">현재 로그인한 계정에만 표시됩니다.</span>
        </div>
        <textarea
            value={draft}
            onChange={(event) => onChange(event.target.value)}
            maxLength={1000}
            className="input-base h-24 resize-none text-xs leading-relaxed"
            placeholder="개인적으로 참고할 운영 메모를 입력하세요."
        />
        <div className="mt-2 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[11px] text-slate-500" role="status">{message}</p>
            <button
                type="button"
                onClick={onSave}
                disabled={isDisabled || isSaving}
                className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md bg-cyan-500/15 px-2.5 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:opacity-40"
            >
                {isSaving ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Save size={12} aria-hidden="true" />}
                저장
            </button>
        </div>
    </div>
);

/**
 * @description BattleTag에 연결된 로그인 운영자 본인의 개인 메모를 조회·저장한다.
 */
export const PlayerNoteEditor = ({
    battleTag,
    csrfToken,
    isEditable = true,
}: PlayerNoteEditorProps) => {
    const [draft, setDraft] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        void fetchPlayerNote(battleTag)
            .then((note) => {
                if (!active) return;
                setDraft(note?.content ?? '');
                setLoadError(null);
            })
            .catch((error: unknown) => {
                if (!active) return;
                setLoadError(getErrorMessage(error, '개인 운영 메모를 불러오지 못했습니다.'));
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });
        return () => {
            active = false;
        };
    }, [battleTag]);

    const retryLoad = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const note = await fetchPlayerNote(battleTag);
            setDraft(note?.content ?? '');
        } catch (error) {
            setLoadError(getErrorMessage(error, '개인 운영 메모를 불러오지 못했습니다.'));
        } finally {
            setIsLoading(false);
        }
    };

    const save = async () => {
        setIsSaving(true);
        setMessage('');
        try {
            await savePlayerNote(battleTag, draft, csrfToken);
            setMessage(draft.trim()
                ? '개인 운영 메모를 저장했습니다.'
                : '개인 운영 메모를 삭제했습니다.');
        } catch (error) {
            setMessage(getErrorMessage(error, '개인 운영 메모를 저장하지 못했습니다.'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-950/40 px-3 py-3 text-xs text-slate-500">
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                개인 운영 메모를 불러오고 있습니다
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

    if (!isEditable) return <PlayerNoteViewer content={draft} />;

    return (
        <PlayerNoteForm
            draft={draft}
            isDisabled={!csrfToken}
            isSaving={isSaving}
            message={message}
            onChange={setDraft}
            onSave={() => void save()}
        />
    );
};

export default PlayerNoteEditor;
