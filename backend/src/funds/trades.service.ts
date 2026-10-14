// backend/src/funds/trades.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dateStr, parseDay, shiftNavDate } from './replay/dates';
import {
  DEFAULT_TIERS,
  lotHoldingDays,
  redeemFeeRate,
  splitRedeemFifo,
  type RedeemTier,
} from './replay/redeem';
import { CreateTradeDto, UpdateTradeDto } from './dto';

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  list(fundId?: string) {
    return this.prisma.trade.findMany({
      where: fundId ? { fundId } : undefined,
      orderBy: [{ applyDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async create(dto: CreateTradeDto) {
    const fund = await this.prisma.fund.findUnique({ where: { id: dto.fundId } });
    if (!fund) throw new NotFoundException('基金不存在');
    const applyDate = dto.applyDate;
    const navRow = await this.navAt(fund.id, applyDate);
    if (!navRow) throw new BadRequestException('该日净值未入库，请先同步净值');
    const nav = Number(navRow.unit);

    if (dto.kind === 'SUBSCRIBE') {
      const rate = Number(fund.origFeeRate) * Number(fund.discount);
      const net = dto.amount / (1 + rate);
      const shares = Math.round((net / nav) * 100) / 100;
      return this.prisma.trade.create({
        data: {
          fundId: fund.id,
          kind: 'SUBSCRIBE',
          source: 'MANUAL',
          applyDate: parseDay(applyDate),
          confirmDate: parseDay(applyDate),
          nav,
          amount: dto.amount,
          fee: Math.round((dto.amount - net) * 100) / 100,
          shares,
          status: 'CONFIRMED',
          note: dto.note,
        },
      });
    }

    if (dto.kind === 'REDEEM') {
      if (!dto.shares || dto.shares <= 0) throw new BadRequestException('赎回须指定正数份额');
      const lots = await this.availableLots(fund.id, applyDate);
      const total = lots.reduce((s, l) => s + l.shares, 0);
      if (dto.shares > total + 1e-9) {
        throw new BadRequestException(`赎回份额超过可用持仓 ${total}`);
      }
      const tiers = (fund.redeemFeeTiers as RedeemTier[] | null) ?? DEFAULT_TIERS;
      const navDates = await this.navDates(fund.id);
      const confirmDate = shiftNavDate(applyDate, fund.confirmLag, navDates) ?? applyDate;
      const split = splitRedeemFifo(lots, dto.shares);
      let fee = 0;
      for (const s of split) {
        fee += s.shares * nav * redeemFeeRate(lotHoldingDays(s.confirmDate, confirmDate), tiers);
      }
      fee = Math.round(fee * 100) / 100;
      const gross = Math.round(dto.shares * nav * 100) / 100;
      return this.prisma.trade.create({
        data: {
          fundId: fund.id,
          kind: 'REDEEM',
          source: 'MANUAL',
          applyDate: parseDay(applyDate),
          confirmDate: parseDay(confirmDate),
          nav,
          amount: Math.round((gross - fee) * 100) / 100,
          fee,
          shares: -dto.shares,
          status: 'CONFIRMED',
          note: JSON.stringify({ split, confirmDatePredicted: confirmDate }),
        },
      });
    }

    // 分红：amount = 每份派息额；红利 = 除息日持有份额 × 每份派息
    const held = await this.heldSharesAt(fund.id, applyDate);
    const dividend = Math.round(held * dto.amount * 100) / 100;
    if (dto.kind === 'DIVIDEND_CASH') {
      return this.prisma.trade.create({
        data: {
          fundId: fund.id,
          kind: 'DIVIDEND_CASH',
          source: 'MANUAL',
          applyDate: parseDay(applyDate),
          confirmDate: parseDay(applyDate),
          nav,
          amount: dividend,
          fee: 0,
          shares: 0,
          status: 'CONFIRMED',
          note: `每份派息 ${dto.amount} × ${held} 份`,
        },
      });
    }
    const shares = Math.round((dividend / nav) * 100) / 100;
    return this.prisma.trade.create({
      data: {
        fundId: fund.id,
        kind: 'DIVIDEND_REINVEST',
        source: 'MANUAL',
        applyDate: parseDay(applyDate),
        confirmDate: parseDay(applyDate),
        nav,
        amount: dividend,
        fee: 0,
        shares,
        status: 'CONFIRMED',
        note: `每份派息 ${dto.amount}，红利再投`,
      },
    });
  }

  /** 修正：改数值字段后 replay 自动重算（summary 现算保证）。 */
  async update(id: string, patch: UpdateTradeDto) {
    const t = await this.prisma.trade.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('流水不存在');
    return this.prisma.trade.update({ where: { id }, data: patch });
  }

  async remove(id: string) {
    await this.prisma.trade.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('流水不存在');
    });
    return { ok: true };
  }

  private async navAt(fundId: string, date: string) {
    return this.prisma.nav.findUnique({
      where: { fundId_date: { fundId, date: parseDay(date) } },
    });
  }

  private async navDates(fundId: string) {
    const rows = await this.prisma.nav.findMany({
      where: { fundId },
      orderBy: { date: 'asc' },
      select: { date: true },
    });
    return rows.map((r) => dateStr(r.date));
  }

  /** 可用批次：已确认申购/再投（升序），赎回从最早批次抵扣（与 replay FIFO 口径一致）。 */
  private async availableLots(fundId: string, before: string) {
    const trades = await this.prisma.trade.findMany({
      where: { fundId, status: 'CONFIRMED', confirmDate: { lte: parseDay(before) } },
    });
    const buys = trades
      .filter((t) => t.kind === 'SUBSCRIBE' || t.kind === 'DIVIDEND_REINVEST')
      .map((t) => ({ confirmDate: dateStr(t.confirmDate), shares: Number(t.shares) }))
      .sort((a, b) => (a.confirmDate < b.confirmDate ? -1 : 1));
    const totalRedeem = trades
      .filter((t) => t.kind === 'REDEEM')
      .reduce((s, t) => s + -Number(t.shares), 0);
    let remain = totalRedeem;
    return buys
      .map((b) => {
        const take = Math.min(b.shares, Math.max(remain, 0));
        remain -= take;
        return { confirmDate: b.confirmDate, shares: Math.round((b.shares - take) * 100) / 100 };
      })
      .filter((b) => b.shares > 0);
  }

  private async heldSharesAt(fundId: string, date: string) {
    const lots = await this.availableLots(fundId, date);
    return lots.reduce((s, l) => s + l.shares, 0);
  }
}
