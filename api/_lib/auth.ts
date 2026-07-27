import type { VercelRequest } from '@vercel/node';
import { parseCookie, stringifySetCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual } from 'node:crypto';

export interface SessionUser {
    id: string;
    username: string;
    globalName?: string;
    avatar?: string;
    csrfToken: string;
}

interface SessionPayload extends SessionUser {
    type: 'session';
}

interface OAuthStatePayload {
    type: 'oauth-state';
    value: string;
}

const SESSION_COOKIE = 'owkr_session';
const OAUTH_STATE_COOKIE = 'owkr_oauth_state';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('JWT_SECRET은 32자 이상으로 설정해야 합니다.');
    }
    return secret;
};

const isSecureRequest = (req: VercelRequest): boolean => (
    process.env.NODE_ENV === 'production'
    || req.headers['x-forwarded-proto'] === 'https'
);

const splitIds = (value?: string): string[] => (
    value?.split(',').map(id => id.trim()).filter(Boolean) ?? []
);

/**
 * @description Discord 사용자 ID가 관리자 허용 목록에 포함되는지 확인한다.
 */
export const isAllowedAdmin = (userId: string): boolean => (
    splitIds(process.env.ADMIN_USER_IDS).includes(userId)
);

/**
 * @description OAuth 요청 위조를 막는 state 값과 HttpOnly 쿠키를 만든다.
 */
export const createOAuthState = (req: VercelRequest): { state: string; cookie: string } => {
    const state = randomBytes(32).toString('base64url');
    const token = jwt.sign(
        { type: 'oauth-state', value: state } satisfies OAuthStatePayload,
        getJwtSecret(),
        { expiresIn: OAUTH_STATE_MAX_AGE_SECONDS },
    );

    return {
        state,
        cookie: stringifySetCookie({
            name: OAUTH_STATE_COOKIE,
            value: token,
            httpOnly: true,
            secure: isSecureRequest(req),
            sameSite: 'lax',
            path: '/api/auth',
            maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
        }),
    };
};

/**
 * @description 콜백의 state 값이 로그인 시작 시 발급한 값과 일치하는지 검증한다.
 */
export const verifyOAuthState = (req: VercelRequest, receivedState: string): boolean => {
    const token = parseCookie(req.headers.cookie ?? '')[OAUTH_STATE_COOKIE];
    if (!token) return false;

    try {
        const decoded = jwt.verify(token, getJwtSecret()) as OAuthStatePayload;
        if (decoded.type !== 'oauth-state') return false;
        const expected = Buffer.from(decoded.value);
        const received = Buffer.from(receivedState);
        return expected.length === received.length && timingSafeEqual(expected, received);
    } catch {
        return false;
    }
};

/**
 * @description 로그인된 운영자 정보를 담는 서명 세션 쿠키를 만든다.
 */
export const createSessionCookie = (req: VercelRequest, user: Omit<SessionUser, 'csrfToken'>): string => {
    const payload: SessionPayload = {
        ...user,
        csrfToken: randomBytes(24).toString('base64url'),
        type: 'session',
    };
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_MAX_AGE_SECONDS });

    return stringifySetCookie({
        name: SESSION_COOKIE,
        value: token,
        httpOnly: true,
        secure: isSecureRequest(req),
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
    });
};

/**
 * @description 요청의 서명 세션을 검증해 로그인된 운영자 정보를 반환한다.
 */
export const getSessionUser = (req: VercelRequest): SessionUser | null => {
    const token = parseCookie(req.headers.cookie ?? '')[SESSION_COOKIE];
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, getJwtSecret()) as SessionPayload;
        if (decoded.type !== 'session' || !decoded.id || !decoded.csrfToken) return null;
        return decoded;
    } catch {
        return null;
    }
};

/**
 * @description 쓰기 요청의 CSRF 헤더가 현재 세션의 토큰과 일치하는지 확인한다.
 */
export const hasValidCsrfToken = (req: VercelRequest, user: SessionUser): boolean => {
    const header = req.headers['x-csrf-token'];
    if (typeof header !== 'string') return false;
    const expected = Buffer.from(user.csrfToken);
    const received = Buffer.from(header);
    return expected.length === received.length && timingSafeEqual(expected, received);
};

/**
 * @description 로그인 및 OAuth state 쿠키를 즉시 만료시키는 헤더 값을 만든다.
 */
export const createClearedAuthCookies = (req: VercelRequest): string[] => {
    const common = {
        httpOnly: true,
        secure: isSecureRequest(req),
        sameSite: 'lax' as const,
        maxAge: 0,
    };
    return [
        stringifySetCookie({ name: SESSION_COOKIE, value: '', ...common, path: '/' }),
        stringifySetCookie({ name: OAUTH_STATE_COOKIE, value: '', ...common, path: '/api/auth' }),
    ];
};

/**
 * @description OAuth 콜백 처리 뒤 일회용 state 쿠키만 만료시킨다.
 */
export const createClearedOAuthStateCookie = (req: VercelRequest): string => (
    stringifySetCookie({
        name: OAUTH_STATE_COOKIE,
        value: '',
        httpOnly: true,
        secure: isSecureRequest(req),
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 0,
    })
);
