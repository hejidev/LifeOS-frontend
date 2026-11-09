-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminAuditAction" ADD VALUE 'MERCHANT_STAFF_SIGNED_OUT';
ALTER TYPE "AdminAuditAction" ADD VALUE 'MERCHANT_STORE_CODE_REGENERATED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'MERCHANT_STORE_PAUSED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'MERCHANT_STORE_RESUMED';

-- CreateTable
CREATE TABLE "TrafficBucket" (
    "id" TEXT NOT NULL,
    "minute" TIMESTAMP(3) NOT NULL,
    "instance" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "clientErrors" INTEGER NOT NULL DEFAULT 0,
    "serverErrors" INTEGER NOT NULL DEFAULT 0,
    "totalMs" INTEGER NOT NULL DEFAULT 0,
    "maxMs" INTEGER NOT NULL DEFAULT 0,
    "b50" INTEGER NOT NULL DEFAULT 0,
    "b100" INTEGER NOT NULL DEFAULT 0,
    "b250" INTEGER NOT NULL DEFAULT 0,
    "b500" INTEGER NOT NULL DEFAULT 0,
    "b1000" INTEGER NOT NULL DEFAULT 0,
    "b2500" INTEGER NOT NULL DEFAULT 0,
    "bSlow" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TrafficBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficRoute" (
    "id" TEXT NOT NULL,
    "hour" TIMESTAMP(3) NOT NULL,
    "instance" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "clientErrors" INTEGER NOT NULL DEFAULT 0,
    "serverErrors" INTEGER NOT NULL DEFAULT 0,
    "totalMs" INTEGER NOT NULL DEFAULT 0,
    "maxMs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TrafficRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceInstance" (
    "instance" TEXT NOT NULL,
    "bootedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "rssMb" INTEGER NOT NULL DEFAULT 0,
    "heapMb" INTEGER NOT NULL DEFAULT 0,
    "loopLagMs" INTEGER NOT NULL DEFAULT 0,
    "dbPingMs" INTEGER NOT NULL DEFAULT 0,
    "requests" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceInstance_pkey" PRIMARY KEY ("instance")
);

-- CreateTable
CREATE TABLE "LoadTestRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "progress" JSONB,
    "result" JSONB,
    "stopRequested" BOOLEAN NOT NULL DEFAULT false,
    "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "LoadTestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrafficBucket_minute_idx" ON "TrafficBucket"("minute");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficBucket_minute_instance_area_key" ON "TrafficBucket"("minute", "instance", "area");

-- CreateIndex
CREATE INDEX "TrafficRoute_hour_idx" ON "TrafficRoute"("hour");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficRoute_hour_instance_route_key" ON "TrafficRoute"("hour", "instance", "route");

-- CreateIndex
CREATE INDEX "LoadTestRun_createdAt_idx" ON "LoadTestRun"("createdAt");

-- CreateIndex
CREATE INDEX "SupportNote_userId_createdAt_idx" ON "SupportNote"("userId", "createdAt");
