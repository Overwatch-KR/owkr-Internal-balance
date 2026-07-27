import { useState } from 'react';
import { AlertCircle, CheckCircle2, MessageSquareText, X } from 'lucide-react';

export interface DiscordSheetImportResult {
    addedCount: number;
    failedCount: number;
    updatedCount: number;
    warningCount: number;
}

interface DiscordSheetImportProps {
    onImport: (text: string) => DiscordSheetImportResult | null;
}

/**
 * @description Discord 명단 텍스트를 시트 행으로 가져오는 독립 입력 패널을 제공한다.
 */
export function DiscordSheetImport({ onImport }: DiscordSheetImportProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [text, setText] = useState('');
    const [result, setResult] = useState<DiscordSheetImportResult | null>(null);
    const [error, setError] = useState('');

    const apply = () => {
        if (!text.trim()) {
            setError('붙여넣을 디스코드 명단이 없습니다.');
            return;
        }
        const nextResult = onImport(text);
        if (!nextResult) {
            setError('읽어낸 유저가 없습니다. 디스코드 입력 형식을 확인해 주세요.');
            setResult(null);
            return;
        }
        setError('');
        setResult(nextResult);
        setText('');
    };

    if (!isOpen) {
        return (
            <div className="shrink-0 border-b border-slate-800 px-4 py-2.5 md:px-6">
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-500/15"
                >
                    <MessageSquareText size={14} aria-hidden="true" />
                    디스코드 명단 가져오기
                </button>
            </div>
        );
    }

    return (
        <section className="border-b border-violet-500/20 bg-violet-500/[0.05] px-4 py-3 md:px-6" aria-labelledby="discord-sheet-import-title">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 id="discord-sheet-import-title" className="text-sm font-medium text-violet-100">
                        디스코드 명단 가져오기
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        중복 배틀태그는 이름과 티어만 업데이트하며 기존 특이사항은 유지합니다.
                        선호·비선호 기호는 시트에 반영할 때 자동으로 제거됩니다.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white/5 hover:text-white"
                    aria-label="디스코드 명단 가져오기 닫기"
                >
                    <X size={14} aria-hidden="true" />
                </button>
            </div>
            <textarea
                value={text}
                onChange={event => {
                    setText(event.target.value);
                    setError('');
                }}
                className="input-base mt-3 h-28 resize-none font-mono text-xs leading-relaxed"
                placeholder={'상민 — Player#1234 다3!/플2?/마5\n재봉 — Other#5678 플1/다4/골2'}
                spellCheck={false}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 text-xs" role="status" aria-live="polite">
                    {error && (
                        <span className="inline-flex items-center gap-1.5 text-rose-300">
                            <AlertCircle size={12} aria-hidden="true" />
                            {error}
                        </span>
                    )}
                    {result && !error && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-300">
                            <CheckCircle2 size={12} aria-hidden="true" />
                            신규 {result.addedCount}명 · 업데이트 {result.updatedCount}명
                            {result.failedCount > 0 && ` · 실패 ${result.failedCount}명`}
                            {result.warningCount > 0 && ` · 비선호 확인 ${result.warningCount}명`}
                        </span>
                    )}
                </div>
                <button type="button" onClick={apply} className="btn-primary min-h-9 text-xs">
                    편집 표에 반영
                </button>
            </div>
        </section>
    );
}
