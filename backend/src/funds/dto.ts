// backend/src/funds/dto.ts
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateFundDto {
  @Matches(/^\d{6}$/, { message: '基金代码须为 6 位数字' })
  code!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['EQUITY', 'MIXED', 'INDEX', 'BOND', 'QDII', 'OTHER'])
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  origFeeRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  discount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  confirmLag?: number;
}

export class UpdateFundDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['EQUITY', 'MIXED', 'INDEX', 'BOND', 'QDII', 'OTHER'])
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  origFeeRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  discount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  confirmLag?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  redeemFeeTiers?: { days: number; rate: number }[];
}

export class CreatePlanDto {
  @IsString()
  fundId!: string;

  @IsIn(['WEEKLY', 'BIWEEKLY', 'MONTHLY'])
  freq!: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  weekday?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  monthday?: number;

  @IsNumber()
  @Min(1)
  amount!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '日期格式须为 YYYY-MM-DD' })
  startDate!: string;

  @IsOptional()
  @IsIn(['CASH', 'REINVEST'])
  dividendMode?: 'CASH' | 'REINVEST';
}

export class UpdatePlanDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'PAUSED', 'STOPPED'])
  status?: string;
}

export class BackfillDto {
  @IsString()
  planId!: string;

  /** 历史金额分段；首段 startDate 通常为计划起始日。 */
  segments!: { startDate: string; endDate?: string; amount: number }[];
}

export class CreateTradeDto {
  @IsString()
  fundId!: string;

  @IsIn(['SUBSCRIBE', 'REDEEM', 'DIVIDEND_CASH', 'DIVIDEND_REINVEST'])
  kind!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '日期格式须为 YYYY-MM-DD' })
  applyDate!: string;

  /** SUBSCRIBE=扣款额；REDEEM 忽略（按份额×净值算）；分红=每份派息额 */
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shares?: number; // REDEEM 必填

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateTradeDto {
  @IsOptional()
  @IsNumber()
  shares?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  fee?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
