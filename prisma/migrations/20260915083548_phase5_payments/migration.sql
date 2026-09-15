-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentRef" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "paymentEsewa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentKhalti" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requirePayToDeliver" BOOLEAN NOT NULL DEFAULT false;
