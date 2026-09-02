-- CreateTable
CREATE TABLE "SocialProfileView" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userAgent" TEXT,
    "referrer" TEXT,
    "country" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialProfileView_profileId_idx" ON "SocialProfileView"("profileId");

-- CreateIndex
CREATE INDEX "SocialProfileView_createdAt_idx" ON "SocialProfileView"("createdAt");

-- AddForeignKey
ALTER TABLE "SocialProfileView" ADD CONSTRAINT "SocialProfileView_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SocialProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
