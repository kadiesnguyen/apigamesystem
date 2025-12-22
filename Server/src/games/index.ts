// src/games/index.ts
import type { Pool } from 'pg';
import type { Db } from 'mongodb';
import { GameManager } from './GameManager';
import { superaceSocketHandler } from './slots/superace/ws-handler';
import { mahjongway2SocketHandler } from './slots/mahjongway2/ws-handler';
import { mahjongwaySocketHandler } from './slots/mahjongway/ws-handler';

export function registerGames(pg: Pool, mongoDb: Db) {
    // thay vì new SuperAceLogic, dùng trình bao ws-handler
    // console.log(mongoDb)
    GameManager.register('1001', {
        name: 'SuperAce',
        socketHandler: (ws, token) => superaceSocketHandler(ws, token, pg, mongoDb)
    });

    GameManager.register('1002', {
        name: 'MahjongWay2',
        socketHandler: (ws, token) => mahjongway2SocketHandler(ws, token, pg, mongoDb)
    });

    GameManager.register('1003', {
        name: 'MahjongWay',
        socketHandler: (ws, token) => mahjongwaySocketHandler(ws, token, pg, mongoDb)
    });
}
