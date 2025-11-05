// types/context.d.ts
import type { Pool } from 'pg';
import type { Db } from 'mongodb';
import type Redis from 'ioredis';

declare module 'elysia' {
  interface Context {
    postgres: Pool;
    mongo: Db;
    redis: Redis;
    store: {
      partnerId?: string;
      [key: string]: any;
    };
  }
}
