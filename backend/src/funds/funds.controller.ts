// backend/src/funds/funds.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { FundsService } from './funds.service';
import { BackfillDto, CreateFundDto, UpdateFundDto } from './dto';

@Controller('funds')
export class FundsController {
  constructor(private readonly funds: FundsService) {}

  @Get()
  list() {
    return this.funds.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.funds.get(id);
  }

  @Post()
  create(@Body() dto: CreateFundDto) {
    return this.funds.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFundDto) {
    return this.funds.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.funds.remove(id);
  }

  /** 回填历史定投（幂等）。 */
  @Post('backfill')
  backfill(@Body() dto: BackfillDto) {
    return this.funds.backfill(dto.planId, dto.segments);
  }
}
