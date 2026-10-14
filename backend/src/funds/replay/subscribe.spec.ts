// backend/src/funds/replay/subscribe.spec.ts
import { subscribeShares } from './subscribe';

describe('subscribeShares', () => {
  it('converts amount to shares with discounted rate', () => {
    // 1000 元、费率 0.15%、净值 1.04 → 净额 = 1000/1.0015 = 998.5022...
    const r = subscribeShares(1000, 0.0015, 1.04);
    expect(r.netAmount).toBeCloseTo(998.5022, 4);
    expect(r.fee).toBeCloseTo(1.4978, 4);
    expect(r.shares).toBeCloseTo(959.91, 2); // round2(998.5022/1.04)=959.91
  });

  it('zero rate gives full amount', () => {
    const r = subscribeShares(1000, 0, 2);
    expect(r.fee).toBe(0);
    expect(r.shares).toBe(500);
  });
});
