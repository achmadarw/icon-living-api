ALTER TABLE "public"."households"
ADD COLUMN "iplPaymentTypeId" TEXT;

CREATE INDEX "households_iplPaymentTypeId_idx"
ON "public"."households"("iplPaymentTypeId");

ALTER TABLE "public"."households"
ADD CONSTRAINT "households_iplPaymentTypeId_fkey"
FOREIGN KEY ("iplPaymentTypeId")
REFERENCES "public"."payment_types"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
