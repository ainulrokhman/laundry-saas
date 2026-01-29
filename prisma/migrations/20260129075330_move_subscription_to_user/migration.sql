/*
  Warnings:

  - You are about to drop the column `packageId` on the `Outlet` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionExpiresAt` on the `Outlet` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionStartedAt` on the `Outlet` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionTier` on the `Outlet` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Outlet" DROP CONSTRAINT "Outlet_packageId_fkey";

-- DropIndex
DROP INDEX "Outlet_packageId_idx";

-- DropIndex
DROP INDEX "Outlet_subscriptionExpiresAt_idx";

-- AlterTable
ALTER TABLE "Outlet" DROP COLUMN "packageId",
DROP COLUMN "subscriptionExpiresAt",
DROP COLUMN "subscriptionStartedAt",
DROP COLUMN "subscriptionTier";

-- AlterTable
ALTER TABLE "SubscriptionPackage" ADD COLUMN     "maxOutlets" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStartedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_packageId_idx" ON "User"("packageId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SubscriptionPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
