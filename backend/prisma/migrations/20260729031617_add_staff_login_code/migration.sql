/*
  Warnings:

  - A unique constraint covering the columns `[staffLoginCode]` on the table `BizProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BizProfile" ADD COLUMN     "staffLoginCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BizProfile_staffLoginCode_key" ON "BizProfile"("staffLoginCode");
