-- CreateTable
CREATE TABLE "whatsapp_deliveries" (
    "id" TEXT NOT NULL,
    "fonnteId" TEXT,
    "stateId" TEXT,
    "target" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "unitNumber" TEXT,
    "source" TEXT NOT NULL,
    "batchId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "fonnteStatus" TEXT,
    "fonnteState" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_deliveries_batchId_idx" ON "whatsapp_deliveries"("batchId");

-- CreateIndex
CREATE INDEX "whatsapp_deliveries_fonnteId_idx" ON "whatsapp_deliveries"("fonnteId");

-- CreateIndex
CREATE INDEX "whatsapp_deliveries_source_createdAt_idx" ON "whatsapp_deliveries"("source", "createdAt");
