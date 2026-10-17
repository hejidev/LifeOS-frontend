-- AlterTable
ALTER TABLE "BizCustomer" ADD COLUMN     "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "BizProfile" ADD COLUMN     "loyaltyEarnRate" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "loyaltyRedemptionValue" INTEGER NOT NULL DEFAULT 1;
