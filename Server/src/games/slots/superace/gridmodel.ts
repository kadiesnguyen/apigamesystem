// src/games/slots/superace/gridmodel.ts
import { SuperAceConfig } from './config';

export interface Cell {
  idx: number;
  isGolden: boolean;
  isScatter: boolean;
  isWild: boolean;
  wildType: 'red' | 'blue' | null;
}

export interface SpinRoundResult {
  grid: Cell[][];
  winLines: { c: number; r: number }[];
  winAmount: number;
  multiplier: number;
}

export interface Pos { c: number; r: number }

export interface FlipEvent extends Pos {
  wildType: 'red' | 'blue';
}

export interface CopyEvent extends Pos {
  sourcePos: Pos; // Vị trí Đại Quỷ gốc
  wildType: 'red';
}

export interface SpawnItem extends Pos {
  cell: Cell;
}

export interface StepRoundPayload {
  index: number;
  grid: Cell[][];            // trạng thái đầu step (trước flip/clear)
  winCells: Pos[];           // để highlight
  stepWin: number;
  multiplier: number;

  // Hành vi:
  flipEvents: FlipEvent[];   // golden -> wild diễn ra ở step này (trên 'grid' hiện tại)
  copyEvents: CopyEvent[];   // copy events của Đại Quỷ (trên 'grid' hiện tại)

  nextGrid: Cell[][];        // trạng thái sau clear + collapse + refill (đầu step kế)
  hasNext: boolean;          // có step tiếp theo hay không
}

export class GridModel {
  cols: number;
  rows: number;
  payoutTable: number[][];
  scatterChance: number;
  goldenChance: number;
  redWildChance: number;
  noWinRate: number;


  data: Cell[][];

  constructor(
    cols: number,
    rows: number,
    payoutTable: number[][],
    scatterChance: number,
    goldenChance: number,
    redWildChance: number,
    noWinRate: number,
    initialLayout?: number[][]
  ) {
    this.cols = cols;
    this.rows = rows;
    this.payoutTable = payoutTable;
    this.scatterChance = scatterChance;
    this.goldenChance = goldenChance;
    this.redWildChance = redWildChance;
    this.noWinRate = noWinRate;
    // console.log(payoutTable)
    this.data = Array.from({ length: cols }, (_, c) =>
      Array.from({ length: rows }, (_, r) => ({
        idx: initialLayout?.[c]?.[r] ?? 0,
        isScatter: false,
        isGolden: false,
        isWild: false,
        wildType: null,
      }))
    );
  }
  private markCarryFlag = Symbol('carry');

