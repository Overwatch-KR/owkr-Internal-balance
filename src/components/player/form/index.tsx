import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ListChecks,
    MessageSquareText,
    MicOff,
    Pencil,
    RefreshCw,
    Sparkles,
    User,
    UserMinus,
    UserPlus,
    X,
} from 'lucide-react';
import type { Player } from '../../../types';
import type { RosterImportMode } from '../../../utils/player';
import type { PlayerInputMode, PlayerInputs } from '../../../hooks/use-player-input';
import type { AvoidedRoleWarning } from '../../../utils/parser';
import TierSelect from './tier-select';
import ParticipantChecker from './participant-checker';

export type { PlayerInputMode } from '../../../hooks/use-player-input';

interface RosterImportPreview {
    incomingCount: number;
    issues: Array<{
        detail: string;
        id: string;
        label: string;
    }>;
    addedCount: number;
    updatedCount: number;
    unchangedCount: number;
    removedCount: number;
}

interface PlayerFormProps {
    players: Player[];
    participantMentions: string;
    setParticipantMentions: (value: string) => void;
    inputs: PlayerInputs;
    setInputs: React.Dispatch<React.SetStateAction<PlayerFormProps['inputs']>>;
    addPlayer: () => void;
    pasteText: string;
    onPasteTextChange: (value: string) => void;
    handlePaste: () => void;
    importPreview: RosterImportPreview | null;
    onApplyImport: (mode: RosterImportMode) => void;
    onCancelImport: () => void;
    failedParses: string[];
    setFailedParses: React.Dispatch<React.SetStateAction<string[]>>;
    avoidedRoleWarnings: AvoidedRoleWarning[];
    setAvoidedRoleWarnings: React.Dispatch<React.SetStateAction<AvoidedRoleWarning[]>>;
    isCollapsed: boolean;
    summary: string;
    onExpand: () => void;
    onCollapse: () => void;
    mode: PlayerInputMode;
    onModeChange: (mode: PlayerInputMode) => void;
    isEditing: boolean;
    onCancelEdit: () => void;
    onRemovePlayer: (playerId: number) => void;
}

/**
 * @description 참가자 입력을 제공하고 성공 후에는 한 줄 요약으로 접힌다.
 */
