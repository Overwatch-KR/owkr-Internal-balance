import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { UIEvent } from 'react';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { AvoidedRoleWarning } from '../../../utils/parser';
import {
    findAvoidedRoleHighlightRanges,
    type TextHighlightRange,
} from '../../../utils/parser/avoidance-highlight';

interface RosterPasteTextareaProps {
    isValidationPending: boolean;
    onChange: (value: string) => void;
    value: string;
    warnings: AvoidedRoleWarning[];
}

const ROLE_LABELS: Record<AvoidedRoleWarning['avoidedRoles'][number], string> = {
    TANK: '탱커',
    DPS: '딜러',
    SUPPORT: '힐러',
};

const renderHighlightedText = (
    text: string,
    ranges: TextHighlightRange[],
) => {
    const nodes = [];
    let cursor = 0;

    for (const [index, range] of ranges.entries()) {
        if (cursor < range.start) {
            nodes.push(
                <span key={`plain-${index}`} className="text-transparent">
                    {text.slice(cursor, range.start)}
                </span>,
            );
        }
        nodes.push(
            <mark
                key={`highlight-${index}`}
                data-highlight-start={range.start}
                className="rounded-sm bg-rose-500/25 text-rose-200 underline decoration-2 decoration-rose-400 underline-offset-2"
            >
                {text.slice(range.start, range.end)}
            </mark>,
        );
        cursor = range.end;
    }

    if (cursor < text.length) {
        nodes.push(
            <span key="plain-last" className="text-transparent">
                {text.slice(cursor)}
            </span>,
        );
    }
    return nodes;
};

/**
 * @description Discord 명단 입력과 문제 포지션 구간을 같은 위치에 겹쳐 표시한다.
 */
