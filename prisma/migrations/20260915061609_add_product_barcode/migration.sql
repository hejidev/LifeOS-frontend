/*
  Warnings:

  - A unique constraint covering the columns `[userId,barcode]` on the table `BizProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BizProduct" ADD COLUMN     "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BizProduct_userId_barcode_key" ON "BizProduct"("userId", "barcode");
