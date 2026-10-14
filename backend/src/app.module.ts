import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { FundsModule } from './funds/funds.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, HealthModule, FundsModule],
})
export class AppModule {}
