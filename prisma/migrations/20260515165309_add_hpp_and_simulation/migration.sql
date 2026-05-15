-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "totalCogs" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "totalCogs" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unitCogs" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "cogs" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CogsSimulation" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalCogs" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CogsSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CogsSimulationItem" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "usage" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CogsSimulationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CogsSimulation_outletId_idx" ON "CogsSimulation"("outletId");

-- AddForeignKey
ALTER TABLE "CogsSimulation" ADD CONSTRAINT "CogsSimulation_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CogsSimulationItem" ADD CONSTRAINT "CogsSimulationItem_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "CogsSimulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
