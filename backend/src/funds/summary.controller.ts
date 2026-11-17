// backend/src/funds/summary.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { SummaryService } from './summary.service';

@Controller('summary')
export class SummaryController {
  constructor(private readonly summary: SummaryService) {}

  @Get('overview')
  overview() {
    return this.summary.overview();
  }

  @Get('daily')
  daily(@Query('from') from?: string, @Query('to') to?: string) {
    return this.summary.daily(from, to);
  }
}
