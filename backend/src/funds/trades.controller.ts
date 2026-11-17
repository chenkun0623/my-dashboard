// backend/src/funds/trades.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TradesService } from './trades.service';
import { CreateTradeDto, UpdateTradeDto } from './dto';

@Controller('trades')
export class TradesController {
  constructor(private readonly trades: TradesService) {}

  @Get()
  list(@Query('fundId') fundId?: string) {
    return this.trades.list(fundId);
  }

  @Post()
  create(@Body() dto: CreateTradeDto) {
    return this.trades.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTradeDto) {
    return this.trades.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.trades.remove(id);
  }
}
