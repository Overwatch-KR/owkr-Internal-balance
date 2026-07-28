import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DiscordSheetImport } from './discord-sheet-import';

describe('DiscordSheetImport', () => {
    it('설명과 접근 가능한 펼치기 상태를 표시한다', () => {
        const markup = renderToStaticMarkup(
            <DiscordSheetImport onImport={vi.fn()} />,
        );

        expect(markup).toContain('디스코드 채팅에서 가져오기');
        expect(markup).toContain('빠른 입력');
        expect(markup).toContain('aria-expanded="false"');
        expect(markup).toContain('aria-controls="discord-sheet-import-panel"');
    });
});
