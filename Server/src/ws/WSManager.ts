// WSManager.ts
import { Elysia } from 'elysia';
import { GameManager } from '../games/GameManager';

// WebSocket handler for Elysia - same port as HTTP
export const wsPlugin = new Elysia()
    .ws('/ws', {
        open(ws) {
            const url = new URL(ws.data.request.url);
            const gameID = url.searchParams.get('gameID');
            const token = url.searchParams.get('token');

            console.log('🌐 WS connection attempt:', { gameID, token });

            // Store connection info on the websocket object
            (ws as any).gameID = gameID;
            (ws as any).token = token;

            const game = GameManager.get(gameID);
            if (!game || typeof game.socketHandler !== 'function') {
                console.warn('❌ Không tìm thấy game hoặc thiếu socketHandler');
                ws.send('❌ Game not found or not ready');
                ws.close();
                return;
            }

            // Pass an adapter that matches the ws library interface
            const wsAdapter = {
                send: (data: string | Buffer) => ws.send(data),
                close: () => ws.close(),
                on: (event: string, handler: Function) => {
                    // Store handlers for later use
                    if (!(ws as any)._handlers) (ws as any)._handlers = {};
                    (ws as any)._handlers[event] = handler;
                },
                // Expose raw websocket for advanced usage
                raw: ws
            };

            game.socketHandler(wsAdapter, token);
        },
        message(ws, message) {
            const handlers = (ws as any)._handlers;
            if (handlers?.message) {
                handlers.message(message);
            }
        },
        close(ws) {
            const handlers = (ws as any)._handlers;
            if (handlers?.close) {
                handlers.close();
            }
        },
        error(ws, error) {
            const handlers = (ws as any)._handlers;
            if (handlers?.error) {
                handlers.error(error);
            }
        }
    });

console.log('🔌 WebSocket plugin initialized');
