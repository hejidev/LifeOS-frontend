/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `BizProfile` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `BizProfile` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `Subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BizProfile" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "paystackCustomerCode" TEXT,
ADD COLUMN     "paystackSubscriptionCode" TEXT;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "paystackCustomerCode" TEXT,
ADD COLUMN     "paystackSubscriptionCode" TEXT;
