// backend/src/funds/replay/schedule.ts
import { addDays, deferToTradingDay, diffDays, parseDay } from './dates';

export interface PlanSchedule {
  freq: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  weekday?: number | null; // 1=周一 ... 7=周日（WEEKLY/BIWEEKLY）
  monthday?: number | null; // 1-31（MONTHLY）
  startDate: string;
  endDate?: string | null;
}

function weekdayOf(s: string): number {
  // 1970-01-01 是周四(4)
  return ((Math.floor(parseDay(s).getTime() / 86400000) + 4 - 1) % 7) + 1;
}

/**
 * 原始候选扣款日（未顺延）：从 startDate 起按频率规则滚动，<= until。
 * WEEKLY：每周 weekday；BIWEEKLY：以 startDate 所在周为锚，隔周 weekday；
 * MONTHLY：每月 monthday（超出当月天数取月末）。
 */
export function rawCandidates(plan: PlanSchedule, until: string): string[] {
  const out: string[] = [];
  const end = plan.endDate && plan.endDate < until ? plan.endDate : until;
  if (plan.freq === 'MONTHLY') {
    const md = Math.min(plan.monthday ?? 1, 31);
    let [y, m] = plan.startDate.split('-').map(Number);
    for (;;) {
      const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const day = String(Math.min(md, dim)).padStart(2, '0');
      const cand = `${y}-${String(m).padStart(2, '0')}-${day}`;
      if (cand > end) break;
      if (cand >= plan.startDate) out.push(cand);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return out;
  }
  // WEEKLY / BIWEEKLY：先对齐到 startDate 之后第一个目标 weekday
  const wd = plan.weekday ?? 1;
  let cur = plan.startDate;
  while (weekdayOf(cur) !== wd) cur = addDays(cur, 1);
  const anchor = cur;
  while (cur <= end) {
    if (plan.freq === 'WEEKLY' || diffDays(anchor, cur) % 14 === 0) out.push(cur);
    cur = addDays(cur, 7);
  }
  return out;
}

/** 实际扣款日（= 申请日 T）：候选日顺延到下一交易日；超出 endDate/until 或序列外的候选丢弃；同日去重。 */
export function debitDates(plan: PlanSchedule, navDates: string[], until: string): string[] {
  const end = plan.endDate && plan.endDate < until ? plan.endDate : until;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cand of rawCandidates(plan, until)) {
    const d = deferToTradingDay(cand, navDates);
    if (d && d <= end && !seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out;
}

/**
 * 下一期扣款日（展示用）：日历规则下第一个 > from 的候选日。
 * 注意：未来交易日序列未知，此处显示顺延前日期（遇节假日实际顺延）。
 */
export function nextDebitDate(
  plan: PlanSchedule,
  _navDates: string[],
  from: string,
): string | null {
  const cands = rawCandidates(plan, addDays(from, 370));
  return cands.find((d) => d > from) ?? null;
}
