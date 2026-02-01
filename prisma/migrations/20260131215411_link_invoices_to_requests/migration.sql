-- AlterTable
ALTER TABLE "ProductInvoice" ADD COLUMN     "requestId" UUID;

-- CreateIndex
CREATE INDEX "ProductInvoice_requestId_idx" ON "ProductInvoice"("requestId");

-- AddForeignKey
ALTER TABLE "ProductInvoice" ADD CONSTRAINT "ProductInvoice_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;
