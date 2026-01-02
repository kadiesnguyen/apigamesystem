// src/games/slots/mahjongway2/ws-handler.ts
import type { WebSocket, RawData } from 'ws';
import type { Pool } from 'pg';
import type { Db } from 'mongodb';
import { MahjongWay2Logic } from './logic';
import { parseJwt } from '../../../utils/jwt.util';
import { userController } from '../../../controllers/user.controller';

export async function mahjongway2SocketHandler(
    ws: WebSocket,
    token: string,
    pg: Pool,
    mongoDb: Db
) {
    const logic = new MahjongWay2Logic(pg, mongoDb);
    let userId: number;
    try {
        const payload = parseJwt(token);
        userId = payload.userId;
    } catch (err: any) {
        ws.send(JSON.stringify({
            type: 'authError',
            message: 'Token không hợp lệ hoặc đã hết hạn'
        }));
        return ws.close(4001, 'Unauthorized');
    }

    ws.on('message', async (raw: RawData) => {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            return ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
        }

        switch (msg.type) {
            case 'spin': {
                const bet = msg.payload?.bet ?? 1;

                if (!Number.isFinite(bet) || bet <= 0 || bet > 10000) {
                    return ws.send(JSON.stringify({
                        type: 'spinResult',
                        success: false,
                        error: 'Số tiền cược không hợp lệ'
                    }));
                }

                try {
                    const result = await logic.spin(userId, bet);

                    if (result.success === false) {
                        return ws.send(JSON.stringify({
                            type: 'spinResult',
                            payload: {
                                success: false,
                                error: result.error ?? result.reason ?? 'Spin failed'
                            }
                        }));
                    }

                    const payload = {
                        success: true,
                        totalWin: result.totalWin,
                        freeSpinsLeft: result.freeSpinsLeft,
                        usingFreeSpin: result.usingFreeSpin,
                        free: result.free,
                        rounds: result.rounds,
                        // Thông tin cấu trúc grid để client biết số hàng mỗi cột
                        gridConfig: result.gridConfig,
                    };

                    ws.send(JSON.stringify({
                        type: 'spinResult',
                        payload
                    }));
                } catch (err: any) {
                    ws.send(JSON.stringify({ type: 'error', error: err.message }));
                }
                break;
            }
            case 'getProfile': {
                try {
                    const rawGameId = msg.payload?.gameID ?? msg.payload?.gameId ?? msg.payload?.game_id;
                    const parsedGameId = rawGameId !== undefined ? Number(rawGameId) : undefined;
                    const requestedGameId = typeof parsedGameId === 'number' && Number.isFinite(parsedGameId)
                        ? parsedGameId
                        : undefined;
                    const profile = await userController.getProfile({
                        userId,
                        postgres: pg,
                        store: { userId },
                        gameId: requestedGameId
                    });
                    ws.send(JSON.stringify({ type: 'getProfileResult', payload: profile }));
                } catch (err: any) {
                    ws.send(JSON.stringify({ type: 'error', error: err.message }));
                }
                break;
            }
            case 'getLogs': {
                const payload = msg.payload ?? {};
                const rawLimit = Number(payload.limit ?? 20);
                const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 20;
                const rawOffset = Number(payload.offset ?? payload.skip ?? 0);
                const skip = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;
                const allowedSorts = new Set(['t.desc', 't.asc', 'win.desc', 'win.asc', 'bet.desc', 'bet.asc']);
                const sort = typeof payload.sort === 'string' && allowedSorts.has(payload.sort)
                    ? payload.sort
                    : undefined;
                const parseDate = (value: any) => {
                    if (!value) return undefined;
                    const d = new Date(value);
                    return Number.isNaN(d.getTime()) ? undefined : d;
                };
                try {
                    const logs = await logic.getUserLogs(userId, {
                        limit,
                        skip,
                        sort,
                        dateFrom: parseDate(payload.dateFrom) ?? undefined,
                        dateTo: parseDate(payload.dateTo) ?? undefined,
                    });
                    ws.send(JSON.stringify({
                        type: 'getLogsResult',
                        payload: {
                            success: true,
                            logs,
                        }
                    }));
                } catch (err: any) {
                    ws.send(JSON.stringify({
                        type: 'getLogsResult',
                        payload: {
                            success: false,
                            error: err.message ?? 'Không thể lấy log',
                        }
                    }));
                }
                break;
            }
            default:
                ws.send(JSON.stringify({ type: 'error', error: 'Unknown action' }));
        }
    });

    ws.on('close', () => {
        console.log(`🛑 MahjongWay2 user ${userId} disconnected`);
    });
}

