// backend/src/funds/replay/redeem.ts
import { diffDays } from './dates';

/** 赎回费率阶梯：持有天数 < days 适用 rate（第一个满足条件的档）。days 用 Infinity 兜底。 */
export interface RedeemTier {
  days: number;
  rate: number;
}

export const DEFAULT_TIERS: RedeemTier[] = [
  { days: 7, rate: 0.015 },
  { days: 30, rate: 0.0075 },
  { days: 365, rate: 0.005 },
  { days: 730, rate: 0.0025 },
  { days: Infinity, rate: 0 },
];

export function redeemFeeRate(holdingDays: number, tiers: RedeemTier[]): number {
  const t = tiers.find((x) => holdingDays < x.days);
  return t ? t.rate : 0;
}

export interface Lot {
  confirmDate: string;
  shares: number;
}

/** FIFO 拆分：按确认日升序扣批次（fund-rules §5.4）。 */
export function splitRedeemFifo(lots: Lot[], redeemShares: number): Lot[] {
  const sorted = [...lots].sort((a, b) => (a.confirmDate < b.confirmDate ? -1 : 1));
  let remaining = redeemShares;
  const out: Lot[] = [];
  for (const lot of sorted) {
    if (remaining <= 1e-9) break;
    const take = Math.min(lot.shares, remaining);
    out.push({ confirmDate: lot.confirmDate, shares: take });
    remaining -= take;
  }
  if (remaining > 1e-9) throw new Error('赎回份额超过可用持仓');
  return out;
}

/** 批次持有天数 = 赎回确认日 - 批次申购确认日（自然日，§5.4）。 */
export function lotHoldingDays(lotConfirm: string, redeemConfirm: string): number {
  return diffDays(lotConfirm, redeemConfirm);
}
