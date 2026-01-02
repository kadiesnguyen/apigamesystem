// src/games/slots/superace/ws-handler.ts
import type { WebSocket } from 'ws';
import type { Pool } from 'pg';
import type { Db } from 'mongodb';
import { SuperAceLogic } from './logic';
import { parseJwt, verifyToken } from '../../../utils/jwt.util';
import { userController } from '../../../controllers/user.controller';


export async function superaceSocketHandler(
    ws: WebSocket,
    token: string,
    pg: Pool,
    mongoDb: Db
) {
    // console.log(mongoDb);
    const logic = new SuperAceLogic(pg, mongoDb);
    // 1) Xác thực token
    let userId: number;
    try {
        const payload = parseJwt(token);
        userId = payload.userId;
    } catch (err: any) {
        ws.send(JSON.stringify({
            type: 'authError',
            message: 'Token không hợp lệ hoặc đã hết hạn'
        }));
        // Đóng kết nối với mã 4001 (Unauthorized) và lý do
        return ws.close(4001, 'Unauthorized');
    }

    // 2) Lắng nghe message từ client
    ws.on('message', async raw => {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            return ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
        }

        switch (msg.type) {
            case 'spin': {
                const bet = msg.payload?.bet ?? 1;
                
                // ✅ VALIDATE BET AMOUNT
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
                            success: false,
                            error: result.reason
                        }));
                    }
                    // console.log(`✅ User ${userId} spun with bet=${bet}, result:`, result);
                    // ✅ Gửi kết quả spin tối ưu
                    ws.send(JSON.stringify({
                        type: 'spinResult',
                        payload: {
                            totalWin: result.totalWin,
                            freeSpinsLeft: result.freeSpinsLeft,
                            usingFreeSpin: result.usingFreeSpin,
                            free: result.free, // { triggered, awarded }
                            rounds: result.rounds // <== dữ liệu đã được tối ưu hóa
                        }
                    }));
                    // console.log(result.rounds.length, 'rounds in spin result');
                    // console.log(result.rounds);
                    // for (const round of result.rounds) {
                    //     // console.log(`Round thứ ${result.rounds.indexOf(round) + 1}`);
                    //     console.log(round.grid);
                    // }
                    // console.log(`✅ Gửi spinResult của user ${userId}: win=${result.totalWin}`);
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
                    // console.log(`📄 User ${userId} requested profile`);
                    const profile = await userController.getProfile({
                        userId,
                        postgres: pg,
                        store: { userId },
                        gameId: requestedGameId
                    });
                    // console.log(`📄 Lấy thông tin profile của user ${userId}:`, profile);
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

    // 3) Khi client đóng kết nối
    ws.on('close', () => {
        console.log(`🛑 SuperAce user ${userId} disconnected`);
    });
}
