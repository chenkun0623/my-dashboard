// backend/src/funds/funds.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NavFetcherService } from './nav-fetcher.service';
import { CreateFundDto, UpdateFundDto } from './dto';
import { addDays, beijingToday, dateStr, parseDay, shiftNavDate } from './replay/dates';
import { debitDates } from './replay/schedule';
import { subscribeShares } from './replay/subscribe';

@Injectable()
export class FundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fetcher: NavFetcherService,
  ) {}

  list() {
    return this.prisma.fund.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async get(id: string) {
    const fund = await this.prisma.fund.findUnique({ where: { id } });
    if (!fund) throw new NotFoundException('基金不存在');
    return fund;
  }

  /** 建档：名称优先用户传入，否则自动抓；随后全量抓历史净值入库。 */
  async create(dto: CreateFundDto) {
    const existing = await this.prisma.fund.findUnique({ where: { code: dto.code } });
    if (existing) return existing;

    let name = dto.name ?? '';
    if (!name) name = await this.fetcher.fetchName(dto.code).catch(() => dto.code);

    const fund = await this.prisma.fund.create({
      data: {
        code: dto.code,
        name,
        category: dto.category ?? 'OTHER',
        origFeeRate: dto.origFeeRate ?? 0.015,
        discount: dto.discount ?? 0.1,
        confirmLag: dto.confirmLag ?? 1,
      },
    });
    await this.syncNavs(fund.id).catch(() => undefined); // 建档抓净值失败不阻断，可稍后手动 sync
    return this.get(fund.id);
  }

  async update(id: string, dto: UpdateFundDto) {
    await this.get(id);
    const { redeemFeeTiers, ...rest } = dto;
    const data: Prisma.FundUpdateInput = { ...rest };
    if (redeemFeeTiers) {
      data.redeemFeeTiers = redeemFeeTiers as unknown as Prisma.InputJsonValue;
    }
    return this.prisma.fund.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.fund.delete({ where: { id } });
    return { ok: true };
  }

  /** 净值入库（存在则跳过，天然幂等）。返回新入库条数。 */
  async syncNavs(fundId: string): Promise<number> {
    const fund = await this.get(fundId);
    const rows = await this.fetcher.fetchHistory(fund.code);
    const existing = await this.prisma.nav.findMany({
      where: { fundId },
      select: { date: true },
    });
    const have = new Set(existing.map((n) => dateStr(n.date)));
    const fresh = rows.filter((r) => !have.has(r.date));
    if (fresh.length) {
      await this.prisma.nav.createMany({
        data: fresh.map((r) => ({
          fundId,
          date: parseDay(r.date),
          unit: r.unit,
          accUnit: r.accUnit,
          dayGrowth: r.dayGrowth,
        })),
      });
    }
    await this.prisma.fund.update({
      where: { id: fundId },
      data: { lastSyncAt: new Date(), lastSyncError: null },
    });
    return fresh.length;
  }

  /** 回填：按计划 + 分段金额重放历史扣款，生成 source=BACKFILL 申购流水（幂等）。 */
  async backfill(planId: string, segments: { startDate: string; endDate?: string; amount: number }[]) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('计划不存在');
    const fund = await this.prisma.fund.findUniqueOrThrow({ where: { id: plan.fundId } });
    const navs = await this.prisma.nav.findMany({
      where: { fundId: plan.fundId },
      orderBy: { date: 'asc' },
      select: { date: true, unit: true },
    });
    const navDates = navs.map((n) => dateStr(n.date));
    const navOf = new Map(navs.map((n) => [dateStr(n.date), Number(n.unit)]));
    const rate = Number(fund.origFeeRate) * Number(fund.discount);
    const today = beijingToday();
    let created = 0;

    for (const seg of segments) {
      const schedule = {
        freq: plan.freq as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
        weekday: plan.weekday,
        monthday: plan.monthday,
        startDate: seg.startDate,
        endDate: seg.endDate ?? null,
      };
      const dates = debitDates(schedule, navDates, seg.endDate ?? today);
      for (const applyDate of dates) {
        const existed = await this.prisma.trade.findFirst({
          where: { planId, applyDate: parseDay(applyDate), kind: 'SUBSCRIBE' },
        });
        if (existed) continue;
        const nav = navOf.get(applyDate);
        if (!nav) continue;
        const { fee, shares } = subscribeShares(seg.amount, rate, nav);
        const realConfirm = shiftNavDate(applyDate, fund.confirmLag, navDates);
        await this.prisma.trade.create({
          data: {
            fundId: plan.fundId,
            planId,
            kind: 'SUBSCRIBE',
            source: 'BACKFILL',
            applyDate: parseDay(applyDate),
            confirmDate: parseDay(realConfirm ?? addDays(applyDate, fund.confirmLag)),
            nav,
            amount: seg.amount,
            fee,
            shares,
            status: realConfirm ? 'CONFIRMED' : 'PENDING',
          },
        });
        created += 1;
      }
    }
    return { created };
  }
}
