import type { AvoidedRoleWarning } from '.';

export interface TextHighlightRange {
    start: number;
    end: number;
}

const BATTLE_TAG_PATTERN = /[^\s#]+\s*#\s*\d{4,}/g;

const escapeRegExp = (value: string): string => (
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
);

const trimRange = (
    text: string,
    start: number,
    end: number,
): TextHighlightRange | null => {
    let nextStart = start;
    let nextEnd = end;
    while (nextStart < nextEnd && /\s/.test(text[nextStart])) nextStart += 1;
    while (nextEnd > nextStart && /\s/.test(text[nextEnd - 1])) nextEnd -= 1;
    return nextStart < nextEnd ? { start: nextStart, end: nextEnd } : null;
};

const findMarkedTokenRange = (
    line: string,
    questionIndex: number,
): TextHighlightRange => {
    let start = questionIndex;
    let end = questionIndex + 1;
    while (start > 0 && !/[\s/]/.test(line[start - 1])) start -= 1;
    while (end < line.length && !/[\s/]/.test(line[end])) end += 1;

    const token = line.slice(start, end);
    if (!token.replace(/[()?？]/g, '')) {
        let previousEnd = start;
        while (previousEnd > 0 && /\s/.test(line[previousEnd - 1])) previousEnd -= 1;
        start = previousEnd;
        while (start > 0 && !/[\s/]/.test(line[start - 1])) start -= 1;
    }

    if (/^(?:탱(?:커)?|딜(?:러)?|힐(?:러)?|tank|dps|support|[tds])[!?？]*$/i.test(line.slice(start, end))) {
        let nextStart = end;
        while (nextStart < line.length && /\s/.test(line[nextStart])) nextStart += 1;
        end = nextStart;
        while (end < line.length && !/[\s/]/.test(line[end])) end += 1;
    }

    return { start, end };
};

const findLineHighlightRanges = (
    line: string,
    lineOffset: number,
): TextHighlightRange[] => {
    if (!line.includes('?')) return [];

    if (line.includes('/')) {
        const ranges: TextHighlightRange[] = [];
        let partStart = 0;
        for (let index = 0; index <= line.length; index += 1) {
            if (index !== line.length && line[index] !== '/') continue;
            const part = line.slice(partStart, index);
            if (part.includes('?')) {
                const range = trimRange(line, partStart, index);
                if (range) {
                    ranges.push({
                        start: lineOffset + range.start,
                        end: lineOffset + range.end,
                    });
                }
            }
            partStart = index + 1;
        }
        return ranges;
    }

    const ranges: TextHighlightRange[] = [];
    for (let index = line.indexOf('?'); index >= 0; index = line.indexOf('?', index + 1)) {
        const range = findMarkedTokenRange(line, index);
        ranges.push({
            start: lineOffset + range.start,
            end: lineOffset + range.end,
        });
    }
    return ranges;
};

const mergeHighlightRanges = (ranges: TextHighlightRange[]): TextHighlightRange[] => {
    const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
    const merged: TextHighlightRange[] = [];
    for (const range of sorted) {
        const previous = merged.at(-1);
        if (!previous || range.start > previous.end) {
            merged.push({ ...range });
            continue;
        }
        previous.end = Math.max(previous.end, range.end);
    }
    return merged;
};

/**
 * @description 비선호 역할이 중복된 참가자 블록에서 물음표가 포함된 포지션 구간을 찾는다.
 */
export const findAvoidedRoleHighlightRanges = (
    text: string,
    warnings: AvoidedRoleWarning[],
): TextHighlightRange[] => {
    if (!text || warnings.length === 0) return [];

    const ranges: TextHighlightRange[] = [];
    for (const warning of warnings) {
        const [playerName, tag] = warning.playerName.split('#');
        if (!playerName || !tag) continue;
        const playerPattern = new RegExp(
            `${escapeRegExp(playerName)}\\s*#\\s*${escapeRegExp(tag)}`,
            'gi',
        );

        for (const match of text.matchAll(playerPattern)) {
            if (match.index === undefined) continue;
            const blockStart = match.index + match[0].length;
            BATTLE_TAG_PATTERN.lastIndex = blockStart;
            const nextBattleTag = BATTLE_TAG_PATTERN.exec(text);
            const blockEnd = nextBattleTag?.index ?? text.length;
            const block = text.slice(blockStart, blockEnd);

            let lineStart = 0;
            for (let index = 0; index <= block.length; index += 1) {
                if (index !== block.length && block[index] !== '\n') continue;
                const line = block.slice(lineStart, index);
                ranges.push(...findLineHighlightRanges(line, blockStart + lineStart));
                lineStart = index + 1;
            }
        }
    }

    return mergeHighlightRanges(ranges);
};
