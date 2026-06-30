-- Speed up dashboard and cash-flow reads.
CREATE INDEX IF NOT EXISTS "users_isActive_idx" ON "users"("isActive");
CREATE INDEX IF NOT EXISTS "transactions_type_createdAt_idx" ON "transactions"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "transactions_referenceType_type_createdAt_idx" ON "transactions"("referenceType", "type", "createdAt");
