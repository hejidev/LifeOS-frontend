-- CreateEnum
CREATE TYPE "IdDocumentType" AS ENUM ('NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE', 'VOTERS_CARD');

-- CreateEnum
CREATE TYPE "MerchantPlanTier" AS ENUM ('NONE', 'STARTER', 'GROWTH', 'PRO');

-- CreateEnum
CREATE TYPE "MerchantPlanStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "BizProfile" ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "idBackUrl" TEXT,
ADD COLUMN     "idDocumentNumber" TEXT,
ADD COLUMN     "idDocumentType" "IdDocumentType",
ADD COLUMN     "idFrontUrl" TEXT,
ADD COLUMN     "idVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "planStatus" "MerchantPlanStatus" NOT NULL DEFAULT 'INACTIVE',
ADD COLUMN     "planTier" "MerchantPlanTier" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;
