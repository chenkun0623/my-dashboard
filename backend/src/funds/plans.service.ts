// backend/src/funds/plans.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { beijingToday, parseDay } from './replay/dates';
import { CreatePlanDto, UpdatePlanDto } from './dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  list(fundId?: string) {
    return this.prisma.plan.findMany({
      where: fundId ? { fundId } : undefined,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreatePlanDto) {
    if (dto.freq !== 'MONTHLY' && !dto.weekday) {
      throw new BadRequestException('WEEKLY/BIWEEKLY 须指定 weekday');
    }
    if (dto.freq === 'MONTHLY' && !dto.monthday) {
      throw new BadRequestException('MONTHLY 须指定 monthday');
    }
    const fund = await this.prisma.fund.findUnique({ where: { id: dto.fundId } });
    if (!fund) throw new NotFoundException('基金不存在');
    if (dto.startDate > beijingToday()) throw new BadRequestException('起始日不能是未来');
    return this.prisma.plan.create({
      data: {
        fundId: dto.fundId,
        freq: dto.freq,
        weekday: dto.weekday ?? null,
        monthday: dto.monthday ?? null,
        amount: dto.amount,
        startDate: parseDay(dto.startDate),
        dividendMode: dto.dividendMode ?? 'CASH',
      },
    });
  }

  /** 改金额 = 旧段 endDate（今天）+ 新段从今天开始；其余直接更新。 */
  async update(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('计划不存在');
    if (dto.amount !== undefined && dto.amount !== Number(plan.amount)) {
      const today = beijingToday();
      await this.prisma.$transaction([
        this.prisma.plan.update({
          where: { id },
          data: { endDate: parseDay(today), status: 'STOPPED' },
        }),
        this.prisma.plan.create({
          data: {
            fundId: plan.fundId,
            freq: plan.freq,
            weekday: plan.weekday,
            monthday: plan.monthday,
            amount: dto.amount,
            startDate: parseDay(today),
            dividendMode: plan.dividendMode,
          },
        }),
      ]);
      return this.prisma.plan.findUnique({ where: { id } });
    }
    return this.prisma.plan.update({
      where: { id },
      data: {
        endDate: dto.endDate ? parseDay(dto.endDate) : undefined,
        status: dto.status,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.plan.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('计划不存在');
    });
    return { ok: true };
  }
}
