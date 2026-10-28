-- CreateEnum
CREATE TYPE "StockReason" AS ENUM ('RECEIVED', 'DAMAGED', 'EXPIRED', 'COUNT_CORRECTION', 'RETURNED_TO_SUPPLIER', 'MANUAL_EDIT', 'OTHER');

-- AlterTable
ALTER TABLE "BizSale" ADD COLUMN     "staffId" TEXT;

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "attachment" JSONB;

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "bizProfileId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "reason" "StockReason" NOT NULL,
    "note" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_productId_storeId_createdAt_idx" ON "StockMovement"("productId", "storeId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_bizProfileId_createdAt_idx" ON "StockMovement"("bizProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "BizSale_userId_staffId_idx" ON "BizSale"("userId", "staffId");
