-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyDocuments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyWeekly" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL DEFAULT '',
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderLog_createdAt_idx" ON "ReminderLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLog_userId_kind_refId_period_key" ON "ReminderLog"("userId", "kind", "refId", "period");

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
