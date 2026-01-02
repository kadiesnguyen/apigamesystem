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


      console.log(`Step ${rounds.length} | cascadeCount=${cascadeCount} | winCells=${winCells.length}`);
      
      // Debug: In thông tin Golden Poker và Joker
      const goldenCount = winCells.filter(p => gridStart[p.c]?.[p.r]?.isGolden).length;
      if (goldenCount > 0) {
        console.log(`  🃏 Found ${goldenCount} Golden Poker(s) - sẽ spawn Joker sau khi clear`);
      }
      
      // Debug: In thông tin copy events
      if (copyEvents.length > 0) {
        console.log(`  📋 Copy Events: ${copyEvents.length} cells sẽ được copy`);
        copyEvents.forEach(ev => {
          console.log(`    Copy from (${ev.sourcePos.c},${ev.sourcePos.r}) to (${ev.c},${ev.r})`);
        });
      }

      // Tạo set để đánh dấu ô thắng
      const winSet = new Set(winCells.map(p => `${p.c},${p.r}`));

      // In từng winCell chi tiết
      // for (const p of winCells) {
      //   console.log(`  WinCell: c=${p.c}, r=${p.r}, symbol=${gridStart[p.c][p.r]?.idx}`);
      // }

      // In dạng bảng để nhìn trực quan
      // console.log("Grid view (W = win cell, số = idx):");
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
      // Nếu không còn thắng và không còn gì để clear bắt buộc → kết thúc
      if (winCells.length === 0 && carryFromPrev.length === 0) break;

      // Multiplier & stepWin
      const mult = baseMultipliers[Math.min(cascadeCount, baseMultipliers.length - 1)] || 1;
      const stepWin = winCells.length > 0 ? this.calculateBaseWin(bet) * mult : 0;
      totalWin += stepWin;

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
          
          // Thêm copy events cho round hiện tại
          for (const copiedPos of copied) {
            copyEvents.push({
              c: copiedPos.c,
              r: copiedPos.r,
              sourcePos: { c, r },
              wildType: 'red'
            });
          }
          
          console.log(`  🎭 Đại Quỷ @ (${c},${r}) copy ${copied.length} cells:`, copied.map(p => `(${p.c},${p.r})`));
          
          // Thêm copied cells vào winCells để chúng được highlight
          winCells.push(...copied);
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
            carryForNext.push({ c, r }); // refill-only: vị trí giữ nguyên
            delete (cell as any)[this.markCarryFlag];
          }
        }
      }

      // 9) Ảnh chụp nextGrid sau xử lý
      const nextGrid = this.deepCopy(this.data);

      // 10) Ghi payload của step hiện tại
      rounds.push({
        index: rounds.length,
        grid: gridStart,
        winCells,
        stepWin,
        multiplier: mult || 1,
        flipEvents,
        copyEvents,
        nextGrid,
        hasNext: true, // sẽ được cập nhật dựa trên logic bên dưới
      });

      // 11) Kiểm tra xem có cần step tiếp theo không
      // Luôn tạo step tiếp theo khi có winCells để xử lý cascade
      // Chỉ kết thúc khi thực sự không có gì để làm tiếp
      const futureWins = this.getWinningPositions();
      const noFutureWin = futureWins.length === 0;
      const noCarryNext = carryForNext.length === 0;

      if (noFutureWin && noCarryNext) {
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
    const winners: { c: number; r: number }[] = [];
    
    // Tìm tất cả vị trí có symbol này trên toàn bộ grid
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cell = this.data[c]?.[r];
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
        const cell = this.data[c]?.[r];
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

  private getWinningPositionsWithCopyEvents(debug = false): { winners: { c: number; r: number }[]; copyEvents: CopyEvent[] } {
    type Pos = { c: number; r: number };
    const winners: Pos[] = [];
    const copyEvents: CopyEvent[] = [];
    debug = false;
    if (debug) this.dbgGrid('GRID (before evaluate)');

    // ===== 1) Tính line‑wins (ít nhất 3 cột liên tiếp từ cột 0) =====
    for (let sym = 0; sym < 8; sym++) {
      // Tìm pattern thắng cho symbol này
      const winPattern = this.findWinPatternForSymbol(sym);
      if (winPattern.length >= 3) {
        // Thêm tất cả vị trí trong pattern thắng
        winners.push(...winPattern);
        if (debug) {
          console.log(`WIN PATTERN for ${this.fmtSym(sym)}:`, winPattern);
        }
      }
    }

    // ===== 2) Joker bonus (theo luật mới) =====
    // - Tiểu Quỷ (blue): chỉ triệt tiêu chính nó
    // - Đại Quỷ (red): triệt tiêu chính nó + copy ngẫu nhiên từ chính nó để thay thế các biểu tượng khác
    const bigCopyCount = 2; // Copy 2 cells cho Đại Quỷ
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cell = this.data[c]?.[r];
        if (!cell?.isWild) continue;

        // chính vị trí wild luôn bị triệt tiêu
        winners.push({ c, r });

        if (cell.wildType === 'red') {
          // Đại Quỷ: copy ngẫu nhiên từ chính nó để thay thế các biểu tượng khác
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
          winners.push(...copied);

          // Track copy events cho client animation
          for (const copiedPos of copied) {
            copyEvents.push({
              c: copiedPos.c,
              r: copiedPos.r,
              sourcePos: { c, r },
              wildType: 'red'
            });
          }
          
          console.log(`  🎭 Đại Quỷ @ (${c},${r}) copy ${copied.length} cells:`, copied.map(p => `(${p.c},${p.r})`));

          if (debug) this.dbgWinners(`ĐẠI QUỶ (RED) @ (${c},${r}) COPIED -> ${copied.length}`, copied);
        } else if (debug) {
          console.log(`TIỂU QUỶ (BLUE) @ (${c},${r})`);
        }
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

    if (debug) this.dbgWinners('WINNERS (final, deduped)', unique);
    return { winners: unique, copyEvents };
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

    for (let sym = 0; sym < 8; sym++) {
      // 1) Xác định độ dài chuỗi (chain) theo cột
      let chain = 0;
      for (let c = 0; c < this.cols; c++) {
        const column = this.data[c];
        if (!column) break;
        const hit = column.some(cell =>
          cell && !cell.isScatter &&
          (cell.idx === sym || cell.idx === WILD_IDX || cell.isWild)
        );
        if (!hit) break;
        chain++;
      }
      if (chain < 3) continue;

      // 2) Tính payout (không cần wildMultiplier nữa vì cả hai loại Joker đều là Wild)
      // console.log(`Calculating win for symbol ${this.fmtSym(sym)}: chain=${chain}`);
      // console.log(`Payout table:`, payoutTable);
      const pay = (payoutTable[sym]?.[chain] || 0) * bet;
      // console.log(`Pay for symbol ${sym}: ${payoutTable[sym]?.[chain] || 0} * ${bet} = ${pay}`);
      total += pay;
    }

    return total;
  }
}
