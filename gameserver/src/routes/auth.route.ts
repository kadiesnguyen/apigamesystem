import { Elysia } from 'elysia';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const authRoutes = new Elysia({ prefix: '/auth' })
    .post('/register', userController.register);
