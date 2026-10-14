// backend/src/funds/nav-fetcher.service.spec.ts
import { NavFetcherService } from './nav-fetcher.service';

const LIST_RESP = {
  ErrCode: 0,
  ErrMsg: '',
  TotalCount: 2,
  Data: {
    LSJZList: [
      { FSRQ: '2026-09-11', DWJZ: '1.2340', LJJZ: '1.5670', JZZZL: '0.5200' },
      { FSRQ: '2026-09-10', DWJZ: '1.2276', LJJZ: '1.5606', JZZZL: '-0.3100' },
    ],
  },
};

describe('NavFetcherService', () => {
  it('parses list rows: JZZZL percent -> decimal, ascending order', async () => {
    const svc = new NavFetcherService();
    const orig = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => LIST_RESP,
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
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('fetches name from pingzhongdata js', async () => {
    const svc = new NavFetcherService();
    const orig = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => 'var fS_name = "易方达蓝筹精选混合";',
    } as Response);
    try {
      expect(await svc.fetchName('005827')).toBe('易方达蓝筹精选混合');
    } finally {
      globalThis.fetch = orig;
    }
  });
});
