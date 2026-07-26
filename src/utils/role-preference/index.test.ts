import { describe, expect, it } from 'vitest';
import type { Role } from '../../types';
import { normalizeRolePreferences } from './index';

const createPreferences = (
    overrides: Partial<Record<Role, { isPreferred: boolean; isAvoided: boolean }>>,
) => ({
    TANK: { isPreferred: false, isAvoided: false },
    DPS: { isPreferred: false, isAvoided: false },
    SUPPORT: { isPreferred: false, isAvoided: false },
    ...overrides,
});

describe('normalizeRolePreferences', () => {
    it('두 역할이 비선호이면 첫 번째 비선호만 유지한다', () => {
        const normalized = normalizeRolePreferences(createPreferences({
            TANK: { isPreferred: false, isAvoided: true },
            DPS: { isPreferred: false, isAvoided: true },
        }));

        expect(normalized).toEqual({
            TANK: { isPreferred: false, isAvoided: true },
            DPS: { isPreferred: false, isAvoided: false },
            SUPPORT: { isPreferred: false, isAvoided: false },
        });
    });

    it('새로 선택한 역할을 전달하면 해당 비선호만 유지한다', () => {
        const normalized = normalizeRolePreferences(createPreferences({
            TANK: { isPreferred: false, isAvoided: true },
            DPS: { isPreferred: false, isAvoided: true },
        }), 'DPS');

        expect(normalized.TANK.isAvoided).toBe(false);
        expect(normalized.DPS.isAvoided).toBe(true);
    });

    it('비선호 역할이 두 개가 아니면 선호 상태를 변경하지 않는다', () => {
        const preferences = createPreferences({
            TANK: { isPreferred: false, isAvoided: true },
        });

        expect(normalizeRolePreferences(preferences)).toBe(preferences);
    });
});
