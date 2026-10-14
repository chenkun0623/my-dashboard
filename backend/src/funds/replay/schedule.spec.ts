// backend/src/funds/replay/schedule.spec.ts
import { debitDates, nextDebitDate } from './schedule';

// 交易日序列（含一个长假缺口 10-01~10-08）
const NAV = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-09', '2026-10-12'];

describe('schedule', () => {
  it('WEEKLY: every week on weekday, deferred over holiday', () => {
    // startDate 2026-09-24(周四) 本身非交易日 → 首期顺延 09-28；10-01 落在假期 → 顺延 10-09
    const dates = debitDates(
      { freq: 'WEEKLY', weekday: 4, startDate: '2026-09-24' },
      NAV,
      '2026-10-12',
    );
    expect(dates).toEqual(['2026-09-28', '2026-10-09']);
  });

  it('BIWEEKLY: anchor week is startDate week, every other week', () => {
    const dates = debitDates(
      { freq: 'BIWEEKLY', weekday: 4, startDate: '2026-09-24' },
      NAV,
      '2026-10-20',
    );
    expect(dates).toEqual(['2026-09-28', '2026-10-09']); // 10-08 那周不扣
  });

  it('MONTHLY: monthday clamped; candidates beyond until skipped', () => {
    // monthday=31 → 9月候选为 09-30；10 月候选 10-31 超过 until(10-12) 不生成
    const dates = debitDates(
      { freq: 'MONTHLY', monthday: 31, startDate: '2026-09-01' },
      NAV,
      '2026-10-12',
    );
    expect(dates).toEqual(['2026-09-30']);
  });

  it('MONTHLY: in-range candidate defers within nav series', () => {
    // monthday=30 → 9月候选 09-30（交易日，不顺延）
    const dates = debitDates(
      { freq: 'MONTHLY', monthday: 30, startDate: '2026-09-01' },
      NAV,
      '2026-10-12',
    );
    expect(dates).toEqual(['2026-09-30']);
  });

  it('dedups when deferral collides', () => {
    const dates = debitDates(
      { freq: 'WEEKLY', weekday: 4, startDate: '2026-09-24' },
      NAV,
      '2026-10-09',
    );
    expect(dates.filter((d) => d === '2026-10-09')).toHaveLength(1);
  });

  it('respects endDate (deferred date beyond endDate is skipped)', () => {
    const dates = debitDates(
      { freq: 'WEEKLY', weekday: 4, startDate: '2026-09-24', endDate: '2026-09-24' },
      NAV,
      '2026-10-12',
    );
    expect(dates).toEqual([]); // 09-24 顺延到 09-28 已超出 endDate
  });

  it('skips candidates beyond nav series (future)', () => {
    const dates = debitDates(
      { freq: 'WEEKLY', weekday: 2, startDate: '2026-09-29' },
      NAV,
      '2026-09-29',
    );
    expect(dates).toEqual(['2026-09-29']);
  });

  it('nextDebitDate returns first upcoming debit', () => {
    expect(
      nextDebitDate({ freq: 'WEEKLY', weekday: 4, startDate: '2026-09-24' }, NAV, '2026-09-24'),
    ).toBe('2026-09-28'); // 首期本身顺延到 09-28
  });
});
