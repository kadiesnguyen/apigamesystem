// GameManager.ts
import { ConfigManager } from '../config/ConfigManager';

type GameId = string;

export type RegisteredGame = {
    socketHandler: (ws: any, token: any) => void;
    // --- mới, tùy chọn ---
    name?: string;
    gameIdNum?: number; // tiện cho nơi khác nếu cần
    getConfig?: (partnerId: number) => Promise<any>;
};

export class GameManager {
    private static games: Map<GameId, RegisteredGame> = new Map();

    static async register(gameId: GameId, logic: Omit<RegisteredGame, 'getConfig' | 'gameIdNum'> & Partial<RegisteredGame>) {
        // auto bơm getConfig nếu chưa truyền
        const withConfig: RegisteredGame = {
            ...logic,
            gameIdNum: Number(gameId),
            getConfig: async (partnerId: number) => ConfigManager.I.getConfig(gameId, partnerId),
        };
        this.games.set(gameId, withConfig);
    }

    static get(gameId: GameId): RegisteredGame | undefined {
        return this.games.get(gameId);
    }
}
