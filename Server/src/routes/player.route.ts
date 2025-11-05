// src/routes/player.route.ts
import { t, Elysia } from 'elysia';
import { playerController } from '../controllers/player.controller';

export const playerRoutes = (app: Elysia) =>
  app
    .get(
      '/profile',
      playerController.getProfile
    )
    .post(
      '/balance/update',
      playerController.updateBalance,
      {
        body: t.Object({
          amount: t.Number(),
          type: t.Union([t.Literal('increase'), t.Literal('decrease')]),
          reason: t.String()
        })
      }
    );
