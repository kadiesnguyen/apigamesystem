// src/index.ts
import { createServer } from 'http';
import { setupApp } from './app';
import { WSManager } from './ws/WSManager';
import { registerGames } from './games';
import { registerAllGames } from './config/register-games';
import { ConfigManager } from './config/ConfigManager';

async function main() {
  // Boot Elysia + get raw DBs
  const { app, postgres, mongoDb, redisClient } = await setupApp();

  registerAllGames(); // đăng ký adapter các game
  ConfigManager.I.attachPg(postgres);   // <— đưa Pool vào
  ConfigManager.I;                // bật subscriber
  await ConfigManager.I.bootstrapGameOnly([1001]); // seed ngay (tuỳ chọn)
  registerGames(postgres, mongoDb);

  // Start WebSocket on :3001
  const wsServer = createServer();

  new WSManager(wsServer, {
    pg: postgres,
    mongo: mongoDb,
    redis: redisClient
  });

  wsServer.listen(3001, () =>
    console.log('✅ WebSocket chạy tại ws://localhost:3001')
  );

  // Finally start HTTP API on :3000
  app.listen(3000, () =>
    console.log('✅ API đang chạy tại http://localhost:3000')
  );
}

main().catch((err) => {
  console.error('❌ Không thể khởi động server:', err);
});
