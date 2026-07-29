import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DiscordLoginPolicy } from './discord-login-policy';

describe('DiscordLoginPolicy', () => {
    it('관리자 인증에 사용하는 정보와 이용 범위를 안내한다', () => {
        const markup = renderToStaticMarkup(<DiscordLoginPolicy />);

        expect(markup).toContain('Discord 로그인 정보 이용 안내');
        expect(markup).toContain('Discord 사용자 ID');
        expect(markup).toContain('관리자 목록과 대조');
        expect(markup).toContain('유저 시트의 마지막 수정자 이름');
        expect(markup).toContain('OAuth 액세스 토큰은 저장하지 않고');
        expect(markup).toContain('로그인 세션은 8시간 후 만료');
        expect(markup).toContain('메시지는 조회하지');
    });
});
