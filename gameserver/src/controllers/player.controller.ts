import { successResponse, errorResponse } from '../utils/response.util';
import { createToken } from '../utils/jwt.util';

export const playerController = {
    async getProfile({ postgres, store }: any) {
        try {
            // console.log('Controller: Đang xử lý lấy thông tin người dùng');
            // console.log('Controller: store.user:', store.user);

            if (!store?.user) {
                return errorResponse('Không tìm thấy thông tin người dùng', 404);
            }

            const { userId, partnerId } = store.user;
            // console.log('Controller: userId:', userId, 'partnerId:', partnerId);
            const result = await postgres.query(
                `SELECT player_id, username, balance, free_spins, created_at FROM player_accounts WHERE player_id = $1 AND partner_id = $2`,
                [userId, partnerId]
            );

            if (result.rowCount === 0) {
                return errorResponse('Người dùng không tồn tại', 404);
            }

            const user = result.rows[0];
            // console.log('Controller: Thông tin người dùng:', user);
            return successResponse({
                userId: user.player_id,
                username: user.username,
                balance: user.balance,
                freeSpins: user.free_spins,
                createdAt: user.created_at,
                partnerId: partnerId
            });

        } catch (error) {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            return errorResponse('Lỗi hệ thống', 500);
        }
    },
    async updateBalance({ postgres, mongo, store, body }: any) {
        try {
            const { user } = store;
            if (!user) return errorResponse('Người dùng không hợp lệ', 401);

            const { amount, type, reason } = body as {
                amount: number;
                type: 'increase' | 'decrease';
                reason: string;
            };

            if (!['increase', 'decrease'].includes(type))
                return errorResponse('Loại cập nhật không hợp lệ', 400);
            if (amount <= 0) return errorResponse('Số tiền không hợp lệ', 400);

            const multiplier = type === 'increase' ? 1 : -1;
            const actualAmount = multiplier * amount;

            const result = await postgres.query(
                `UPDATE player_accounts
                SET balance = balance + $1
                WHERE player_id = $2 AND partner_id = $3 AND game_id = $4
                RETURNING balance`,
                [actualAmount, user.userId, user.partnerId, user.gameId]
            );

            if (result.rowCount === 0) return errorResponse('Người dùng không tồn tại', 404);

            // Ghi log vào Mongo
            const logs = mongo.collection('logs.balance');
            await logs.insertOne({
                userId: user.userId,
                partnerId: user.partnerId,
                type,
                amount,
                reason,
                before: result.rows[0].balance - actualAmount,
                after: result.rows[0].balance,
                createdAt: new Date(),
            });

            return successResponse({
                message: `Cập nhật số dư thành công`,
                balance: result.rows[0].balance,
            });
        } catch (error) {
            console.error('❌ Lỗi cập nhật số dư:', error);
            return errorResponse('Cập nhật số dư thất bại', 500);
        }
    }
};
