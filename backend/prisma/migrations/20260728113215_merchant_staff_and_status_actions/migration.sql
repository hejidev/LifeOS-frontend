-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('MANAGER', 'CASHIER', 'SALES_REP', 'INVENTORY_CLERK');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StaffActionType" AS ENUM ('LOGIN', 'SALE_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_CREATED', 'CUSTOMER_ADDED', 'EXPENSE_CREATED', 'REFUND_ISSUED', 'OTHER');

-- CreateTable
CREATE TABLE "BizStaff" (
    "id" TEXT NOT NULL,
    "bizProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "StaffRole" NOT NULL DEFAULT 'CASHIER',
    "pinHash" TEXT NOT NULL,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizStaffActivity" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "bizProfileId" TEXT NOT NULL,
    "action" "StaffActionType" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizStaffActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BizStaff_bizProfileId_idx" ON "BizStaff"("bizProfileId");

-- CreateIndex
CREATE INDEX "BizStaffActivity_staffId_idx" ON "BizStaffActivity"("staffId");

-- CreateIndex
CREATE INDEX "BizStaffActivity_bizProfileId_idx" ON "BizStaffActivity"("bizProfileId");

-- AddForeignKey
ALTER TABLE "BizStaff" ADD CONSTRAINT "BizStaff_bizProfileId_fkey" FOREIGN KEY ("bizProfileId") REFERENCES "BizProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizStaffActivity" ADD CONSTRAINT "BizStaffActivity_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "BizStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
