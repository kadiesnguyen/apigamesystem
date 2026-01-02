// src/games/slots/mahjongway2/config.ts

export const MahjongWay2Config = {
    GameName: 'MahjongWay2',
    GameId: '1002',

    Cols: 5,
    // Mahjong Way 2 có cấu trúc grid không đồng nhất: 2000 ways
    // Cột 0 và 4 (ngoài cùng): 4 hàng
    // Cột 1, 2, 3 (giữa): 5 hàng
    RowsPerColumn: [4, 5, 5, 5, 4] as number[],  // số hàng cho mỗi cột
    MaxRows: 5,              // số hàng tối đa (dùng để hiển thị và tính toán)
    RowsAbove: 4,            // buffer phía trên cho animation rơi xuống

    // Layout khởi tạo - mỗi cột có độ dài khác nhau
    InitialLayout: [
        [3, 3, 3, 3],        // cột 0: 4 hàng
        [2, 2, 2, 2, 2],     // cột 1: 5 hàng
        [1, 1, 1, 1, 1],     // cột 2: 5 hàng
        [0, 0, 0, 0, 0],     // cột 3: 5 hàng
        [4, 4, 4, 4],        // cột 4: 4 hàng
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

