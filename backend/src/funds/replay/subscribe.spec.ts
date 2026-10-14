// backend/src/funds/replay/subscribe.spec.ts
import { subscribeShares } from './subscribe';

describe('subscribeShares', () => {
  it('converts amount to shares with discounted rate', () => {
    // 1000 元、费率 0.15%、净值 1.04 → 净额 998.50
    const r = subscribeShares(1000, 0.0015, 1.04);
    expect(r.netAmount).toBeCloseTo(998.5, 6);
    expect(r.fee).toBeCloseTo(1.5, 6);
    expect(r.shares).toBeCloseTo(959.9, 2); // round2(998.5/1.04)=959.90
  });

  it('zero rate gives full amount', () => {
    const r = subscribeShares(1000, 0, 2);
    expect(r.fee).toBe(0);
    expect(r.shares).toBe(500);
  });
});
