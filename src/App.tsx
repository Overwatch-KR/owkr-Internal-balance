import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { SAMPLE_ROSTER, getTierScore } from './constants';
import {
    getEligibleRosterPlayers,
    parseMultipleLines,
} from './utils/parser';
import { swapMatchResultPlayers } from './utils/balance';
import {
    isMatchResultStale,
    reconcilePlayers,
    syncMatchResultPlayerIdentities,
} from './utils/player';
import { normalizePlayerRolePreferences } from './utils/role-preference';
import {
    addMissingPlayersToUserSheet,
    createUserSheetPlayerLookup,
    normalizeUserSheetBattleTag,
} from './utils/user-sheet';
import { useOnboardingGuide } from './hooks/use-onboarding-guide';
import { usePlayerInput } from './hooks/use-player-input';
import { useToast } from './hooks/use-toast';
import { useAuth, type AuthUser } from './hooks/use-auth';
import { useMatchSession } from './hooks/use-match-session';
import { useUserSheet } from './hooks/use-user-sheet';
import { getErrorMessage } from './utils/api';
import { clearPlayerNoteCache } from './utils/player-note';
import type { Player, Role, SwapSource } from './types';
import type { RosterImportMode } from './utils/player';
import PlayerForm from './components/player/form';
import { RosterIdentityResolver } from './components/player/form/roster-identity-resolver';
import PlayerList from './components/player/list';
import { OnboardingGuide } from './components/onboarding-guide';
import { GuideResumePrompt } from './components/guide-resume-prompt';
import { AppToast } from './components/app-toast';
import LoginScreen from './components/auth/login-screen';
import LoadingScreen from './components/common/loading-screen';
import {
    ErrorDetailsModal,
    type ErrorDetails,
} from './components/common/error-details-modal';
import { AppHeader } from './components/layout/app-header';
import { MatchResultPanel } from './components/match/match-result-panel';

const UserSheetModal = lazy(() => import('./components/user-sheet/user-sheet-modal').then(module => ({
    default: module.UserSheetModal,
})));

const normalizePlayerName = (name: string) => name.trim().toLowerCase();

interface MatchAppProps {
    csrfToken: string;
    logout: () => Promise<void>;
    user: AuthUser;
}

interface PendingIdentityImport {
    failedLines: string[];
    incoming: Player[];
}

