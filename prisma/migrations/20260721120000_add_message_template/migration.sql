-- CreateEnum
CREATE TYPE "MessageTemplateCategory" AS ENUM ('PENGUMUMAN', 'TAGIHAN', 'UPDATE_APLIKASI', 'ACARA', 'LAINNYA');

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MessageTemplateCategory" NOT NULL DEFAULT 'PENGUMUMAN',
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_templates_category_idx" ON "message_templates"("category");
