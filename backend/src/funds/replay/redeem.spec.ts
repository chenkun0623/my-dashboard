// backend/src/funds/replay/redeem.spec.ts
import { DEFAULT_TIERS, redeemFeeRate, splitRedeemFifo } from './redeem';

describe('redeem', () => {
  it('splits redeem shares FIFO across lots', () => {
    const lots = [
      { confirmDate: '2026-01-05', shares: 100 },
      { confirmDate: '2026-03-10', shares: 200 },
    ];
    expect(splitRedeemFifo(lots, 150)).toEqual([
      { confirmDate: '2026-01-05', shares: 100 },
      { confirmDate: '2026-03-10', shares: 50 },
    ]);
  });

  it('throws when redeeming more than held', () => {
    expect(() => splitRedeemFifo([{ confirmDate: '2026-01-05', shares: 100 }], 101)).toThrow();
  });

  it('applies tier by holding days (natural days, first tier whose days > holding)', () => {
    expect(redeemFeeRate(6, DEFAULT_TIERS)).toBeCloseTo(0.015);
    expect(redeemFeeRate(7, DEFAULT_TIERS)).toBeCloseTo(0.0075);
    expect(redeemFeeRate(30, DEFAULT_TIERS)).toBeCloseTo(0.005);
    expect(redeemFeeRate(365, DEFAULT_TIERS)).toBeCloseTo(0.0025);
    expect(redeemFeeRate(730, DEFAULT_TIERS)).toBe(0);
  });
});
