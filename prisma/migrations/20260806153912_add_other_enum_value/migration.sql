-- -- CreateEnum
-- CREATE TYPE "GoalModule" AS ENUM ('TASKS', 'FINANCE', 'STUDY', 'HEALTH', 'CAREER', 'OTHER');

-- CreateEnum
-- CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- AlterEnum
-- ALTER TYPE "CalendarEventType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "linkedTaskId" TEXT,
ALTER COLUMN "type" DROP DEFAULT;

-- CreateTable
-- CREATE TABLE "Goal" (
--     "id" TEXT NOT NULL,
--     "userId" TEXT NOT NULL,
--     "title" TEXT NOT NULL,
--     "module" "GoalModule" NOT NULL DEFAULT 'OTHER',
--     "target" DOUBLE PRECISION NOT NULL,
--     "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
--     "unit" TEXT,
--     "deadline" TIMESTAMP(3),
--     "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
--     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     "updatedAt" TIMESTAMP(3) NOT NULL,

--     CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
-- );

-- -- CreateIndex
-- CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- -- AddForeignKey
-- ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
