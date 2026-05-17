import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

function usernameFromUnit(unitNumber: string): string {
  return unitNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function nextUniqueUsername(base: string): Promise<string> {
  let candidate = base;
  let index = 2;
  while (true) {
    const exists = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!exists) return candidate;
    candidate = `${base}_${index}`;
    index += 1;
  }
}

function sanitizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.replace(/[^\d+]/g, '');
  return v.length >= 8 ? v : null;
}

async function main() {
  const tempPassword = process.env.TEMP_USER_PASSWORD ?? 'Warga@12345';
  const defaultRole = (process.env.DEFAULT_USER_ROLE as Role | undefined) ?? 'WARGA';
  const activateUser = process.env.ACTIVATE_USER === 'true';
  const rounds = Number.parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);
  const passwordHash = await bcrypt.hash(tempPassword, Number.isFinite(rounds) ? rounds : 10);

  const households = await prisma.household.findMany({
    include: {
      members: true,
      emergencyContacts: true,
      users: true,
    },
    orderBy: { unitNumber: 'asc' },
  });

  const createdRows: string[] = ['unit_number,name,username,temp_password,phone,status'];
  let createdCount = 0;
  let skippedCount = 0;

  for (const household of households) {
    const existing = household.users.find((u) => u.role === 'WARGA') ?? household.users[0];
    if (existing) {
      skippedCount += 1;
      createdRows.push(`${household.unitNumber},"${existing.name}",${existing.username},,${existing.phone ?? ''},SKIPPED_EXISTING`);
      continue;
    }

    const primary = household.members.find((m) => m.isPrimary) ?? household.members[0];
    const name = (primary?.name?.trim() || household.unitNumber).replace(/"/g, '""');
    const baseUsername = usernameFromUnit(household.unitNumber);
    const username = await nextUniqueUsername(baseUsername);
    const phone = sanitizePhone(household.emergencyContacts[0]?.phone ?? null);

    await prisma.user.create({
      data: {
        name: name || household.unitNumber,
        username,
        passwordHash,
        role: defaultRole,
        phone,
        unitNumber: household.unitNumber,
        address: household.unitNumber,
        isActive: activateUser,
        householdId: household.id,
      },
    });

    createdCount += 1;
    createdRows.push(`${household.unitNumber},"${name}",${username},${tempPassword},${phone ?? ''},CREATED`);
  }

  const outDir = path.resolve(__dirname, '../../docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'household-user-seed-result.csv');
  fs.writeFileSync(outPath, createdRows.join('\n'), 'utf8');

  console.log(`Users created: ${createdCount}`);
  console.log(`Users skipped (already exist): ${skippedCount}`);
  console.log(`Report: ${outPath}`);
  console.log(`Temporary password used: ${tempPassword}`);
}

main()
  .catch((error) => {
    console.error('Create users failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
