// src/games/slots/mahjongway2/gridmodel.ts
import { MahjongWay2Config } from './config';

const AnsiColor = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  normal: '\x1b[37m',
  golden: '\x1b[33m',
  wild: '\x1b[36m',
  scatter: '\x1b[35m',
};

export interface Cell {
  idx: number;
  isGolden: boolean;
  isScatter: boolean;
  isWild: boolean;
  wildType: 'blue' | null;
}

export interface SpinRoundResult {
  grid: Cell[][];
  winLines: { c: number; r: number }[];
  winAmount: number;
  multiplier: number;
}

export interface Pos { c: number; r: number }

export interface FlipEvent extends Pos {
  wildType: 'blue';
}

export interface CopyEvent extends Pos {
  sourcePos: Pos;
  wildType: 'blue';
}

export interface SpawnItem extends Pos {
  cell: Cell;
}

export interface StepRoundPayload {
  index: number;
  grid: Cell[][];
  aboveGrid: Cell[][];
  winCells: Pos[];
  clearedCells: Pos[];
  stepWin: number;
  multiplier: number;
  flipEvents: FlipEvent[];
  copyEvents: CopyEvent[];
  nextGrid: Cell[][];
  nextAboveGrid: Cell[][];
  hasNext: boolean;
}

export class GridModel {
  cols: number;
  rowsPerColumn: number[];
  maxRows: number;
  private bufferRows: number;
  private topBufferReserve: number;
  payoutTable: number[][];
  scatterChance: number;
  goldenChance: number;
  noWinRate: number;
  symbolCount: number;
  goldenReelSet: Set<number>;

  data: Cell[][];
  private topBuffers: Cell[][] = [];
  private debugEnabled: boolean;

  constructor(
    cols: number,
    rowsPerColumn: number[],
    payoutTable: number[][],
    scatterChance: number,
    goldenChance: number,
    noWinRate: number,
    initialLayout?: number[][]
  ) {
    this.cols = cols;
    this.rowsPerColumn = rowsPerColumn;
    this.maxRows = Math.max(...rowsPerColumn);
    this.bufferRows = Math.max(0, MahjongWay2Config.RowsAbove ?? 0);
    this.topBufferReserve = Math.max(1, this.maxRows + this.bufferRows);
    this.payoutTable = payoutTable;
    this.scatterChance = scatterChance;
    this.goldenChance = goldenChance;
    this.noWinRate = noWinRate;
    this.symbolCount = MahjongWay2Config.SymbolNames?.length ?? 8;
    this.goldenReelSet = new Set(MahjongWay2Config.GoldenReelIndexes ?? []);
    this.debugEnabled = Boolean(MahjongWay2Config.DebugSpinLog);

    // Khởi tạo grid với số hàng khác nhau cho mỗi cột
    this.data = Array.from({ length: cols }, (_, c) => {
      const rowCount = this.getRowCount(c);
      return Array.from({ length: rowCount }, (_, r) => ({
        idx: initialLayout?.[c]?.[r] ?? 0,
        isScatter: false,
        isGolden: false,
        isWild: false,
        wildType: null,
      }));
    });
    this.initTopBuffers();
  }

  // Lấy số hàng của cột cụ thể
  getRowCount(column: number): number {
    return this.rowsPerColumn[column] ?? this.maxRows;
  }

  private deepCopy<T>(x: T): T {
    return JSON.parse(JSON.stringify(x));
  }

  private cloneCell(cell: Cell): Cell {
    return {
      idx: cell.idx,
      isGolden: cell.isGolden,
      isScatter: cell.isScatter,
      isWild: cell.isWild,
      wildType: cell.wildType,
    };
  }

  private snapshotAboveBuffer(): Cell[][] {
    if (!this.topBuffers) {
      return Array.from({ length: this.cols }, () => []);
    }
    return this.topBuffers.map(col => col.map(cell => this.cloneCell(cell)));
  }

