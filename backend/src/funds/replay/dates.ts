// backend/src/funds/replay/dates.ts
/** 所有日期以 YYYY-MM-DD 字符串经手；DB @db.Date 存 UTC 午夜 Date，往返稳定。 */

export function parseDay(s: string): Date {
  return new Date(s + 'T00:00:00.000Z');
}

export function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  const d = parseDay(s);
  d.setUTCDate(d.getUTCDate() + n);
  return dateStr(d);
}

/** b - a 的自然日数（a <= b） */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
}

/**
 * 扣款日顺延：返回 >= candidate 的第一个交易日（净值日）。
 * 净值序列未覆盖（基金刚上市/数据缺口之后）返回 null，调用方视为"等待净值"。
 */
export function deferToTradingDay(candidate: string, tradingDays: string[]): string | null {
  for (const d of tradingDays) {
    if (d >= candidate) return d;
  }
  return null;
}

/** 净值序列中从 from 起向后移动 step 步；越界返回 null。 */
export function shiftNavDate(from: string, step: number, navDates: string[]): string | null {
  const i = navDates.indexOf(from);
  if (i === -1) return null;
  return navDates[i + step] ?? null;
}

/** 北京时间今天（UTC+8），与服务器时区无关。 */
export function beijingToday(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
