import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoginScreen from './login-screen';

describe('LoginScreen', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('배경 효과를 화면 안에 고정하고 정책 페이지 링크를 제공한다', () => {
        vi.stubGlobal('window', {
            location: {
                hostname: 'localhost',
                search: '',
            },
        });

        const markup = renderToStaticMarkup(<LoginScreen />);
        const footerIndex = markup.indexOf('<footer');

        expect(markup).toContain('min-h-screen overflow-hidden');
        expect(markup).not.toContain('overflow-x-hidden');
        expect(footerIndex).toBeGreaterThan(markup.indexOf('href="/api/auth/login"'));
        expect(markup.slice(footerIndex)).toContain('href="/discord-login-policy"');
    });
});
