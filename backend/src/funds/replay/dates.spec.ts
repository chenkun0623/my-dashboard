// backend/src/funds/replay/dates.spec.ts
import {
  addDays,
  beijingToday,
  dateStr,
  deferToTradingDay,
  diffDays,
  parseDay,
  shiftNavDate,
} from './dates';

describe('dates', () => {
  it('round-trips YYYY-MM-DD', () => {
    expect(dateStr(parseDay('2026-09-13'))).toBe('2026-09-13');
  });

  it('addDays crosses month end', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('diffDays counts calendar days', () => {
    expect(diffDays('2026-09-01', '2026-09-13')).toBe(12);
  });

  it('defers Saturday to next trading day', () => {
    // 2026-09-12 是周六，09-14 周一
    expect(deferToTradingDay('2026-09-12', ['2026-09-14', '2026-09-15'])).toBe('2026-09-14');
  });

  it('keeps trading day unchanged', () => {
    expect(deferToTradingDay('2026-09-14', ['2026-09-14'])).toBe('2026-09-14');
  });

  it('deferToTradingDay returns null when series exhausted', () => {
    expect(deferToTradingDay('2026-09-14', ['2026-09-10'])).toBeNull();
  });

  it('shiftNavDate moves N steps in nav series', () => {
    const series = ['2026-09-10', '2026-09-11', '2026-09-14'];
    expect(shiftNavDate('2026-09-11', 1, series)).toBe('2026-09-14');
    expect(shiftNavDate('2026-09-11', 5, series)).toBeNull();
  });

  it('beijingToday returns YYYY-MM-DD', () => {
    expect(beijingToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
