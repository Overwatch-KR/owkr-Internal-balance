import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PlayerList from '.';

describe('PlayerList', () => {
    it('모든 화면 폭에서 참가자 명단을 별도 스크롤 영역으로 유지한다', () => {
        const markup = renderToStaticMarkup(
            <PlayerList
                participants={[]}
                waitlist={[]}
                onEditPlayer={vi.fn()}
                onRemovePlayer={vi.fn()}
                onClearAll={vi.fn()}
                csrfToken="csrf-token"
                userSheetByBattleTag={new Map()}
                onOpenUserSheet={vi.fn()}
            />,
        );

        expect(markup).toContain('aria-label="참가자 스크롤 목록"');
        expect(markup).toContain('overflow-y-auto');
        expect(markup).toContain('max-xl:max-h-[32rem]');
        expect(markup).not.toContain('xl:overflow-y-auto');
    });
});
