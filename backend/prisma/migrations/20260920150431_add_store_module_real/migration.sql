-- AlterTable
ALTER TABLE "BizExpense" ADD COLUMN     "storeId" TEXT;

-- AlterTable
ALTER TABLE "BizSale" ADD COLUMN     "storeId" TEXT;

-- AlterTable
ALTER TABLE "BizStaff" ADD COLUMN     "storeId" TEXT;

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "bizProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreInventory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockAt" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Store_bizProfileId_idx" ON "Store"("bizProfileId");

-- CreateIndex
CREATE INDEX "StoreInventory_storeId_idx" ON "StoreInventory"("storeId");

-- CreateIndex
CREATE INDEX "StoreInventory_productId_idx" ON "StoreInventory"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreInventory_storeId_productId_key" ON "StoreInventory"("storeId", "productId");

-- CreateIndex
CREATE INDEX "BizExpense_storeId_idx" ON "BizExpense"("storeId");

-- CreateIndex
CREATE INDEX "BizSale_storeId_idx" ON "BizSale"("storeId");

-- CreateIndex
CREATE INDEX "BizStaff_storeId_idx" ON "BizStaff"("storeId");

-- AddForeignKey
ALTER TABLE "BizSale" ADD CONSTRAINT "BizSale_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizExpense" ADD CONSTRAINT "BizExpense_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizStaff" ADD CONSTRAINT "BizStaff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_bizProfileId_fkey" FOREIGN KEY ("bizProfileId") REFERENCES "BizProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreInventory" ADD CONSTRAINT "StoreInventory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreInventory" ADD CONSTRAINT "StoreInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BizProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
