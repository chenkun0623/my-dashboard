// backend/src/funds/replay/replay.ts
export interface TradeLike {
  kind: string;
  applyDate: string;
  confirmDate: string;
  nav: number;
  amount: number;
  fee: number;
  shares: number; // 正申购/再投，负赎回
  status: string;
}

export interface NavPoint {
  date: string;
  unit: number;
  dayGrowth: number | null;
}

export interface DailyPoint {
  date: string;
  shares: number;
  dayGain: number;
  marketValue: number;
  invested: number;
  recovered: number;
  totalGain: number;
}

interface Lot {
  confirmDate: string;
  shares: number;
}

/**
 * 按净值日升序重放：批次队列 = 已确认申购/再投（确认日入队），赎回 FIFO 出队。
 * 每日收益优先 dayGrowth（除息日已修正），缺失用净值差。
 * 新确认批次当日涨幅 = nav_d - prev（买入价即 prev），与 growth 口径天然一致。
 */
export function computeDailySeries(trades: TradeLike[], navs: NavPoint[]): DailyPoint[] {
  const sortedNavs = [...navs].sort((a, b) => (a.date < b.date ? -1 : 1));
  const lots: Lot[] = [];
  let invested = 0;
  let recovered = 0;
  const out: DailyPoint[] = [];

  const redeemsByDate = new Map<string, number>();
  for (const t of trades) {
    if (t.status === 'CONFIRMED' && t.kind === 'REDEEM') {
      redeemsByDate.set(t.confirmDate, (redeemsByDate.get(t.confirmDate) ?? 0) + -t.shares);
    }
  }
  const subs = trades
    .filter(
      (t) =>
        t.status === 'CONFIRMED' &&
        (t.kind === 'SUBSCRIBE' || t.kind === 'DIVIDEND_REINVEST'),
    )
    .sort((a, b) => (a.confirmDate < b.confirmDate ? -1 : 1));
  recovered += trades
    .filter((t) => t.status === 'CONFIRMED' && t.kind === 'DIVIDEND_CASH')
    .reduce((s, t) => s + t.amount, 0);

  let subIdx = 0;
  let prevUnit: number | null = null;

  for (const nav of sortedNavs) {
    while (subIdx < subs.length && subs[subIdx].confirmDate <= nav.date) {
      const t = subs[subIdx++];
      lots.push({ confirmDate: t.confirmDate, shares: t.shares });
      if (t.kind === 'SUBSCRIBE') invested += t.amount; // 再投不重复计投入
    }
    const redeemQty = redeemsByDate.get(nav.date) ?? 0;
    if (redeemQty > 0) {
      let remain = redeemQty;
      for (const lot of lots) {
        if (remain <= 1e-9) break;
        const take = Math.min(lot.shares, remain);
        lot.shares -= take;
        remain -= take;
      }
      recovered += trades
        .filter(
          (t) => t.status === 'CONFIRMED' && t.kind === 'REDEEM' && t.confirmDate === nav.date,
        )
        .reduce((s, t) => s + t.amount, 0);
    }
    let dayGain = 0;
    if (prevUnit !== null) {
      const growth = nav.dayGrowth ?? (prevUnit !== 0 ? nav.unit / prevUnit - 1 : 0);
      const held = lots.reduce((s, l) => s + l.shares, 0);
      dayGain = held * prevUnit * growth;
    }
    const shares = lots.reduce((s, l) => s + l.shares, 0);
    const marketValue = shares * nav.unit;
    out.push({
      date: nav.date,
      shares,
      dayGain,
      marketValue,
      invested,
      recovered,
      totalGain: marketValue + recovered - invested,
    });
    prevUnit = nav.unit;
  }
  return out;
}

export interface Overview {
  shares: number;
  invested: number;
  recovered: number;
  marketValue: number;
  totalGain: number;
  costPerShare: number;
  latestUnit: number | null;
  latestDate: string | null;
  todayGain: number;
}

export function computeOverview(trades: TradeLike[], navs: NavPoint[]): Overview {
  const series = computeDailySeries(trades, navs);
  const last = series[series.length - 1];
  if (!last) {
    return {
      shares: 0, invested: 0, recovered: 0, marketValue: 0, totalGain: 0,
      costPerShare: 0, latestUnit: null, latestDate: null, todayGain: 0,
    };
  }
  const prev = series[series.length - 2];
  const remainingCost = last.invested - last.recovered; // 回收口径
  const latest = sortedLast(navs);
  return {
    shares: last.shares,
    invested: last.invested,
    recovered: last.recovered,
    marketValue: last.marketValue,
    totalGain: last.totalGain,
    costPerShare: last.shares > 0 ? remainingCost / last.shares : 0,
    latestUnit: latest?.unit ?? null,
    latestDate: last.date,
    todayGain: prev ? last.totalGain - prev.totalGain : 0,
  };
}

function sortedLast(navs: NavPoint[]): NavPoint | undefined {
  return [...navs].sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1);
}
