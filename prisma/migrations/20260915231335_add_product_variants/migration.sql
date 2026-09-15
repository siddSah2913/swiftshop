-- CreateTable
CREATE TABLE "ProductOptionGroup" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductOptionGroup_storeId_idx" ON "ProductOptionGroup"("storeId");

-- CreateIndex
CREATE INDEX "ProductOptionGroup_productId_idx" ON "ProductOptionGroup"("productId");

-- CreateIndex
CREATE INDEX "ProductOption_storeId_idx" ON "ProductOption"("storeId");

-- CreateIndex
CREATE INDEX "ProductOption_groupId_idx" ON "ProductOption"("groupId");

-- AddForeignKey
ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProductOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