  public getVisibleGridSnapshot(): Cell[][] {
    return this.deepCopy(this.data);
  }

  public getAboveBufferSnapshot(): Cell[][] {
    return this.snapshotAboveBuffer();
  }

  private dedup(arr: Pos[]): Pos[] {
    const s = new Set<string>();
    const out: Pos[] = [];
    for (const p of arr) {
      const k = `${p.c},${p.r}`;
      if (!s.has(k)) { s.add(k); out.push(p); }
    }
    return out;
  }

  private isGoldenEligible(column: number): boolean {
    return this.goldenReelSet.size === 0 || this.goldenReelSet.has(column);
  }

  private createRandomCell(column: number): Cell {
    const scatterRoll = Math.random();
    const goldenRoll = Math.random();

    const isScatter = scatterRoll < this.scatterChance;
    const isGolden = !isScatter && this.isGoldenEligible(column) && goldenRoll < this.goldenChance;

    return {
      idx: Math.floor(Math.random() * this.symbolCount),
      isScatter,
      isGolden,
      isWild: false,
      wildType: null,
    };
  }

  private initTopBuffers() {
    this.topBuffers = Array.from({ length: this.cols }, () => []);
    this.ensureAllTopBuffersReady();
  }

  private ensureAllTopBuffersReady(minTarget?: number) {
    if (this.topBufferReserve <= 0) return;
    for (let c = 0; c < this.cols; c++) {
      this.ensureTopBufferColumn(c, minTarget);
    }
  }

  private ensureTopBufferColumn(column: number, minTarget?: number) {
    if (this.topBufferReserve <= 0) return;
    if (!this.topBuffers[column]) {
      this.topBuffers[column] = [];
    }
    const targetLength = Math.max(this.topBufferReserve, minTarget ?? 0);
    while (this.topBuffers[column]!.length < targetLength) {
      this.topBuffers[column]!.push(this.createRandomCell(column));
    }
  }

  private pullFromTopBuffer(column: number, count: number): Cell[] {
    if (count <= 0) return [];
    this.ensureTopBufferColumn(column, count);
    const pulled = this.topBuffers[column]!.splice(0, count);
    this.ensureTopBufferColumn(column);
    return pulled;
  }

  private refillOnlyCleared() {
    for (let c = 0; c < this.cols; c++) {
      const rowCount = this.getRowCount(c);
      for (let r = 0; r < rowCount; r++) {
        const cell = this.data[c]?.[r];
        if (cell && cell.idx === -1) {
          this.data[c]![r] = this.createRandomCell(c);
        }
      }
    }
    this.initTopBuffers();
  }

  /**
   * Quét toàn bộ lưới để tìm line thắng với cấu trúc grid không đồng nhất.
   * Mỗi cột có số hàng khác nhau nên cần duyệt đúng theo rowsPerColumn.
   */
  private evaluateWins(grid: Cell[][], totalBet: number): {
    totalBaseWin: number;
    winCells: Pos[];
    goldenToWild: Pos[];
  } {
    const baseBet = MahjongWay2Config.BaseBet ?? 20;
    const betPerWay = totalBet / baseBet;

    const winCellMap = new Map<string, Pos>();
    const goldenMap = new Map<string, Pos>();
    let totalBaseWin = 0;

    for (let symbol = 0; symbol < this.symbolCount; symbol++) {
      const columns: Pos[][] = [];

      for (let c = 0; c < this.cols; c++) {
        const matches: Pos[] = [];
        const rowCount = this.getRowCount(c);

        for (let r = 0; r < rowCount; r++) {
          const cell = grid[c]?.[r];
          if (!cell || cell.isScatter) continue;

          const matchesSymbol = cell.idx === symbol || cell.isWild;
          if (!matchesSymbol) continue;
          if (c === 0 && cell.isWild && cell.idx !== symbol) continue;

          matches.push({ c, r });
        }

        if (matches.length === 0) {
          if (c > 0 && columns.length === 0) {
            continue;
          }
          break;
        }
        columns.push(matches);
      }

      if (columns.length < 3) continue;

      const payoutRow = this.payoutTable[symbol] ?? [];
      const index = Math.min(columns.length - 3, payoutRow.length - 1);
      if (index < 0) continue;

      const payoutRate = payoutRow[index] ?? 0;
      if (payoutRate <= 0) continue;

      const ways = columns.reduce((acc, group) => acc * group.length, 1);
      totalBaseWin += payoutRate * betPerWay * ways;

      for (const columnMatches of columns) {
        for (const pos of columnMatches) {
          const key = `${pos.c},${pos.r}`;
          if (!winCellMap.has(key)) {
            winCellMap.set(key, pos);
            const sourceCell = grid[pos.c]?.[pos.r];
            if (sourceCell?.isGolden) {
              goldenMap.set(key, pos);
            }
          }
        }
      }
    }

    return {
      totalBaseWin,
      winCells: Array.from(winCellMap.values()),
      goldenToWild: Array.from(goldenMap.values()),
    };
  }

