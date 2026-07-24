import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Rank } from '../../types';
import RankBadge from './rank-badge';

const unrankedRank: Rank = {
    tier: 'UNRANKED',
    div: 0,
    score: 0,
    isPreferred: false,
    isAvoided: false,
};

describe('RankBadge', () => {
    it('미배치를 기존 배지 안에서 중립 라벨과 방패 아이콘으로 표시한다', () => {
        const markup = renderToStaticMarkup(
            <RankBadge role="SUPPORT" rank={unrankedRank} />,
        );

        expect(markup).toContain('data-tier="UNRANKED"');
        expect(markup).toContain('aria-label="지원 미배치"');
        expect(markup).toContain('미배치');
        expect(markup).toContain('lucide-shield-question-mark');
        expect(markup).toContain('border-slate-600/70');
        expect(markup).not.toContain('0 디비전');
    });

    it('배정된 미배치는 체크 아이콘과 중립 포커스로 선택 상태를 함께 구분한다', () => {
        const markup = renderToStaticMarkup(
            <RankBadge role="SUPPORT" rank={unrankedRank} isAssigned />,
        );

        expect(markup).toContain('data-assigned="true"');
        expect(markup).toContain('현재 배정 역할');
        expect(markup).toContain('ring-slate-300/70');
        expect(markup).toContain('lucide-check');
    });
});
