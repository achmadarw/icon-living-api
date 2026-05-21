ALTER TABLE "expenses"
ADD COLUMN "expenseDate" TIMESTAMP(3),
ADD COLUMN "paymentMethod" TEXT,
ADD COLUMN "recipient" TEXT,
ADD COLUMN "referenceNumber" TEXT;
