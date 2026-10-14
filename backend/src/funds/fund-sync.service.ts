// backend/src/funds/fund-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FundsService } from './funds.service';
import { addDays, beijingToday, dateStr, parseDay, shiftNavDate } from './replay/dates';
import { debitDates } from './replay/schedule';
import { subscribeShares } from './replay/subscribe';

@Injectable()
export class FundSyncService {
  private readonly log = new Logger(FundSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly funds: FundsService,
  ) {}

  /** 每晚 21:30（北京时间）+ 手动 sync 共用入口。 */
  @Cron('0 30 21 * * *', { timeZone: 'Asia/Shanghai' })
  async nightly() {
    await this.syncAndAdvance();
  }

  async syncAndAdvance(fundId?: string) {
    const funds = await this.prisma.fund.findMany({
      where: { id: fundId, status: 'ACTIVE' },
    });
    for (const fund of funds) {
      try {
        const fresh = await this.funds.syncNavs(fund.id);
        await this.advancePlans(fund.id);
        await this.confirmPending(fund.id);
        if (fresh > 0) await this.markDormantCheck(fund.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.log.error(`sync ${fund.code}: ${msg}`);
        await this.prisma.fund.update({
          where: { id: fund.id },
          data: { lastSyncError: msg.slice(0, 500) },
        });
      }
    }
  }

  /** 推进定投计划：为每个计划生成 AUTO/BACKFILL 申购流水（幂等）。 */
  async advancePlans(fundId: string) {
    const today = beijingToday();
    const navs = await this.prisma.nav.findMany({
      where: { fundId },
      orderBy: { date: 'asc' },
      select: { date: true, unit: true },
    });
    const navDates = navs.map((n) => dateStr(n.date));
    const navOf = new Map(navs.map((n) => [dateStr(n.date), Number(n.unit)]));
    const fund = await this.prisma.fund.findUniqueOrThrow({ where: { id: fundId } });
    const plans = await this.prisma.plan.findMany({
      where: { fundId, status: 'ACTIVE' },
    });

    for (const plan of plans) {
      const schedule = {
        freq: plan.freq as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
        weekday: plan.weekday,
        monthday: plan.monthday,
        startDate: dateStr(plan.startDate),
        endDate: plan.endDate ? dateStr(plan.endDate) : null,
      };
      const dates = debitDates(schedule, navDates, today);
      for (const applyDate of dates) {
        const existed = await this.prisma.trade.findFirst({
          where: { planId: plan.id, applyDate: parseDay(applyDate), kind: 'SUBSCRIBE' },
        });
        if (existed) continue;
        const nav = navOf.get(applyDate);
        if (!nav) continue;
        const rate = Number(fund.origFeeRate) * Number(fund.discount);
        const { fee, shares } = subscribeShares(Number(plan.amount), rate, nav);
        const realConfirm = shiftNavDate(applyDate, fund.confirmLag, navDates);
        // 生成日晚于申请日 4 天以上 → 视为回填生成（启动前欠账）
        const gapDays = Math.round(
          (parseDay(today).getTime() - parseDay(applyDate).getTime()) / 86400000,
        );
        await this.prisma.trade.create({
          data: {
            fundId,
            planId: plan.id,
            kind: 'SUBSCRIBE',
            source: gapDays > 4 ? 'BACKFILL' : 'AUTO',
            applyDate: parseDay(applyDate),
            confirmDate: parseDay(realConfirm ?? addDays(applyDate, fund.confirmLag)),
            nav,
            amount: plan.amount,
            fee,
            shares,
            status: realConfirm ? 'CONFIRMED' : 'PENDING',
          },
        });
      }
    }
  }

  /** 确认在途流水：确认日净值已入库 → CONFIRMED 并校正 confirmDate。 */
  async confirmPending(fundId: string) {
    const navs = await this.prisma.nav.findMany({
      where: { fundId },
      orderBy: { date: 'asc' },
      select: { date: true },
    });
    const navDates = navs.map((n) => dateStr(n.date));
    const fund = await this.prisma.fund.findUniqueOrThrow({ where: { id: fundId } });
    const pending = await this.prisma.trade.findMany({
      where: { fundId, status: 'PENDING' },
    });
    for (const t of pending) {
      const apply = dateStr(t.applyDate);
      if (!shiftNavDate(apply, 0, navDates)) continue; // 申请日净值不在，异常跳过
      const confirmDate = shiftNavDate(apply, fund.confirmLag, navDates);
      if (!confirmDate) continue; // 确认日净值未到
      await this.prisma.trade.update({
        where: { id: t.id },
        data: { status: 'CONFIRMED', confirmDate: parseDay(confirmDate) },
      });
    }
  }

  /** 超过 10 个自然日无新净值 → DORMANT。 */
  private async markDormantCheck(fundId: string) {
    const latest = await this.prisma.nav.findFirst({
      where: { fundId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    if (!latest) return;
    const days = Math.round((Date.now() - latest.date.getTime()) / 86400000);
    if (days > 10) {
      await this.prisma.fund.update({ where: { id: fundId }, data: { status: 'DORMANT' } });
    }
  }
}
