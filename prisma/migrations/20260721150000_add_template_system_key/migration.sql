-- AlterTable
ALTER TABLE "message_templates" ADD COLUMN "systemKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_systemKey_key" ON "message_templates"("systemKey");
