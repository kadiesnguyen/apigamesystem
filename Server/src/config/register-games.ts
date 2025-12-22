import { GameRegistry } from './types';
import { SuperAceAdapter } from '../games/slots/superace/adapter';
import { MahjongWay2Adapter } from '../games/slots/mahjongway2/adapter';
import { MahjongWayAdapter } from '../games/slots/mahjongway/adapter';

export function registerAllGames() {
    GameRegistry.register(SuperAceAdapter);
    GameRegistry.register(MahjongWay2Adapter);
    GameRegistry.register(MahjongWayAdapter);
}
