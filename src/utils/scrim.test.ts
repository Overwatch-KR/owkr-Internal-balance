import { describe, expect, it } from 'vitest';
import {
    formatRemainingDuration,
    getSatisfactionParticipationStatus,
    getScrimTimes,
    getVoteParticipationStatus,
} from './scrim';

describe('scrim time rules', () => {
    it('calculates the next Seoul calendar day end for satisfaction', () => {
        const times = getScrimTimes('2026-07-29', '21:00');
        expect(new Date(times.customGameStartsAt).toISOString()).toBe('2026-07-29T12:00:00.000Z');
        expect(new Date(times.satisfactionExpiresAt).toISOString()).toBe('2026-07-30T14:59:59.999Z');
    });

    it('keeps voting open only before the custom-game start', () => {
        const record = { voteOpenedAt: 100, voteClosedAt: undefined, customGameStartsAt: 200, satisfactionExpiresAt: 300 };
        expect(getVoteParticipationStatus(record, 150)).toBe('VOTING_OPEN');
        expect(getVoteParticipationStatus(record, 200)).toBe('VOTING_CLOSED');
        expect(getSatisfactionParticipationStatus(record, 150)).toBe('SATISFACTION_PENDING');
        expect(getSatisfactionParticipationStatus(record, 200)).toBe('SATISFACTION_OPEN');
        expect(getSatisfactionParticipationStatus(record, 301)).toBe('SATISFACTION_EXPIRED');
    });

    it('formats the remaining voting time down to seconds', () => {
        expect(formatRemainingDuration(3_661_001)).toBe('1시간 01분 02초');
        expect(formatRemainingDuration(61_000)).toBe('01분 01초');
        expect(formatRemainingDuration(0)).toBe('00분 00초');
    });
});
