// src/app.ts

import { Elysia } from 'elysia';
import { authRoutes } from './routes/auth.route';
import { UserRoutes } from './routes/user.route';
import { playerRoutes } from './routes/player.route';

import { loggerMiddleware } from './middlewares/logger.middleware';
import { authUserMiddleware } from './middlewares/authUser.middleware';
import { authMiddleware } from './middlewares/auth.middleware';

import { mongo } from './config/mongo';
import { db } from './config/db';
import { redis } from './config/redis';
import cors from '@elysiajs/cors';

const app = new Elysia();

export interface SetupResult {
  app: typeof app;
  postgres: Awaited<ReturnType<typeof db.connect>>;
  mongoDb: Awaited<ReturnType<typeof mongo.connect>>;
  redisClient: typeof redis;
}

export const setupApp = async (): Promise<SetupResult> => {
  console.log('✅ Khởi tạo ứng dụng Elysia');

  // Connect all DBs
  const mongoDb = await mongo.connect();
  const postgres = await db.connect();
  const redisClient = redis;

  // Decorate only for route handlers
  app.decorate('mongo', mongoDb);
  app.decorate('postgres', postgres);
  app.decorate('redis', redisClient);

  // Middleware + routes
  app.use(cors({ origin: '*' }));
  app.use(loggerMiddleware);

  app.group('/api', (g) => {
    authMiddleware(g);
    UserRoutes(g);
    return g;
  });

  app.group('/api/player', (g) => {
    authUserMiddleware(g);
    playerRoutes(g);
    return g;
  });

  // Health check endpoint for Kubernetes
  app.get('/health', () => {
    return { status: 'ok' };
  });

  return { app, postgres, mongoDb, redisClient };
};