const RosterPasteTextarea = ({
    isValidationPending,
    onChange,
    value,
    warnings,
}: RosterPasteTextareaProps) => {
    const highlightLayerRef = useRef<HTMLDivElement>(null);
    const shouldAutoNavigateAfterPasteRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [activeWarningIndex, setActiveWarningIndex] = useState(0);
    const ranges = useMemo(
        () => findAvoidedRoleHighlightRanges(value, warnings),
        [value, warnings],
    );
    const navigationTargets = useMemo(() => warnings.flatMap((warning) => {
        const warningRanges = findAvoidedRoleHighlightRanges(value, [warning]);
        const firstRange = warningRanges[0];
        const lastRange = warningRanges.at(-1);
        if (!firstRange || !lastRange) return [];
        return [{
            end: lastRange.end,
            start: firstRange.start,
            warning,
        }];
    }), [value, warnings]);
    const hasWarnings = ranges.length > 0;
    const currentWarningIndex = navigationTargets.length > 0
        ? activeWarningIndex % navigationTargets.length
        : 0;
    const currentTarget = navigationTargets[currentWarningIndex];

    const syncHighlightScroll = useCallback((textarea: HTMLTextAreaElement) => {
        if (!highlightLayerRef.current) return;
        highlightLayerRef.current.style.transform = (
            `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`
        );
    }, []);

    useLayoutEffect(() => {
        if (textareaRef.current) syncHighlightScroll(textareaRef.current);
    }, [ranges, syncHighlightScroll]);

    const scrollToWarning = useCallback((targetIndex: number) => {
        if (!textareaRef.current || navigationTargets.length === 0) return;
        const target = navigationTargets[targetIndex];
        const targetMark = highlightLayerRef.current?.querySelector<HTMLElement>(
            `[data-highlight-start="${target.start}"]`,
        );
        const textarea = textareaRef.current;

        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(target.start, target.end);
        if (targetMark) {
            textarea.scrollTop = Math.max(
                0,
                targetMark.offsetTop - (textarea.clientHeight / 2) + (targetMark.offsetHeight / 2),
            );
        }
        syncHighlightScroll(textarea);
    }, [navigationTargets, syncHighlightScroll]);

    useLayoutEffect(() => {
        if (isValidationPending || !shouldAutoNavigateAfterPasteRef.current) return;
        shouldAutoNavigateAfterPasteRef.current = false;
        if (navigationTargets.length > 0) scrollToWarning(0);
    }, [isValidationPending, navigationTargets.length, scrollToWarning]);

    const navigateToWarning = (direction: -1 | 1) => {
        if (navigationTargets.length === 0) return;
        const nextIndex = (
            currentWarningIndex + direction + navigationTargets.length
        ) % navigationTargets.length;
        setActiveWarningIndex(nextIndex);
        scrollToWarning(nextIndex);
    };

    return (
        <div className="space-y-2">
            <div className="relative">
                {hasWarnings && (
                    <div
                        className="pointer-events-none absolute inset-y-px left-px right-[9px] z-10 overflow-hidden rounded-[7px]"
                        aria-hidden="true"
                    >
                        <div
                            ref={highlightLayerRef}
                            className="min-h-full whitespace-pre-wrap break-words px-4 py-3 font-mono text-sm leading-relaxed"
                        >
                            {renderHighlightedText(value, ranges)}
                        </div>
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    id="discord-chat"
                    name="discord-chat"
                    autoComplete="off"
                    spellCheck={false}
                    className={`input-base custom-scrollbar h-40 resize-none overflow-y-scroll font-mono text-sm leading-relaxed ${
                        hasWarnings
                            ? 'border-rose-500/70 focus:border-rose-400 focus:ring-rose-500/20'
                            : ''
                    }`}
                    placeholder={`예시:\nkimjungun#11853 다5/다1/다5\n학살#38848 다3/마4/다4\nAki#34981 미배치(골)/미배치(플)/플2\n재봉이#31207 그5!/마1!/마4`}
                    value={value}
                    onChange={event => onChange(event.target.value)}
                    onPaste={() => {
                        shouldAutoNavigateAfterPasteRef.current = true;
                        setActiveWarningIndex(0);
                    }}
                    onScroll={(event: UIEvent<HTMLTextAreaElement>) => (
                        syncHighlightScroll(event.currentTarget)
                    )}
                    aria-invalid={hasWarnings || undefined}
                    aria-describedby={hasWarnings ? 'roster-paste-error-navigation' : undefined}
                />
            </div>
            {currentTarget && (
                <div
                    id="roster-paste-error-navigation"
                    className="flex min-h-9 items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-2.5 py-1.5"
                    role="status"
                    aria-live="polite"
                >
                    <AlertCircle size={13} className="shrink-0 text-rose-400" aria-hidden="true" />
                    <p className="min-w-0 flex-1 truncate text-[11px] text-rose-200/80">
                        <span className="font-semibold text-rose-200">
                            오류 {currentWarningIndex + 1}/{navigationTargets.length}
                        </span>
                        {' · '}
                        {currentTarget.warning.discordName || currentTarget.warning.playerName}
                        {' · '}
                        {currentTarget.warning.avoidedRoles.map(role => ROLE_LABELS[role]).join('·')}
                    </p>
                    <div className="flex shrink-0 items-center gap-0.5">
                        <button
                            type="button"
                            onClick={() => navigateToWarning(-1)}
                            disabled={navigationTargets.length <= 1}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-200/70 transition-colors hover:bg-rose-400/10 hover:text-rose-100 disabled:cursor-default disabled:opacity-30"
                            aria-label="이전 비선호 오류로 이동"
                        >
                            <ChevronUp size={15} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => navigateToWarning(1)}
                            disabled={navigationTargets.length <= 1}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-200/70 transition-colors hover:bg-rose-400/10 hover:text-rose-100 disabled:cursor-default disabled:opacity-30"
                            aria-label="다음 비선호 오류로 이동"
                        >
                            <ChevronDown size={15} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RosterPasteTextarea;
