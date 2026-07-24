/**
 * @description 팀 배치 흐름에서 사용하는 역할 타입.
 */
export type Role = 'TANK' | 'DPS' | 'SUPPORT';

/**
 * @description 랭크 파싱과 표시 흐름에서 사용하는 티어 타입.
 */
export type Tier =
    | 'BRONZE'
    | 'SILVER'
    | 'GOLD'
    | 'PLATINUM'
    | 'DIAMOND'
    | 'MASTER'
    | 'GRANDMASTER'
    | 'CHAMPION'
    | 'UNRANKED';

/**
 * @description 역할별 점수 계산과 표시를 위한 랭크 정보.
 * @property tier - 티어 (BRONZE ~ CHAMPION, UNRANKED)
 * @property div - 등급 (1~5, 미배치는 0)
 * @property score - 계산된 점수 (티어 * 600 + (6 - div) * 100)
 * @property isPreferred - 선호 역할 여부 (! 표시)
 * @property isAvoided - 비선호 역할 여부 (? 표시)
 */
export interface Rank {
    tier: Tier;
    div: number | string;
    score: number;
    isPreferred: boolean;
    isAvoided: boolean;
}

/**
 * @description 파싱/입력 → 팀 배치 흐름에서 사용하는 플레이어 모델.
 * @property id - 고유 식별자 (타임스탬프 + 랜덤)
 * @property name - 배틀태그 (닉네임#숫자)
 * @property discordName - 디스코드에서 사용하는 표시 이름
 * @property tank - 탱커 역할 랭크
 * @property dps - 딜러 역할 랭크
 * @property sup - 힐러 역할 랭크
 * @property noMic - 마이크 미사용 여부
 */
export interface Player {
    id: number;
    name: string;
    discordName?: string;
    tank: Rank;
    dps: Rank;
    sup: Rank;
    noMic?: boolean;
}

/**
 * @description 팀 결과에서 역할별로 묶인 배치 구조.
 * @property TANK - 탱커 배치 (1명)
 * @property DPS - 딜러 배치 (2명)
 * @property SUPPORT - 힐러 배치 (2명)
 */
export interface RoleAssignment {
    TANK: Player[];
    DPS: Player[];
    SUPPORT: Player[];
}

/**
 * @description 한 팀의 배치와 점수를 담는 결과 모델.
 * @property name - 팀 이름 (TEAM 1, TEAM 2)
 * @property assignment - 역할별 플레이어 배치
 * @property realScore - 실제 점수 (순수 티어 기반)
 */
export interface TeamResult {
    name: string;
    assignment: RoleAssignment;
    realScore: number;
}

/**
 * @description 결과 화면에서 선택된 교체 슬롯을 식별한다.
 */
export interface SwapSource {
    teamIdx: number;
    role: Role;
    index: number;
}

/**
 * @description 밸런스 품질 지표 모델.
 * @property totalDiff - 팀 총점 차이
 * @property roleDiffs - 역할별 매치업 점수 차이 (탱크, 딜러, 힐러)
 * @property teamStdDevs - 각 팀의 내부 점수 표준편차
 * @property preferenceViolations - 선호 역할이 있지만 다른 역할에 배정된 인원
 * @property avoidedAssignments - 비선호 역할에 배정된 인원
 * @property unrankedAssignments - 미배치 역할에 배정된 인원
 */
export interface BalanceMetrics {
    totalDiff: number;
    roleDiffs: { tank: number; dps: number; support: number };
    teamStdDevs: [number, number];
    preferenceViolations?: number;
    avoidedAssignments?: number;
    unrankedAssignments?: number;
}

/**
 * @description 두 팀 결과와 점수 차이를 묶은 매칭 결과 모델.
 * @property teamA - 1팀 결과
 * @property teamB - 2팀 결과
 * @property diff - 실제 점수 차이
 * @property metrics - 밸런스 품질 지표
 */
export interface MatchResultData {
    teamA: TeamResult;
    teamB: TeamResult;
    diff: number;
    metrics?: BalanceMetrics;
}
