// src/index.ts
import { setupApp } from './app';
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

  const PORT = Number(process.env.PORT) || 3000;

  // Start Elysia HTTP server with WebSocket support on same port
  app.listen({
    port: PORT,
    hostname: '0.0.0.0'
  });

  console.log(`✅ API đang chạy tại http://0.0.0.0:${PORT}`);
  console.log(`✅ WebSocket chạy tại ws://0.0.0.0:${PORT}/ws`);
}

main().catch((err) => {
  console.error('❌ Không thể khởi động server:', err);
});
