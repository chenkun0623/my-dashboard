// backend/src/funds/replay/subscribe.ts
/** 金额申购折算（fund-rules §5.1）：净额 = amount/(1+r)，份额 = round2(净额/nav)。 */
export function subscribeShares(
  amount: number,
  rate: number,
  nav: number,
): { netAmount: number; fee: number; shares: number } {
  const netAmount = amount / (1 + rate);
  const fee = amount - netAmount;
  const shares = Math.round((netAmount / nav) * 100) / 100;
  return { netAmount, fee, shares };
}