const PlayerForm = ({
    players,
    participantMentions,
    setParticipantMentions,
    inputs,
    setInputs,
    addPlayer,
    pasteText,
    onPasteTextChange,
    handlePaste,
    importPreview,
    onApplyImport,
    onCancelImport,
    failedParses,
    setFailedParses,
    avoidedRoleWarnings,
    setAvoidedRoleWarnings,
    isCollapsed,
    summary,
    onExpand,
    onCollapse,
    mode,
    onModeChange,
    isEditing,
    onCancelEdit,
    onRemovePlayer,
}: PlayerFormProps) => {
    const reduceMotion = useReducedMotion();
    const inputScrollRef = React.useRef<HTMLDivElement>(null);
    const animation = reduceMotion
        ? { duration: 0 }
        : { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const };
    const collapsedMessage = isEditing
        ? `참가자 수정 중 · ${inputs.discordName || inputs.name}`
        : failedParses.length > 0 || avoidedRoleWarnings.length > 0
            ? `입력 항목 ${failedParses.length + avoidedRoleWarnings.length}명 확인 필요`
            : summary || '참가자 입력이 접혀 있습니다';

    React.useEffect(() => {
        inputScrollRef.current?.scrollTo({ top: 0 });
    }, [mode]);

    const handleRemoveFailed = (name: string) => {
        setFailedParses(prev => prev.filter(n => n !== name));
    };

    const handleUseForManualInput = (failedEntry: string, battleTag = failedEntry) => {
        setInputs(prev => ({ ...prev, name: battleTag }));
        setFailedParses(prev => prev.filter(entry => entry !== failedEntry));
        onModeChange('manual');
    };

    const handleUseWarningForManualInput = (warning: AvoidedRoleWarning) => {
        setInputs(prev => ({
            ...prev,
            name: warning.playerName,
            discordName: warning.discordName ?? '',
        }));
        setAvoidedRoleWarnings(previous => (
            previous.filter(item => item.playerName !== warning.playerName)
        ));
        onModeChange('manual');
    };

    return (
        <section id="player-input" className="card scroll-mt-24 shrink-0 overflow-hidden p-0" aria-label="참가자 입력">
            <div className="flex min-h-14 items-center gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    {isCollapsed ? (
                        failedParses.length > 0 || avoidedRoleWarnings.length > 0 ? (
                            <AlertCircle size={17} className="shrink-0 text-amber-400" aria-hidden="true" />
                        ) : isEditing ? (
                            <Pencil size={17} className="shrink-0 text-cyan-300" aria-hidden="true" />
                        ) : summary ? (
                            <CheckCircle2 size={17} className="shrink-0 text-emerald-400" aria-hidden="true" />
                        ) : (
                            <User size={17} className="shrink-0 text-slate-400" aria-hidden="true" />
                        )
                    ) : (
                        <User size={17} className="shrink-0 text-slate-400" aria-hidden="true" />
                    )}
                    {isCollapsed ? (
                        <p className="min-w-0 flex-1 truncate text-sm text-slate-300" role="status">
                            {collapsedMessage}
                        </p>
                    ) : (
                        <h2 className="truncate text-sm font-semibold text-white">참가자 입력</h2>
                    )}
                </div>
                <button
                    type="button"
                    onClick={isCollapsed ? onExpand : onCollapse}
                    className={`inline-flex min-h-9 shrink-0 touch-manipulation items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
                        isCollapsed
                            ? 'text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-200'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                    aria-label={isCollapsed ? '참가자 입력 폼 다시 열기' : '참가자 입력 폼 접기'}
                    aria-expanded={!isCollapsed}
                    aria-controls="player-input-content"
                >
                    {isCollapsed ? (
                        <>
                            다시 열기
                            <ChevronDown size={14} aria-hidden="true" />
                        </>
                    ) : (
                        <>
                            접기
                            <ChevronUp size={14} aria-hidden="true" />
                        </>
                    )}
                </button>
            </div>

            <AnimatePresence initial={false}>
                {!isCollapsed ? (
                    <motion.div
                        id="player-input-content"
                        key="input-content"
                        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={animation}
                        className="overflow-hidden border-t border-slate-800/50"
                    >
                        <div
                            ref={inputScrollRef}
                            role="region"
                            aria-label="참가자 입력 내용"
                            tabIndex={0}
                            className="custom-scrollbar scroll-region px-4 pb-4 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/60 xl:max-h-[calc(44dvh-3.5rem)] xl:overflow-y-auto xl:overscroll-contain"
                        >

                            {/* Tab Navigation */}
                            <div id="player-input-tabs" className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-surface p-1 xl:sticky xl:top-0 xl:z-10 xl:-mx-1 xl:bg-surface-elevated/95 xl:pb-2 xl:backdrop-blur" role="group" aria-label="입력 방식">
                            <button
                                id="discord-input-tab"
                                type="button"
                                aria-pressed={mode === 'discord'}
                                onClick={() => onModeChange('discord')}
                                className={`flex min-h-10 flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
                                    mode === 'discord'
                                        ? 'bg-accent text-white shadow-lg shadow-accent/25'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                            >
                                <MessageSquareText size={16} aria-hidden="true" />
                                채팅 붙여넣기
                            </button>
                            <button
                                id="manual-input-tab"
                                type="button"
                                aria-pressed={mode === 'manual'}
                                onClick={() => onModeChange('manual')}
                                className={`flex min-h-10 flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
                                    mode === 'manual'
                                        ? 'bg-accent text-white shadow-lg shadow-accent/25'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                            >
                                <User size={16} aria-hidden="true" />
                                수동 입력
                            </button>
                            <button
                                id="participant-check-tab"
                                type="button"
                                aria-pressed={mode === 'mentions'}
                                onClick={() => onModeChange('mentions')}
                                className={`flex min-h-10 touch-manipulation items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
                                    mode === 'mentions'
                                        ? 'bg-accent text-white shadow-lg shadow-accent/25'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                            >
                                <ListChecks size={16} aria-hidden="true" />
                                참여 대조
                            </button>
                        </div>

                        {/* Discord Parsing Mode */}
                        {mode === 'discord' && (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <label htmlFor="discord-chat" className="mb-3 flex items-center gap-2 text-sm text-slate-400">
                                        <Sparkles size={14} className="text-accent" aria-hidden="true" />
                                        디스코드 채팅 내용을 그대로 붙여넣으세요
                                    </label>
                                    <textarea
                                        id="discord-chat"
                                        name="discord-chat"
                                        autoComplete="off"
                                        spellCheck={false}
                                        className="input-base h-40 resize-none font-mono text-sm leading-relaxed"
                                        placeholder={`예시:\nkimjungun#11853 다5/다1/다5\n학살#38848 다3/마4/다4\nAki#34981 미배치(골)/미배치(플)/플2\n재봉이#31207 그5!/마1!/마4`}
                                        value={pasteText}
                                        onChange={(event) => onPasteTextChange(event.target.value)}
                                    />
                                </div>
                                {importPreview ? (
                                    <div
                                        className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.07] p-3.5"
                                        role="region"
                                        aria-label="참여 명단 변경 확인"
                                    >
                                        <div className="mb-3 flex items-start gap-2.5">
                                            <ListChecks size={17} className="mt-0.5 shrink-0 text-cyan-300" aria-hidden="true" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-cyan-100">
                                                    가져올 {importPreview.incomingCount}명 확인
                                                </p>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                                                    새 명단으로 교체하면 붙여넣은 순서대로 참가자와 대기열을 다시 구성합니다.
                                                </p>
                                            </div>
                                        </div>

                                        <dl className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="rounded-lg bg-surface/70 px-2.5 py-2">
                                                <dt className="flex items-center gap-1 text-slate-500">
                                                    <CheckCircle2 size={12} aria-hidden="true" />
                                                    그대로 유지
                                                </dt>
                                                <dd className="mt-1 font-semibold tabular-nums text-slate-200">
                                                    {importPreview.unchangedCount}명
                                                </dd>
                                            </div>
                                            <div className="rounded-lg bg-surface/70 px-2.5 py-2">
                                                <dt className="flex items-center gap-1 text-slate-500">
                                                    <RefreshCw size={12} aria-hidden="true" />
                                                    정보 갱신
                                                </dt>
                                                <dd className="mt-1 font-semibold tabular-nums text-cyan-200">
                                                    {importPreview.updatedCount}명
                                                </dd>
                                            </div>
                                            <div className="rounded-lg bg-surface/70 px-2.5 py-2">
                                                <dt className="flex items-center gap-1 text-slate-500">
                                                    <UserPlus size={12} aria-hidden="true" />
                                                    새로 참여
                                                </dt>
                                                <dd className="mt-1 font-semibold tabular-nums text-emerald-300">
                                                    {importPreview.addedCount}명
                                                </dd>
                                            </div>
                                            <div className="rounded-lg bg-surface/70 px-2.5 py-2">
                                                <dt className="flex items-center gap-1 text-slate-500">
                                                    <UserMinus size={12} aria-hidden="true" />
                                                    이번 명단에서 제외
                                                </dt>
                                                <dd className="mt-1 font-semibold tabular-nums text-amber-300">
                                                    {importPreview.removedCount}명
                                                </dd>
                                            </div>
                                        </dl>

                                        {importPreview.issues.length > 0 && (
                                            <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] p-3" role="alert">
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-300" aria-hidden="true" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-rose-200">
                                                            자동 추가하지 않는 항목 {importPreview.issues.length}개
                                                        </p>
                                                        <p className="mt-1 text-[11px] leading-relaxed text-rose-200/70">
                                                            원문을 수정한 뒤 다시 가져오거나, 나머지 정상 유저만 먼저 적용할 수 있습니다.
                                                        </p>
                                                    </div>
                                                </div>
                                                <ul className="mt-2.5 space-y-1.5">
                                                    {importPreview.issues.map(issue => (
                                                        <li
                                                            key={issue.id}
                                                            className="rounded-lg border border-rose-500/15 bg-slate-950/35 px-3 py-2"
                                                        >
                                                            <span className="block whitespace-nowrap text-[10px] font-semibold text-rose-300">
                                                                {issue.label}
                                                            </span>
                                                            <span className="mt-0.5 block break-words text-xs leading-relaxed text-slate-300">
                                                                {issue.detail}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="mt-3 grid gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onApplyImport('replace')}
                                                className="btn-primary w-full"
                                            >
                                                정상 유저 {importPreview.incomingCount}명으로 교체
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onApplyImport('append')}
                                                className="btn-ghost w-full border border-slate-700/70"
                                            >
                                                정상 유저만 기존 명단에 추가
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onCancelImport}
                                                className="min-h-9 rounded-md text-xs text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                                            >
                                                변경 취소
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handlePaste}
                                        disabled={!pasteText.trim()}
                                        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        명단 가져오기
                                    </button>
                                )}
                                <p className="text-center text-xs text-slate-500">
                                    <span className="font-semibold text-amber-400">!</span>는 선호,
                                    {' '}<span className="font-semibold text-rose-400">?</span>는 비선호 포지션입니다
                                </p>
                            </div>
                        )}

                        {/* Manual Input Mode */}
                        {mode === 'manual' && (
                            <div className="space-y-4 animate-fade-in">
                                {isEditing && (
                                    <div className="flex items-center gap-3 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2" role="status">
                                        <Pencil size={14} className="shrink-0 text-cyan-300" aria-hidden="true" />
                                        <p className="min-w-0 flex-1 truncate text-xs font-medium text-cyan-100">
                                            참가자 정보 수정 중
                                        </p>
                                        <button
                                            type="button"
                                            onClick={onCancelEdit}
                                            className="inline-flex min-h-8 shrink-0 touch-manipulation items-center rounded-md px-2 text-xs text-slate-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                                        >
                                            수정 취소
                                        </button>
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="battle-tag" className="mb-2 block text-xs font-medium text-slate-400">배틀태그</label>
                                    <input
                                        id="battle-tag"
                                        name="battle-tag"
                                        type="text"
                                        autoComplete="off"
                                        spellCheck={false}
                                        placeholder="예: 닉네임#1234…"
                                        className="input-base"
                                        value={inputs.name}
                                        onChange={(event) => setInputs(prev => ({ ...prev, name: event.target.value }))}
                                        onKeyDown={(event) => event.key === 'Enter' && addPlayer()}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="discord-name" className="mb-2 block text-xs font-medium text-slate-400">디스코드 닉네임 (선택)</label>
                                    <input
                                        id="discord-name"
                                        name="discord-name"
                                        type="text"
                                        autoComplete="off"
                                        spellCheck={false}
                                        placeholder="예: 서버에서 사용하는 닉네임…"
                                        className="input-base"
                                        value={inputs.discordName}
                                        onChange={(event) => setInputs(prev => ({ ...prev, discordName: event.target.value }))}
                                    />
                                </div>

                                <label
                                    htmlFor="no-mic"
                                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-700/70 bg-surface/60 px-3 py-2.5 transition-colors hover:border-slate-600 hover:bg-white/[0.03]"
                                >
                                    <input
                                        id="no-mic"
                                        name="no-mic"
                                        type="checkbox"
                                        checked={inputs.noMic}
                                        onChange={(event) => setInputs(prev => ({ ...prev, noMic: event.target.checked }))}
                                        className="h-4 w-4 shrink-0 accent-rose-500"
                                    />
                                    <MicOff size={16} className={inputs.noMic ? 'text-rose-400' : 'text-slate-500'} aria-hidden="true" />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-medium text-slate-200">마이크 미사용</span>
                                        <span className="block text-xs text-slate-500">음성 채팅에 참여하지 않는 참가자라면 선택하세요</span>
                                    </span>
                                </label>

                                <div className="space-y-3">
                                    <TierSelect prefix="t" label="탱커" prefKey="tPref" avoidKey="tAvoid" inputs={inputs} setInputs={setInputs} />
                                    <TierSelect prefix="d" label="딜러" prefKey="dPref" avoidKey="dAvoid" inputs={inputs} setInputs={setInputs} />
                                    <TierSelect prefix="s" label="힐러" prefKey="sPref" avoidKey="sAvoid" inputs={inputs} setInputs={setInputs} />
                                </div>

                                <button
                                    type="button"
                                    onClick={addPlayer}
                                    disabled={!inputs.name.trim()}
                                    className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {isEditing ? '변경사항 저장' : '플레이어 추가'}
                                </button>
                            </div>
                        )}

                        {mode === 'mentions' && (
                            <ParticipantChecker
                                players={players}
                                mentionText={participantMentions}
                                setMentionText={setParticipantMentions}
                                onRemovePlayer={onRemovePlayer}
                            />
                        )}

                        {avoidedRoleWarnings.length > 0 && (
                            <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 animate-fade-in" role="alert">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <AlertCircle size={14} className="shrink-0 text-rose-400" aria-hidden="true" />
                                        <span className="text-sm font-medium text-rose-300">
                                            비선호 중복 확인 ({avoidedRoleWarnings.length}명)
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAvoidedRoleWarnings([])}
                                        className="min-h-8 shrink-0 rounded-md px-2 text-xs text-rose-200/70 transition-colors hover:bg-rose-500/10 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
                                    >
                                        모두 닫기
                                    </button>
                                </div>
                                <p className="mb-3 text-xs leading-relaxed text-slate-400">
                                    비선호는 한 역할만 허용됩니다. 아래 항목은 임의로 보정하지 않고 명단에서 제외했습니다.
                                </p>
                                <div className="space-y-2">
                                    {avoidedRoleWarnings.map((warning) => {
                                        const displayName = warning.discordName || warning.playerName;

                                        return (
                                            <div
                                                key={warning.playerName}
                                                className="flex items-center justify-between gap-2 rounded-lg border border-rose-500/15 bg-rose-500/[0.06] px-3 py-2"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleUseWarningForManualInput(warning)}
                                                    className="min-w-0 flex-1 text-left text-xs text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
                                                >
                                                    <strong className="font-medium text-rose-200">{displayName}</strong>
                                                    <span className="block break-all font-mono text-[11px] text-slate-500">
                                                        {warning.playerName}
                                                    </span>
                                                    <span className="mt-1 block text-rose-300/80">
                                                        비선호 {warning.avoidedRoleCount}개 감지 · 자동 추가 제외 · 눌러서 수동 입력
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAvoidedRoleWarnings(previous => (
                                                        previous.filter(item => item.playerName !== warning.playerName)
                                                    ))}
                                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
                                                    aria-label={`${displayName} 비선호 중복 안내 닫기`}
                                                >
                                                    <X size={14} aria-hidden="true" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Failed Parses Section */}
                        {failedParses.length > 0 && (
                            <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] p-4 animate-fade-in" role="alert">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <AlertCircle size={14} className="shrink-0 text-rose-400" aria-hidden="true" />
                                        <span className="text-sm font-medium text-rose-300">
                                            읽지 못한 항목 ({failedParses.length}명)
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFailedParses([])}
                                        className="min-h-8 shrink-0 rounded-md px-2 text-xs text-rose-200/70 transition-colors hover:bg-rose-500/10 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
                                    >
                                        모두 닫기
                                    </button>
                                </div>
                                <p className="mb-3 text-xs text-slate-400">
                                    배틀태그가 확인되는 항목은 누르면 수동 입력으로 옮겨집니다.
                                </p>
                                <div className="space-y-2">
                                    {failedParses.map((name) => {
                                        const battleTag = name.match(/[^\s·]+#\d{4,}/)?.[0];
                                        return (
                                            <div
                                                key={name}
                                                className="group flex items-center justify-between gap-2 rounded-lg border border-rose-500/15 bg-surface/50 px-3 py-2"
                                            >
                                                {battleTag ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUseForManualInput(name, battleTag)}
                                                        className="min-h-8 min-w-0 flex-1 break-words text-left text-sm leading-relaxed text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
                                                    >
                                                        {name}
                                                    </button>
                                                ) : (
                                                    <span className="min-w-0 flex-1 break-words text-sm leading-relaxed text-slate-300">
                                                        {name}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFailed(name)}
                                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
                                                    aria-label={`${name} 실패 항목 삭제`}
                                                >
                                                    <X size={14} aria-hidden="true" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </section>
    );
};

export default PlayerForm;
