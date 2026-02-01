-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('SERVICOS', 'ARMAZEM', 'OUTROS');

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "deliveryLocation" TEXT,
ADD COLUMN     "deliveryLocationId" TEXT,
ADD COLUMN     "deliveryWindowFrom" TIMESTAMP(3),
ADD COLUMN     "deliveryWindowTo" TIMESTAMP(3),
ADD COLUMN     "requestNumber" SERIAL NOT NULL,
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "requesterNameSnapshot" TEXT,
ADD COLUMN     "serviceId" TEXT,
ADD COLUMN     "serviceName" TEXT,
ADD COLUMN     "type" "RequestType" NOT NULL DEFAULT 'OUTROS';

-- AlterTable
ALTER TABLE "RequestItem" ADD COLUMN     "itemDescSnapshot" TEXT,
ADD COLUMN     "itemNameSnapshot" TEXT,
ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "RequestSupplier" (
    "id" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" UUID NOT NULL,
    "supplierId" UUID,
    "supplierName" TEXT,
    "price" DOUBLE PRECISION,
    "leadTimeDays" INTEGER,

    CONSTRAINT "RequestSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestSupplier_requestId_idx" ON "RequestSupplier"("requestId");

-- CreateIndex
CREATE INDEX "RequestSupplier_supplierId_idx" ON "RequestSupplier"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestSupplier_requestId_order_key" ON "RequestSupplier"("requestId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Request_requestNumber_key" ON "Request"("requestNumber");

-- AddForeignKey
ALTER TABLE "RequestSupplier" ADD CONSTRAINT "RequestSupplier_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestSupplier" ADD CONSTRAINT "RequestSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

