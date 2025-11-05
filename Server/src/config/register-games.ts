import { GameRegistry } from './types';
import { SuperAceAdapter } from '../games/slots/superace/adapter';
import { MahjongWay2Adapter } from '../games/slots/mahjongway2/adapter';

export function registerAllGames() {
    GameRegistry.register(SuperAceAdapter);
    GameRegistry.register(MahjongWay2Adapter);
}
