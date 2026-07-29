interface SkeletonProps {
    className?: string;
}

/**
 * @description 데이터 로딩 중 실제 콘텐츠의 크기와 위치를 미리 보여주는 공통 플레이스홀더다.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <span
            aria-hidden="true"
            className={`block animate-pulse rounded-lg bg-slate-800/70 ${className}`}
        />
    );
}
