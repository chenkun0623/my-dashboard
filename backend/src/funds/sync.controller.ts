// backend/src/funds/sync.controller.ts
import { Controller, Param, Post } from '@nestjs/common';
import { FundSyncService } from './fund-sync.service';

@Controller('funds')
export class SyncController {
  constructor(private readonly sync: FundSyncService) {}

  /** 手动触发：抓净值 + 推进 + 确认（可单基金）。 */
  @Post('sync')
  syncAll() {
    return this.sync.syncAndAdvance();
  }

  @Post(':id/sync')
  syncOne(@Param('id') id: string) {
    return this.sync.syncAndAdvance(id);
  }
}
