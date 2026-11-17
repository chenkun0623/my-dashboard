// backend/src/funds/replay/replay.spec.ts
import { computeDailySeries, computeOverview } from './replay';

const NAVS = [
  { date: '2026-09-08', unit: 1.0, dayGrowth: null },
  { date: '2026-09-09', unit: 1.01, dayGrowth: 0.01 },
  { date: '2026-09-10', unit: 1.02, dayGrowth: 0.009901 },
  { date: '2026-09-11', unit: 1.0, dayGrowth: -0.019608 }, // 除息模拟：净值跳降但增长率已修正
  { date: '2026-09-14', unit: 1.005, dayGrowth: 0.005 },
];

// 批次1：9-08 确认 1000 份（成本 1000，0 费率）；批次2：9-10 申请、9-11 确认 1000 份
const TRADES = [
  { kind: 'SUBSCRIBE', applyDate: '2026-09-08', confirmDate: '2026-09-08', nav: 1.0, amount: 1000, fee: 0, shares: 1000, status: 'CONFIRMED' },
  { kind: 'SUBSCRIBE', applyDate: '2026-09-10', confirmDate: '2026-09-11', nav: 1.0, amount: 1000, fee: 0, shares: 1000, status: 'CONFIRMED' },
];

describe('replay', () => {
  it('daily series: dayGain uses dayGrowth, new lots join on confirm date', () => {
    const s = computeDailySeries(TRADES, NAVS);
    const by = Object.fromEntries(s.map((p) => [p.date, p]));
    expect(by['2026-09-08'].dayGain).toBe(0); // 首日无前期持仓
    expect(by['2026-09-09'].dayGain).toBeCloseTo(1000 * 1.0 * 0.01, 2);
    expect(by['2026-09-10'].dayGain).toBeCloseTo(1000 * 1.01 * 0.009901, 2);
    // 09-11：第一批按增长率；第二批当日确认，涨幅（1.0-1.02）也并入
    expect(by['2026-09-11'].dayGain).toBeCloseTo(
      1000 * 1.02 * -0.019608 + 1000 * (1.0 - 1.02), 2,
    );
    expect(by['2026-09-14'].shares).toBe(2000);
  });

  it('overview calibers', () => {
    const o = computeOverview(TRADES, NAVS);
    expect(o.invested).toBe(2000);
    expect(o.shares).toBe(2000);
    expect(o.marketValue).toBeCloseTo(2000 * 1.005, 2);
    expect(o.totalGain).toBeCloseTo(2000 * 1.005 - 2000, 2);
    expect(o.latestDate).toBe('2026-09-14');
    expect(o.costPerShare).toBeCloseTo(1.0, 4);
  });

  it('redeem reduces shares and counts net into recovered', () => {
    const withRedeem = [
      ...TRADES,
      { kind: 'REDEEM', applyDate: '2026-09-14', confirmDate: '2026-09-14', nav: 1.005, amount: 502.5, fee: 0, shares: -500, status: 'CONFIRMED' },
    ];
    const o = computeOverview(withRedeem, NAVS);
    expect(o.shares).toBe(1500);
    expect(o.recovered).toBeCloseTo(502.5, 2);
  });

  it('pending trades excluded from holdings', () => {
    const withPending = [
      ...TRADES,
      { kind: 'SUBSCRIBE', applyDate: '2026-09-14', confirmDate: '2026-09-15', nav: 1.005, amount: 100, fee: 0, shares: 99.5, status: 'PENDING' },
    ];
    expect(computeOverview(withPending, NAVS).shares).toBe(2000);
  });
});
