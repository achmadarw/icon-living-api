-- Tambah nilai enum Role: SEKSI_KEAMANAN
--
-- PENTING: migrasi ini sengaja berdiri sendiri dan hanya berisi ALTER TYPE.
-- PostgreSQL tidak mengizinkan nilai enum baru dipakai pada transaksi yang sama
-- dengan penambahannya, sehingga migrasi yang MEMAKAI 'SEKSI_KEAMANAN'
-- (mis. seed atau default kolom) harus berada di migrasi terpisah setelah ini.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SEKSI_KEAMANAN';
