// backend/src/funds/funds.module.ts
import { Module } from '@nestjs/common';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';
import { NavFetcherService } from './nav-fetcher.service';
import { FundSyncService } from './fund-sync.service';
import { SyncController } from './sync.controller';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';

@Module({
  controllers: [
    FundsController,
    SyncController,
    PlansController,
    TradesController,
    SummaryController,
  ],
  providers: [
    FundsService,
    NavFetcherService,
    FundSyncService,
    PlansService,
    TradesService,
    SummaryService,
  ],
})
export class FundsModule {}