  /**
   * Spin với cascade và xử lý grid không đồng nhất
   */
  public spinWithCascadeAuthoritative(
    bet: number,
    isFreeSpin = false
  ): { rounds: StepRoundPayload[]; totalWin: number } {

    const rounds: StepRoundPayload[] = [];
    const baseMultipliers = isFreeSpin ? [2, 4, 6, 10] : [1, 2, 3, 5];

    let cascadeCount = 0;
    let totalWin = 0;

    const forceNoWin =
      (this.noWinRate ?? 0) > 0 &&
      !isFreeSpin &&
      Math.random() < (this.noWinRate ?? 0);

    if (forceNoWin) {
      let tries = 0, ok = false;
      while (tries++ < 30) {
        this.randomFill();
        const evalNoWin = this.evaluateWins(this.data, bet);
        const scatters = this.data.flat().filter(c => c.isScatter).length;
        if (evalNoWin.winCells.length === 0 && scatters < 3) { ok = true; break; }
      }
      if (!ok) this.randomFill();
    } else {
      this.randomFill();
    }

    while (true) {
      this.ensureAllTopBuffersReady();
      const gridStart = this.deepCopy(this.data);
      const aboveStart = this.snapshotAboveBuffer();

      const evaluation = this.evaluateWins(gridStart, bet);
      let winCells = evaluation.winCells;
      const copyEvents: CopyEvent[] = [];

      const baseWin = evaluation.totalBaseWin;
      if (baseWin <= 0) {
        break;
      }

      const mult = baseMultipliers[Math.min(cascadeCount, baseMultipliers.length - 1)] || 1;
      const stepWin = baseWin * mult;

      totalWin += stepWin;

      const flipEvents: FlipEvent[] = [];
      const goldenWildPositions = new Set(
        (evaluation.goldenToWild ?? []).map(pos => `${pos.c},${pos.r}`)
      );

      for (const pos of evaluation.goldenToWild) {
        const cell = this.data[pos.c]?.[pos.r];
        if (!cell) continue;
        cell.isGolden = false;
        cell.isWild = true;
        cell.wildType = 'blue';
        flipEvents.push({ c: pos.c, r: pos.r, wildType: 'blue' });
      }

      const toClearNow: Pos[] = winCells;
      const clearedCells: Pos[] = [];
      let clearedAny = false;
      for (const { c, r } of toClearNow) {
        const key = `${c},${r}`;
        if (goldenWildPositions.has(key)) {
          continue;
        }
        const cell = this.data[c]?.[r];
        if (!cell) continue;
        cell.idx = -1;
        cell.isScatter = false;
        cell.isGolden = false;
        cell.isWild = false;
        cell.wildType = null;
        clearedAny = true;
        clearedCells.push({ c, r });
      }

      if (MahjongWay2Config.Gravity === 'collapse') {
        this.collapseGrid();
      } else {
        this.refillOnlyCleared();
      }

      const nextGrid = this.deepCopy(this.data);
      const nextAbove = this.snapshotAboveBuffer();

      if (!clearedAny) {
        break;
      }

      if (this.debugEnabled) {
        this.logRoundDebug({
          index: rounds.length,
          multiplier: mult || 1,
          baseWin,
          stepWin,
          gridStart,
          aboveStart,
          nextGrid,
          nextAbove,
          winCells,
          goldenToWild: evaluation.goldenToWild,
        });
      }

      rounds.push({
        index: rounds.length,
        grid: gridStart,
        aboveGrid: aboveStart,
        winCells,
        clearedCells,
        stepWin,
        multiplier: mult || 1,
        flipEvents,
        copyEvents,
        nextGrid,
        nextAboveGrid: nextAbove,
        hasNext: true,
      });

      cascadeCount++;
    }

    const lastRound = rounds.at(-1);
    if (lastRound) lastRound.hasNext = false;
    if (this.debugEnabled && !lastRound) {
      console.log('\n⚠️ [DEBUG] Không có round thắng nào trong spin này.');
    }

    return { rounds, totalWin };
  }

