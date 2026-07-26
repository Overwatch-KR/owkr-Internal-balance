import type { Player, Role } from '../../types';

interface RolePreference {
    isPreferred: boolean;
    isAvoided: boolean;
}

const ROLES: Role[] = ['TANK', 'DPS', 'SUPPORT'];

/**
 * @description 비선호 역할을 하나로 제한하고 우선 역할이 있으면 해당 역할을 유지한다.
 */
export const normalizeRolePreferences = <T extends RolePreference>(
    preferences: Record<Role, T>,
    preferredAvoidedRole?: Role,
): Record<Role, T> => {
    const avoidedRoles = ROLES.filter(role => preferences[role].isAvoided);
    if (avoidedRoles.length <= 1) return preferences;

    const keptRole = preferredAvoidedRole && avoidedRoles.includes(preferredAvoidedRole)
        ? preferredAvoidedRole
        : avoidedRoles[0];

    return Object.fromEntries(ROLES.map(role => [
        role,
        role === keptRole
            ? preferences[role]
            : { ...preferences[role], isAvoided: false },
    ])) as Record<Role, T>;
};

/**
 * @description 플레이어의 세 역할 선호 상태에 자동 선호 규칙을 적용한다.
 */
export const normalizePlayerRolePreferences = (player: Player): Player => {
    const ranks = normalizeRolePreferences({
        TANK: player.tank,
        DPS: player.dps,
        SUPPORT: player.sup,
    });

    if (
        ranks.TANK === player.tank
        && ranks.DPS === player.dps
        && ranks.SUPPORT === player.sup
    ) {
        return player;
    }

    return {
        ...player,
        tank: ranks.TANK,
        dps: ranks.DPS,
        sup: ranks.SUPPORT,
    };
};
