-- CreateTable
CREATE TABLE "StaffShift" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "bizProfileId" TEXT NOT NULL,
    "storeId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffShift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffShift_staffId_idx" ON "StaffShift"("staffId");

-- CreateIndex
CREATE INDEX "StaffShift_bizProfileId_idx" ON "StaffShift"("bizProfileId");

-- CreateIndex
CREATE INDEX "StaffShift_startsAt_idx" ON "StaffShift"("startsAt");

-- AddForeignKey
ALTER TABLE "StaffShift" ADD CONSTRAINT "StaffShift_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "BizStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShift" ADD CONSTRAINT "StaffShift_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
