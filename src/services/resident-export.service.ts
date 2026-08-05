import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma';

// Cakupan data yang bisa diekspor.
export type ExportScope = 'warga' | 'household' | 'members' | 'vehicles' | 'staff' | 'contacts';
export const ALL_SCOPES: ExportScope[] = ['warga', 'household', 'members', 'vehicles', 'staff', 'contacts'];

const SCOPE_TITLE: Record<ExportScope, string> = {
  warga: 'Data Warga',
  household: 'Rumah Tangga',
  members: 'Anggota Keluarga',
  vehicles: 'Kendaraan',
  staff: 'Asisten & Staf',
  contacts: 'Kontak Darurat',
};

const OCCUPANCY_LABEL: Record<string, string> = {
  PEMILIK: 'Pemilik', KONTRAK: 'Kontrak/Sewa', KELUARGA: 'Keluarga pemilik', LAINNYA: 'Lainnya',
};
const HOME_LABEL: Record<string, string> = {
  DIHUNI: 'Dihuni', KOSONG: 'Kosong', DISEWAKAN: 'Disewakan', RENOVASI: 'Renovasi', LAINNYA: 'Lainnya',
};
const VEHICLE_LABEL: Record<string, string> = {
  MOBIL: 'Mobil', MOTOR: 'Motor', SEPEDA: 'Sepeda', LAINNYA: 'Lainnya',
};
const STAFF_LABEL: Record<string, string> = {
  ART: 'ART', SOPIR: 'Sopir', LAINNYA: 'Lainnya',
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
}

