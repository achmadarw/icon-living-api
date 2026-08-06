-- Samakan warna shift bawaan dengan tampilan roster TIA:
--   Shift 1 (Pagi)  → kuning-amber
--   Shift 2 (Siang) → hijau
--   Shift 3 (Malam) → merah
--
-- Hanya menyentuh baris yang warnanya masih nilai seed awal, sehingga warna
-- yang sudah diubah sendiri oleh pengurus tidak ikut tertimpa.

UPDATE "security_shifts" SET "color" = '#d97706' WHERE "code" = '1' AND "color" = '#3b82f6';
UPDATE "security_shifts" SET "color" = '#65a30d' WHERE "code" = '2' AND "color" = '#f59e0b';
UPDATE "security_shifts" SET "color" = '#dc2626' WHERE "code" = '3' AND "color" = '#6366f1';
