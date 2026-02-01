-- CreateEnum
CREATE TYPE "StorageKind" AS ENUM ('INVOICE', 'REQUEST', 'DOCUMENT', 'OTHER');

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" UUID NOT NULL,
    "kind" "StorageKind" NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "invoiceId" UUID,
    "requestId" UUID,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoredFile_userId_idx" ON "StoredFile"("userId");

-- CreateIndex
CREATE INDEX "StoredFile_kind_idx" ON "StoredFile"("kind");

-- CreateIndex
CREATE INDEX "StoredFile_invoiceId_idx" ON "StoredFile"("invoiceId");

-- CreateIndex
CREATE INDEX "StoredFile_requestId_idx" ON "StoredFile"("requestId");

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ProductInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
