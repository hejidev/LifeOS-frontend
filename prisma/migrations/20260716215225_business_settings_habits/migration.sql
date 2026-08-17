/*
  Warnings:

  - The `category` column on the `Habit` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "HabitCategory" AS ENUM ('HEALTH', 'FOCUS', 'LEARNING', 'FINANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "BizPaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "BizSaleStatus" AS ENUM ('PAID', 'PENDING', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BizExpenseCategory" AS ENUM ('INVENTORY', 'RENT', 'UTILITIES', 'SALARY', 'MARKETING', 'SUPPLIES', 'OTHER');

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "colorHex" TEXT,
ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "longestStreak" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "category",
ADD COLUMN     "category" "HabitCategory" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN     "darkMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "notifyCalendar" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyFinance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyTasks" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
ADD COLUMN     "weekStartsOn" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "BizProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizProduct" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "cost" DECIMAL(65,30),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockAt" INTEGER NOT NULL DEFAULT 3,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizCustomer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizSale" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "paymentMethod" "BizPaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "BizSaleStatus" NOT NULL DEFAULT 'PAID',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizSaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "lineTotal" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "BizSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "BizExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BizProfile_userId_key" ON "BizProfile"("userId");

-- CreateIndex
CREATE INDEX "BizProduct_userId_idx" ON "BizProduct"("userId");

-- CreateIndex
CREATE INDEX "BizProduct_userId_active_idx" ON "BizProduct"("userId", "active");

-- CreateIndex
CREATE INDEX "BizCustomer_userId_idx" ON "BizCustomer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BizSale_receiptNumber_key" ON "BizSale"("receiptNumber");

-- CreateIndex
CREATE INDEX "BizSale_userId_idx" ON "BizSale"("userId");

-- CreateIndex
CREATE INDEX "BizSale_userId_createdAt_idx" ON "BizSale"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BizSale_userId_status_idx" ON "BizSale"("userId", "status");

-- CreateIndex
CREATE INDEX "BizSaleItem_saleId_idx" ON "BizSaleItem"("saleId");

-- CreateIndex
CREATE INDEX "BizSaleItem_productId_idx" ON "BizSaleItem"("productId");

-- CreateIndex
CREATE INDEX "BizExpense_userId_idx" ON "BizExpense"("userId");

-- CreateIndex
CREATE INDEX "BizExpense_userId_date_idx" ON "BizExpense"("userId", "date");

-- AddForeignKey
ALTER TABLE "BizProfile" ADD CONSTRAINT "BizProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizProduct" ADD CONSTRAINT "BizProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizCustomer" ADD CONSTRAINT "BizCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizSale" ADD CONSTRAINT "BizSale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizSale" ADD CONSTRAINT "BizSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "BizCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizSaleItem" ADD CONSTRAINT "BizSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "BizSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizSaleItem" ADD CONSTRAINT "BizSaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BizProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizExpense" ADD CONSTRAINT "BizExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
