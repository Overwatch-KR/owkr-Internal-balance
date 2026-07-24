import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GuideResumePrompt } from './guide-resume-prompt';
import { OnboardingGuide } from './onboarding-guide';

describe('OnboardingGuide', () => {
    it('입력 가이드를 5단계 투어로 시작한다', () => {
        const markup = renderToStaticMarkup(
            <OnboardingGuide
                variant="start"
                onDismiss={() => undefined}
            />,
        );

        expect(markup).toContain('입력 가이드 · 1/5');
        expect(markup).toContain('채팅 명단을 한 번에 가져오세요');
        expect(markup).toContain('디스코드에서 배틀태그와 역할별 티어가 적힌 채팅');
        expect(markup).not.toContain('화면으로 자동 이동했습니다');
        expect(markup).not.toContain('화면으로 자동 전환했습니다');
        expect(markup).not.toContain('단계에 맞춰 화면과 기능을 자동으로 적용합니다');
        expect(markup).toContain('다음');
        expect(markup).toContain('이전');
    });

    it('결과 활용 가이드를 5단계 투어로 시작한다', () => {
        const markup = renderToStaticMarkup(
            <OnboardingGuide variant="result" onDismiss={() => undefined} />,
        );

        expect(markup).toContain('결과 활용 가이드 · 1/5');
        expect(markup).toContain('전체 밸런스를 먼저 확인하세요');
        expect(markup).toContain('총점 차이');
        expect(markup).not.toContain('예시 명단 채우기');
    });

    it('저장된 단계부터 결과 가이드를 이어서 표시한다', () => {
        const markup = renderToStaticMarkup(
            <OnboardingGuide
                variant="result"
                initialStep="result-alternatives"
                onDismiss={() => undefined}
            />,
        );

        expect(markup).toContain('결과 활용 가이드 · 3/5');
        expect(markup).toContain('다른 팀 조합을 바로 비교하세요');
    });

    it('교체 단계에서는 안내 배너 대신 실제 선수 행의 이동을 설명한다', () => {
        const markup = renderToStaticMarkup(
            <OnboardingGuide
                variant="result"
                initialStep="result-swap"
                onDismiss={() => undefined}
            />,
        );

        expect(markup).toContain('결과 활용 가이드 · 4/5');
        expect(markup).toContain('강조된 탱커 행에서 양 팀 선수가 실제로 자리를 바꾸는 모습');
        expect(markup).not.toContain('가이드가 양 팀 탱커를 예시로 교체');
    });

    it('중단한 가이드를 이어보거나 처음부터 시작할 수 있다', () => {
        const markup = renderToStaticMarkup(
            <GuideResumePrompt
                progress={{
                    stepId: 'start-roster',
                    variant: 'start',
                    version: 1,
                }}
                onDismiss={() => undefined}
                onRestart={() => undefined}
                onResume={() => undefined}
            />,
        );

        expect(markup).toContain('이전 가이드를 이어서 볼까요?');
        expect(markup).toContain('입력 가이드 · 4/5');
        expect(markup).toContain('4단계부터 이어보기');
        expect(markup).toContain('처음부터');
    });
});
