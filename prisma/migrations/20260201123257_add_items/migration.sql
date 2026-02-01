-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('EQUIPAMENTO', 'FERRAMENTA', 'MATERIAL', 'OUTROS');

-- CreateTable
CREATE TABLE "Item" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "type" "ItemType" NOT NULL DEFAULT 'OUTROS',
    "descriptionLines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minStock" BIGINT NOT NULL DEFAULT 0,
    "initialStock" BIGINT NOT NULL DEFAULT 0,
    "stock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_userId_idx" ON "Item"("userId");

-- CreateIndex
CREATE INDEX "Item_internalCode_idx" ON "Item"("internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Item_userId_internalCode_key" ON "Item"("userId", "internalCode");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

