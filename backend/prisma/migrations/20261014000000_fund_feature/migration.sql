-- DropTable（占位 User 表，无业务数据）
DROP TABLE "User";

-- CreateTable
CREATE TABLE "Fund" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "origFeeRate" DECIMAL(8,6) NOT NULL DEFAULT 0.015,
    "discount" DECIMAL(4,3) NOT NULL DEFAULT 0.1,
    "confirmLag" INTEGER NOT NULL DEFAULT 1,
    "redeemFeeTiers" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nav" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "unit" DECIMAL(10,4) NOT NULL,
    "accUnit" DECIMAL(10,4),
    "dayGrowth" DECIMAL(8,6),

    CONSTRAINT "Nav_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "freq" TEXT NOT NULL,
    "weekday" INTEGER,
    "monthday" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "dividendMode" TEXT NOT NULL DEFAULT 'CASH',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "planId" TEXT,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "applyDate" DATE NOT NULL,
    "confirmDate" DATE NOT NULL,
    "nav" DECIMAL(10,4) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shares" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fund_code_key" ON "Fund"("code");
CREATE UNIQUE INDEX "Nav_fundId_date_key" ON "Nav"("fundId", "date");
CREATE INDEX "Nav_fundId_date_idx" ON "Nav"("fundId", "date");
CREATE UNIQUE INDEX "Trade_planId_applyDate_kind_key" ON "Trade"("planId", "applyDate", "kind");
CREATE INDEX "Trade_fundId_confirmDate_idx" ON "Trade"("fundId", "confirmDate");

-- AddForeignKey
ALTER TABLE "Nav" ADD CONSTRAINT "Nav_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
