-- CreateTable
CREATE TABLE "arrears_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "warningTemplateId" TEXT,
    "suspensionTemplateId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arrears_settings_pkey" PRIMARY KEY ("id")
);
