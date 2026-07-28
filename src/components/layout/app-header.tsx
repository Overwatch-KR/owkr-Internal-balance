import { BookOpen, FileSpreadsheet, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

interface AppHeaderProps {
    isGuideOpen: boolean;
    isLoggingOut: boolean;
    isUserSheetOpen: boolean;
    onLogout: () => void;
    onOpenGuide: () => void;
    onOpenUserSheet: () => void;
    userName: string;
    userSheetHasError: boolean;
}

/**
 * @description 앱 전역 탐색과 로그인 사용자 동작을 독립된 상단 영역으로 제공한다.
 */
export function AppHeader({
    isGuideOpen,
    isLoggingOut,
    isUserSheetOpen,
    onLogout,
    onOpenGuide,
    onOpenUserSheet,
    userName,
    userSheetHasError,
}: AppHeaderProps) {
    return (
        <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-surface/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-8">
                <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-xl font-bold tracking-tight text-transparent"
                >
                    OWKR Balance
                </motion.h1>

                <nav className="flex items-center gap-1" aria-label="주요 메뉴">
                    <button
                        type="button"
                        onClick={onOpenUserSheet}
                        aria-haspopup="dialog"
                        aria-expanded={isUserSheetOpen}
                        className={`relative inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                            userSheetHasError
                                ? 'text-amber-300 hover:bg-amber-500/10'
                                : 'text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200'
                        }`}
                    >
                        <FileSpreadsheet size={15} aria-hidden="true" />
                        <span className="hidden sm:inline">유저 시트</span>
                        {userSheetHasError && (
                            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" aria-label="유저 시트 연결 오류" />
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onOpenGuide}
                        data-guide-control="true"
                        aria-expanded={isGuideOpen}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                    >
                        <BookOpen size={15} aria-hidden="true" />
                        사용 가이드
                    </button>
                    <div className="mx-1 hidden h-4 w-px bg-slate-800 sm:block" aria-hidden="true" />
                    <span className="hidden max-w-28 truncate px-1 text-xs text-slate-500 sm:block">{userName}</span>
                    <button
                        type="button"
                        onClick={onLogout}
                        disabled={isLoggingOut}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 disabled:cursor-wait disabled:opacity-40"
                        aria-label="로그아웃"
                    >
                        <LogOut size={15} aria-hidden="true" />
                        <span className="hidden md:inline">{isLoggingOut ? '처리 중' : '로그아웃'}</span>
                    </button>
                </nav>
            </div>
        </header>
    );
}
