// src/games/slots/mahjongway/config.ts

export const MahjongWayConfig = {
    GameName: 'MahjongWay',
    GameId: '1003',

    Cols: 5,
    Rows: 4,                // số hàng hiển thị
    RowsAbove: 2,           // số hàng buffer phía trên dùng cho animation rơi xuống

    InitialLayout: [
        [3, 3, 3, 3],
        [2, 2, 2, 2],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [4, 4, 4, 4],
    ],

    Gravity: 'collapse' as 'collapse' | 'refill', // MahjongWay sử dụng collapse gravity
    FreeSpinAward: 12,
    ExtraFreeSpinsPerScatter: 3,
    GoldenReelIndexes: [1, 2, 3], // cột 2,3,4 theo index 0-based

    BaseBet: 20, // tổng cược cơ sở (20 lines) dùng để quy đổi bảng trả thưởng
    DebugSpinLog: true,

    SymbolNames: [
        'Fa',        // idx = 0 (phát)
        'Zhong',     // idx = 1 (trung)
        'TileBlue',  // idx = 2
        'TileWan',   // idx = 3
        'Dots4',     // idx = 4
        'Bamboo4',   // idx = 5
        'Dots1',     // idx = 6
        'Bamboo2',   // idx = 7
    ]
};