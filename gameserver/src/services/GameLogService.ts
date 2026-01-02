// src/services/GameLogService.ts
import type { Collection, Db, Filter, SortDirection } from 'mongodb';
import { ObjectId } from 'mongodb';

export type GameLogSort =
  | 't.desc'
  | 't.asc'
  | 'win.desc'
  | 'win.asc'
  | 'bet.desc'
  | 'bet.asc';

export interface RawSpinLogDocument {
  _id: ObjectId;
  t: Date;
  gid: number;
  pid: number;
  uid: number;
  bet: number;
  username?: string;
  win: number;
  free?: boolean;
  fsl?: number;
  cfgv?: number;
  bal_b?: number;
  bal_a?: number;
}

export interface GameLogQuery {
  userId: number;
  gameId?: number;
  partnerId?: number;
  limit?: number;
  skip?: number;
  sort?: GameLogSort;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SpinLogView {
  id: string;
  timestamp: string;
  gameId: number;
  partnerId: number;
  username?: string;
  bet: number;
  win: number;
  isFreeSpin: boolean;
  freeSpinsLeft?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  configVersion?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class GameLogService {
  private readonly collection: Collection<RawSpinLogDocument>;

  constructor(db: Db) {
    this.collection = db.collection<RawSpinLogDocument>('logs.game');
  }

  async fetchLogs(query: GameLogQuery): Promise<SpinLogView[]> {
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    const skip = Math.max(0, query.skip ?? 0);

    const filter: Filter<RawSpinLogDocument> = {
      uid: query.userId,
    };

    if (Number.isFinite(query.gameId)) {
      filter.gid = query.gameId as number;
    }
    if (Number.isFinite(query.partnerId)) {
      filter.pid = query.partnerId as number;
    }
    if (query.dateFrom || query.dateTo) {
      const timeFilter: Record<string, Date> = {};
      if (query.dateFrom) {
        timeFilter.$gte = query.dateFrom;
      }
      if (query.dateTo) {
        timeFilter.$lte = query.dateTo;
      }
      filter.t = timeFilter as Filter<RawSpinLogDocument>['t'];
    }

    const sort = this.buildSort(query.sort);

    const docs = await this.collection
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    return docs.map((doc) => ({
      id: doc._id?.toString() ?? '',
      timestamp:
        doc.t instanceof Date ? doc.t.toISOString() : new Date(doc.t).toISOString(),
      gameId: doc.gid,
      partnerId: doc.pid,
      username: doc.username,
      bet: doc.bet ?? 0,
      win: doc.win ?? 0,
      isFreeSpin: Boolean(doc.free),
      freeSpinsLeft: doc.fsl,
      balanceBefore: doc.bal_b,
      balanceAfter: doc.bal_a,
      configVersion: doc.cfgv,
    }));
  }

  private buildSort(sort?: GameLogSort): Record<string, SortDirection> {
    switch (sort) {
      case 't.asc':
        return { t: 1 };
      case 'win.desc':
        return { win: -1 };
      case 'win.asc':
        return { win: 1 };
      case 'bet.desc':
        return { bet: -1 };
      case 'bet.asc':
        return { bet: 1 };
      default:
        return { t: -1 };
    }
  }
}

