-- AlterTable
ALTER TABLE "BizProfile" ADD COLUMN     "notifyDailySummary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyLowStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNewSale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "staffTokenVersion" INTEGER NOT NULL DEFAULT 1;
