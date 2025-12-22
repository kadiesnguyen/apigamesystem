// src/games/slots/mahjongway2/config.ts

export const MahjongWay2Config = {
    GameName: 'MahjongWay2',
    GameId: '1002',

    Cols: 5,
    Rows: 5,                // MahjongWay2 có 2000 ways với thêm một hàng
    RowsAbove: 4,

    InitialLayout: [
        [3, 3, 3, 3, 3],
        [2, 2, 2, 2, 2],
        [1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0],
        [4, 4, 4, 4, 4],
    ],

    Gravity: 'collapse' as 'collapse' | 'refill',
    FreeSpinAward: 12,
    ExtraFreeSpinsPerScatter: 3,
    GoldenReelIndexes: [1, 2, 3],

    BaseBet: 20,
    DebugSpinLog: true,

    SymbolNames: [
        'Fa',
        'Zhong',
        'TileBlue',
        'TileWan',
        'Dots4',
        'Bamboo4',
        'Dots1',
        'Bamboo2',
    ]
};

