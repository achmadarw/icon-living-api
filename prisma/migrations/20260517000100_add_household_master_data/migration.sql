-- Enums
CREATE TYPE "OccupancyStatus" AS ENUM ('PEMILIK', 'KONTRAK', 'KELUARGA', 'LAINNYA');
CREATE TYPE "HomeCurrentStatus" AS ENUM ('DIHUNI', 'KOSONG', 'DISEWAKAN', 'RENOVASI', 'LAINNYA');
CREATE TYPE "VehicleType" AS ENUM ('MOBIL', 'MOTOR', 'SEPEDA', 'LAINNYA');
CREATE TYPE "HouseholdStaffRole" AS ENUM ('ART', 'SOPIR', 'LAINNYA');

-- Households
CREATE TABLE "households" (
  "id" TEXT NOT NULL,
  "unitNumber" TEXT NOT NULL,
  "occupancyStatus" "OccupancyStatus",
  "occupancyNote" TEXT,
  "homeCurrentStatus" "HomeCurrentStatus",
  "homeStatusNote" TEXT,
  "residentCount" INTEGER,
  "emergencyContact" TEXT,
  "hobbies" TEXT,
  "consentGiven" BOOLEAN,
  "formSubmittedAt" TIMESTAMP(3),
  "sourceRaw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "households_unitNumber_key" ON "households"("unitNumber");

-- Household members
CREATE TABLE "household_members" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "name" TEXT,
  "age" INTEGER,
  "relationLabel" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "rawText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "household_members_householdId_idx" ON "household_members"("householdId");

-- Household vehicles
CREATE TABLE "household_vehicles" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "type" "VehicleType" NOT NULL DEFAULT 'LAINNYA',
  "plateNumber" TEXT,
  "color" TEXT,
  "description" TEXT,
  "rawText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "household_vehicles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "household_vehicles_householdId_idx" ON "household_vehicles"("householdId");

-- Household staff
CREATE TABLE "household_staff" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "name" TEXT,
  "role" "HouseholdStaffRole" NOT NULL DEFAULT 'LAINNYA',
  "isLiveIn" BOOLEAN,
  "description" TEXT,
  "rawText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "household_staff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "household_staff_householdId_idx" ON "household_staff"("householdId");

-- Household emergency contacts
CREATE TABLE "household_emergency_contacts" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT,
  "relation" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 1,
  "rawText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "household_emergency_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "household_emergency_contacts_householdId_idx" ON "household_emergency_contacts"("householdId");

-- Household hobbies
CREATE TABLE "household_hobbies" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "hobbyText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "household_hobbies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "household_hobbies_householdId_idx" ON "household_hobbies"("householdId");

-- Users relation
ALTER TABLE "users" ADD COLUMN "householdId" TEXT;

ALTER TABLE "users"
  ADD CONSTRAINT "users_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "households"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- FKs for household detail tables
ALTER TABLE "household_members"
  ADD CONSTRAINT "household_members_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "households"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "household_vehicles"
  ADD CONSTRAINT "household_vehicles_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "households"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "household_staff"
  ADD CONSTRAINT "household_staff_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "households"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "household_emergency_contacts"
  ADD CONSTRAINT "household_emergency_contacts_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "households"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "household_hobbies"
  ADD CONSTRAINT "household_hobbies_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "households"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
