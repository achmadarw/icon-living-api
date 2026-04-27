/*
  Warnings:

  - You are about to drop the column `period` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `payments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_transactionId_fkey";

-- DropIndex
DROP INDEX "payments_period_idx";

-- DropIndex
DROP INDEX "payments_transactionId_key";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "period",
DROP COLUMN "transactionId";

-- CreateTable
CREATE TABLE "payment_periods" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,

    CONSTRAINT "payment_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_periods_period_idx" ON "payment_periods"("period");

-- CreateIndex
CREATE UNIQUE INDEX "payment_periods_paymentId_period_key" ON "payment_periods"("paymentId", "period");

-- AddForeignKey
ALTER TABLE "payment_periods" ADD CONSTRAINT "payment_periods_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
