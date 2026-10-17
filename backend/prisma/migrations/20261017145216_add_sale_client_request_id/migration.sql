/*
  Warnings:

  - A unique constraint covering the columns `[userId,clientRequestId]` on the table `BizSale` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BizSale" ADD COLUMN     "clientRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BizSale_userId_clientRequestId_key" ON "BizSale"("userId", "clientRequestId");