// Satu tabel siap-render: judul, header kolom, dan baris.
interface Section {
  scope: ExportScope;
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export class ResidentExportService {
  /** Kumpulkan seksi-seksi data sesuai scope yang diminta. */
  async buildSections(scopes: ExportScope[]): Promise<Section[]> {
    const wanted = scopes.length > 0 ? scopes : ALL_SCOPES;
    const sections: Section[] = [];

    // Daftar warga (identitas) — selalu berguna sebagai acuan unit.
    if (wanted.includes('warga')) {
      const users = await prisma.user.findMany({
        select: { name: true, username: true, phone: true, role: true, isActive: true, address: true, unitNumber: true, createdAt: true },
        orderBy: [{ unitNumber: 'asc' }, { name: 'asc' }],
      });
      sections.push({
        scope: 'warga',
        title: SCOPE_TITLE.warga,
        headers: ['No', 'Unit', 'Nama', 'Username', 'Telepon', 'Role', 'Status', 'Alamat', 'Terdaftar'],
        rows: users.map((u, i) => [
          i + 1, u.unitNumber ?? '-', u.name, u.username, u.phone ?? '-', u.role,
          u.isActive ? 'Aktif' : 'Nonaktif', u.address ?? '-', fmtDate(u.createdAt),
        ]),
      });
    }

    // Seksi berbasis household.
    const needHousehold = (['household', 'members', 'vehicles', 'staff', 'contacts'] as ExportScope[]).some((s) => wanted.includes(s));
    if (needHousehold) {
      const households = await prisma.household.findMany({
        select: {
          unitNumber: true,
          occupancyStatus: true, occupancyNote: true,
          homeCurrentStatus: true, homeStatusNote: true,
          residentCount: true, emergencyContact: true, hobbies: true,
          members: { select: { name: true, age: true, relationLabel: true, isPrimary: true, notes: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
          vehicles: { select: { type: true, plateNumber: true, color: true, description: true }, orderBy: { createdAt: 'asc' } },
          staff: { select: { name: true, role: true, isLiveIn: true, description: true }, orderBy: { createdAt: 'asc' } },
          emergencyContacts: { select: { name: true, phone: true, relation: true, priority: true }, orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] },
        },
        orderBy: { unitNumber: 'asc' },
      });

      if (wanted.includes('household')) {
        sections.push({
          scope: 'household',
          title: SCOPE_TITLE.household,
          headers: ['No', 'Unit', 'Status Kepemilikan', 'Status Hunian', 'Jumlah Penghuni', 'Catatan Kepemilikan', 'Catatan Hunian'],
          rows: households.map((h, i) => [
            i + 1, h.unitNumber,
            h.occupancyStatus ? (OCCUPANCY_LABEL[h.occupancyStatus] ?? h.occupancyStatus) : '-',
            h.homeCurrentStatus ? (HOME_LABEL[h.homeCurrentStatus] ?? h.homeCurrentStatus) : '-',
            h.residentCount ?? '-', h.occupancyNote ?? '-', h.homeStatusNote ?? '-',
          ]),
        });
      }

      if (wanted.includes('members')) {
        const rows: (string | number)[][] = [];
        for (const h of households) {
          for (const m of h.members) {
            rows.push([rows.length + 1, h.unitNumber, m.name ?? '-', m.age ?? '-', m.relationLabel ?? '-', m.isPrimary ? 'Ya' : '-', m.notes ?? '-']);
          }
        }
        sections.push({ scope: 'members', title: SCOPE_TITLE.members, headers: ['No', 'Unit', 'Nama', 'Usia', 'Hubungan', 'Kepala Keluarga', 'Catatan'], rows });
      }

      if (wanted.includes('vehicles')) {
        const rows: (string | number)[][] = [];
        for (const h of households) {
          for (const v of h.vehicles) {
            rows.push([rows.length + 1, h.unitNumber, VEHICLE_LABEL[v.type] ?? v.type, v.plateNumber ?? '-', v.color ?? '-', v.description ?? '-']);
          }
        }
        sections.push({ scope: 'vehicles', title: SCOPE_TITLE.vehicles, headers: ['No', 'Unit', 'Jenis', 'Plat Nomor', 'Warna', 'Deskripsi'], rows });
      }

      if (wanted.includes('staff')) {
        const rows: (string | number)[][] = [];
        for (const h of households) {
          for (const s of h.staff) {
            rows.push([rows.length + 1, h.unitNumber, s.name ?? '-', STAFF_LABEL[s.role] ?? s.role, s.isLiveIn == null ? '-' : s.isLiveIn ? 'Menginap' : 'Tidak', s.description ?? '-']);
          }
        }
        sections.push({ scope: 'staff', title: SCOPE_TITLE.staff, headers: ['No', 'Unit', 'Nama', 'Peran', 'Menginap', 'Deskripsi'], rows });
      }

      if (wanted.includes('contacts')) {
        const rows: (string | number)[][] = [];
        for (const h of households) {
          for (const c of h.emergencyContacts) {
            rows.push([rows.length + 1, h.unitNumber, c.name ?? '-', c.phone ?? '-', c.relation ?? '-', c.priority ?? '-']);
          }
        }
        sections.push({ scope: 'contacts', title: SCOPE_TITLE.contacts, headers: ['No', 'Unit', 'Nama', 'Telepon', 'Hubungan', 'Prioritas'], rows });
      }
    }

    return sections;
  }

  /** Bangun workbook Excel: satu sheet per seksi. */
  buildXlsx(sections: Section[]): Buffer {
    const wb = XLSX.utils.book_new();
    // Nama sheet Excel tidak boleh mengandung : \ / ? * [ ] dan maks 31 karakter.
    const safeSheetName = (name: string) => name.replace(/[:\\/?*[\]]/g, '-').slice(0, 31);
    for (const sec of sections) {
      const aoa = [sec.headers, ...sec.rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      // Lebar kolom sederhana berdasarkan panjang header.
      ws['!cols'] = sec.headers.map((h) => ({ wch: Math.max(10, Math.min(40, h.length + 6)) }));
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sec.title));
    }
    if (sections.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tidak ada data']]), 'Kosong');
    }
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /** Bangun PDF: satu tabel per seksi (landscape). */
  buildPdf(sections: Section[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 32, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const usableWidth = right - left;

      doc.fontSize(18).font('Helvetica-Bold').text('Data Warga — The Icon Acropolis', { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(9).font('Helvetica').text(`Diekspor: ${fmtDate(new Date())}`, { align: 'center' });
      doc.moveDown(0.8);

      for (const sec of sections) {
        if (doc.y > doc.page.height - 120) doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text(`${sec.title} (${sec.rows.length})`, left, doc.y);
        doc.moveDown(0.3);

        const colCount = sec.headers.length;
        // Kolom "No" sempit, sisanya dibagi rata.
        const noWidth = 30;
        const otherWidth = (usableWidth - noWidth) / (colCount - 1);
        const widths = sec.headers.map((_, i) => (i === 0 ? noWidth : otherWidth));

        const drawRow = (cells: (string | number)[], bold: boolean) => {
          const padY = 3;
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
          const heights = cells.map((c, i) => doc.heightOfString(String(c), { width: widths[i] - 4 }));
          const rowH = Math.max(...heights) + padY * 2;
          if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
          }
          const y = doc.y;
          let x = left;
          for (let i = 0; i < cells.length; i++) {
            doc.text(String(cells[i]), x + 2, y + padY, { width: widths[i] - 4 });
            x += widths[i];
          }
          doc.moveTo(left, y + rowH).lineTo(right, y + rowH).strokeColor('#e2e8f0').stroke();
          doc.y = y + rowH;
        };

        if (sec.rows.length === 0) {
          doc.font('Helvetica-Oblique').fontSize(9).fillColor('#94a3b8').text('Belum ada data.', left, doc.y);
          doc.fillColor('#000');
        } else {
          drawRow(sec.headers, true);
          for (const r of sec.rows) drawRow(r, false);
        }
        doc.moveDown(1);
      }

      doc.end();
    });
  }
}

export const residentExportService = new ResidentExportService();
