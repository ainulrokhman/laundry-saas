-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN     "packageId" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "features" JSONB NOT NULL,
    "maxStaff" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPackage_slug_key" ON "SubscriptionPackage"("slug");

-- CreateIndex
CREATE INDEX "SubscriptionPackage_slug_idx" ON "SubscriptionPackage"("slug");

-- CreateIndex
CREATE INDEX "SubscriptionPackage_isActive_idx" ON "SubscriptionPackage"("isActive");

-- CreateIndex
CREATE INDEX "SubscriptionPackage_sortOrder_idx" ON "SubscriptionPackage"("sortOrder");

-- CreateIndex
CREATE INDEX "Outlet_packageId_idx" ON "Outlet"("packageId");

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SubscriptionPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
