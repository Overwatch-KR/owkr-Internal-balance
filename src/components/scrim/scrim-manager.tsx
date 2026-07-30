import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Copy,
    Dices,
    ExternalLink,
    Link2,
    Pencil,
    ShieldBan,
    Star,
    Trash2,
} from 'lucide-react';
import { HEROES, type Hero } from '../../constants/hero';
import type { Player } from '../../types';
import type {
    PublicParticipationKind,
    PublicParticipationLink,
    ScrimRecord,
} from '../../types/scrim';
import { formatScrimLabel } from '../../utils/scrim';
import { getErrorMessage, requestJson } from '../../utils/api';
import { useToast } from '../../hooks/use-toast';
import { AppToast } from '../app-toast';
import { DouMascot } from '../common/dou-mascot';
import { Skeleton } from '../common/skeleton';
import { HeroPickerModal } from './hero-picker-modal';
import { RandomBanModal } from './random-ban-modal';
import { ScrimDateTimePicker } from './scrim-datetime-picker';

interface ScrimManagerProps {
    csrfToken: string;
    onClose: () => void;
    players: Player[];
    userId: string;
}

interface ScrimsResponse {
    scrims: ScrimRecord[];
}

interface VoteCount {
    count: number;
    hero: Hero;
}

type DetailTab = 'operations' | 'ban' | 'satisfaction';
type HeroPickerMode = 'final' | 'used' | null;

const DETAIL_TABS: Array<{ id: DetailTab; label: string; icon: typeof Link2 }> = [
    { id: 'operations', label: '운영 및 링크', icon: Link2 },
    { id: 'ban', label: '영웅 밴', icon: ShieldBan },
    { id: 'satisfaction', label: '만족도 결과', icon: Star },
];

const heroById = new Map(HEROES.map(hero => [hero.id, hero]));

const toRosterSnapshot = (players: Player[]) => players.slice(0, 10).map(player => ({
    id: player.discordUserId ?? player.userSheetEntryId ?? String(player.id),
    name: player.name,
    discordName: player.discordName,
}));

const ScrimRecordsSkeleton = () => (
    <div className="space-y-2" role="status" aria-label="내전 기록을 불러오는 중">
        <DouMascot variant="loading" size={64} className="mx-auto animate-pulse" decorative />
        <div className="pt-2">
            {[0, 1, 2].map(index => (
                <div key={index} className="mb-2 rounded-xl bg-slate-900 p-3">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="mt-2 h-3 w-3/5" />
                </div>
            ))}
        </div>
    </div>
);

const ScrimDetailSkeleton = () => (
    <section className="space-y-5" role="status" aria-label="내전 상세 정보를 불러오는 중">
        <div className="card">
            <Skeleton className="h-7 w-2/5" />
            <Skeleton className="mt-3 h-4 w-1/3" />
            <div className="mt-6 flex gap-2">
                <Skeleton className="h-11 w-32" />
                <Skeleton className="h-11 w-32" />
                <Skeleton className="h-11 w-32" />
            </div>
        </div>
        <div className="card">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="mt-4 h-32 w-full" />
        </div>
    </section>
);

interface LinkControlCardProps {
    kind: PublicParticipationKind;
    link?: PublicParticipationLink;
    onAction: (action: string, payload?: Record<string, unknown>) => void;
    onCopy: (kind: PublicParticipationKind) => void;
}

