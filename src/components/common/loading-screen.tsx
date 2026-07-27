import { Loader2 } from 'lucide-react';

/**
 * @description 로그인 세션을 확인하는 동안 전체 화면 로딩 상태를 표시한다.
 */
const LoadingScreen = () => (
    <main className="flex min-h-screen items-center justify-center bg-surface text-slate-400">
        <div className="flex items-center gap-3 text-sm">
            <Loader2 size={20} className="animate-spin text-cyan-300" aria-hidden="true" />
            로그인 상태를 확인하고 있습니다
        </div>
    </main>
);

export default LoadingScreen;
