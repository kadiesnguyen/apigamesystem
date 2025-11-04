// assets/scripts/utils/DataOptimizer.js
// Helper functions để xử lý dữ liệu tối ưu từ server

const CellFlags = {
    IS_SCATTER: 1,
    IS_GOLDEN: 2,
    IS_WILD: 4,
    IS_RED_WILD: 8
};

/**
 * Giải nén cell từ dữ liệu tối ưu
 * @param {Object} compressed - Cell đã nén từ server
 * @returns {Object} Cell object đầy đủ
 */
function decompressCell(compressed) {
    return {
        idx: compressed.idx,
        isScatter: !!(compressed.flags & CellFlags.IS_SCATTER),
        isGolden: !!(compressed.flags & CellFlags.IS_GOLDEN),
        isWild: !!(compressed.flags & CellFlags.IS_WILD),
        wildType: (compressed.flags & CellFlags.IS_RED_WILD) ? 'red' : 
                  (compressed.flags & CellFlags.IS_WILD) ? 'blue' : null,
        wildMultiplier: (compressed.flags & CellFlags.IS_RED_WILD) ? 2 : 1
    };
}

/**
 * Giải nén grid từ dữ liệu tối ưu
 * @param {Array} compressedGrid - Grid đã nén từ server
 * @returns {Array} Grid object đầy đủ
 */
function decompressGrid(compressedGrid) {
    return compressedGrid.map(col => 
        col.map(cell => decompressCell(cell))
    );
}

/**
 * Chuyển đổi round tối ưu thành format cũ để tương thích
 * @param {Object} optimizedRound - Round tối ưu từ server
 * @param {number} index - Index của round
 * @returns {Object} Round object đầy đủ
 */
function convertOptimizedRound(optimizedRound, index) {
    const grid = decompressGrid(optimizedRound.finalGrid);
    
    return {
        index: index,
        grid: grid,
        winCells: optimizedRound.winCells || [],
        stepWin: optimizedRound.stepWin || 0,
        multiplier: optimizedRound.multiplier || 1,
        flipEvents: optimizedRound.flipEvents || [],
        forcedHighlight: optimizedRound.forcedWilds || [],
        forcedClear: optimizedRound.forcedWilds || [],
        clearList: [], // Sẽ được tính từ winCells + forcedClear
        nextGrid: optimizedRound.hasNext ? grid : null
    };
}

/**
 * Chuyển đổi toàn bộ rounds tối ưu thành format cũ
 * @param {Array} optimizedRounds - Rounds tối ưu từ server
 * @returns {Array} Rounds object đầy đủ
 */
function convertOptimizedRounds(optimizedRounds) {
    return optimizedRounds.map((round, index) => 
        convertOptimizedRound(round, index)
    );
}

module.exports = {
    decompressCell,
    decompressGrid,
    convertOptimizedRound,
    convertOptimizedRounds,
    CellFlags
};