const MatchApp = ({ csrfToken, logout, user }: MatchAppProps) => {
    const {
        alternatives,
        balanceTeams,
        isBalancing,
        participantMentions,
        players,
        result,
        setAlternatives,
        setParticipantMentions,
        setPlayers,
        setResult,
    } = useMatchSession(user.id);

    const {
        editingPlayerId,
        editPlayer: handleEditPlayer,
        failedParses,
        inputMode,
        inputSummary,
        inputs,
        isInputCollapsed,
        isPasteValidationPending,
        pasteText,
        pasteAvoidedRoleWarnings,
        pendingRosterImport,
        resetInputs: handleCancelEdit,
        selectInputMode: handleGuideInputMode,
        setFailedParses,
        setInputMode,
        setInputSummary,
        setInputs,
        setIsInputCollapsed,
        setPasteText,
        setPendingRosterImport,
        updatePasteText,
    } = usePlayerInput(players.length);
    const [swapSource, setSwapSource] = useState<SwapSource | null>(null);
    const [showAllRanks, setShowAllRanks] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
    const [manualInputError, setManualInputError] = useState('');
    const [pendingIdentityImport, setPendingIdentityImport] = useState<PendingIdentityImport | null>(null);
    const userSheet = useUserSheet();
    const { dismissToast, showToast, toast } = useToast();
    const resetPlayerInputs = useCallback(() => {
        handleCancelEdit();
        setManualInputError('');
    }, [handleCancelEdit]);
    const startEditingPlayer = useCallback((player: Player) => {
        handleEditPlayer(player);
        setManualInputError('');
    }, [handleEditPlayer]);
    const showDetailedError = useCallback((message: string, details: ErrorDetails) => {
        showToast('error', message, {
            label: '자세히 보기',
            onClick: () => setErrorDetails(details),
        });
    }, [showToast]);

    const addPlayer = () => {
        if (!inputs.name.trim()) {
            setIsInputCollapsed(false);
            setManualInputError('배틀태그를 Player#1234 형식으로 입력해 주세요.');
            return;
        }
        const normalizedName = normalizePlayerName(inputs.name);
        if (players.some(player => (
            player.id !== editingPlayerId
            && normalizePlayerName(player.name) === normalizedName
        ))) {
            setIsInputCollapsed(false);
            const duplicate = players.find(player => (
                player.id !== editingPlayerId
                && normalizePlayerName(player.name) === normalizedName
            ));
            setManualInputError(
                `${duplicate?.discordName ?? duplicate?.name ?? inputs.name} 참가자가 이미 명단에 있습니다. 기존 참가자 카드를 수정해 주세요.`,
            );
            return;
        }
        const tTier = inputs.tTier;
        const dTier = inputs.dTier;
        const sTier = inputs.sTier;
        const existingPlayer = editingPlayerId === null
            ? undefined
            : players.find(player => player.id === editingPlayerId);
        if (editingPlayerId !== null && !existingPlayer) {
            resetPlayerInputs();
            showDetailedError('수정할 참가자를 찾지 못했습니다.', {
                title: '참가자 정보가 변경되었습니다',
                description: '수정 중이던 참가자가 이미 삭제되었거나 명단이 갱신되었습니다.',
                hint: '현재 참가자 목록에서 대상을 다시 선택해 주세요.',
            });
            return;
        }
        const willJoinWaitlist = editingPlayerId === null && players.length >= 10;
        const newPlayer = normalizePlayerRolePreferences({
            id: editingPlayerId ?? Date.now(),
            name: inputs.name.trim(),
            discordName: inputs.discordName.trim() || undefined,
            discordUserId: existingPlayer?.discordUserId,
            userSheetEntryId: existingPlayer?.userSheetEntryId,
            tank: { tier: tTier, div: inputs.tDiv, score: getTierScore(tTier, inputs.tDiv), isPreferred: inputs.tPref, isAvoided: inputs.tAvoid },
            dps: { tier: dTier, div: inputs.dDiv, score: getTierScore(dTier, inputs.dDiv), isPreferred: inputs.dPref, isAvoided: inputs.dAvoid },
            sup: { tier: sTier, div: inputs.sDiv, score: getTierScore(sTier, inputs.sDiv), isPreferred: inputs.sPref, isAvoided: inputs.sAvoid },
            noMic: inputs.noMic,
        });
        const isEditing = editingPlayerId !== null;
        setPlayers(prev => isEditing
            ? prev.map(player => player.id === editingPlayerId ? newPlayer : player)
            : [...prev, newPlayer]);
        setFailedParses(previous => previous.filter((entry) => {
            const battleTag = entry.match(/[^\s·]+#\d{4,}/)?.[0];
            return !battleTag || normalizePlayerName(battleTag) !== normalizePlayerName(newPlayer.name);
        }));
        resetPlayerInputs();
        const hasOtherFailedParses = failedParses.some((entry) => {
            const battleTag = entry.match(/[^\s·]+#\d{4,}/)?.[0];
            return !battleTag || normalizePlayerName(battleTag) !== normalizePlayerName(newPlayer.name);
        });
        if (!hasOtherFailedParses) {
            setInputSummary(isEditing
                ? `참가자 수정 완료 · ${newPlayer.discordName ?? newPlayer.name}`
                : willJoinWaitlist
                    ? `대기열에 추가 완료 · ${newPlayer.discordName ?? newPlayer.name}`
                    : `참가자 1명 추가 완료 · ${newPlayer.discordName ?? newPlayer.name}`);
            setIsInputCollapsed(true);
        } else {
            setIsInputCollapsed(false);
        }
    };

    const commitRosterImport = async (
        incoming: Player[],
        failedLines: string[],
        mode: RosterImportMode,
    ): Promise<void> => {
        const eligibleIncoming = getEligibleRosterPlayers(
            incoming,
            failedLines,
            [],
        );
        const reconciled = reconcilePlayers(players, eligibleIncoming, mode);
        const waitlistCount = Math.max(reconciled.players.length - 10, 0);
        const hasIssues = failedLines.length > 0 || failedParses.length > 0;
        const syncedResult = result
            ? syncMatchResultPlayerIdentities(result, reconciled.players)
            : null;
        const shouldClearMatchResult = syncedResult
            ? isMatchResultStale(syncedResult, reconciled.players.slice(0, 10))
            : false;

        if (failedLines.length > 0) {
            setFailedParses(previous => [...new Set([...previous, ...failedLines])]);
        }
        setPlayers(reconciled.players);
        setResult(shouldClearMatchResult ? null : syncedResult);
        setAlternatives(shouldClearMatchResult
            ? []
            : alternatives.map(alternative => (
                syncMatchResultPlayerIdentities(alternative, reconciled.players)
            )));
        setSwapSource(null);
        setPendingRosterImport(null);
        resetPlayerInputs();

        const summaryParts = mode === 'replace'
            ? [
                `유지 ${reconciled.unchangedCount}명`,
                `갱신 ${reconciled.updatedCount}명`,
                `신규 ${reconciled.addedCount}명`,
                `제외 ${reconciled.removedCount}명`,
            ]
            : [
                `갱신 ${reconciled.updatedCount}명`,
                `신규 ${reconciled.addedCount}명`,
            ];
        if (waitlistCount > 0) summaryParts.push(`대기열 ${waitlistCount}명`);
        if (failedLines.length > 0) {
            summaryParts.push(`보완 ${failedLines.length}명`);
        }
        if (shouldClearMatchResult && reconciled.players.length >= 10) {
            summaryParts.push('팀 재배정 필요');
        }
        const importSummary = `${mode === 'replace' ? '새 명단 적용' : '기존 명단에 추가'} · ${summaryParts.join(' · ')}`;
        setInputSummary(importSummary);

        if (hasIssues) {
            setIsInputCollapsed(false);
        } else {
            setIsInputCollapsed(true);
            setPasteText('');
        }

        let sheetAddedCount = 0;
        try {
            const sheetResult = await addMissingPlayersToUserSheet(eligibleIncoming, csrfToken);
            sheetAddedCount = sheetResult.addedCount;
            userSheet.updateSnapshot(sheetResult);
        } catch (error) {
            const message = getErrorMessage(error, '유저 시트에 신규 참가자를 추가하지 못했습니다.');
            showDetailedError(
                '참여 명단은 적용했지만 유저 시트는 갱신하지 못했습니다.',
                {
                    title: '유저 시트 자동 추가를 완료하지 못했습니다',
                    description: message,
                    hint: '참여 명단은 정상적으로 적용되었습니다. 유저 시트를 새로고침한 뒤 누락된 참가자를 다시 추가해 주세요.',
                },
            );
            return;
        }

        if (sheetAddedCount > 0) {
            setInputSummary(`${importSummary} · 유저 시트 신규 ${sheetAddedCount}명`);
        }
    };

    const applyPendingRosterImport = (mode: RosterImportMode) => {
        if (!pendingRosterImport) return;
        void commitRosterImport(
            pendingRosterImport.incoming,
            pendingRosterImport.failedLines,
            mode,
        );
    };

    const continueRosterImport = (
        incoming: Player[],
        failedLines: string[],
    ) => {
        if (players.length === 0 && failedLines.length === 0) {
            void commitRosterImport(incoming, failedLines, 'replace');
            return;
        }

        setPendingRosterImport({ incoming, failedLines });
        setIsInputCollapsed(false);
    };

    const requestRosterIdentityReview = (
        incoming: Player[],
        failedLines: string[],
    ) => {
        setPendingRosterImport(null);
        setPendingIdentityImport({ incoming, failedLines });
        setIsInputCollapsed(false);
    };

    const handlePaste = () => {
        if (!pasteText.trim()) {
            showDetailedError('붙여넣을 디스코드 채팅이 없습니다.', {
                title: '가져올 명단이 비어 있습니다',
                description: '채팅 붙여넣기 입력란에서 읽어낼 내용이 없습니다.',
                hint: 'Discord에서 참가자 명단이 포함된 채팅을 복사해 입력란에 붙여넣어 주세요.',
            });
            return;
        }
        const { players: parsedPlayers, failedLines, avoidedRoleWarnings: importWarnings } = parseMultipleLines(pasteText);

        if (importWarnings.length > 0) {
            setPendingRosterImport(null);
            setIsInputCollapsed(false);
            return;
        }

        if (parsedPlayers.length === 0) {
            if (failedLines.length > 0) {
                setFailedParses(previous => [...new Set([...previous, ...failedLines])]);
            }
            setIsInputCollapsed(false);
            setPendingRosterImport(null);
            showDetailedError(
                '읽어낸 플레이어가 없습니다.',
                {
                    title: 'Discord 명단을 해석하지 못했습니다',
                    description: '붙여넣은 내용에서 올바른 배틀태그와 세 역할 티어를 찾지 못했습니다.',
                    items: failedLines,
                    hint: 'Player#1234 다3/플2/마5 형식이 포함되어 있는지 확인해 주세요.',
                },
            );
            return;
        }

        requestRosterIdentityReview(parsedPlayers, failedLines);
    };

    const handleRunMatching = async (): Promise<boolean> => {
        if (!isReady) {
            showToast('error', '팀을 짜려면 참가자 10명이 필요합니다.');
            return false;
        }
        setAlternatives([]);
        setSwapSource(null);
        const participants = players.slice(0, 10);
        try {
            await balanceTeams(participants);
            return true;
        } catch (error) {
            const errorMessage = getErrorMessage(error, '매칭 중 오류가 발생했습니다.');
            showDetailedError(errorMessage, {
                title: '팀 자동 배정을 완료하지 못했습니다',
                description: errorMessage,
                hint: '참가자 역할 티어를 확인한 뒤 다시 시도해 주세요. 계속 실패하면 페이지를 새로고침해 주세요.',
            });
            return false;
        }
    };

    const handleSlotClick = (teamIdx: number, role: Role, idx: number) => {
        if (!result) return;
        if (swapSource) {
            if (swapSource.teamIdx === teamIdx && swapSource.role === role && swapSource.index === idx) {
                setSwapSource(null);
                return;
            }
            setResult(swapMatchResultPlayers(
                result,
                swapSource,
                { teamIdx, role, index: idx },
            ));
            setSwapSource(null);
        } else {
            setSwapSource({ teamIdx, role, index: idx });
        }
    };

    // 참여자 제거 시 대기자 자동 승격 처리
    const handleRemovePlayer = (playerId: number) => {
        const removedIndex = players.findIndex(player => player.id === playerId);
        const removedPlayer = players[removedIndex];
        if (!removedPlayer) return;
        const previousResult = result;
        const previousAlternatives = alternatives;
        const previousSwapSource = swapSource;

        setPlayers(prev => prev.filter(p => p.id !== playerId));
        if (removedIndex < 10) {
            setResult(null);
            setAlternatives([]);
            setSwapSource(null);
        }
        if (editingPlayerId === playerId) {
            resetPlayerInputs();
        }
        showToast(
            'success',
            `${removedPlayer.discordName ?? removedPlayer.name}을 명단에서 제외했습니다.`,
            {
                label: '실행 취소',
                onClick: () => {
                    setPlayers(current => {
                        if (current.some(player => player.id === removedPlayer.id)) return current;
                        const restored = [...current];
                        restored.splice(Math.min(removedIndex, restored.length), 0, removedPlayer);
                        return restored;
                    });
                    if (removedIndex < 10) {
                        setResult(previousResult);
                        setAlternatives(previousAlternatives);
                        setSwapSource(previousSwapSource);
                    }
                },
            },
        );
    };

    const handleClearAll = () => {
        if (players.length === 0) return;
        const previousPlayers = players;
        const previousInputSummary = inputSummary;
        const previousInputCollapsed = isInputCollapsed;
        const previousResult = result;
        const previousAlternatives = alternatives;
        const previousSwapSource = swapSource;

        setPlayers([]);
        setResult(null);
        setAlternatives([]);
        setPendingRosterImport(null);
        setInputSummary('');
        setIsInputCollapsed(false);
        setSwapSource(null);
        resetPlayerInputs();
        showToast('success', '전체 참여 명단을 비웠습니다.', {
            label: '실행 취소',
            onClick: () => {
                setPlayers(previousPlayers);
                setInputSummary(previousInputSummary);
                setIsInputCollapsed(previousInputCollapsed);
                setResult(previousResult);
                setAlternatives(previousAlternatives);
                setSwapSource(previousSwapSource);
            },
        });
    };

    const handleClearResult = () => {
        if (!result) return;
        const previousResult = result;
        const previousAlternatives = alternatives;
        const previousSwapSource = swapSource;

        setResult(null);
        setAlternatives([]);
        setSwapSource(null);
        showToast('success', '팀 배정 결과를 지웠습니다.', {
            label: '실행 취소',
            onClick: () => {
                setResult(previousResult);
                setAlternatives(previousAlternatives);
                setSwapSource(previousSwapSource);
            },
        });
    };

    const handleUseExampleRoster = () => {
        if (players.length > 0) {
            showToast('error', '기존 명단이 있어 더미 참가자를 추가하지 않았습니다.');
            return;
        }

        const {
            players: examplePlayers,
            failedLines,
            avoidedRoleWarnings: exampleWarnings,
        } = parseMultipleLines(SAMPLE_ROSTER);
        if (examplePlayers.length !== 10 || failedLines.length > 0 || exampleWarnings.length > 0) {
            showToast('error', '더미 참가자 명단을 불러오지 못했습니다.');
            return;
        }

        requestRosterIdentityReview(examplePlayers, []);
    };

    const handleSelectAlternative = (idx: number) => {
        const alternative = alternatives[idx];
        if (!alternative || !result) return;
        const remaining = alternatives.filter((_, index) => index !== idx);
        remaining.unshift(result);
        setResult(alternative);
        setAlternatives(remaining);
        setSwapSource(null);
    };

    const {
        activeGuide,
        completeGuide: handleCompleteGuide,
        dismissGuide: handleDismissGuide,
        handleGuideStepChange,
        initialGuideStep,
        isGuideOpen,
        isGuideResumePromptOpen,
        restartGuide: handleRestartGuide,
        resumableProgress,
        resumeGuide: handleResumeGuide,
        toggleGuide: handleToggleGuide,
    } = useOnboardingGuide({
        alternativeCount: alternatives.length,
        hasResult: Boolean(result),
        onApplyAlternative: () => handleSelectAlternative(0),
        onPrepareOpen: () => {
            setSwapSource(null);
            if (!result) setIsInputCollapsed(false);
        },
        onSelectInputMode: handleGuideInputMode,
        onSwapExample: () => {
            if (!result) return;
            setResult(swapMatchResultPlayers(
                result,
                { teamIdx: 0, role: 'TANK', index: 0 },
                { teamIdx: 1, role: 'TANK', index: 0 },
            ));
            setSwapSource(null);
        },
        onUseExampleRoster: handleUseExampleRoster,
        playerCount: players.length,
    });
    const handleInterruptGuide = useCallback(() => {
        handleDismissGuide();
    }, [handleDismissGuide]);

    // 참여 명단 (첫 10명)과 대기 명단 (나머지) 분리
    const participants = players.slice(0, 10);
    const waitlist = players.slice(10);
    const isReady = participants.length === 10;
    const isResultStale = result ? isMatchResultStale(result, participants) : false;
    const eligiblePendingPlayers = pendingRosterImport
        ? getEligibleRosterPlayers(
            pendingRosterImport.incoming,
            pendingRosterImport.failedLines,
            [],
        )
        : [];
    const rosterImportPreview = pendingRosterImport
        ? reconcilePlayers(players, eligiblePendingPlayers, 'replace')
        : null;
    const userSheetByBattleTag = useMemo(
        () => createUserSheetPlayerLookup(userSheet.entries),
        [userSheet.entries],
    );
    const participantBattleTags = useMemo(() => new Set(
        players.slice(0, 10).map(player => normalizeUserSheetBattleTag(player.name)),
    ), [players]);
    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            userSheet.close();
            await logout();
            clearPlayerNoteCache(user.id);
        } catch (error) {
            showToast('error', getErrorMessage(error, '로그아웃하지 못했습니다. 다시 시도해 주세요.'));
            setIsLoggingOut(false);
        }
    };

    return (
        <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-surface text-slate-200 font-sans">
            <a
                href="#main-content"
                className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
            >
                본문으로 건너뛰기
            </a>
            <AppHeader
                isGuideOpen={isGuideOpen || isGuideResumePromptOpen}
                isLoggingOut={isLoggingOut}
                isUserSheetOpen={userSheet.isOpen}
                onLogout={() => void handleLogout()}
                onOpenGuide={handleToggleGuide}
                onOpenUserSheet={() => {
                    setSwapSource(null);
                    userSheet.open();
                }}
                userName={user.globalName ?? user.username}
                userSheetHasError={Boolean(userSheet.error)}
            />

            {/* Main Content */}
            <main
                id="main-content"
                tabIndex={-1}
                className="mx-auto max-w-[1600px] scroll-mt-20 px-4 py-6 focus:outline-none md:px-8 md:py-8"
            >
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(400px,460px)_minmax(0,1fr)] xl:items-start">
                    {/* Left Panel - Player Input */}
                    <div className="flex min-h-0 min-w-0 flex-col gap-4 xl:sticky xl:top-24 xl:h-[calc(100dvh-8rem)]">
                        <PlayerForm
                            players={players}
                            participantMentions={participantMentions}
                            setParticipantMentions={setParticipantMentions}
                            inputs={inputs}
                            setInputs={setInputs}
                            addPlayer={addPlayer}
                            pasteText={pasteText}
                            pasteAvoidedRoleWarnings={pasteAvoidedRoleWarnings}
                            isPasteValidationPending={isPasteValidationPending}
                            onPasteTextChange={updatePasteText}
                            handlePaste={handlePaste}
                            importPreview={rosterImportPreview ? {
                                incomingCount: eligiblePendingPlayers.length,
                                issues: [
                                    ...(pendingRosterImport?.failedLines ?? []).map((line, index) => ({
                                        id: `failed-${index}-${line}`,
                                        label: '등급 정보 확인',
                                        detail: line,
                                    })),
                                ],
                                addedCount: rosterImportPreview.addedCount,
                                updatedCount: rosterImportPreview.updatedCount,
                                unchangedCount: rosterImportPreview.unchangedCount,
                                removedCount: rosterImportPreview.removedCount,
                            } : null}
                            onApplyImport={applyPendingRosterImport}
                            onCancelImport={() => setPendingRosterImport(null)}
                            failedParses={failedParses}
                            setFailedParses={setFailedParses}
                            isCollapsed={isInputCollapsed}
                            summary={inputSummary}
                            onExpand={() => setIsInputCollapsed(false)}
                            onCollapse={() => setIsInputCollapsed(true)}
                            mode={inputMode}
                            onModeChange={setInputMode}
                            isEditing={editingPlayerId !== null}
                            manualInputError={manualInputError}
                            onCancelEdit={resetPlayerInputs}
                            onClearManualInputError={() => setManualInputError('')}
                            onRemovePlayer={handleRemovePlayer}
                        />
                        <PlayerList
                            participants={participants}
                            waitlist={waitlist}
                            onEditPlayer={startEditingPlayer}
                            onRemovePlayer={handleRemovePlayer}
                            onClearAll={handleClearAll}
                            csrfToken={csrfToken}
                            noteCacheScope={user.id}
                            userSheetByBattleTag={userSheetByBattleTag}
                            onOpenUserSheet={(battleTag, entryId) => {
                                userSheet.open(battleTag, entryId);
                            }}
                        />
                    </div>

                    <MatchResultPanel
                        alternatives={alternatives}
                        isBalancing={isBalancing}
                        isReady={isReady}
                        isResultStale={isResultStale}
                        onCancelSwap={() => setSwapSource(null)}
                        onClearResult={handleClearResult}
                        onRunMatching={() => void handleRunMatching()}
                        onSelectAlternative={handleSelectAlternative}
                        onShowAllRanksChange={setShowAllRanks}
                        onSlotClick={handleSlotClick}
                        participantCount={participants.length}
                        result={result}
                        showAllRanks={showAllRanks}
                        swapSource={swapSource}
                        userSheetByBattleTag={userSheetByBattleTag}
                    />
                </div>
            </main>
            <AnimatePresence>
                {userSheet.isOpen && (
                    <Suspense
                        fallback={(
                            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 text-sm text-slate-400 backdrop-blur-sm">
                                유저 시트를 여는 중…
                            </div>
                        )}
                    >
                        <UserSheetModal
                            key={userSheet.selectedEntryId ?? userSheet.selectedBattleTag ?? 'all-users'}
                            csrfToken={csrfToken}
                            entries={userSheet.entries}
                            error={userSheet.error}
                            initialBattleTag={userSheet.selectedBattleTag}
                            initialEntryId={userSheet.selectedEntryId}
                            isLoading={userSheet.isLoading}
                            noteCacheScope={user.id}
                            participantBattleTags={participantBattleTags}
                            sheetVersion={userSheet.sheetVersion}
                            onEntriesChange={(snapshot, message) => {
                                userSheet.updateSnapshot(snapshot);
                                showToast('success', message);
                            }}
                            onRetry={() => void userSheet.retry()}
                            onSaveError={(message) => {
                                showDetailedError(message, {
                                    title: '유저 시트를 저장하지 못했습니다',
                                    description: message,
                                    hint: '동시 수정 충돌은 표시되는 병합 화면에서 내 초안과 최신값을 비교해 해결할 수 있습니다. 그 외에는 배틀태그 오류와 중복 행을 확인해 주세요.',
                                });
                            }}
                            onSnapshotChange={userSheet.updateSnapshot}
                            onClose={userSheet.close}
                        />
                    </Suspense>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {pendingIdentityImport && (
                    <RosterIdentityResolver
                        entries={userSheet.entries}
                        players={pendingIdentityImport.incoming}
                        onCancel={() => setPendingIdentityImport(null)}
                        onConfirm={(identifiedPlayers) => {
                            const failedLines = pendingIdentityImport.failedLines;
                            setPendingIdentityImport(null);
                            continueRosterImport(identifiedPlayers, failedLines);
                        }}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isGuideResumePromptOpen && resumableProgress && (
                    <GuideResumePrompt
                        key="guide-resume-prompt"
                        progress={resumableProgress}
                        onDismiss={handleDismissGuide}
                        onRestart={handleRestartGuide}
                        onResume={handleResumeGuide}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {activeGuide && (
                    <OnboardingGuide
                        key={activeGuide}
                        initialStep={initialGuideStep ?? undefined}
                        isWorking={isBalancing}
                        variant={activeGuide}
                        onComplete={handleCompleteGuide}
                        onDismiss={handleDismissGuide}
                        onInterrupt={handleInterruptGuide}
                        onStepChange={handleGuideStepChange}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {errorDetails && (
                    <ErrorDetailsModal
                        details={errorDetails}
                        onClose={() => setErrorDetails(null)}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {toast && (
                    <AppToast toast={toast} onDismiss={dismissToast} />
                )}
            </AnimatePresence>
        </div>
        </MotionConfig>
    );
};

const App = () => {
    const { csrfToken, error, isLoading, logout, retry, user } = useAuth();
    if (isLoading) return <LoadingScreen />;
    if (!user) return <LoginScreen serviceError={error} onRetry={retry} />;
    return <MatchApp csrfToken={csrfToken} logout={logout} user={user} />;
};

export default App;
