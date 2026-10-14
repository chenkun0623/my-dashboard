// backend/src/funds/nav-fetcher.service.spec.ts
import { NavFetcherService } from './nav-fetcher.service';

// Data_netWorthTrend.x 为北京时间零点的毫秒时间戳
const T1 = Date.parse('2026-09-11T00:00:00+08:00'); // 周五
const T0 = Date.parse('2026-09-10T00:00:00+08:00'); // 周四
const JS = [
  'var fS_name = "易方达蓝筹精选混合";',
  'var Data_netWorthTrend = [',
  `{"x":${T1},"y":1.234,"equityReturn":"0.52","unitMoney":""},`,
  `{"x":${T0},"y":1.2276,"equityReturn":"-0.31","unitMoney":""}`,
  '];',
  `var Data_ACWorthTrend = [[${T1},1.567],[${T0},1.5606]];`,
].join('\n');

describe('NavFetcherService', () => {
  it('parses pingzhongdata js: equityReturn percent -> decimal, ascending order', async () => {
    const svc = new NavFetcherService();
    const orig = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JS,
    } as Response);
    try {
      const rows = await svc.fetchHistory('005827');
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        date: '2026-09-10',
        unit: 1.2276,
        accUnit: 1.5606,
        dayGrowth: -0.0031,
      });
      expect(rows[1].dayGrowth).toBeCloseTo(0.0052, 6);
      expect(rows[1].accUnit).toBe(1.567);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('fetches name from pingzhongdata js', async () => {
    const svc = new NavFetcherService();
    const orig = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JS,
    } as Response);
    try {
      expect(await svc.fetchName('005827')).toBe('易方达蓝筹精选混合');
    } finally {
      globalThis.fetch = orig;
    }
  });
});
