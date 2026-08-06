-- Modul Keamanan / Roster Satpam (aditif, tidak menyentuh tabel lama)

-- CreateTable
CREATE TABLE "security_personnel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_shifts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_patterns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "patternData" INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roster_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_assignments" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "assignmentMonth" TEXT NOT NULL,
    "assignedById" TEXT,
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roster_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_shift_assignments" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "assignmentDate" TEXT NOT NULL,
    "isReplacement" BOOLEAN NOT NULL DEFAULT false,
    "replacedPersonnelId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_day_overrides" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "overrideDate" TEXT NOT NULL,
    "shiftId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roster_day_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_auto_assign_snapshots" (
    "id" TEXT NOT NULL,
    "assignmentMonth" TEXT NOT NULL,
    "rosterAssignments" JSONB NOT NULL DEFAULT '[]',
    "shiftAssignments" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restoredAt" TIMESTAMP(3),
    "restoredById" TEXT,

    CONSTRAINT "roster_auto_assign_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_personnel_isActive_idx" ON "security_personnel"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "security_shifts_code_key" ON "security_shifts"("code");

-- CreateIndex
CREATE INDEX "security_shifts_isActive_idx" ON "security_shifts"("isActive");

-- CreateIndex
CREATE INDEX "roster_patterns_isActive_idx" ON "roster_patterns"("isActive");

-- CreateIndex
CREATE INDEX "roster_assignments_assignmentMonth_idx" ON "roster_assignments"("assignmentMonth");

-- CreateIndex
CREATE UNIQUE INDEX "roster_assignments_personnelId_assignmentMonth_key" ON "roster_assignments"("personnelId", "assignmentMonth");

-- CreateIndex
CREATE INDEX "security_shift_assignments_assignmentDate_idx" ON "security_shift_assignments"("assignmentDate");

-- CreateIndex
CREATE INDEX "security_shift_assignments_personnelId_assignmentDate_idx" ON "security_shift_assignments"("personnelId", "assignmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "security_shift_assignments_personnelId_assignmentDate_shiftI_key" ON "security_shift_assignments"("personnelId", "assignmentDate", "shiftId");

-- CreateIndex
CREATE INDEX "roster_day_overrides_overrideDate_idx" ON "roster_day_overrides"("overrideDate");

-- CreateIndex
CREATE UNIQUE INDEX "roster_day_overrides_personnelId_overrideDate_key" ON "roster_day_overrides"("personnelId", "overrideDate");

-- CreateIndex
CREATE INDEX "roster_auto_assign_snapshots_assignmentMonth_idx" ON "roster_auto_assign_snapshots"("assignmentMonth");

-- CreateIndex
CREATE INDEX "roster_auto_assign_snapshots_assignmentMonth_restoredAt_crea_idx" ON "roster_auto_assign_snapshots"("assignmentMonth", "restoredAt", "createdAt");

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "security_personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "roster_patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_shift_assignments" ADD CONSTRAINT "security_shift_assignments_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "security_personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_shift_assignments" ADD CONSTRAINT "security_shift_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "security_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_day_overrides" ADD CONSTRAINT "roster_day_overrides_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "security_personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_day_overrides" ADD CONSTRAINT "roster_day_overrides_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "security_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed 3 shift standar (sama seperti TIA: Pagi/Siang/Malam)
INSERT INTO "security_shifts" ("id", "name", "code", "startTime", "endTime", "color", "description", "isActive", "createdAt", "updatedAt")
VALUES
    ('seed_shift_1', 'Shift 1 (Pagi)',  '1', '07:00', '16:00', '#3b82f6', 'Shift pagi 07:00 - 16:00',  true, NOW(), NOW()),
    ('seed_shift_2', 'Shift 2 (Siang)', '2', '15:00', '00:00', '#f59e0b', 'Shift siang 15:00 - 24:00', true, NOW(), NOW()),
    ('seed_shift_3', 'Shift 3 (Malam)', '3', '23:00', '07:00', '#6366f1', 'Shift malam 23:00 - 07:00', true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
