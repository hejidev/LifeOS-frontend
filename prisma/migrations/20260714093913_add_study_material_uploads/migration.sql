-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StudyMaterialType" ADD VALUE 'IMAGE';
ALTER TYPE "StudyMaterialType" ADD VALUE 'DOCUMENT';

-- AlterTable
ALTER TABLE "StudyMaterial" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT;
