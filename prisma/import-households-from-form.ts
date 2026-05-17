import fs from 'node:fs';
import path from 'node:path';
import { Prisma, PrismaClient, HomeCurrentStatus, HouseholdStaffRole, OccupancyStatus, VehicleType } from '@prisma/client';
import * as XLSX from 'xlsx';

type InputRow = Record<string, unknown>;

const prisma = new PrismaClient();

function asText(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeUnitNumber(raw: string): string {
  const upper = raw.toUpperCase().replace(/\s+/g, '');
  const parts = upper.match(/^([A-Z]{1,3})-?(\d{1,3})([A-Z]?)$/);
  if (!parts) return upper;

  const block = parts[1];
  const num = parts[2].padStart(2, '0');
  const suffix = parts[3] ?? '';
  return `${block}-${num}${suffix}`;
}

function legacyUnitNumber(raw: string): string {
  return raw.replace(/-/g, '');
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function splitLooseList(raw: string): string[] {
  return raw
    .split(/\r?\n|,|;|\||\/(?!\d)/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  return digits.length >= 8 ? digits : null;
}

function mapOccupancyStatus(raw: string): { value: OccupancyStatus | null; note: string | null } {
  const t = raw.toLowerCase();
  if (!t) return { value: null, note: null };
  if (t.includes('pemilik')) return { value: 'PEMILIK', note: null };
  if (t.includes('kontrak') || t.includes('sewa')) return { value: 'KONTRAK', note: null };
  if (t.includes('keluarga')) return { value: 'KELUARGA', note: null };
  return { value: 'LAINNYA', note: raw };
}

function mapHomeCurrentStatus(raw: string): { value: HomeCurrentStatus | null; note: string | null } {
  const t = raw.toLowerCase();
  if (!t) return { value: null, note: null };
  if (t.includes('dihuni')) return { value: 'DIHUNI', note: null };
  if (t.includes('kosong')) return { value: 'KOSONG', note: null };
  if (t.includes('sewa')) return { value: 'DISEWAKAN', note: null };
  if (t.includes('renov')) return { value: 'RENOVASI', note: null };
  return { value: 'LAINNYA', note: raw };
}

function mapVehicleType(raw: string): VehicleType {
  const t = raw.toLowerCase();
  if (t.includes('mobil') || /\bcar\b/.test(t)) return 'MOBIL';
  if (t.includes('motor')) return 'MOTOR';
  if (t.includes('sepeda') || t.includes('bike')) return 'SEPEDA';
  return 'LAINNYA';
}

function parseMemberLine(raw: string): { name: string | null; age: number | null; relationLabel: string | null } {
  const compact = raw.replace(/\s+/g, ' ').trim();
  const ageMatch = compact.match(/usia\s*[:\-]?\s*(\d{1,3})/i) ?? compact.match(/\b(\d{1,3})\s*(th|tahun)\b/i);
  const age = ageMatch ? Number(ageMatch[1]) : null;

  let name: string | null = null;
  const nameMatch = compact.match(/nama\s*[:\-]?\s*([A-Za-z .,'-]+)/i);
  if (nameMatch?.[1]) name = nameMatch[1].trim();
  if (!name) {
    const cleaned = compact.replace(/^(suami|istri|anak\s*\d*|ayah|ibu|ortu|orang tua)\s*[:\-]?\s*/i, '').trim();
    if (cleaned && !/^(suami|istri|anak)$/i.test(cleaned)) name = cleaned;
  }

  let relationLabel: string | null = null;
  const relationMatch = compact.match(/sebutan\s*[:\-]?\s*([A-Za-z0-9 .,'-]+)/i);
  if (relationMatch?.[1]) relationLabel = relationMatch[1].trim();
  if (!relationLabel) {
    const relPrefix = compact.match(/^(suami|istri|anak\s*\d*|ayah|ibu|ortu|orang tua)\b/i);
    if (relPrefix?.[1]) relationLabel = relPrefix[1].trim();
  }

  return { name, age, relationLabel };
}

function parseEmergencyContacts(raw: string): Array<{ name: string | null; phone: string | null; rawText: string }> {
  const items = splitLooseList(raw);
  if (items.length === 0 && raw.trim()) items.push(raw.trim());

  return items.map((item) => {
    const phoneMatch = item.match(/(\+?\d[\d\s-]{7,}\d)/);
    const phone = phoneMatch ? normalizePhone(phoneMatch[1]) : null;
    const name = item
      .replace(/(\+?\d[\d\s-]{7,}\d)/g, '')
      .replace(/[:.\-]/g, ' ')
      .trim() || null;
    return { name, phone, rawText: item };
  });
}

function parseStaff(raw: string): Array<{ name: string | null; role: HouseholdStaffRole; rawText: string }> {
  const items = splitLooseList(raw);
  if (items.length === 0 && raw.trim()) items.push(raw.trim());
  return items.map((item) => {
    const t = item.toLowerCase();
    const role = t.includes('sopir') ? 'SOPIR' : t.includes('art') ? 'ART' : 'LAINNYA';
    const name = item.replace(/\((.*?)\)/g, '').replace(/(art|sopir)/gi, '').trim() || null;
    return { name, role, rawText: item };
  });
}

async function main() {
  const excelPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, '../../../docs/Formulir tanpa judul (Jawaban).xlsx');

  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  const workbook = XLSX.readFile(excelPath);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<InputRow>(firstSheet, { defval: '' });

  let processed = 0;
  for (const row of rows) {
    const submittedAtRaw = row['Timestamp'];
    const kepalaKeluarga = asText(row['Nama Kepala Keluarga / Penghuni Utama']);
    const phone = asText(row['Nomor HP Whatsapp Aktif yang bisa dihubungi']);
    const unitNumber = normalizeUnitNumber(asText(row['Blok / Nomor Rumah']));
    const occupancyRaw = asText(row['Status Hunian']);
    const homeStatusRaw = asText(row['Status Rumah Saat Ini']);
    const residentCountRaw = asText(row['Jumlah Penghuni di Rumah']);
    const membersRaw = asText(row['Tuliskan daftar penghuni rumah (Nama – Usia – Sebutan) ']);
    const membersRaw2 = asText(row['Tuliskan daftar penghuni rumah (Nama – Usia – Sebutan)  [Baris 2]']);
    const membersRaw3 = asText(row['Tuliskan daftar penghuni rumah (Nama – Usia – Sebutan)  [Baris 3]']);
    const membersRaw4 = asText(row['Tuliskan daftar penghuni rumah (Nama – Usia – Sebutan)  [Baris 4]']);
    const vehiclesRaw = asText(row['Kendaraan yang dimiliki']);
    const hasStaffRaw = asText(row['Apakah memiliki asisten rumah tangga / sopir yang rutin di rumah?']);
    const staffRaw = asText(row['Nama panggilan & peran']);
    const emergencyRaw = asText(row['Kontak darurat (nama & nomor HP)']);
    const hobbiesRaw = asText(row[' Minat / Hobi']);
    const consentRaw = asText(
      row['Saya memahami bahwa data ini digunakan terbatas untuk kepentingan administrasi, keamanan, dan kegiatan lingkungan, serta tidak disebarluaskan tanpa izin.'],
    );

    if (!unitNumber) continue;

    const occupancy = mapOccupancyStatus(occupancyRaw);
    const homeStatus = mapHomeCurrentStatus(homeStatusRaw);
    const residentCount = Number.parseInt(residentCountRaw, 10);
    const submittedAt = submittedAtRaw ? new Date(asText(submittedAtRaw)) : null;
    const consentGiven = consentRaw.toLowerCase().includes('setuju');

    const household = await prisma.household.upsert({
      where: { unitNumber },
      update: {
        occupancyStatus: occupancy.value ?? undefined,
        occupancyNote: occupancy.note,
        homeCurrentStatus: homeStatus.value ?? undefined,
        homeStatusNote: homeStatus.note,
        residentCount: Number.isFinite(residentCount) ? residentCount : null,
        emergencyContact: emergencyRaw || null,
        hobbies: hobbiesRaw || null,
        consentGiven,
        formSubmittedAt: submittedAt && !Number.isNaN(submittedAt.getTime()) ? submittedAt : null,
        sourceRaw: toJsonValue(row),
      },
      create: {
        unitNumber,
        occupancyStatus: occupancy.value ?? undefined,
        occupancyNote: occupancy.note,
        homeCurrentStatus: homeStatus.value ?? undefined,
        homeStatusNote: homeStatus.note,
        residentCount: Number.isFinite(residentCount) ? residentCount : null,
        emergencyContact: emergencyRaw || null,
        hobbies: hobbiesRaw || null,
        consentGiven,
        formSubmittedAt: submittedAt && !Number.isNaN(submittedAt.getTime()) ? submittedAt : null,
        sourceRaw: toJsonValue(row),
      },
    });

    await prisma.user.updateMany({
      where: {
        OR: [
          { unitNumber },
          { unitNumber: legacyUnitNumber(unitNumber) },
          ...(phone ? [{ phone }] : []),
        ],
      },
      data: { householdId: household.id },
    });

    await prisma.householdMember.deleteMany({ where: { householdId: household.id } });
    await prisma.householdVehicle.deleteMany({ where: { householdId: household.id } });
    await prisma.householdStaff.deleteMany({ where: { householdId: household.id } });
    await prisma.householdEmergencyContact.deleteMany({ where: { householdId: household.id } });
    await prisma.householdHobby.deleteMany({ where: { householdId: household.id } });

    await prisma.householdMember.create({
      data: {
        householdId: household.id,
        name: kepalaKeluarga || null,
        relationLabel: 'Kepala Keluarga',
        isPrimary: true,
        rawText: kepalaKeluarga || null,
      },
    });

    const memberLines = [membersRaw, membersRaw2, membersRaw3, membersRaw4]
      .filter(Boolean)
      .flatMap((raw) => raw.split(/\r?\n/))
      .map((s) => s.trim())
      .filter(Boolean);

    for (const line of memberLines) {
      const parsed = parseMemberLine(line);
      await prisma.householdMember.create({
        data: {
          householdId: household.id,
          name: parsed.name,
          age: parsed.age,
          relationLabel: parsed.relationLabel,
          rawText: line,
        },
      });
    }

    const vehicles = splitLooseList(vehiclesRaw);
    for (const item of vehicles) {
      await prisma.householdVehicle.create({
        data: {
          householdId: household.id,
          type: mapVehicleType(item),
          description: item,
          rawText: item,
        },
      });
    }

    const hasStaff = hasStaffRaw.toLowerCase().includes('ada');
    if (hasStaff && staffRaw && !staffRaw.toLowerCase().includes('tidak ada') && !staffRaw.toLowerCase().includes('belum')) {
      for (const item of parseStaff(staffRaw)) {
        await prisma.householdStaff.create({
          data: {
            householdId: household.id,
            name: item.name,
            role: item.role,
            description: item.rawText,
            rawText: item.rawText,
          },
        });
      }
    }

    for (const contact of parseEmergencyContacts(emergencyRaw)) {
      await prisma.householdEmergencyContact.create({
        data: {
          householdId: household.id,
          name: contact.name,
          phone: contact.phone,
          rawText: contact.rawText,
        },
      });
    }

    for (const hobby of splitLooseList(hobbiesRaw)) {
      await prisma.householdHobby.create({
        data: {
          householdId: household.id,
          hobbyText: hobby,
        },
      });
    }

    processed += 1;
  }

  console.log(`Import completed. Processed households: ${processed}`);
}

main()
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