function LinkControlCard({
    kind,
    link,
    onAction,
    onCopy,
}: LinkControlCardProps) {
    const title = kind === 'vote' ? '영웅 밴 투표 링크' : '만족도 조사 링크';
    const href = link ? `${window.location.origin}/participate/${link.token}` : '';

    return (
        <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="font-semibold text-white">{title}</h3>
                    <p className={`mt-1 text-xs ${link?.active ? 'text-emerald-300' : 'text-slate-500'}`}>
                        {link?.active
                            ? '활성화된 링크'
                            : kind === 'vote'
                                ? '투표를 열면 링크가 자동으로 생성됩니다.'
                                : '비활성화된 내전 링크'}
                    </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    link?.active
                        ? 'bg-emerald-400/10 text-emerald-200'
                        : 'bg-slate-800 text-slate-400'
                }`}>
                    {link?.active ? '활성' : '비활성'}
                </span>
            </div>

            {!link?.active && kind === 'satisfaction' ? (
                <button
                    type="button"
                    className="btn-primary mt-4 w-full"
                    onClick={() => onAction('activateLink', { kind, regenerate: !link })}
                >
                    {link ? '링크 다시 활성화' : '링크 생성'}
                </button>
            ) : null}

            {link?.active ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" className="btn-ghost w-full" onClick={() => onCopy(kind)}>
                        <Copy size={15} className="mr-1 inline" />링크 복사
                    </button>
                    <a className="btn-ghost w-full text-center" href={href} target="_blank" rel="noreferrer">
                        <ExternalLink size={15} className="mr-1 inline" />열기
                    </a>
                    <button
                        type="button"
                        className="btn-danger w-full"
                        onClick={() => onAction('deactivateLink', { kind })}
                    >
                        링크 비활성화
                    </button>
                    <button
                        type="button"
                        className="btn-ghost w-full"
                        onClick={() => onAction('activateLink', { kind, regenerate: true })}
                    >
                        새 링크 생성
                    </button>
                </div>
            ) : null}
        </section>
    );
}

interface OperationsTabProps {
    onAction: (action: string, payload?: Record<string, unknown>) => void;
    onCopy: (kind: PublicParticipationKind) => void;
    scrim: ScrimRecord;
}

function OperationsTab({ onAction, onCopy, scrim }: OperationsTabProps) {
    return (
        <section className="card" role="tabpanel" id="scrim-panel-operations">
            <h2 className="text-lg font-semibold text-white">운영 및 참여 링크</h2>
            <p className="mt-1 text-sm text-slate-400">투표와 만족도 링크를 각각 관리합니다.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
                <LinkControlCard
                    kind="vote"
                    link={scrim.publicLinks?.vote}
                    onAction={onAction}
                    onCopy={onCopy}
                />
                <LinkControlCard
                    kind="satisfaction"
                    link={scrim.publicLinks?.satisfaction}
                    onAction={onAction}
                    onCopy={onCopy}
                />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={() => onAction('openVote')}>
                    영웅 밴 투표 열기
                </button>
                <button type="button" className="btn-ghost" onClick={() => onAction('closeVote')}>
                    투표 수동 마감
                </button>
            </div>
        </section>
    );
}

function HeroResultCard({ count, hero, maxVotes }: VoteCount & { maxVotes: number }) {
    const percentage = maxVotes > 0 ? Math.max(8, (count / maxVotes) * 100) : 0;
    return (
        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <span
                className="absolute inset-y-0 left-0 bg-cyan-400/8"
                style={{ width: `${percentage}%` }}
                aria-hidden="true"
            />
            <div className="relative flex items-center gap-3">
                <img
                    src={`/hero/${hero.role}/${hero.id}.png`}
                    alt=""
                    className="h-11 w-11 rounded-lg bg-slate-800 object-cover"
                />
                <strong className="min-w-0 flex-1 truncate text-sm text-white">{hero.name}</strong>
                <span className="text-sm font-semibold text-cyan-200">{count}표</span>
            </div>
        </div>
    );
}

interface BanTabProps {
    onOpenFinalPicker: () => void;
    onOpenRandom: () => void;
    onOpenUsedPicker: () => void;
    scrim: ScrimRecord;
    voteCounts: VoteCount[];
}

function BanTab({
    onOpenFinalPicker,
    onOpenRandom,
    onOpenUsedPicker,
    scrim,
    voteCounts,
}: BanTabProps) {
    const decision = scrim.finalBanDecision;
    const finalHeroes = decision?.heroIds
        .map(heroId => heroById.get(heroId))
        .filter((hero): hero is Hero => Boolean(hero)) ?? [];
    const usedHeroes = scrim.usedBanHeroIds
        .map(heroId => heroById.get(heroId))
        .filter((hero): hero is Hero => Boolean(hero));
    const hasUnresolvedTie = Boolean(decision?.hasTie && finalHeroes.length < 2);
    const canResolveRandomly = new Set(voteCounts.map(result => result.hero.role)).size >= 2;
    const maxVotes = voteCounts[0]?.count ?? 0;

    return (
        <section className="space-y-5" role="tabpanel" id="scrim-panel-ban">
            <div className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-white">영웅 밴 결과</h2>
                        <p className="mt-1 text-sm text-slate-400">
                            제출 {scrim.votes.length}/{scrim.rosterSnapshot.length}명
                        </p>
                    </div>
                    <div className="min-w-36">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                                className="h-full rounded-full bg-cyan-400 transition-[width]"
                                style={{ width: `${Math.min(100, (scrim.votes.length / scrim.rosterSnapshot.length) * 100)}%` }}
                            />
                        </div>
                        <p className="mt-1 text-right text-xs text-slate-500">
                            {Math.round((scrim.votes.length / scrim.rosterSnapshot.length) * 100)}% 참여
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {voteCounts.slice(0, 6).map(result => (
                        <HeroResultCard
                            key={result.hero.id}
                            {...result}
                            maxVotes={maxVotes}
                        />
                    ))}
                </div>
                {voteCounts.length === 0 ? (
                    <div className="mt-5 rounded-xl border border-dashed border-slate-700 py-8 text-center text-sm text-slate-500">
                        아직 제출된 투표가 없습니다.
                    </div>
                ) : null}
            </div>

            <div className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-white">최종 밴</h2>
                        <p className="mt-1 text-sm text-slate-400">
                            {decision?.resolvedBy === 'random'
                                ? '관리자 랜덤 추첨으로 확정됨'
                                : decision?.resolvedBy === 'manual'
                                    ? '관리자가 직접 확정함'
                                    : decision?.resolvedBy === 'automatic'
                                        ? '득표 규칙에 따라 자동 선정됨'
                                        : '아직 최종 밴이 확정되지 않았습니다.'}
                        </p>
                    </div>
                    {finalHeroes.length === 2 ? (
                        <button type="button" className="btn-ghost" onClick={onOpenFinalPicker}>
                            <Pencil size={15} className="mr-1 inline" />수정
                        </button>
                    ) : null}
                </div>

                {finalHeroes.length > 0 ? (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        {finalHeroes.map(hero => (
                            <div key={hero.id} className="flex items-center gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/8 p-3">
                                <img src={`/hero/${hero.role}/${hero.id}.png`} alt="" className="h-16 w-16 rounded-xl object-cover" />
                                <strong className="text-white">{hero.name}</strong>
                            </div>
                        ))}
                    </div>
                ) : null}

                {hasUnresolvedTie ? (
                    <div className="mt-5 rounded-2xl border border-violet-400/25 bg-violet-400/8 p-4">
                        <h3 className="font-semibold text-violet-100">동점 후보가 있습니다</h3>
                        <p className="mt-1 text-sm text-slate-400">
                            {canResolveRandomly
                                ? '랜덤 추첨을 진행하거나 관리자가 직접 최종 밴을 선택해 주세요.'
                                : '서로 다른 역할군 후보가 부족해 관리자가 직접 최종 밴을 선택해야 합니다.'}
                        </p>
                        <div className={`mt-4 grid gap-2 ${canResolveRandomly ? 'sm:grid-cols-2' : ''}`}>
                            {canResolveRandomly ? (
                                <button type="button" className="btn-primary" onClick={onOpenRandom}>
                                    <Dices size={16} className="mr-1 inline" />랜덤으로 결정
                                </button>
                            ) : null}
                            <button type="button" className="btn-ghost" onClick={onOpenFinalPicker}>
                                <Pencil size={16} className="mr-1 inline" />직접 선택
                            </button>
                        </div>
                    </div>
                ) : finalHeroes.length < 2 ? (
                    <button type="button" className="btn-primary mt-5" onClick={onOpenFinalPicker}>
                        최종 밴 직접 선택
                    </button>
                ) : null}

                {decision?.excludedHeroIds.length ? (
                    <p className="mt-4 text-xs text-slate-500">
                        역할군 중복 제외: {decision.excludedHeroIds.map(heroId => heroById.get(heroId)?.name ?? heroId).join(', ')}
                    </p>
                ) : null}
            </div>

            <div className="card">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-white">사용된 밴 영웅</h2>
                        <p className="mt-1 text-sm text-slate-400">다음 투표에서 다시 선택할 수 없는 영웅입니다.</p>
                    </div>
                    <button type="button" className="btn-ghost" onClick={onOpenUsedPicker}>
                        <Pencil size={15} className="mr-1 inline" />편집
                    </button>
                </div>
                {usedHeroes.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {usedHeroes.map(hero => (
                            <span key={hero.id} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-200">
                                <img src={`/hero/${hero.role}/${hero.id}.png`} alt="" className="h-8 w-8 rounded-lg object-cover" />
                                {hero.name}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-slate-500">아직 기록된 사용 밴이 없습니다.</p>
                )}
            </div>
        </section>
    );
}

interface SatisfactionTabProps {
    disappointmentCounts: Record<string, number>;
    satisfactionAverage: number;
    satisfactionScores: number[];
    scrim: ScrimRecord;
}

function SatisfactionTab({
    disappointmentCounts,
    satisfactionAverage,
    satisfactionScores,
    scrim,
}: SatisfactionTabProps) {
    return (
        <section className="card" role="tabpanel" id="scrim-panel-satisfaction">
            <h2 className="text-lg font-semibold text-white">만족도 응답</h2>
            <p className="mt-2 text-sm">
                총 {scrim.satisfactionResponses.length}건 · 평균 {satisfactionAverage.toFixed(1)}점
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {satisfactionScores.map((count, index) => (
                    <span key={index} className="rounded bg-slate-800 px-2 py-1">{index + 1}점 {count}건</span>
                ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                {Object.entries(disappointmentCounts).map(([item, count]) => (
                    <span key={item} className="rounded bg-slate-800 px-2 py-1">{item} {count}회</span>
                ))}
            </div>
            <div className="mt-4 space-y-2">
                {scrim.satisfactionResponses.map((response, index) => (
                    <div key={`${response.submittedAt}-${index}`} className="rounded-lg bg-slate-900 p-3 text-sm">
                        <span className="font-semibold text-amber-200">{response.score}점</span>
                        <span className="ml-3 text-slate-400">{response.disappointments.join(', ') || '아쉬운 점 없음'}</span>
                        {response.otherOpinion ? <p className="mt-1 text-slate-300">기타: {response.otherOpinion}</p> : null}
                    </div>
                ))}
            </div>
            {scrim.satisfactionResponses.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-slate-700 py-8 text-center text-sm text-slate-500">
                    아직 제출된 만족도 응답이 없습니다.
                </p>
            ) : null}
        </section>
    );
}

/**
 * @description 전용 페이지에서 내전 기록과 공개 링크, 밴 및 만족도 결과를 탭으로 관리한다.
 */
export function ScrimManager({ csrfToken, players, userId, onClose }: ScrimManagerProps) {
    const [scrims, setScrims] = useState<ScrimRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [date, setDate] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()));
    const [startTime, setStartTime] = useState('21:00');
    const [selectedId, setSelectedId] = useState('');
    const [activeTab, setActiveTab] = useState<DetailTab>('operations');
    const [heroPickerMode, setHeroPickerMode] = useState<HeroPickerMode>(null);
    const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
    const { dismissToast, showToast, toast } = useToast();

    const load = useCallback(async () => {
        try {
            const result = await requestJson<ScrimsResponse>('/api/scrims', { credentials: 'same-origin' });
            setScrims(result.scrims);
            setSelectedId(current => (
                result.scrims.some(scrim => scrim.id === current)
                    ? current
                    : result.scrims[0]?.id ?? ''
            ));
        } catch (error) {
            showToast('error', getErrorMessage(error, '내전 기록을 불러오지 못했습니다.'));
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const selected = useMemo(
        () => scrims.find(scrim => scrim.id === selectedId) ?? null,
        [scrims, selectedId],
    );
    const selectedScrimId = selected?.id;

    const voteCounts = useMemo<VoteCount[]>(() => {
        if (!selected) return [];
        return HEROES
            .map(hero => ({
                hero,
                count: selected.votes.filter(vote => vote.heroIds.includes(hero.id)).length,
            }))
            .filter(result => result.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [selected]);
    const randomCandidateHeroIds = useMemo(
        () => voteCounts.slice(0, 8).map(result => result.hero.id),
        [voteCounts],
    );

    const satisfactionAverage = selected?.satisfactionResponses.length
        ? selected.satisfactionResponses.reduce((sum, response) => sum + response.score, 0)
            / selected.satisfactionResponses.length
        : 0;
    const satisfactionScores = selected
        ? [1, 2, 3, 4, 5].map(score => (
            selected.satisfactionResponses.filter(response => response.score === score).length
        ))
        : [];
    const disappointmentCounts = selected?.satisfactionResponses.reduce<Record<string, number>>(
        (counts, response) => {
            response.disappointments.forEach(item => {
                counts[item] = (counts[item] ?? 0) + 1;
            });
            return counts;
        },
        {},
    ) ?? {};

    const selectScrim = (scrim: ScrimRecord) => {
        setSelectedId(scrim.id);
        setHeroPickerMode(null);
        setIsRandomModalOpen(false);
    };

    const call = useCallback(async (
        action: string,
        payload: Record<string, unknown> = {},
    ) => {
        if (!selected && action !== 'create') return;
        try {
            await requestJson('/api/scrims', {
                method: action === 'create' ? 'POST' : 'PATCH',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                body: JSON.stringify(
                    action === 'create'
                        ? payload
                        : { id: selected!.id, action, ...payload },
                ),
            });
            await load();
            const messages: Record<string, string> = {
                create: '내전을 등록했습니다.',
                openVote: '영웅 밴 투표를 열고 참여 링크를 생성했습니다.',
                closeVote: '영웅 밴 투표를 마감했습니다.',
                activateLink: payload.kind === 'satisfaction'
                    ? '만족도 조사 링크를 활성화했습니다.'
                    : '영웅 밴 투표 링크를 활성화했습니다.',
                deactivateLink: payload.kind === 'satisfaction'
                    ? '만족도 조사 링크를 비활성화했습니다.'
                    : '영웅 밴 투표 링크를 비활성화했습니다.',
                addUsedBans: '사용된 밴 영웅을 저장했습니다.',
                confirmFinalBans: '최종 밴 영웅을 확정했습니다.',
            };
            showToast('success', messages[action] ?? '변경 사항을 저장했습니다.');
        } catch (error) {
            showToast('error', getErrorMessage(error, '저장하지 못했습니다.'));
        }
    }, [csrfToken, load, selected, showToast]);

    const resolveTieRandom = useCallback(async (): Promise<string[]> => {
        if (!selectedScrimId) throw new Error('내전 정보를 찾을 수 없습니다.');
        const result = await requestJson<{ scrim: ScrimRecord }>('/api/scrims', {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify({ id: selectedScrimId, action: 'resolveTieRandom' }),
        });
        setScrims(current => current.map(scrim => (
            scrim.id === result.scrim.id ? result.scrim : scrim
        )));
        const heroIds = result.scrim.finalBanDecision?.heroIds ?? [];
        if (heroIds.length !== 2) throw new Error('랜덤 추첨 결과를 확인하지 못했습니다.');
        return heroIds;
    }, [csrfToken, selectedScrimId]);

    const deleteSelected = async () => {
        if (!selected || !window.confirm(`${formatScrimLabel(selected)} 기록을 삭제할까요?`)) return;
        try {
            await requestJson('/api/scrims', {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                body: JSON.stringify({ id: selected.id, action: 'delete' }),
            });
            await load();
            showToast('success', '내전 기록을 삭제했습니다.');
        } catch (error) {
            showToast('error', getErrorMessage(error, '삭제하지 못했습니다.'));
        }
    };

    const copyLink = async (kind: PublicParticipationKind) => {
        const publicToken = selected?.publicLinks?.[kind]?.token;
        if (!publicToken) return;
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/participate/${publicToken}`);
            showToast('success', `${kind === 'vote' ? '영웅 밴 투표' : '만족도 조사'} 링크를 복사했습니다.`);
        } catch {
            showToast('error', '링크를 복사하지 못했습니다.');
        }
    };

    const create = () => void call('create', {
        date,
        startTime,
        roster: toRosterSnapshot(players),
    });

    return (
        <main className="min-h-screen bg-surface px-4 py-6 text-slate-200 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl">
                <header className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">내전 관리</h1>
                        <p className="mt-1 text-sm text-slate-400">내전 일정과 참여 링크, 결과 기록을 관리합니다.</p>
                    </div>
                    <button type="button" className="btn-ghost" onClick={onClose}>
                        <ArrowLeft size={16} className="mr-1 inline" />매칭으로 돌아가기
                    </button>
                </header>

                <section className="card">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <h2 className="font-semibold text-white">내전 등록</h2>
                            <p className="mt-1 text-sm text-slate-400">진행 일시는 한국 시간(Asia/Seoul)으로 저장됩니다.</p>
                        </div>
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-200">
                            로스터 {Math.min(players.length, 10)}명
                        </span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <ScrimDateTimePicker
                            date={date}
                            time={startTime}
                            onDateChange={setDate}
                            onTimeChange={setStartTime}
                        />
                        <button
                            type="button"
                            className="btn-primary min-h-12 whitespace-nowrap disabled:opacity-40"
                            disabled={players.length === 0}
                            onClick={create}
                        >
                            내전 등록
                        </button>
                    </div>
                </section>

                <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <aside className="card h-fit">
                        <h2 className="font-semibold text-white">내전 기록</h2>
                        <div className="mt-3">
                            {isLoading ? (
                                <ScrimRecordsSkeleton />
                            ) : scrims.length > 0 ? (
                                <div className="space-y-2">
                                    {scrims
                                        .slice()
                                        .sort((a, b) => b.customGameStartsAt - a.customGameStartsAt)
                                        .map(scrim => (
                                            <button
                                                key={scrim.id}
                                                type="button"
                                                onClick={() => selectScrim(scrim)}
                                                className={`w-full rounded-xl p-3 text-left text-sm ${
                                                    selected?.id === scrim.id
                                                        ? 'bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-400/30'
                                                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                                                }`}
                                            >
                                                <span className="font-medium">{formatScrimLabel(scrim)}</span>
                                                <span className="mt-1 block text-xs text-slate-500">
                                                    {scrim.startTime} · 투표 {scrim.votes.length}명 · 만족도 {scrim.satisfactionResponses.length}건
                                                </span>
                                            </button>
                                        ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-6 text-center text-sm text-slate-500">
                                    <DouMascot variant="empty" size={72} className="mb-3 opacity-80" decorative />
                                    <p>등록된 내전이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </aside>

                    {isLoading ? (
                        <ScrimDetailSkeleton />
                    ) : selected ? (
                        <section className="space-y-5">
                            <section className="card">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{formatScrimLabel(selected)}</h2>
                                        <p className="mt-1 text-sm text-slate-400">
                                            {selected.date} · {selected.startTime} · 참가 {selected.rosterSnapshot.length}명
                                        </p>
                                    </div>
                                    {selected.createdById === userId ? (
                                        <button type="button" className="btn-danger" onClick={() => void deleteSelected()}>
                                            <Trash2 size={15} className="mr-1 inline" />내전 삭제
                                        </button>
                                    ) : null}
                                </div>
                                <div className="mt-5 flex overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50 p-1" role="tablist" aria-label="내전 상세">
                                    {DETAIL_TABS.map(tab => {
                                        const Icon = tab.icon;
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                role="tab"
                                                aria-selected={isActive}
                                                aria-controls={`scrim-panel-${tab.id}`}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`min-h-10 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition ${
                                                    isActive
                                                        ? 'bg-slate-800 text-white shadow'
                                                        : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                            >
                                                <Icon size={15} className="mr-1.5 inline" />{tab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            {activeTab === 'operations' ? (
                                <OperationsTab
                                    scrim={selected}
                                    onAction={(action, payload) => void call(action, payload)}
                                    onCopy={kind => void copyLink(kind)}
                                />
                            ) : activeTab === 'ban' ? (
                                <BanTab
                                    scrim={selected}
                                    voteCounts={voteCounts}
                                    onOpenFinalPicker={() => setHeroPickerMode('final')}
                                    onOpenRandom={() => setIsRandomModalOpen(true)}
                                    onOpenUsedPicker={() => setHeroPickerMode('used')}
                                />
                            ) : (
                                <SatisfactionTab
                                    scrim={selected}
                                    satisfactionAverage={satisfactionAverage}
                                    satisfactionScores={satisfactionScores}
                                    disappointmentCounts={disappointmentCounts}
                                />
                            )}
                        </section>
                    ) : (
                        <section className="card flex min-h-64 items-center justify-center text-sm text-slate-500">
                            내전을 등록하면 상세 정보가 표시됩니다.
                        </section>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {heroPickerMode && selected ? (
                    <HeroPickerModal
                        key={heroPickerMode}
                        mode={heroPickerMode}
                        initialHeroIds={
                            heroPickerMode === 'final'
                                ? selected.finalBanDecision?.heroIds ?? []
                                : selected.usedBanHeroIds
                        }
                        disabledHeroIds={heroPickerMode === 'final' ? selected.usedBanHeroIds : []}
                        onClose={() => setHeroPickerMode(null)}
                        onConfirm={heroIds => {
                            setHeroPickerMode(null);
                            void call(
                                heroPickerMode === 'final' ? 'confirmFinalBans' : 'addUsedBans',
                                { heroIds },
                            );
                        }}
                    />
                ) : null}
            </AnimatePresence>

            <AnimatePresence>
                {isRandomModalOpen && selected ? (
                    <RandomBanModal
                        candidateHeroIds={randomCandidateHeroIds}
                        onResolve={resolveTieRandom}
                        onClose={succeeded => {
                            setIsRandomModalOpen(false);
                            if (succeeded) {
                                showToast('success', '랜덤 추첨으로 최종 밴을 확정했습니다.');
                            }
                        }}
                    />
                ) : null}
            </AnimatePresence>

            {toast ? <AppToast toast={toast} onDismiss={dismissToast} /> : null}
        </main>
    );
}
