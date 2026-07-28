import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RosterImportAction } from '.';

describe('RosterImportAction', () => {
    it('비선호 역할 중복이 있으면 별도 경고 카드 없이 가져오기 버튼을 비활성화한다', () => {
        const markup = renderToStaticMarkup(
            <RosterImportAction
                hasWarnings
                hasPasteText
                isChecking={false}
                onImport={vi.fn()}
            />,
        );

        expect(markup).toContain('disabled=""');
        expect(markup).toContain('aria-describedby="roster-paste-error-navigation"');
        expect(markup).not.toContain('비선호 포지션을 한 개만 남겨 주세요');
    });

    it('입력 확인이 끝나고 경고가 없으면 가져오기를 활성화한다', () => {
        const markup = renderToStaticMarkup(
            <RosterImportAction
                hasWarnings={false}
                hasPasteText
                isChecking={false}
                onImport={vi.fn()}
            />,
        );

        expect(markup).not.toContain('disabled=""');
        expect(markup).toContain('명단 가져오기');
    });

    it('키보드 입력 직후 검사 중에는 버튼을 잠시 비활성화한다', () => {
        const markup = renderToStaticMarkup(
            <RosterImportAction
                hasWarnings={false}
                hasPasteText
                isChecking
                onImport={vi.fn()}
            />,
        );

        expect(markup).toContain('disabled=""');
        expect(markup).toContain('입력 확인 중…');
    });
});
