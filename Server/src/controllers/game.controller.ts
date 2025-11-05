import { t } from 'elysia';
import { GameManager } from '../games/GameManager';
import { errorResponse, successResponse } from '../utils/response.util';

export const playGameController = {
    body: t.Object({
        gameId: t.String(),
        userId: t.String(),
        betAmount: t.Number(),
    }),
    async handler({ body }: { body: any }) {
        // console.log(body);
        const { gameId, userId, betAmount } = body;

        const game = GameManager.get(gameId);
        if (!game) {
            return errorResponse(`Game ID "${gameId}" không tồn tại`, 404);
        }

        // Validate input nếu game có validate riêng
        if (game.validate && !game.validate(body)) {
            return errorResponse(`Dữ liệu không hợp lệ cho game ${gameId}`, 400);
        }

        try {
            const result = game.play(body);
            return successResponse(result);
        } catch (err: any) {
            return errorResponse(`Lỗi khi xử lý game: ${err.message}`, 500);
        }
    }
};
