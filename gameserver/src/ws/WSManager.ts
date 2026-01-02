// WSManager.ts
import { WebSocketServer } from 'ws';
import { GameManager } from '../games/GameManager';

export class WSManager {
    private wss: WebSocketServer;

    constructor(server: any) {
        this.wss = new WebSocketServer({ server });
        console.log('🔌 WebSocket server is starting...');

        this.wss.on('connection', (ws, req) => {
            const url = new URL(req.url || '', 'http://localhost');
            const gameID = url.searchParams.get('gameID');
            const token = url.searchParams.get('token');

            console.log('🌐 WS connection attempt:', { gameID, token });

            const game = GameManager.get(gameID);
            if (!game || typeof game.socketHandler !== 'function') {
                console.warn('❌ Không tìm thấy game hoặc thiếu socketHandler');
                ws.send('❌ Game not found or not ready');
                ws.close();
                return;
            }

            game.socketHandler(ws, token);
        });
    }
}
