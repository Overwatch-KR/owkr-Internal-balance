import { describe, expect, it } from 'vitest';
import { getTierImage } from './tier';

describe('getTierImage', () => {
    it('미배치에는 별도 티어 이미지를 연결하지 않는다', () => {
        expect(getTierImage('UNRANKED')).toBeUndefined();
    });

    it('정식 티어는 기존 이미지 경로를 유지한다', () => {
        expect(getTierImage('DIAMOND')).toContain('/tier/diamond.png');
    });
});
