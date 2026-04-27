import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AUTH } from '@tia/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Payment Types ──────────────────────────────────
  const paymentTypes = await Promise.all([
    prisma.paymentType.upsert({
      where: { id: 'pt_ipl' },
      update: {},
      create: {
        id: 'pt_ipl',
        name: 'IPL',
        description: 'Iuran Pengelolaan Lingkungan - wajib bulanan',
        fixedAmount: 250000,
        isMandatory: true,
      },
    }),
    prisma.paymentType.upsert({
      where: { id: 'pt_parkir' },
      update: {},
      create: {
        id: 'pt_parkir',
        name: 'Parkir',
        description: 'Iuran parkir bulanan',
        fixedAmount: 50000,
        isMandatory: false,
      },
    }),
    prisma.paymentType.upsert({
      where: { id: 'pt_lainnya' },
      update: {},
      create: {
        id: 'pt_lainnya',
        name: 'Lainnya',
        description: 'Pembayaran lainnya - nominal bebas',
        fixedAmount: null,
        isMandatory: false,
      },
    }),
  ]);

  console.log(`✅ ${paymentTypes.length} payment types seeded`);

  // ─── Expense Categories ─────────────────────────────
  const expenseCategories = await Promise.all([
    prisma.expenseCategory.upsert({
      where: { id: 'ec_kebersihan' },
      update: {},
      create: {
        id: 'ec_kebersihan',
        name: 'Kebersihan',
        description: 'Biaya kebersihan lingkungan',
        requiresApproval: false,
      },
    }),
    prisma.expenseCategory.upsert({
      where: { id: 'ec_gaji_satpam' },
      update: {},
      create: {
        id: 'ec_gaji_satpam',
        name: 'Gaji Satpam',
        description: 'Gaji petugas keamanan',
        requiresApproval: false,
      },
    }),
    prisma.expenseCategory.upsert({
      where: { id: 'ec_listrik_fasum' },
      update: {},
      create: {
        id: 'ec_listrik_fasum',
        name: 'Listrik Fasum',
        description: 'Biaya listrik fasilitas umum',
        requiresApproval: false,
      },
    }),
    prisma.expenseCategory.upsert({
      where: { id: 'ec_air_fasum' },
      update: {},
      create: {
        id: 'ec_air_fasum',
        name: 'Air Fasum',
        description: 'Biaya air fasilitas umum',
        requiresApproval: true,
      },
    }),
    prisma.expenseCategory.upsert({
      where: { id: 'ec_perbaikan' },
      update: {},
      create: {
        id: 'ec_perbaikan',
        name: 'Perbaikan Fasilitas',
        description: 'Biaya perbaikan dan pemeliharaan fasilitas',
        requiresApproval: true,
      },
    }),
    prisma.expenseCategory.upsert({
      where: { id: 'ec_keamanan' },
      update: {},
      create: {
        id: 'ec_keamanan',
        name: 'Keamanan',
        description: 'Biaya peralatan keamanan',
        requiresApproval: true,
      },
    }),
    prisma.expenseCategory.upsert({
      where: { id: 'ec_kegiatan' },
      update: {},
      create: {
        id: 'ec_kegiatan',
        name: 'Kegiatan Warga',
        description: 'Biaya kegiatan dan acara warga',
        requiresApproval: true,
      },
    }),
    prisma.expenseCategory.upsert({
      where: { id: 'ec_lainnya' },
      update: {},
      create: {
        id: 'ec_lainnya',
        name: 'Lainnya',
        description: 'Pengeluaran lainnya',
        requiresApproval: true,
      },
    }),
  ]);

  console.log(`✅ ${expenseCategories.length} expense categories seeded`);

  // ─── Users ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', AUTH.BCRYPT_ROUNDS);
  const wargaHash = await bcrypt.hash('warga123', AUTH.BCRYPT_ROUNDS);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { username: 'ketua' },
      update: {},
      create: {
        name: 'Pak Ketua',
        username: 'ketua',
        passwordHash,
        role: 'KETUA',
        phone: '081234567890',
        unitNumber: 'A-01',
        address: 'Blok A No. 1',
      },
    }),
    prisma.user.upsert({
      where: { username: 'bendahara' },
      update: {},
      create: {
        name: 'Bu Bendahara',
        username: 'bendahara',
        passwordHash,
        role: 'BENDAHARA',
        phone: '081234567891',
        unitNumber: 'A-02',
        address: 'Blok A No. 2',
      },
    }),
    prisma.user.upsert({
      where: { username: 'warga1' },
      update: {},
      create: {
        name: 'Budi Santoso',
        username: 'warga1',
        passwordHash: wargaHash,
        role: 'WARGA',
        phone: '081234567892',
        unitNumber: 'B-01',
        address: 'Blok B No. 1',
      },
    }),
    prisma.user.upsert({
      where: { username: 'warga2' },
      update: {},
      create: {
        name: 'Sari Wulandari',
        username: 'warga2',
        passwordHash: wargaHash,
        role: 'WARGA',
        phone: '081234567893',
        unitNumber: 'B-02',
        address: 'Blok B No. 2',
      },
    }),
  ]);

  console.log(`✅ ${users.length} users seeded`);
  console.log('');
  console.log('📋 Login credentials:');
  console.log('   ketua     / admin123  (KETUA)');
  console.log('   bendahara / admin123  (BENDAHARA)');
  console.log('   warga1    / warga123  (WARGA)');
  console.log('   warga2    / warga123  (WARGA)');
  console.log('');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