  private randomFill() {
    for (let c = 0; c < this.cols; c++) {
      const rowCount = this.getRowCount(c);
      if (!this.data[c]) this.data[c] = [];
      // Đảm bảo cột có đúng số hàng
      this.data[c]!.length = rowCount;
      for (let r = 0; r < rowCount; r++) {
        this.data[c]![r] = this.createRandomCell(c);
      }
    }
    this.initTopBuffers();
  }

  private collapseGrid() {
    for (let c = 0; c < this.cols; c++) {
      const rowCount = this.getRowCount(c);
      const survivors: Cell[] = [];
      
      for (let r = 0; r < rowCount; r++) {
        const cell = this.data[c]?.[r];
        if (cell && cell.idx !== -1) {
          survivors.push(cell);
        }
      }

      const missing = rowCount - survivors.length;
      if (missing > 0) {
        const arrivals = this.pullFromTopBuffer(c, missing);
        for (const arrival of arrivals) {
          survivors.push(arrival!);
        }
      }

      while (survivors.length < rowCount) {
        survivors.unshift(this.createRandomCell(c));
      }

      // Đảm bảo cột có đúng số hàng
      if (!this.data[c]) this.data[c] = [];
      this.data[c]!.length = rowCount;
      
      for (let r = 0; r < rowCount; r++) {
        this.data[c]![r] = survivors[r]!;
      }
    }
  }

  private logRoundDebug(payload: {
    index: number;
    multiplier: number;
    baseWin: number;
    stepWin: number;
    gridStart: Cell[][];
    aboveStart: Cell[][];
    nextGrid: Cell[][];
    nextAbove: Cell[][];
    winCells: Pos[];
    goldenToWild: Pos[];
  }) {
    const {
      index,
      multiplier,
      baseWin,
      stepWin,
      gridStart,
      aboveStart,
      nextGrid,
      nextAbove,
      winCells,
      goldenToWild,
    } = payload;
    console.log(`\n📘 [DEBUG] Round ${index}`);
    console.log(`   ➤ BaseWin: ${baseWin.toFixed(2)} | Multiplier: x${multiplier} | StepWin: ${stepWin.toFixed(2)}`);
    const winHighlight = new Set(winCells.map(p => `${p.c},${p.r}`));
    console.log('   ▶️ Grid trước khi xử lý (Row 0 = hàng dưới cùng):');
    console.log(this.renderGrid(gridStart, { highlight: winHighlight }));
    if (this.bufferRows > 0) {
      console.log('   ☁️ Buffer phía trên trước khi rơi:');
      console.log(this.renderAbove(aboveStart));
    }
    if (winCells.length > 0) {
      const winDetails = winCells.map(p => {
        const cell = gridStart[p.c]?.[p.r];
        const label = (cell ? this.describeCellLabel(cell).trim() : 'N/A');
        const tag = this.describeCellState(cell);
        return `(${p.c},${p.r})=${label}${tag ? `[${tag}]` : ''}`;
      }).join(', ');
      console.log('   ⭐ Ô thắng:', winDetails);
    } else {
      console.log('   ⭐ Không có ô thắng (sẽ dừng cascade).');
    }
    if (goldenToWild.length > 0) {
      console.log('   🥇 Golden → Wild:', goldenToWild.map(p => `(${p.c},${p.r})`).join(', '));
    }
    console.log('   ⬇️ Grid sau khi clear + collapse (Row 0 = hàng dưới cùng):');
    console.log(this.renderGrid(nextGrid));
    if (this.bufferRows > 0) {
      console.log('   ☁️ Buffer phía trên sau khi rơi:');
      console.log(this.renderAbove(nextAbove));
    }
  }

