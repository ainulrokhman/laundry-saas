-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStartedAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionTier" TEXT DEFAULT 'FREE';

-- CreateIndex
CREATE INDEX "Outlet_subscriptionExpiresAt_idx" ON "Outlet"("subscriptionExpiresAt");
