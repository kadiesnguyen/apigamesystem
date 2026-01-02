import { Elysia, t } from 'elysia';
import { playGameController } from '../controllers/game.controller';


export const gameRoutes = new Elysia({ prefix: '/game' })
    .get('/', () => {
        return { message: 'Hello World' };
    })
    .post(
        '/play',
        playGameController.handler, // ✅ đúng cách gọi hàm handler
        {
            body: t.Object({
                gameId: t.String(),
                userId: t.String(),
                betAmount: t.Number(),
            }),
        }
    );
