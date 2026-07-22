-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ARREARS_WARNING';
ALTER TYPE "NotificationType" ADD VALUE 'WASTE_SUSPENSION_WARNING';
ALTER TYPE "NotificationType" ADD VALUE 'WASTE_SERVICE_RESTORED';

-- CreateTable
CREATE TABLE "waste_suspensions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "unitNumber" TEXT,
    "startPeriod" TEXT NOT NULL,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "liftedAt" TIMESTAMP(3),
    "liftedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waste_suspensions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waste_suspensions_isActive_idx" ON "waste_suspensions"("isActive");

-- CreateIndex
CREATE INDEX "waste_suspensions_userId_idx" ON "waste_suspensions"("userId");

-- CreateTable
CREATE TABLE "arrears_reminder_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arrears_reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "arrears_reminder_logs_userId_period_level_key" ON "arrears_reminder_logs"("userId", "period", "level");

-- CreateIndex
CREATE INDEX "arrears_reminder_logs_period_idx" ON "arrears_reminder_logs"("period");
