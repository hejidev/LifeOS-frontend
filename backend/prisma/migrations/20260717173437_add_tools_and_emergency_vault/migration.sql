-- CreateEnum
CREATE TYPE "WritingMode" AS ENUM ('GENERATE', 'REWRITE', 'IMPROVE', 'SHORTEN', 'EXPAND', 'SUMMARIZE', 'TRANSLATE', 'TONE_CHANGE');

-- CreateTable
CREATE TABLE "WritingDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" "WritingMode" NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "tone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bloodType" TEXT,
    "organDonor" BOOLEAN,
    "height" TEXT,
    "weight" TEXT,
    "physicianName" TEXT,
    "physicianPhone" TEXT,
    "allergiesCipher" TEXT,
    "conditionsCipher" TEXT,
    "medicationsCipher" TEXT,
    "notesCipher" TEXT,
    "shareToken" TEXT,
    "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shareExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WritingDocument_userId_idx" ON "WritingDocument"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyProfile_userId_key" ON "EmergencyProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyProfile_shareToken_key" ON "EmergencyProfile"("shareToken");

-- CreateIndex
CREATE INDEX "EmergencyContact_profileId_idx" ON "EmergencyContact"("profileId");

-- AddForeignKey
ALTER TABLE "WritingDocument" ADD CONSTRAINT "WritingDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyProfile" ADD CONSTRAINT "EmergencyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "EmergencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
