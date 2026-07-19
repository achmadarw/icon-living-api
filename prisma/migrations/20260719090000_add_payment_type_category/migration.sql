CREATE TYPE "PaymentTypeCategory" AS ENUM ('IPL', 'DONATION', 'OTHER');

ALTER TABLE "payment_types"
ADD COLUMN "category" "PaymentTypeCategory" NOT NULL DEFAULT 'IPL',
ADD COLUMN "requiresPeriod" BOOLEAN NOT NULL DEFAULT true;
