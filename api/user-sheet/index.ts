import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionUser, hasValidCsrfToken } from '../_lib/auth.js';
import { sendUnexpectedError } from '../_lib/error.js';
import { disableResponseCache } from '../_lib/http.js';
import { getRedis } from '../_lib/redis.js';
import {
    addMissingUserSheetEntries,
    readUserSheetSnapshot,
    replaceUserSheet,
    updateUserSheetEntry,
} from '../_lib/user-sheet-store.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    disableResponseCache(res);
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ error: '로그인이 필요합니다.' });
    const redis = getRedis();
    if (!redis) return res.status(503).json({ error: '유저 시트 저장소가 아직 설정되지 않았습니다.' });

    try {
        if (req.method === 'GET') {
            return res.status(200).json(await readUserSheetSnapshot(redis));
        }

        if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'POST') {
            if (!hasValidCsrfToken(req, user)) {
                return res.status(403).json({ error: '유저 시트 저장 요청을 확인할 수 없습니다.' });
            }
        }

        const actorName = user.globalName ?? user.username;

        if (req.method === 'PUT') {
            const body = req.body as {
                entries?: unknown;
                sheetVersion?: unknown;
            } | undefined;
            const result = await replaceUserSheet(
                redis,
                body?.entries,
                body?.sheetVersion,
                actorName,
            );
            if (result.status === 'INVALID') {
                return res.status(400).json({
                    error: '최신 시트를 다시 불러온 뒤 중복되지 않은 올바른 배틀태그로 작성해 주세요.',
                });
            }
            if (result.status === 'CONFLICT') {
                return res.status(409).json({
                    code: 'USER_SHEET_CONFLICT',
                    error: '다른 관리자가 시트를 먼저 수정했습니다. 최신 시트를 새로고침한 뒤 변경 내용을 다시 반영해 주세요.',
                    snapshot: await readUserSheetSnapshot(redis),
                });
            }
            if (result.status !== 'OK') {
                return res.status(409).json({
                    code: 'USER_SHEET_CONFLICT',
                    error: '유저 시트 상태가 변경되었습니다. 최신 시트를 새로고침해 주세요.',
                    snapshot: await readUserSheetSnapshot(redis),
                });
            }
            return res.status(200).json(result.snapshot);
        }

        if (req.method === 'POST') {
            const body = req.body as { entries?: unknown } | undefined;
            const result = await addMissingUserSheetEntries(
                redis,
                body?.entries,
                actorName,
            );
            if (result.status !== 'OK') {
                return res.status(400).json({ error: '추가할 Discord 명단을 확인해 주세요.' });
            }
            return res.status(200).json({
                ...result.snapshot,
                addedCount: result.addedCount ?? 0,
            });
        }

        if (req.method === 'PATCH') {
            const body = req.body as {
                entry?: unknown;
                expectedUpdatedAt?: unknown;
            } | undefined;
            const result = await updateUserSheetEntry(
                redis,
                body?.entry,
                body?.expectedUpdatedAt,
                actorName,
            );
            if (result.status === 'INVALID') {
                return res.status(400).json({
                    error: '배틀태그에 #과 숫자 태그를 포함해 주세요. 예: Player#1234',
                });
            }
            if (result.status === 'NOT_FOUND') {
                return res.status(404).json({
                    error: '수정할 유저를 찾지 못했습니다. 시트를 새로고침해 주세요.',
                });
            }
            if (result.status === 'DUPLICATE') {
                return res.status(409).json({
                    code: 'DUPLICATE_BATTLE_TAG',
                    error: '같은 배틀태그가 이미 등록되어 있습니다.',
                });
            }
            if (result.status === 'CONFLICT') {
                return res.status(409).json({
                    code: 'USER_SHEET_CONFLICT',
                    error: '다른 관리자가 이 유저를 먼저 수정했습니다. 최신 정보를 새로고침한 뒤 다시 수정해 주세요.',
                    snapshot: await readUserSheetSnapshot(redis),
                });
            }
            if (result.status !== 'OK') {
                return res.status(409).json({
                    code: 'USER_SHEET_CONFLICT',
                    error: '유저 정보 상태가 변경되었습니다. 최신 시트를 새로고침해 주세요.',
                    snapshot: await readUserSheetSnapshot(redis),
                });
            }
            return res.status(200).json(result.snapshot);
        }

        res.setHeader('Allow', 'GET, PUT, PATCH, POST');
        return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
    } catch (error) {
        return sendUnexpectedError(
            res,
            error,
            '유저 시트 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        );
    }
}
