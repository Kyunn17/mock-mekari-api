# Mock Talenta API (POC)

API tiruan (Hono + Swagger) yang meniru endpoint Mekari Talenta dengan **data dummy**.
Dipakai sebagai sumber untuk pipeline Databricks bronze → silver → gold sebelum credentials asli tersedia.

## Menjalankan

```bash
npm install
npm run dev          # atau: npm start
```

- API: http://localhost:3000
- Swagger UI: http://localhost:3000/docs
- Spesifikasi mentah: http://localhost:3000/openapi.json

Opsi:
- `PORT=4000 npm start` untuk ganti port
- `REQUIRE_AUTH=true npm start` supaya request tanpa header `Authorization` (berawalan `hmac `) dan `Date` ditolak 401. Tanda tangan HMAC **tidak** diverifikasi.

## Endpoint

| Endpoint | Untuk tujuan |
|---|---|
| `GET /v2/talenta/v3/employees` | 1 (tim), 3 (kontrak) |
| `GET /v2/talenta/v2/company/{companyId}/organization` | 1 (pemetaan tim). Mock hanya mengenal companyId `3620` |
| `GET /v2/talenta/v2/company/me/employment-status` | 3 |
| `GET /v2/talenta/v2/live-attendance/location?user_id=` | 1 (master lokasi) |
| `GET /v2/talenta/v2/attendance/{userId}/history-list?year=&month=&day=` | 2 |
| `GET /v2/talenta/v3/time-off/policies/users/{userId}` | 2 (kode cuti/sakit) |
| `GET /v2/talenta/v2/attendance/activities?start_date=&end_date=` | 1 (koordinat). **Tambahan** |

`userId` boleh berupa `user_id` (mis. `2001`) atau `employee_id` (mis. `EMP-001`).

Contoh:

```bash
curl "http://localhost:3000/v2/talenta/v3/employees?limit=5"
curl "http://localhost:3000/v2/talenta/v2/attendance/2001/history-list?year=2026&month=10&day=27"
curl "http://localhost:3000/v2/talenta/v2/attendance/activities?start_date=2026-10-26&end_date=2026-10-30"
```

## Isi data dummy

- 12 pegawai di 4 tim: Product, Sales, Technical, Finance (tim diambil dari `organization_name`).
- 3 kontrak berakhir **di bulan berjalan** (tanggal dibuat relatif terhadap bulan saat API dijalankan), plus beberapa kontrak/probation di bulan depan.
- Status harian deterministik: hadir, sakit (`SKT`), cuti (`CT`), tidak absen.
- Pada tanggal genap, sebagian pegawai Product/Sales/Technical absen di lokasi klien yang sama (koordinat sedikit berbeda, ±5 meter). Ada hari di mana ketiga tim hadir di klien dan hari di mana salah satunya tidak.

## Hal yang BELUM terkonfirmasi (asumsi mock, cek ke dokumentasi asli)

1. **Pembungkus response.** Dokumentasi hanya menampilkan satu item per endpoint, kecuali live attendance. Mock memakai `{ message, data: { <nama>: [...] } }`.
2. **Pagination** `/employees` (`page`, `limit`, `data.pagination`) adalah tebakan.
3. **Path time-off.** Dokumentasi menulis `/v3/time-off/policies/users/{user_id}`; mock memakai prefix `/v2/talenta`.
4. **Endpoint `attendance/activities`**: path dan parameter tanggalnya tebakan. Dipakai karena `history-list` hanya punya `has_location` (true/false) tanpa koordinat, sedangkan tujuan 1 butuh koordinat.
5. **Tidak absen** direpresentasikan sebagai list kosong di `history-list`. Weekend dan hari libur tidak ditangani (semua hari dianggap hari kerja).
6. **Time-off policies adalah kebijakan, bukan riwayat cuti.** Cuti/sakit yang benar-benar diambil terlihat dari `timeoff_code` di `history-list`.
7. Pemetaan tim memakai `organization_name`; di data asli mungkin perlu pemetaan jabatan/organisasi yang berbeda.

## Rencana pemakaian di Databricks

- **Bronze**: tiap endpoint disimpan mentah (JSON) ke tabel sendiri.
- **Silver**: dirapikan dan diberi tipe; `employees` jadi tabel acuan (tim, kontrak).
- **Gold**: (1) activities join employees, kelompok per tanggal + koordinat dibulatkan; (2) pegawai aktif dibandingkan dengan history-list per hari; (3) employees dengan `end_date` di bulan berjalan.

Saat credentials asli ada, ganti base URL ke `https://api.mekari.com` dan tambahkan penandatanganan HMAC; logika tabel tidak berubah.
