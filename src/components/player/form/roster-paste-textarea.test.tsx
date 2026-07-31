import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import RosterPasteTextarea from './roster-paste-textarea';

describe('RosterPasteTextarea', () => {
    it('문제 구간과 참가자 단위 이전·다음 오류 이동 UI를 표시한다', () => {
        const value = [
            'First#1234 다3? / 플2? / 골1',
            'Second#5678 마4? / 마4? / 마1',
        ].join('\n');
        const markup = renderToStaticMarkup(
            <RosterPasteTextarea
                isValidationPending={false}
                value={value}
                onChange={vi.fn()}
                warnings={[
                    {
                        playerName: 'First#1234',
                        discordName: '첫 번째',
                        avoidedRoleCount: 2,
                        avoidedRoles: ['TANK', 'DPS'],
                    },
                    {
                        playerName: 'Second#5678',
                        discordName: '두 번째',
                        avoidedRoleCount: 2,
                        avoidedRoles: ['TANK', 'DPS'],
                    },
                ]}
            />,
        );

        expect(markup).toContain('<mark');
        expect(markup).toContain('오류 1/2');
        expect(markup).toContain('첫 번째');
        expect(markup).toContain('aria-label="이전 비선호 오류로 이동"');
        expect(markup).toContain('aria-label="다음 비선호 오류로 이동"');
        expect(markup).not.toContain('비선호 포지션을 한 개만 남겨 주세요');
    });

    it('오류가 한 개여도 해당 위치로 다시 이동할 수 있다', () => {
        const value = 'Only#1234 다3? / 플2? / 골1';
        const markup = renderToStaticMarkup(
            <RosterPasteTextarea
                isValidationPending={false}
                value={value}
                onChange={vi.fn()}
                warnings={[{
                    playerName: 'Only#1234',
                    discordName: '한 명',
                    avoidedRoleCount: 2,
                    avoidedRoles: ['TANK', 'DPS'],
                }]}
            />,
        );

        expect(markup).toContain('오류 1/1');
        expect(markup).toContain('오류 위치로 이동');
        expect(markup).not.toContain('disabled=""');
    });
});
