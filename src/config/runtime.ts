/**
 * @description 개발 서버에서만 로그인·공유 API를 localStorage로 대체하는 검수 모드를 표시한다.
 */
export const IS_LOCAL_REVIEW_MODE = import.meta.env.DEV
    && import.meta.env.VITE_LOCAL_REVIEW_MODE === 'true'
    && !import.meta.env.VITEST;
