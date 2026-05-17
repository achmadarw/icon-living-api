ALTER TABLE "users"
  ADD COLUMN "isActivated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "activatedAt" TIMESTAMP(3);

CREATE TABLE "account_activation_otps" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "unitNumber" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "resendCount" INTEGER NOT NULL DEFAULT 0,
  "cooldownUntil" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "activationTokenHash" TEXT,
  "activationTokenExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "account_activation_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "account_activation_otps_userId_unitNumber_idx"
  ON "account_activation_otps"("userId", "unitNumber");
CREATE INDEX "account_activation_otps_unitNumber_consumedAt_expiresAt_idx"
  ON "account_activation_otps"("unitNumber", "consumedAt", "expiresAt");

ALTER TABLE "account_activation_otps"
  ADD CONSTRAINT "account_activation_otps_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
