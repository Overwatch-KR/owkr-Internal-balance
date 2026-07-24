import { describe, expect, it } from 'vitest';
import { calculateGuideLayout } from './guide-layout';

describe('calculateGuideLayout', () => {
    it('왼쪽 대상은 충분한 공간이 있는 오른쪽에 가이드를 배치한다', () => {
        const layout = calculateGuideLayout(
            { top: 120, right: 460, bottom: 180, left: 180, width: 280, height: 60 },
            { width: 400, height: 240 },
            { width: 1920, height: 1080 },
        );

        expect(layout.placement).toBe('right');
        expect(layout.panel.left).toBeGreaterThan(460);
    });

    it('오른쪽 결과 영역은 대상이 가려지지 않도록 왼쪽에 가이드를 배치한다', () => {
        const layout = calculateGuideLayout(
            { top: 640, right: 1720, bottom: 880, left: 670, width: 1050, height: 240 },
            { width: 400, height: 240 },
            { width: 1920, height: 1080 },
        );

        expect(layout.placement).toBe('left');
        expect(layout.panel.left + layout.panel.width).toBeLessThan(670);
    });

    it('좁은 화면에서는 세로 공간을 우선하고 화면 경계를 벗어나지 않는다', () => {
        const layout = calculateGuideLayout(
            { top: 120, right: 360, bottom: 180, left: 16, width: 344, height: 60 },
            { width: 360, height: 220 },
            { width: 390, height: 844 },
        );

        expect(layout.placement).toBe('bottom');
        expect(layout.panel.left).toBeGreaterThanOrEqual(16);
        expect(layout.panel.left + layout.panel.width).toBeLessThanOrEqual(374);
    });
});
