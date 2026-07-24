export type GuideVariant = 'start' | 'result';
export type GuideStepId =
    | 'start-discord'
    | 'start-manual'
    | 'start-mentions'
    | 'start-roster'
    | 'start-matching'
    | 'result-summary'
    | 'result-exceptions'
    | 'result-alternatives'
    | 'result-swap'
    | 'result-share';

export interface GuideProgress {
    stepId: GuideStepId;
    variant: GuideVariant;
    version: 1;
}

export const GUIDE_STEP_IDS: Record<GuideVariant, readonly GuideStepId[]> = {
    start: [
        'start-discord',
        'start-manual',
        'start-mentions',
        'start-roster',
        'start-matching',
    ],
    result: [
        'result-summary',
        'result-exceptions',
        'result-alternatives',
        'result-swap',
        'result-share',
    ],
};

/**
 * @description 단계 식별자가 속한 입력 또는 결과 가이드 종류를 반환한다.
 */
export const getGuideVariant = (stepId: GuideStepId): GuideVariant => (
    stepId.startsWith('result-') ? 'result' : 'start'
);

/**
 * @description 저장된 가이드 진행 정보가 현재 스키마와 단계 목록에 맞는지 확인한다.
 */
export const isValidGuideProgress = (value: unknown): value is GuideProgress => {
    if (!value || typeof value !== 'object') return false;

    const progress = value as Partial<GuideProgress>;
    if (progress.version !== 1 || !progress.variant || !progress.stepId) return false;

    return GUIDE_STEP_IDS[progress.variant]?.includes(progress.stepId) ?? false;
};

/**
 * @description 가이드 단계의 1부터 시작하는 순서와 전체 단계 수를 반환한다.
 */
export const getGuideStepPosition = (
    variant: GuideVariant,
    stepId: GuideStepId,
): { current: number; total: number } => {
    const steps = GUIDE_STEP_IDS[variant];
    const index = steps.indexOf(stepId);

    return {
        current: index >= 0 ? index + 1 : 1,
        total: steps.length,
    };
};

/**
 * @description 첫 단계보다 진행된 저장 기록이 현재 화면의 가이드와 이어질 수 있는지 확인한다.
 */
export const canResumeGuide = (
    progress: GuideProgress | null,
    variant: GuideVariant,
): progress is GuideProgress => {
    if (!progress || progress.variant !== variant) return false;
    return getGuideStepPosition(progress.variant, progress.stepId).current > 1;
};