  private deepCopy<T>(x: T): T {
    return JSON.parse(JSON.stringify(x));
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

  private refillOnlyCleared() {
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cell = this.data[c]?.[r];
        if (cell && cell.idx === -1) {
          const rnd = Math.random();
          this.data[c]![r] = {
            idx: Math.floor(Math.random() * 8),
            isScatter: rnd < this.scatterChance,
            isGolden: rnd < this.goldenChance,
            isWild: false,
            wildType: null,
          };
        }
      }
    }
  }

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
      // thử vài lần để tạo lưới không có thắng & < 3 scatter
      let tries = 0, ok = false;
      while (tries++ < 30) {
        this.randomFill();
        const wins = this.getWinningPositions();
        const scatters = this.data.flat().filter(c => c.isScatter).length;
        if (wins.length === 0 && scatters < 3) { ok = true; break; }
      }
      if (!ok) this.randomFill(); // phòng hờ
    } else {
      this.randomFill();
    }

    /** Các wild flip ở step trước (đã map sang tọa độ hiện hành sau collapse) */
    let carryFromPrev: Pos[] = [];

    while (true) {
      // 1) Ảnh chụp đầu step
      const gridStart = this.deepCopy(this.data);

      // 2) Tính winCells trên gridStart (wild từ step trước đã tồn tại trong data)
      const winResult = this.getWinningPositionsWithCopyEvents(true);
      let winCells = winResult.winners;
      let copyEvents = winResult.copyEvents;

      // console.log(`Step ${rounds.length} | cascadeCount=${cascadeCount} | winCells=${winCells.length}`);
      // for (const p of winCells) {
      //   let SymbolNames = this.data[p.c][p.r]?.idx;
      //   p.name = SymbolNames;
      //   console.log(`  WinCell: ${JSON.stringify(p)}`);
      // }


      // Debug chính: Hiển thị step và grid
      console.log(`Step ${rounds.length} | cascadeCount=${cascadeCount} | winCells=${winCells.length}`);
      
      // Tạo set để đánh dấu ô thắng
      const winSet = new Set(winCells.map(p => `${p.c},${p.r}`));

      // In dạng bảng để nhìn trực quan
      const RESET = "\x1b[0m";
      const YELLOW = "\x1b[33m";
      const RED = "\x1b[31m";
      const BLUE = "\x1b[34m";

      for (let r = 0; r < this.rows; r++) {
        let rowStr = "";
        for (let c = 0; c < this.cols; c++) {
          const cell = gridStart[c]?.[r];
          const isWin = winSet.has(`${c},${r}`);
          let symbol = cell ? cell.idx : -1;
          let symbolName = SuperAceConfig.SymbolNames?.[symbol] ?? String(symbol);

          // Nếu là golden -> màu vàng
          if (cell?.isGolden) {
            symbolName = `${YELLOW}${symbolName}${RESET}`;
          }

          // Nếu là wild -> thêm * hoặc **
          if (cell?.isWild) {
            if (cell.wildType === 'red') {
              symbolName = `${RED}${symbolName}** (Đại Quỷ)${RESET}`;
            } else if (cell.wildType === 'blue') {
              symbolName = `${BLUE}${symbolName}* (Tiểu Quỷ)${RESET}`;
            }
          }

          rowStr += isWin ? `[${symbolName}]` : ` ${symbolName} `;
        }
        console.log(rowStr);
      }


      // console
      // Nếu không còn thắng → kết thúc cascade (điều kiện tiên quyết: phải có win để tiếp tục)
      const shouldEnd = winCells.length === 0;

      // Multiplier & stepWin
      const mult = baseMultipliers[Math.min(cascadeCount, baseMultipliers.length - 1)] || 1;
      // Chỉ tính stepWin khi có win pattern thực sự (ít nhất 3 cột liên tiếp)
      const hasRealWinPattern = this.hasRealWinPatternOnGrid(gridStart);
      
      console.log(`\n📊 STEP ${rounds.length} CALCULATION:`);
      console.log(`Cascade Count: ${cascadeCount}`);
      console.log(`Base Multipliers: ${baseMultipliers}`);
      console.log(`Current Multiplier: ${mult}`);
      console.log(`Has Real Win Pattern: ${hasRealWinPattern}`);
      
      const stepWin = hasRealWinPattern ? this.calculateBaseWin(bet) * mult : 0;
      console.log(`Step Win: ${stepWin} (BaseWin: ${hasRealWinPattern ? this.calculateBaseWin(bet) : 0} × Multiplier: ${mult})`);
      
      totalWin += stepWin;
      console.log(`Total Win so far: ${totalWin}`);

      // 3) Xác định golden thắng trong step này (để clear và spawn Joker sau)
      const goldenWins: Pos[] = [];
      for (const p of winCells) {
        const cell = gridStart[p.c]?.[p.r];
        if (cell?.isGolden) goldenWins.push(p);
      }

      // 4) Xác định clearList của step này:
      //    - Tất cả winCells bao gồm cả goldenWins (theo luật mới: clear trước, spawn Joker sau)
      const clearList: Pos[] = [];
      for (const p of winCells) {
        const cell = gridStart[p.c]?.[p.r];
        if (!cell) continue;
        if (cell.isWild) continue;       // wild hiện hữu không clear ở step này
        clearList.push(p);
      }

      // 5) Xử lý Golden Poker theo luật mới: clear trước, spawn Joker sau
      const flipEvents: FlipEvent[] = [];
      const jokerSpawnPositions: Pos[] = [];

      for (const { c, r } of goldenWins) {
        const cell = this.data[c]?.[r];
        if (!cell?.isGolden) continue;

        // Clear Golden Poker (sẽ được clear trong clearList)
        cell.isGolden = false;

        // Lưu vị trí để spawn Joker sau khi clear
        jokerSpawnPositions.push({ c, r });
      }

      // 6) Áp dụng xóa: clearList + forcedClear (carry từ step trước)
      const toClearNow: Pos[] = this.dedup([...clearList, ...carryFromPrev]);
      for (const { c, r } of toClearNow) {
        // Không nên chạm vào cell đang flip/wild đã flip trong step này
        const cell = this.data[c]?.[r];
        if (!cell) continue;
        // nếu là wild vừa flip và đồng thời thuộc forcedClear (góc cạnh), vẫn xóa theo quy ước của bạn
        // (ở thiết kế này, carryFromPrev luôn là wild từ step trước nên an toàn)
        cell.idx = -1;
      }

      // 7) Collapse + refill → đây là trạng thái đầu step kế

      if (SuperAceConfig.Gravity === 'collapse') {
        this.collapseGrid();       // cơ chế cũ: rơi xuống
      } else {
        this.refillOnlyCleared();  // cơ chế mới: chỉ fill ô idx === -1, giữ nguyên các ô còn lại
      }

      // 7.5) Spawn Joker sau khi clear Golden Poker (theo luật mới)
      for (const { c, r } of jokerSpawnPositions) {
        const cell = this.data[c]?.[r];
        if (!cell) continue;

        // Spawn Joker tại vị trí Golden Poker đã bị clear
        cell.isWild = true;
        const isRed = Math.random() < this.redWildChance;
        cell.wildType = isRed ? 'red' : 'blue';

        console.log(`  🎭 Spawned ${isRed ? 'Đại Quỷ (red)' : 'Tiểu Quỷ (blue)'} at (${c},${r})`);

        // Đánh dấu để tìm lại sau collapse (không serialize ra payload)
        (cell as any)[this.markCarryFlag] = true;

        flipEvents.push({
          c, r,
          wildType: cell.wildType!
        });

        // Nếu là Đại Quỷ (red), tính copy events ngay lập tức
        if (isRed) {
          const bigCopyCount = 2;
          const pool: Pos[] = [];
          for (let cc = 0; cc < this.cols; cc++) {
            for (let rr = 0; rr < this.rows; rr++) {
              if (cc === c && rr === r) continue;
              const ch = this.data[cc]?.[rr];
              if (ch && !ch.isScatter && !ch.isWild) pool.push({ c: cc, r: rr });
            }
          }
          // Shuffle Fisher–Yates
          for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = pool[i]!;
            pool[i] = pool[j]!;
            pool[j] = temp;
          }
          const copied = pool.slice(0, bigCopyCount).filter((pos): pos is Pos => pos !== undefined);

          // Biến các ô copy thành wild thực sự (blue) và persist sang round sau
          for (const cp of copied) {
            const target = this.data[cp.c]?.[cp.r];
            if (!target) continue;
            target.isWild = true;
            target.wildType = 'blue';
            (target as any)[this.markCarryFlag] = true; // giữ qua round sau

            // Gửi copy event để client animate
            copyEvents.push({
              c: cp.c,
              r: cp.r,
              sourcePos: { c, r },
              wildType: 'red'
            });
          }

          console.log(`  🎭 Đại Quỷ @ (${c},${r}) copy ${copied.length} cells (persist as BLUE wild):`, copied.map(p => `(${p.c},${p.r})`));
        }
      }

      // Deduplicate winCells sau khi thêm copied cells
      const seen = new Set<string>();
      winCells = winCells.filter(p => {
        const k = `${p.c},${p.r}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      // 8) Map vị trí wild vừa flip ở step này sang tọa độ mới (để force highlight+clear ở step kế)
      let carryForNext: Pos[] = [];
      for (let c = 0; c < this.cols; c++) {
        for (let r = 0; r < this.rows; r++) {
          const cell = this.data[c]?.[r];
          if (cell?.isWild && (cell as any)[this.markCarryFlag]) {
            // Sau khi đã copy xong trong step này, mọi red sẽ hạ cấp thành blue
            // để round sau chỉ đóng vai trò wild thông thường và không tiếp tục copy
            if (cell.wildType === 'red') {
              cell.wildType = 'blue';
            }
            carryForNext.push({ c, r }); // refill-only: vị trí giữ nguyên
            delete (cell as any)[this.markCarryFlag];
          }
        }
      }

      // 9) Ảnh chụp nextGrid sau xử lý
      const nextGrid = this.deepCopy(this.data);

      // 10) Ghi payload của step hiện tại (luôn tạo round, kể cả khi winCells.length === 0)
      rounds.push({
        index: rounds.length,
        grid: gridStart,
        winCells,
        stepWin,
        multiplier: mult || 1,
        flipEvents,
        copyEvents,
        nextGrid,
        hasNext: !shouldEnd, // sẽ được cập nhật dựa trên logic bên dưới
      });

      // 11) Kiểm tra xem có cần step tiếp theo không
      if (shouldEnd) {
        // Cập nhật hasNext cho round hiện tại
        const lastRound = rounds[rounds.length - 1];
        if (lastRound) {
          lastRound.hasNext = false;
        }
        break; // kết thúc ở state sau drop
      }

      // 13) Chuẩn bị cho step kế
      carryFromPrev = carryForNext;
      cascadeCount++;
    }

    return { rounds, totalWin };
  }

  private resetAllWildFlags(): void {
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cell = this.data[c]?.[r];
        if (cell) {
          cell.isWild = false;
          cell.wildType = null;
        }
      }
    }
  }

  private randomFill() {
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const rnd = Math.random();
        if (!this.data[c]) this.data[c] = [];
        this.data[c]![r] = {
          idx: Math.floor(Math.random() * 8),
          isScatter: rnd < this.scatterChance,
          isGolden: rnd < this.goldenChance,
          isWild: false,
          wildType: null,
        };
      }
    }
  }

  private collapseGrid() {
    for (let c = 0; c < this.cols; c++) {
      const col: Cell[] = [];
      for (let r = 0; r < this.rows; r++) {
        const cell = this.data[c]?.[r];
        if (cell && cell.idx !== -1) {
          col.push(cell);
        }
      }
      while (col.length < this.rows) {
        const rnd = Math.random();
        col.unshift({
          idx: Math.floor(Math.random() * 8),
          isScatter: rnd < this.scatterChance,
          isGolden: rnd < this.goldenChance,
          isWild: false,
          wildType: null,
        });
      }
      for (let r = 0; r < this.rows; r++) {
        if (!this.data[c]) this.data[c] = [];
        this.data[c]![r] = col[r]!;
      }
    }
  }

  private findWinPatternForSymbol(symbol: number): { c: number; r: number }[] {
    return this.findWinPatternForSymbolOnGrid(symbol, this.data);
  }

  private findWinPatternForSymbolOnGrid(symbol: number, grid: Cell[][]): { c: number; r: number }[] {
    const winners: { c: number; r: number }[] = [];

    // Tìm tất cả vị trí có symbol này trên toàn bộ grid
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cell = grid[c]?.[r];
        if (!cell) continue;

        // Kiểm tra nếu cell này match với symbol (bao gồm wild)
        if (!cell.isScatter && (cell.idx === symbol || cell.isWild)) {
          winners.push({ c, r });
        }
      }
    }

    // Kiểm tra xem có ít nhất 3 cột liên tiếp từ cột 0 có symbol này không
    let consecutiveColumns = 0;
    for (let c = 0; c < this.cols; c++) {
      let hasWinInColumn = false;
      for (let r = 0; r < this.rows; r++) {
        const cell = grid[c]?.[r];
        if (cell && !cell.isScatter && (cell.idx === symbol || cell.isWild)) {
          hasWinInColumn = true;
          break;
        }
      }
      if (hasWinInColumn) {
        consecutiveColumns++;
      } else {
        break;
      }
    }

    // Nếu có ít nhất 3 cột liên tiếp, trả về TẤT CẢ vị trí có symbol này
    return consecutiveColumns >= 3 ? winners : [];
  }

  private getWinningPositions(debug = false): { c: number; r: number }[] {
    const result = this.getWinningPositionsWithCopyEvents(debug);
    return result.winners;
  }

  private hasRealWinPattern(): boolean {
    return this.hasRealWinPatternOnGrid(this.data);
  }

  private hasRealWinPatternOnGrid(grid: Cell[][]): boolean {
    // Kiểm tra xem có ít nhất 1 symbol tạo thành win pattern (ít nhất 3 cột liên tiếp) không
    for (let sym = 0; sym < 8; sym++) {
      const winPattern = this.findWinPatternForSymbolOnGrid(sym, grid);
      if (winPattern.length >= 3) {
        return true;
      }
    }

    // Kiểm tra wild pattern (wild có thể tạo thành win pattern)
    const wildPattern = this.findWildWinPatternOnGrid(grid);
    if (wildPattern.length >= 3) {
      return true;
    }

    return false;
  }

  private findWildWinPattern(): { c: number; r: number }[] {
    return this.findWildWinPatternOnGrid(this.data);
  }

  private findWildWinPatternOnGrid(grid: Cell[][]): { c: number; r: number }[] {
    const winners: { c: number; r: number }[] = [];

    // Tìm tất cả vị trí có wild trên toàn bộ grid
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cell = grid[c]?.[r];
        if (!cell) continue;

        if (cell.isWild) {
          winners.push({ c, r });
        }
      }
    }

    // Kiểm tra xem có ít nhất 3 cột liên tiếp từ cột 0 có wild không
    let consecutiveColumns = 0;
    for (let c = 0; c < this.cols; c++) {
      let hasWildInColumn = false;
      for (let r = 0; r < this.rows; r++) {
        const cell = grid[c]?.[r];
        if (cell && cell.isWild) {
          hasWildInColumn = true;
          break;
        }
      }
      if (hasWildInColumn) {
        consecutiveColumns++;
      } else {
        break;
      }
    }

    // Nếu có ít nhất 3 cột liên tiếp có wild, trả về TẤT CẢ vị trí có wild
    return consecutiveColumns >= 3 ? winners : [];
  }

  private getWinningPositionsWithCopyEvents(debug = false): { winners: { c: number; r: number }[]; copyEvents: CopyEvent[] } {
    type Pos = { c: number; r: number };
    const winners: Pos[] = [];
    debug = false;
    if (debug) this.dbgGrid('GRID (before evaluate)');

    // ===== 1) Tính line‑wins (ít nhất 3 cột liên tiếp từ cột 0) =====
    for (let sym = 0; sym < 8; sym++) {
      // Tìm pattern thắng cho symbol này
      const winPattern = this.findWinPatternForSymbol(sym);
      if (winPattern.length >= 3) {
        // Thêm tất cả vị trí trong pattern thắng (cả normal và wild)
        winners.push(...winPattern);
        if (debug) {
          console.log(`WIN PATTERN for ${this.fmtSym(sym)}:`, winPattern);
        }
      }
    }

    // ===== 2) Wild pattern check (theo luật mới) =====
    // Wild chỉ thắng khi tạo thành win pattern hợp lệ (ít nhất 3 cột liên tiếp)
    const wildPattern = this.findWildWinPattern();
    if (wildPattern.length > 0) {
      // Chỉ thêm wild vào winners khi chúng tạo thành win pattern hợp lệ
      winners.push(...wildPattern);
      if (debug) {
        console.log(`WILD WIN PATTERN:`, wildPattern);
      }
    }

    // ===== 3) Dedup + in kết quả cuối =====
    const seen = new Set<string>();
    const unique = winners.filter(p => {
      const k = `${p.c},${p.r}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    return { winners: unique, copyEvents: [] };
  }


  // ---- DEBUG HELPERS ----
  private fmtSym(i: number) { return SuperAceConfig.SymbolNames?.[i] ?? String(i); }

  private dbgGrid(title: string) {
    console.groupCollapsed(title);
    // in theo cột→hàng cho đúng layout 5x4 (cols x rows)
    const rows: any[] = [];
    for (let r = 0; r < this.rows; r++) {
      const line: any = { r };
      for (let c = 0; c < this.cols; c++) {
        const cell = this.data[c]?.[r];
        if (cell) {
          line[`c${c}`] = `${this.fmtSym(cell.idx)}${cell.isScatter ? '(S)' : ''}${cell.isGolden ? '(G)' : ''}${cell.isWild ? (cell.wildType === 'red' ? '(Đại Quỷ)' : '(Tiểu Quỷ)') : ''}`;
        } else {
          line[`c${c}`] = '?';
        }
      }
      rows.push(line);
    }
    console.table(rows);
    console.groupEnd();
  }

  private dbgWinners(title: string, list: { c: number; r: number }[]) {
    console.groupCollapsed(title);
    console.table(list.map(p => {
      const cell = this.data[p.c]?.[p.r];
      if (cell) {
        return {
          c: p.c, r: p.r,
          idx: cell.idx,
          sym: this.fmtSym(cell.idx),
          scatter: cell.isScatter,
          golden: cell.isGolden,
          wild: cell.isWild,
          wtype: cell.wildType ?? ''
        }
      } else {
        return {
          c: p.c, r: p.r,
          idx: -1,
          sym: '?',
          scatter: false,
          golden: false,
          wild: false,
          wtype: ''
        }
      }
    }));
    console.groupEnd();
  }

  private calculateBaseWin(bet: number): number {
    const payoutTable = this.payoutTable;
    let total = 0;
    const WILD_IDX = 8;

    console.log(`\n🔍 DEBUG CALCULATE BASE WIN:`);
    console.log(`Bet: ${bet}`);
    console.log(`Payout Table:`, payoutTable);

    // Lấy winCells từ getWinningPositions để có dữ liệu chính xác
    const winResult = this.getWinningPositionsWithCopyEvents(false);
    const winCells = winResult.winners;
    
    console.log(`WinCells from getWinningPositions: ${winCells.length} cells`);
    winCells.forEach((cell, idx) => {
      const cellData = this.data[cell.c]?.[cell.r];
      console.log(`  Cell ${idx}: (${cell.c},${cell.r}) = ${cellData?.idx} (${cellData?.isWild ? 'WILD' : 'NORMAL'})`);
    });

    if (winCells.length < 3) {
      console.log(`Not enough winCells: ${winCells.length} (< 3)`);
      return 0;
    }

    // Đếm số lượng symbols cho từng loại trong winCells
    const symbolCounts = new Map();
    
    winCells.forEach(winCell => {
      const cellData = this.data[winCell.c]?.[winCell.r];
      if (cellData && !cellData.isScatter) {
        if (cellData.isWild) {
          // Wild có thể đại diện cho bất kỳ symbol nào, đếm cho tất cả
          for (let i = 0; i < 8; i++) {
            symbolCounts.set(i, (symbolCounts.get(i) || 0) + 1);
          }
        } else {
          const symbolIdx = cellData.idx;
          symbolCounts.set(symbolIdx, (symbolCounts.get(symbolIdx) || 0) + 1);
        }
      }
    });

    console.log(`Symbol counts in winCells:`, Object.fromEntries(symbolCounts));

    // Tính payout cho từng symbol đã thắng
    for (const [symbolIdx, count] of symbolCounts) {
      if (count < 3) {
        console.log(`Symbol ${symbolIdx}: count=${count} (< 3) - SKIP`);
        continue;
      }

      // Giới hạn tối đa 8 quân trúng
      const actualCount = Math.min(count, 8);
      const payoutIndex = actualCount - 3;
      const payoutRate = payoutTable[symbolIdx]?.[payoutIndex] || 0;
      const pay = payoutRate * bet;
      
      console.log(`Symbol ${symbolIdx}: count=${count}, actualCount=${actualCount}, payoutIndex=${payoutIndex}, payoutRate=${payoutRate}, pay=${pay}`);
      
      total += pay;
    }

    console.log(`Total base win: ${total}`);
    return total;
  }
}
