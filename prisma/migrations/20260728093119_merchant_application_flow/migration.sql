-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BusinessCategory" AS ENUM ('RETAIL', 'FOOD_BEVERAGE', 'SERVICES', 'FASHION', 'ELECTRONICS', 'HEALTH_BEAUTY', 'EDUCATION', 'OTHER');

-- AlterTable
ALTER TABLE "BizProfile" ADD COLUMN     "address" TEXT,
ADD COLUMN     "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "category" "BusinessCategory",
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "status" "MerchantStatus" NOT NULL DEFAULT 'PENDING';
