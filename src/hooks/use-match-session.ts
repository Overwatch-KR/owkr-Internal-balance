import { useEffect, useRef, useState } from 'react';
import { useBalance } from './use-balance';
import type { MatchResultData, Player } from '../types';
import {
    isMatchResultStale,
    reconcilePlayers,
    syncMatchResultPlayerIdentities,
} from '../utils/player';
import { normalizePlayerRolePreferences } from '../utils/role-preference';
import { cleanupExpired, getWithExpiry, removeItem, setWithExpiry } from '../utils/storage';

interface StoredMatchState {
    result: MatchResultData;
    alternatives: MatchResultData[];
}

const getStorageKeys = (userId: string) => ({
    PLAYERS: `owkr_players:${userId}`,
    RESULT: `owkr_result:${userId}`,
    PARTICIPANT_MENTIONS: `owkr_participant_mentions:${userId}`,
});

/**
 * @description 로그인 사용자별 참가 명단·팀 결과의 복원, 저장, 밸런싱 생명주기를 묶어 관리한다.
 */
export const useMatchSession = (userId: string) => {
    const storageKeys = getStorageKeys(userId);
    const [players, setPlayers] = useState<Player[]>(() => {
        const savedPlayers = (getWithExpiry<Player[]>(storageKeys.PLAYERS) || [])
            .map(normalizePlayerRolePreferences);
        return reconcilePlayers([], savedPlayers, 'replace').players;
    });
    const [participantMentions, setParticipantMentions] = useState(() => (
        getWithExpiry<string>(storageKeys.PARTICIPANT_MENTIONS) || ''
    ));
    const [initialMatchState] = useState<StoredMatchState | null>(() => {
        const savedState = getWithExpiry<MatchResultData | StoredMatchState>(storageKeys.RESULT);
        if (!savedState) return null;
        const savedResult = 'result' in savedState ? savedState.result : savedState;
        const savedAlternatives = 'result' in savedState ? savedState.alternatives : [];
        return {
            result: syncMatchResultPlayerIdentities(savedResult, players),
            alternatives: savedAlternatives.map(alternative => (
                syncMatchResultPlayerIdentities(alternative, players)
            )),
        };
    });
    const initialParticipantsRef = useRef(players.slice(0, 10));
    const isMounted = useRef(false);
    const {
        alternatives,
        balanceTeams,
        isBalancing,
        result,
        setAlternatives,
        setResult,
    } = useBalance(
        initialMatchState?.result ?? null,
        initialMatchState?.alternatives ?? [],
    );

    useEffect(() => {
        cleanupExpired();
        isMounted.current = true;
        if (!initialMatchState) return;
        const initialParticipants = initialParticipantsRef.current;
        const shouldGenerateAlternatives = initialMatchState.alternatives.length === 0
            && initialParticipants.length === 10
            && !isMatchResultStale(initialMatchState.result, initialParticipants);
        if (shouldGenerateAlternatives) {
            void balanceTeams(
                initialParticipants,
                { preserveResult: initialMatchState.result },
            ).catch(() => undefined);
        }
    }, [balanceTeams, initialMatchState]);

    useEffect(() => {
        if (players.length > 0) setWithExpiry(storageKeys.PLAYERS, players);
        else removeItem(storageKeys.PLAYERS);
    }, [players, storageKeys.PLAYERS]);

    useEffect(() => {
        if (participantMentions.trim()) {
            setWithExpiry(storageKeys.PARTICIPANT_MENTIONS, participantMentions);
        } else {
            removeItem(storageKeys.PARTICIPANT_MENTIONS);
        }
    }, [participantMentions, storageKeys.PARTICIPANT_MENTIONS]);

    useEffect(() => {
        if (!isMounted.current) return;
        if (result) {
            setWithExpiry<StoredMatchState>(
                storageKeys.RESULT,
                { result, alternatives },
            );
        } else {
            removeItem(storageKeys.RESULT);
        }
    }, [alternatives, result, storageKeys.RESULT]);

    return {
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
    };
};
