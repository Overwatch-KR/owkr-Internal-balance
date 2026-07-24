import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDefaultPlayerInputs } from '../../../hooks/use-player-input';
import TierSelect from './tier-select';

describe('TierSelect', () => {
    it('미배치를 선택하면 중립 상태를 표시하고 디비전 선택을 숨긴다', () => {
        const inputs = {
            ...createDefaultPlayerInputs(),
            sTier: 'UNRANKED' as const,
            sDiv: '0',
        };
        const markup = renderToStaticMarkup(
            <TierSelect
                prefix="s"
                label="힐러"
                prefKey="sPref"
                avoidKey="sAvoid"
                inputs={inputs}
                setInputs={() => undefined}
            />,
        );

        expect(markup).toContain('data-tier-state="unranked"');
        expect(markup).toContain('aria-label="힐러 티어"');
        expect(markup).toContain('value="UNRANKED" selected=""');
        expect(markup).toContain('미배치');
        expect(markup).toContain('lucide-shield-question-mark');
        expect(markup).not.toContain('name="s-division"');
        expect(markup).not.toContain('aria-label="힐러 등급"');
    });

    it('정식 티어에서는 기존 이미지와 디비전 선택 구조를 유지한다', () => {
        const markup = renderToStaticMarkup(
            <TierSelect
                prefix="s"
                label="힐러"
                prefKey="sPref"
                avoidKey="sAvoid"
                inputs={createDefaultPlayerInputs()}
                setInputs={() => undefined}
            />,
        );

        expect(markup).toContain('data-tier-state="ranked"');
        expect(markup).toContain('/tier/platinum.png');
        expect(markup).toContain('name="s-division"');
        expect(markup).toContain('aria-label="힐러 등급"');
    });
});
