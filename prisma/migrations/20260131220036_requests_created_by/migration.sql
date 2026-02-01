/*
  Warnings:

  - Added the required column `createdByUserId` to the `Request` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "createdByUserId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "Request_createdByUserId_idx" ON "Request"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
