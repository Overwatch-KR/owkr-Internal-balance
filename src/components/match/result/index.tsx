import { useRef } from 'react';
import { AlertTriangle, ArrowLeftRight, Loader2, X } from 'lucide-react';
import type { MatchResultData, Role, SwapSource, TeamResult } from '../../../types';
import { useCopyImage } from '../../../hooks/use-copy-image';
import MatchupTable from './matchup-table';
import CopyButton from './copy-button';
import BalanceSummary from './balance-summary';

interface MatchResultProps {
    matchResult: MatchResultData;
    onSlotClick: (teamIdx: number, role: Role, idx: number) => void;
    swapSource: SwapSource | null;
    alternatives?: MatchResultData[];
    onSelectAlternative?: (idx: number) => void;
    isGeneratingAlternatives?: boolean;
    isStale?: boolean;
    onCancelSwap?: () => void;
    onShowAllRanksChange?: (showAllRanks: boolean) => void;
    showAllRanks?: boolean;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('ko-KR');

const getTeamRosterLabel = (team: TeamResult): string => [
    ...team.assignment.TANK,
    ...team.assignment.DPS,
    ...team.assignment.SUPPORT,
].map((player) => player.discordName ?? player.name.split('#')[0]).join(' · ');

const getMatchResultKey = (result: MatchResultData): string => [
    ...result.teamA.assignment.TANK,
    ...result.teamA.assignment.DPS,
    ...result.teamA.assignment.SUPPORT,
    ...result.teamB.assignment.TANK,
    ...result.teamB.assignment.DPS,
    ...result.teamB.assignment.SUPPORT,
].map((player) => player.id).join('-');

const getSelectedSwapPlayer = (
    matchResult: MatchResultData,
    swapSource: SwapSource | null,
) => {
    if (!swapSource) return null;
    const team = swapSource.teamIdx === 0 ? matchResult.teamA : matchResult.teamB;
    return team.assignment[swapSource.role][swapSource.index] ?? null;
};

const MatchResult = ({
    matchResult,
    onSlotClick,
    swapSource,
    alternatives = [],
    onSelectAlternative,
    isGeneratingAlternatives = false,
    isStale = false,
    onCancelSwap,
    onShowAllRanksChange,
    showAllRanks = false,
}: MatchResultProps) => {
    const captureRef = useRef<HTMLDivElement>(null);
    const { copyStatus, handleCopyImage } = useCopyImage(captureRef);
    const selectedSwapPlayer = getSelectedSwapPlayer(matchResult, swapSource);

    return (
        <div id="match-result" className="space-y-4">
            {isStale && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200" role="status">
                    <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
                    <div>
                        <p className="text-sm font-semibold">참가자 정보가 변경되었습니다.</p>
                        <p className="mt-0.5 text-xs text-amber-300/80">다시 매칭해 주세요.</p>
                    </div>
                </div>
            )}

            <BalanceSummary matchResult={matchResult} />

            <div
                id="swap-guide"
                data-exclude-export
                className={`flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                    selectedSwapPlayer
                        ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100'
                        : 'border-slate-800/70 bg-surface-elevated/50 text-slate-400'
                }`}
                role="status"
                aria-live="polite"
            >
                <div className="flex min-w-0 items-center gap-2">
                    <ArrowLeftRight
                        size={14}
                        className={selectedSwapPlayer ? 'shrink-0 text-cyan-300' : 'shrink-0 text-slate-500'}
                        aria-hidden="true"
                    />
                    <p className="min-w-0">
                        {selectedSwapPlayer ? (
                            <>
                                <span className="font-semibold">
                                    {selectedSwapPlayer.discordName ?? selectedSwapPlayer.name}
                                </span>
                                {' '}선택됨 · 바꿀 플레이어를 선택하세요
                            </>
                        ) : (
                            '결과표에서 플레이어 두 명을 차례로 선택하면 자리를 바꿀 수 있습니다'
                        )}
                    </p>
                </div>
                {selectedSwapPlayer && (
                    <button
                        type="button"
                        onClick={onCancelSwap}
                        className="inline-flex min-h-8 shrink-0 touch-manipulation items-center gap-1 rounded-md px-2 text-cyan-200 transition-colors hover:bg-cyan-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                    >
                        <X size={13} aria-hidden="true" />
                        선택 취소
                    </button>
                )}
            </div>

            <div data-exclude-export className="flex justify-end px-1">
                <button
                    type="button"
                    role="switch"
                    aria-checked={showAllRanks}
                    onClick={() => onShowAllRanksChange?.(!showAllRanks)}
                    className="group inline-flex min-h-9 touch-manipulation items-center gap-2.5 rounded-lg px-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                >
                    탱·딜·힐 티어 표시
                    <span
                        aria-hidden="true"
                        className={`relative h-5 w-9 rounded-full border transition-colors ${
                            showAllRanks
                                ? 'border-cyan-400/50 bg-cyan-500/30'
                                : 'border-slate-600 bg-slate-800'
                        }`}
                    >
                        <span
                            className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-[left,background-color] ${
                                showAllRanks
                                    ? 'left-[18px] bg-cyan-300'
                                    : 'left-0.5 bg-slate-400'
                            }`}
                        />
                    </span>
                </button>
            </div>

            <div
                className={`space-y-4 transition-opacity duration-200 ${isStale ? 'opacity-40' : 'opacity-100'}`}
                aria-disabled={isStale}
                inert={isStale}
            >
                {/* 이미지 캡처 영역 */}
                <div
                    ref={captureRef}
                    data-capture-content
                    className="rounded-xl bg-[#0b0c10] py-2.5 sm:py-5"
                >
                    <MatchupTable
                        matchResult={matchResult}
                        onSlotClick={onSlotClick}
                        swapSource={swapSource}
                        showAllRanks={showAllRanks}
                    />
                </div>

                {/* 다른 조합 (캡처 제외) */}
                <div id="alternative-results" className="rounded-lg">
                {alternatives.length > 0 ? (
                    <div className="space-y-2 px-1">
                        <div className="text-sm text-slate-500">다른 팀 조합</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {alternatives.map((alternative, idx) => {
                                const teamARoster = getTeamRosterLabel(alternative.teamA);
                                const teamBRoster = getTeamRosterLabel(alternative.teamB);

                                return (
                                    <button
                                        type="button"
                                        key={getMatchResultKey(alternative)}
                                        onClick={() => onSelectAlternative?.(idx)}
                                        aria-label={`조합 ${idx + 2} 선택. 1팀 ${teamARoster}. 2팀 ${teamBRoster}`}
                                        className="min-w-0 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-left transition-colors hover:border-slate-600 hover:bg-slate-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                                    >
                                        <div className="mb-1.5 flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium text-slate-300">조합 {idx + 2}</span>
                                            <span className="rounded-full bg-slate-900/70 px-2 py-0.5 font-mono text-[10px] tabular-nums text-cyan-300">
                                                총점 차 {NUMBER_FORMATTER.format(Math.round(alternative.metrics?.totalDiff ?? alternative.diff))}
                                            </span>
                                        </div>
                                        <p className="truncate text-[11px] text-slate-400" title={`1팀 · ${teamARoster}`}>
                                            <span className="text-blue-400">1팀</span> · {teamARoster}
                                        </p>
                                        <p className="mt-0.5 truncate text-[11px] text-slate-500" title={`2팀 · ${teamBRoster}`}>
                                            <span className="text-red-400">2팀</span> · {teamBRoster}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : isGeneratingAlternatives ? (
                    <div className="flex items-center gap-2 px-1 text-sm text-slate-500" role="status">
                        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        다른 팀 조합 계산 중…
                    </div>
                ) : null}
                </div>

                {/* 하단 컨트롤 (캡처 제외) */}
                <div id="result-share-controls" className="flex justify-end rounded-lg px-1">
                    <CopyButton status={copyStatus} onClick={handleCopyImage} />
                </div>
            </div>
        </div>
    );
};

export default MatchResult;
