// src/games/slots/superace/config.ts

export const SuperAceConfig = {
    GameName: 'SuperAce',
    GameId: '1001',
    
    Cols: 5,
    Rows: 4,

    InitialLayout: [
        [3, 3, 3, 3],
        [2, 2, 2, 2],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [4, 4, 4, 4],
    ],

    Gravity: 'refill' as 'collapse' | 'refill', // 'collapse' (cũ) hoặc 'refill' (giữ vị trí)
    FreeSpinAward: 10,
    SymbolNames: [
        'J',  // idx = 0
        'Q',  // idx = 1
        'K',  // idx = 2
        'A',  // idx = 3
        '♠',  // idx = 4
        '♣',  // idx = 5
        '♦',  // idx = 6
        '♥',  // idx = 7
    ]
};