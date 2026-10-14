// backend/src/funds/nav-fetcher.service.ts
import { Injectable } from '@nestjs/common';

export interface NavRow {
  date: string; // YYYY-MM-DD
  unit: number;
  accUnit: number | null;
  dayGrowth: number | null; // 小数（接口为百分数字符串，已 /100）
}

interface LsjzRow {
  FSRQ: string;
  DWJZ: string;
  LJJZ: string;
  JZZZL: string;
}

const HISTORY_URL = 'https://api.fund.eastmoney.com/f10/lsjdata';
const NAME_URL = 'https://fund.eastmoney.com/pingzhongdata';
const PAGE_SIZE = 200;
const REFERER = 'https://fundf10.eastmoney.com/';

@Injectable()
export class NavFetcherService {
  /** 全量历史（分页，升序返回）。失败抛错由调用方记 lastSyncError。 */
  async fetchHistory(code: string): Promise<NavRow[]> {
    const all: NavRow[] = [];
    let pageIndex = 1;
    for (;;) {
      const url = `${HISTORY_URL}?fundCode=${code}&pageIndex=${pageIndex}&pageSize=${PAGE_SIZE}`;
      const res = await fetch(url, { headers: { Referer: REFERER } });
      if (!res.ok) throw new Error(`净值接口 HTTP ${res.status}`);
      const body = (await res.json()) as {
        ErrCode: number;
        ErrMsg: string;
        TotalCount: number;
        Data?: { LSJZList?: LsjzRow[] };
      };
      if (body.ErrCode !== 0) throw new Error(`净值接口错误: ${body.ErrMsg || body.ErrCode}`);
      const list = body.Data?.LSJZList ?? [];
      for (const r of list) {
        all.push({
          date: r.FSRQ,
          unit: Number(r.DWJZ),
          accUnit: r.LJJZ ? Number(r.LJJZ) : null,
          dayGrowth: r.JZZZL === '' ? null : Number(r.JZZZL) / 100,
        });
      }
      if (all.length >= (body.TotalCount ?? 0) || list.length === 0) break;
      pageIndex += 1;
    }
    all.sort((a, b) => (a.date < b.date ? -1 : 1));
    return all;
  }

  /** 基金名称（pingzhongdata js 变量）。 */
  async fetchName(code: string): Promise<string> {
    const res = await fetch(`${NAME_URL}/${code}.js`);
    if (!res.ok) throw new Error(`名称接口 HTTP ${res.status}`);
    const text = await res.text();
    const m = /fS_name\s*=\s*"([^"]+)"/.exec(text);
    if (!m) throw new Error('名称解析失败');
    return m[1];
  }
}