  private renderGrid(grid: Cell[][], opts?: { highlight?: Set<string> }): string {
    const highlight = opts?.highlight ?? null;
    const lines: string[] = [];
    
    // Hiển thị từ hàng trên cùng xuống dưới
    for (let visualRow = this.maxRows - 1; visualRow >= 0; visualRow--) {
      const rowCells: string[] = [];
      for (let c = 0; c < this.cols; c++) {
        const rowCount = this.getRowCount(c);
        // Nếu cột này không có hàng này (vd: cột ngoài chỉ có 4 hàng), hiển thị ô trống
        if (visualRow >= rowCount) {
          rowCells.push('[      ]');
        } else {
          const key = `${c},${visualRow}`;
          const isMarked = highlight?.has(key) ?? false;
          rowCells.push(this.formatCell(grid[c]?.[visualRow], isMarked));
        }
      }
      lines.push(`      Row ${visualRow}: ${rowCells.join(' ')}`);
    }
    return lines.join('\n');
  }

  private renderAbove(buffer: Cell[][]): string {
    if (this.bufferRows <= 0) return '      (Không có buffer RowsAbove)';
    const lines: string[] = [];
    for (let r = 0; r < this.bufferRows; r++) {
      const rowCells: string[] = [];
      for (let c = 0; c < this.cols; c++) {
        rowCells.push(this.formatCell(buffer[c]?.[r]));
      }
      lines.push(`      Above ${r}: ${rowCells.join(' ')}`);
    }
    return lines.join('\n');
  }

  private formatCell(cell?: Cell, highlight = false): string {
    if (!cell) return '[------]';
    const label = this.describeCellLabel(cell);
    const color = this.pickCellColor(cell);
    const decorated = highlight ? `${label.replace(/\s+$/, '')}*`.padEnd(6).slice(0, 6) : label;
    return `${color}[${decorated}]${AnsiColor.reset}`;
  }

  private describeCellLabel(cell: Cell): string {
    if (cell.isWild) return 'WILD  ';
    if (cell.isScatter) return 'SCAT  ';
    const name = MahjongWay2Config.SymbolNames?.[cell.idx] ?? `#${cell.idx}`;
    return `${name}`.padEnd(6).slice(0, 6);
  }

  private pickCellColor(cell: Cell): string {
    if (cell.isWild) return AnsiColor.wild + AnsiColor.bold;
    if (cell.isGolden) return AnsiColor.golden + AnsiColor.bold;
    if (cell.isScatter) return AnsiColor.scatter + AnsiColor.bold;
    return AnsiColor.normal;
  }

  private describeCellState(cell?: Cell): string {
    if (!cell) return '';
    if (cell.isWild) return 'wild';
    if (cell.isScatter) return 'scatter';
    if (cell.isGolden) return 'gold';
    return 'normal';
  }
}
