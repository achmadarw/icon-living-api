ALTER TABLE "transactions"
ADD COLUMN "ledgerOrder" BIGSERIAL;

CREATE UNIQUE INDEX "transactions_ledgerOrder_key"
ON "transactions"("ledgerOrder");
