// src/routes/user.route.ts
import { t, Elysia } from 'elysia';
import { userController } from '../controllers/user.controller';

export const UserRoutes = (app: Elysia) =>
  app.group('/user', (group) =>
    group
      .post(
        '/register',
        userController.register,
        {
          body: t.Object({
            username: t.String(),
            password: t.String(),
            initGameId: t.Number(),
            gameUsername: t.String()
          })
        }
      )
      
      .post(
        '/login',
        userController.login,
        {
          body: t.Object({
            username: t.String(),
            password: t.String()
          })
        }
      )

      .post('/token',
        userController.consumeToken,
        {
          body: t.Object({
            token: t.String()
          })
        }
      )
  );

