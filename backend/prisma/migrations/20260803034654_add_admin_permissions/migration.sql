-- CreateEnum
CREATE TYPE "AdminCapability" AS ENUM ('MANAGE_USERS', 'MANAGE_MERCHANTS', 'MANAGE_CONTENT', 'SEND_BROADCASTS', 'VIEW_ANALYTICS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminAuditAction" ADD VALUE 'ROLE_CHANGED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'ADMIN_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PERMISSION_GRANTED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PERMISSION_REVOKED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'BROADCAST_SENT';

-- CreateTable
CREATE TABLE "AdminPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capability" "AdminCapability" NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminPermission_userId_idx" ON "AdminPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminPermission_userId_capability_key" ON "AdminPermission"("userId", "capability");

-- AddForeignKey
ALTER TABLE "AdminPermission" ADD CONSTRAINT "AdminPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
