-- AlterTable
ALTER TABLE "SubscriptionPackage" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "SubscriptionPackage_isDefault_idx" ON "SubscriptionPackage"("isDefault");
