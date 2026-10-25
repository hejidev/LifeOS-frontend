-- AlterTable
ALTER TABLE "BizSale" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "soldOffline" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "BizSale_userId_needsReview_idx" ON "BizSale"("userId", "needsReview");
