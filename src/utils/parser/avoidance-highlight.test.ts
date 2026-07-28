import { describe, expect, it } from 'vitest';
import { parseMultipleLines } from '.';
import { findAvoidedRoleHighlightRanges } from './avoidance-highlight';

const getHighlightedText = (text: string): string[] => {
    const { avoidedRoleWarnings } = parseMultipleLines(text);
    return findAvoidedRoleHighlightRanges(text, avoidedRoleWarnings)
        .map(range => text.slice(range.start, range.end));
};

describe('findAvoidedRoleHighlightRanges', () => {
    it('문제 참가자의 슬래시 포지션 구간만 각각 찾는다', () => {
        const text = [
            '재준역할 아이콘, 신참 — 26. 7. 26. 오후 10:08',
            '대인기피증있어요#3166 마4? / 마4? / 마1 !',
            '달사탕역할 아이콘, 역할 아이콘 — 26. 7. 26. 오후 10:08',
            '달사탕#31414 다3 / 다4 / 다3',
        ].join('\n');

        expect(getHighlightedText(text)).toEqual(['마4?', '마4?']);
    });

    it('물음표가 띄어져 있거나 역할 이름에 붙은 형식도 함께 표시한다', () => {
        const text = [
            'First#1234 플4 ? / 다2(?) / 마1',
            'Second#5678 탱? 골2 딜? 플3 힐 마1',
        ].join('\n');

        expect(getHighlightedText(text)).toEqual([
            '플4 ?',
            '다2(?)',
            '탱? 골2',
            '딜? 플3',
        ]);
    });
});
