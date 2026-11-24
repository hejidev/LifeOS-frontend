-- CreateEnum
CREATE TYPE "SaleConfirmation" AS ENUM ('NOT_REQUIRED', 'AWAITING', 'CONFIRMED', 'DISPUTED');

-- AlterTable
ALTER TABLE "BizSale" ADD COLUMN     "confirmation" "SaleConfirmation" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedByName" TEXT,
ADD COLUMN     "paymentReference" TEXT;

-- CreateIndex
CREATE INDEX "BizSale_userId_confirmation_idx" ON "BizSale"("userId", "confirmation");
