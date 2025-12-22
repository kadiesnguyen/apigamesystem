// GameId trong registry dùng number; GameManager của bạn đang là string → sẽ convert.
export type GameIdNum = 1001 | 1002 | 1003;
export type GameIdStr = string;

export interface GameAdapter<RuntimeCfg = any> {
    gameId: GameIdNum;                 // ID số cho registry
    name: string;
    defaults(): any;
    merge(base: any, override?: any): any;
    validate(raw: any): void;
    toRuntime(raw: any): RuntimeCfg;
}

export class GameRegistry {
    private static map = new Map<GameIdNum, GameAdapter>();
    static register(adapter: GameAdapter) { this.map.set(adapter.gameId, adapter); }
    static get(gameId: GameIdNum) {
        const a = this.map.get(gameId);
        if (!a) throw new Error(`No adapter for gameId=${gameId}`);
        return a;
    }
}

// helper chuyển "1001" -> 1001
export function toNumGameId(id: GameIdStr | number): GameIdNum {
    const n = typeof id === 'number' ? id : Number(id);
    return n as GameIdNum;
}
