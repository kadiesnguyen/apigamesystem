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
            case 'getProfile':
                try {
                    // console.log(`📄 User ${userId} requested profile`);
                    const profile = await userController.getProfile({ userId, postgres: pg, store: { userId } });
                    // console.log(`📄 Lấy thông tin profile của user ${userId}:`, profile);
                    ws.send(JSON.stringify({ type: 'getProfileResult', payload: profile }));
                } catch (err: any) {
                    ws.send(JSON.stringify({ type: 'error', error: err.message }));
                }
                break;
            default:
                ws.send(JSON.stringify({ type: 'error', error: 'Unknown action' }));
        }
    });

    // 3) Khi client đóng kết nối
    ws.on('close', () => {
        console.log(`🛑 SuperAce user ${userId} disconnected`);
    });
}
