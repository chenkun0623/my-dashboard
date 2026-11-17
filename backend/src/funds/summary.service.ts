// backend/src/funds/summary.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { beijingToday, dateStr } from './replay/dates';
import { computeDailySeries, computeOverview, NavPoint, TradeLike } from './replay/replay';
import { nextDebitDate } from './replay/schedule';

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadFundData(fundId: string) {
    const [fund, navRows, tradeRows, plans] = await Promise.all([
      this.prisma.fund.findUniqueOrThrow({ where: { id: fundId } }),
      this.prisma.nav.findMany({ where: { fundId }, orderBy: { date: 'asc' } }),
      this.prisma.trade.findMany({ where: { fundId } }),
      this.prisma.plan.findMany({ where: { fundId, status: 'ACTIVE' } }),
    ]);
    const navs: NavPoint[] = navRows.map((n) => ({
      date: dateStr(n.date),
      unit: Number(n.unit),
      dayGrowth: n.dayGrowth === null ? null : Number(n.dayGrowth),
    }));
    const trades: TradeLike[] = tradeRows.map((t) => ({
      kind: t.kind,
      applyDate: dateStr(t.applyDate),
      confirmDate: dateStr(t.confirmDate),
      nav: Number(t.nav),
      amount: Number(t.amount),
      fee: Number(t.fee),
      shares: Number(t.shares),
      status: t.status,
    }));
    return { fund, navs, trades, plans };
  }

  async overview() {
    const funds = await this.prisma.fund.findMany({ orderBy: { createdAt: 'asc' } });
    let totalMarketValue = 0,
      totalInvested = 0,
      totalRecovered = 0,
      totalGain = 0,
      todayGain = 0;
    let todayGainDate: string | null = null;
    let syncAlert = false;
    const holdings: unknown[] = [];
    const today = beijingToday();

    for (const f of funds) {
      const { fund, navs, trades, plans } = await this.loadFundData(f.id);
      const o = computeOverview(trades, navs);
      totalMarketValue += o.marketValue;
      totalInvested += o.invested;
      totalRecovered += o.recovered;
      totalGain += o.totalGain;
      todayGain += o.todayGain;
      if (o.latestDate && (!todayGainDate || o.latestDate > todayGainDate)) {
        todayGainDate = o.latestDate;
      }
      if (fund.lastSyncError) syncAlert = true;

      let next: string | null = null;
      for (const p of plans) {
        const nd = nextDebitDate(
          {
            freq: p.freq as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
            weekday: p.weekday,
            monthday: p.monthday,
            startDate: dateStr(p.startDate),
            endDate: p.endDate ? dateStr(p.endDate) : null,
          },
          navs.map((n) => n.date),
          today,
        );
        if (nd && (!next || nd < next)) next = nd;
      }

      holdings.push({
        fundId: fund.id,
        code: fund.code,
        name: fund.name,
        status: fund.status,
        shares: o.shares,
        costPerShare: o.costPerShare,
        latestUnit: o.latestUnit,
        latestDate: o.latestDate,
        marketValue: o.marketValue,
        invested: o.invested,
        totalGain: o.totalGain,
        dayGain: o.todayGain,
        nextDebitDate: next,
        lastSyncError: fund.lastSyncError,
      });
    }
    return {
      totalMarketValue,
      invested: totalInvested,
      recovered: totalRecovered,
      totalGain,
      todayGain,
      todayGainDate,
      syncAlert,
      holdings,
    };
  }

  async daily(from?: string, to?: string) {
    const funds = await this.prisma.fund.findMany({ orderBy: { createdAt: 'asc' } });
    const merged = new Map<
      string,
      { dayGain: number; marketValue: number; invested: number; totalGain: number }
    >();
    for (const f of funds) {
      const { navs, trades } = await this.loadFundData(f.id);
      for (const p of computeDailySeries(trades, navs)) {
        if (from && p.date < from) continue;
        if (to && p.date > to) continue;
        const m = merged.get(p.date) ?? { dayGain: 0, marketValue: 0, invested: 0, totalGain: 0 };
        m.dayGain += p.dayGain;
        m.marketValue += p.marketValue;
        m.invested += p.invested;
        m.totalGain += p.totalGain;
        merged.set(p.date, m);
      }
    }
    return [...merged.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, v]) => ({ date, ...v }));
  }
}
