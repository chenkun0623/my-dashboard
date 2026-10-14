// backend/src/funds/nav-fetcher.service.ts
import { Injectable } from '@nestjs/common';

export interface NavRow {
  date: string; // YYYY-MM-DD（北京时间）
  unit: number;
  accUnit: number | null;
  dayGrowth: number | null; // 小数（equityReturn 为百分数，已 /100；分红日已修正）
}

interface NetWorthPoint {
  x: number; // 毫秒时间戳（北京时间零点）
  y: number; // 单位净值
  equityReturn: number | string; // 日增长率（%）
}

interface AccWorthPoint {
  0: number; // 毫秒时间戳
  1: number; // 累计净值
}

const DATA_URL = 'https://fund.eastmoney.com/pingzhongdata';

/** 时间戳（北京时间零点）→ YYYY-MM-DD，与服务器时区无关。 */
function tsToDate(ms: number): string {
  return new Date(ms + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function extractVar<T>(text: string, name: string): T | null {
  const m = new RegExp(`var ${name}\\s*=\\s*(.+?);\\s*(?:/\\*|var|$)`, 's').exec(text);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as T;
  } catch {
    return null;
  }
}

@Injectable()
export class NavFetcherService {
  private async fetchJs(code: string): Promise<string> {
    const res = await fetch(`${DATA_URL}/${code}.js`);
    if (!res.ok) throw new Error(`净值接口 HTTP ${res.status}`);
    return res.text();
  }

  /** 全量历史（升序）。失败抛错由调用方记 lastSyncError。 */
  async fetchHistory(code: string): Promise<NavRow[]> {
    const text = await this.fetchJs(code);
    const trend = extractVar<NetWorthPoint[]>(text, 'Data_netWorthTrend');
    if (!trend) throw new Error('净值数据解析失败：Data_netWorthTrend 缺失');
    const acc = extractVar<AccWorthPoint[]>(text, 'Data_ACWorthTrend') ?? [];
    const accOf = new Map(acc.map((p) => [tsToDate(p[0]), p[1]]));

    const rows: NavRow[] = trend.map((p) => ({
      date: tsToDate(p.x),
      unit: p.y,
      accUnit: accOf.get(tsToDate(p.x)) ?? null,
      dayGrowth: p.equityReturn === '' || p.equityReturn == null ? null : Number(p.equityReturn) / 100,
    }));
    rows.sort((a, b) => (a.date < b.date ? -1 : 1));
    return rows;
  }

  /** 基金名称。 */
  async fetchName(code: string): Promise<string> {
    const text = await this.fetchJs(code);
    const m = /fS_name\s*=\s*"([^"]+)"/.exec(text);
    if (!m) throw new Error('名称解析失败');
    return m[1];
  }
}
