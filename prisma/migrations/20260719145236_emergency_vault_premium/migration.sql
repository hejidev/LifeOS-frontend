-- AlterTable
ALTER TABLE "EmergencyContact" ADD COLUMN     "canMakeMedicalDecisions" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EmergencyProfile" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "dnrStatus" BOOLEAN,
ADD COLUMN     "insurancePhone" TEXT,
ADD COLUMN     "insurancePolicyCipher" TEXT,
ADD COLUMN     "insuranceProvider" TEXT,
ADD COLUMN     "lastViewedAt" TIMESTAMP(3),
ADD COLUMN     "preferredHospital" TEXT,
ADD COLUMN     "pregnancyStatus" BOOLEAN,
ADD COLUMN     "sharePinHash" TEXT,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EmergencyAccessLog" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "EmergencyAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmergencyAccessLog_profileId_idx" ON "EmergencyAccessLog"("profileId");

-- AddForeignKey
ALTER TABLE "EmergencyAccessLog" ADD CONSTRAINT "EmergencyAccessLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "EmergencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
