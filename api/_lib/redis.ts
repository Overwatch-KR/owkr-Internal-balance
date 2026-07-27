import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

/**
 * @description 환경변수가 준비된 경우에만 Upstash Redis 클라이언트를 지연 생성한다.
 */
export const getRedis = (): Redis | null => {
    if (redis) return redis;

    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;

    redis = new Redis({ url, token });
    return redis;
};
