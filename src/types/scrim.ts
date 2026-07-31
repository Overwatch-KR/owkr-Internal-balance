import type { HeroRole } from '../constants/hero';

export interface ScrimRosterParticipant {
    id: string;
    name: string;
    discordName?: string;
}

export interface HeroVote {
    rosterParticipantId: string;
    heroIds: string[];
    submittedAt: number;
}

export interface SatisfactionResponse {
    score: number;
    disappointments: string[];
    otherOpinion?: string;
    submittedAt: number;
}

export interface BanDecision {
    heroIds: string[];
    automaticallySelected: boolean;
    hasTie: boolean;
    excludedHeroIds: string[];
    resolvedBy?: 'automatic' | 'manual' | 'random';
}

export type PublicParticipationKind = 'vote' | 'satisfaction';

export interface PublicParticipationLink {
    token: string;
    active: boolean;
    createdAt: number;
}

export interface ScrimRecord {
    id: string;
    date: string;
    startTime: string;
    customGameStartsAt: number;
    satisfactionExpiresAt: number;
    createdAt: number;
    createdBy: string;
    createdById?: string;
    rosterSnapshot: ScrimRosterParticipant[];
    voteOpenedAt?: number;
    voteClosedAt?: number;
    publicLinks?: Partial<Record<PublicParticipationKind, PublicParticipationLink>>;
    usedBanHeroIds: string[];
    votes: HeroVote[];
    satisfactionResponses: SatisfactionResponse[];
    finalBanDecision?: BanDecision;
    adminReview?: string;
    adminReviewUpdatedAt?: number;
    adminReviewUpdatedBy?: string;
}

export type VoteParticipationStatus = 'VOTING_OPEN' | 'VOTING_CLOSED';
export type SatisfactionParticipationStatus = 'SATISFACTION_PENDING' | 'SATISFACTION_OPEN' | 'SATISFACTION_EXPIRED';
export type ParticipationStatus = VoteParticipationStatus | SatisfactionParticipationStatus;

export interface HeroVoteResult {
    heroId: string;
    votes: number;
    role: HeroRole;
}

export const SATISFACTION_OPTIONS = [
    '팀 밸런스',
    '영웅 밴 방식',
    '진행 속도',
    '음성채팅 분위기',
    '참가자 매너',
    '경기 수',
    '기타',
] as const;
