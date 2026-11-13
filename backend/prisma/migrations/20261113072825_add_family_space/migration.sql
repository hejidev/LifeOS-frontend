/*
  Warnings:

  - A unique constraint covering the columns `[memberUserId]` on the table `FamilyMember` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FamilyMember" ADD COLUMN     "memberUserId" TEXT;

-- CreateTable
CREATE TABLE "FamilyGroup" (
    "ownerId" TEXT NOT NULL,
    "familyCode" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyGroup_pkey" PRIMARY KEY ("ownerId")
);

-- CreateTable
CREATE TABLE "FamilySchedule" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Bedtime',
    "days" INTEGER[],
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FamilySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyOverride" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "until" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMessage" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "threadKey" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyRead" (
    "userId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "threadKey" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyRead_pkey" PRIMARY KEY ("userId","ownerId","threadKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyGroup_familyCode_key" ON "FamilyGroup"("familyCode");

-- CreateIndex
CREATE INDEX "FamilySchedule_memberId_idx" ON "FamilySchedule"("memberId");

-- CreateIndex
CREATE INDEX "FamilyOverride_memberId_until_idx" ON "FamilyOverride"("memberId", "until");

-- CreateIndex
CREATE INDEX "FamilyMessage_ownerId_threadKey_createdAt_idx" ON "FamilyMessage"("ownerId", "threadKey", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_memberUserId_key" ON "FamilyMember"("memberUserId");

-- AddForeignKey
ALTER TABLE "FamilySchedule" ADD CONSTRAINT "FamilySchedule_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyOverride" ADD CONSTRAINT "FamilyOverride_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
