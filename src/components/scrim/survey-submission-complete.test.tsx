import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SurveySubmissionComplete } from './survey-submission-complete';

describe('SurveySubmissionComplete', () => {
    it('shows the success mascot, completion copy, and a home link', () => {
        const markup = renderToStaticMarkup(<SurveySubmissionComplete />);

        expect(markup).toContain('/mascot/dou-success.svg');
        expect(markup).toContain('설문 제출이 완료되었습니다.');
        expect(markup).toContain('소중한 의견 감사합니다.');
        expect(markup).toContain('이미 참여한 설문입니다.');
        expect(markup).toContain('href="/"');
        expect(markup).toContain('홈으로 이동');
    });
});
