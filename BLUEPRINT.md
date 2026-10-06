# 📐 BLUEPRINT SISTEM INFORMASI BKK SMK PGRI 1 TAMAN
*Bursa Kerja Khusus & Penelusuran Tamatan (Tracer Study)*

---

## 1. IKHTISAR SISTEM (SYSTEM OVERVIEW)
Sistem Informasi BKK SMK PGRI 1 Taman adalah platform web terpadu yang memfasilitasi penjembatanan antara **Pencari Kerja (Siswa/Alumni)**, **Perusahaan Mitra (DUDI)**, dan **Pengelola Sekolah (Admin/Operator BKK)**. Platform ini dirancang untuk mempermudah publikasi lowongan kerja, seleksi berkas pelamar secara digital, rekapitulasi data tracer study, serta penjadwalan rekrutmen.

---

## 2. ARSITEKTUR TEKNOLOGI (TECH STACK ARCHITECTURE)

```
┌─────────────────────────────────────────────────────────────┐
│                 CLIENT LAYER (Frontend - SPA)               │
│  React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons │
└──────────────┬───────────────────────────────┬──────────────┘
               │ HTTPS                         │ HTTPS
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      HOSTING & CDN LAYER     │ │     BACKEND / BAAS LAYER   │
│   Vercel Global Edge Network │ │   Google Firebase Platform │
│   (Continuous Deployment)    │ │   - Firebase Authentication│
│                              │ │   - Cloud Firestore DB     │
│                              │ │   - Firestore Security Rule│
└──────────────────────────────┘ └────────────────────────────┘
```

- **Frontend Framework:** React 19 dengan TypeScript untuk type-safety.
- **Build Tool:** Vite (Ultra-fast HMR & optimal production bundle).
- **Styling & UI:** Tailwind CSS dengan desain responsif mobile-first.
- **Autentikasi:** Firebase Authentication (Google OAuth 2.0 & Email/Password).
- **Database:** Google Cloud Firestore (NoSQL Document Store Real-time).
- **Hosting & CI/CD:** Vercel terhubung ke repositori GitHub untuk auto-deploy.

---

## 3. PERAN PENGGUNA & HAK AKSES (USER ROLES & PERMISSIONS)

| Peran (Role) | Hak Akses Utama |
| :--- | :--- |
| **Publik (Tamu)** | • Melihat katalog lowongan kerja terverifikasi<br>• Melihat direktori perusahaan mitra DUDI<br>• Melihat jadwal agenda (Job Fair, Tes Seleksi)<br>• Membaca pengumuman resmi sekolah |
| **Pencari Kerja (Alumni/Siswa)** | • Login via Akun Google atau Email/Password<br>• Melengkapi Biodata, Riwayat Pendidikan & Keahlian<br>• Mengunggah Berkas CV/Portofolio<br>• Melamar lowongan pekerjaan (1-Klik)<br>• Memantau linimasa status lamaran secara real-time |
| **Perusahaan Mitra (DUDI)** | • Mendaftarkan profil & legalitas perusahaan (NIB, PIC HRD)<br>• Membuat dan mengelola draf lowongan kerja<br>• Meninjau data dan berkas CV pelamar<br>• Memperbarui status seleksi pelamar (*Diterima/Wawancara/Ditolak*)<br>• Melihat statistik pelamar posisi perusahaannya |
| **Admin / Operator BKK** | • Memverifikasi legalitas perusahaan baru (Verifikasi DUDI)<br>• Memoderasi dan menyetujui lowongan kerja sebelum tayang<br>• Mengelola data pengguna & reset password pengguna<br>• Manajemen Tracer Study (Rekapitulasi Keterserapan Alumni)<br>• Publikasi Agenda kegiatan & Pengumuman<br>• Audit Log & Pengaturan Situs |

---

## 4. SKEMA DATA CLOUD FIRESTORE (DATABASE BLUEPRINT)

Berikut struktur koleksi (*collections*) utama pada Cloud Firestore:

### A. Koleksi `users`
Menyimpan kredensial dan profil hak akses pengguna.
- `id` (string, Document ID = Firebase Auth UID)
- `name` (string): Nama lengkap pengguna
- `email` (string): Alamat email terdaftar
- `role` (string): `'admin'` | `'operator'` | `'company'` | `'user'`
- `status` (string): `'active'` | `'blocked'`
- `password` (string, opsional): Sinkronisasi password untuk pengelolaan admin
- `createdAt` (string/timestamp): Waktu pembuatan akun

### B. Koleksi `pencariKerja`
Profil lengkap pencari kerja untuk kebutuhan rekrutmen & tracer study.
- `id` (string)
- `userId` (string, relasi ke `users.id`)
- `namaLengkap` (string)
- `jenisKelamin` (string): `'L'` | `'P'`
- `noHp`, `alamat`, `jurusan`, `tahunLulus`
- `pendidikan` (array of objects: jenjang, institusi, jurusan, tahun)
- `pengalaman` (array of objects: posisi, perusahaan, durasi, deskripsi)
- `keahlian` (array of strings)
- `dokumen` (array of objects: nama, tipe, fileData/URL)
- `status` (string): `'Mencari Kerja'` | `'Bekerja'` | `'Wirausaha'` | `'Kuliah'`

### C. Koleksi `perusahaan`
Profil legalitas mitra dunia usaha dan dunia industri (DUDI).
- `id` (string)
- `userId` (string, relasi ke `users.id`)
- `namaPerusahaan` (string)
- `bidangUsaha` (string)
- `alamat`, `kabupaten`, `email`, `noTelepon`, `website`
- `namaPic`, `jabatanPic` (string)
- `statusVerifikasi` (string): `'pending'` | `'verified'` | `'rejected'`

### D. Koleksi `lowongan`
Daftar lowongan kerja yang dibuka oleh perusahaan mitra.
- `id` (string)
- `perusahaanId` (string, relasi ke `perusahaan.id`)
- `kategoriId` (string)
- `judul`, `deskripsi`, `persyaratan`, `lokasi` (string)
- `jenisPekerjaan` (string): `'full_time'` | `'part_time'` | `'internship'` | `'contract'`
- `pendidikanMinimal`, `jurusan`, `usiaMinimal`, `usiaMaksimal`
- `gajiMinimal`, `gajiMaksimal` (number)
- `tanggalBuka`, `tanggalTutup` (string)
- `status` (string): `'draft'` | `'pending'` | `'published'` | `'closed'`

### E. Koleksi `lamaran`
Pencatatan berkas lamaran yang dikirim alumni ke lowongan kerja.
- `id` (string)
- `lowonganId` (string, relasi ke `lowongan.id`)
- `pencariKerjaId` (string, relasi ke `pencariKerja.id`)
- `perusahaanId` (string)
- `status` (string): `'submitted'` ➔ `'reviewed'` ➔ `'interview'` ➔ `'accepted'` / `'rejected'`
- `catatanPerusahaan` (string)
- `tanggalLamar` (string)

### F. Koleksi Pendukung Lainnya:
- `kategori`: Kategori spesialisasi industri lowongan.
- `agenda`: Jadwal kegiatan Job Fair, pelatihan, dan seleksi massal.
- `pengumuman`: Berita dan pengumuman resmi BKK.
- `auditLog`: Catatan jejak rekam aktivitas keamanan & sistem.
- `settings`: Konfigurasi identitas sekolah dan kontak BKK.

---

## 5. DIAGRAM ALUR KERJA UTAMA (WORKFLOW)

### Alur Pelamaran Kerja:
```
1. Alumni Membuka Lowongan 
   └─► 2. Klik "Lamar Sekarang" 
         └─► 3. Verifikasi Kelengkapan CV
               └─► 4. Data Lamaran Masuk ke Dashboard HRD (Status: Diajukan)
                     └─► 5. HRD Meninjau Berkas (Status: Dilihat HRD)
                           ├─► Opsi A: Panggilan Tes/Wawancara
                           ├─► Opsi B: Diterima Kerja ➔ Masuk Data Tracer Study
                           └─► Opsi C: Tidak Memenuhi Kualifikasi (Ditolak)
```

### Alur Verifikasi DUDI & Lowongan:
```
1. Perusahaan Mendaftar 
   └─► 2. Menunggu Verifikasi Operator BKK
         └─► 3. Setelah Diverifikasi, Perusahaan Posting Lowongan
               └─► 4. Lowongan Dimoderasi Admin ➔ Terbit ke Publik
```

---

## 6. ASPEK KEAMANAN & SKALABILITAS
1. **Aturan Database (Firestore Security Rules):** Membatasi hak modifikasi hanya pada dokumen milik masing-masing pengguna, serta membatasi operasi kritis (hapus akun/verifikasi DUDI) hanya untuk Admin BKK.
2. **Authorized Domains:** Memastikan Google Sign-In hanya dapat beroperasi di domain resmi (Vercel & Domain Sekolah).
3. **Pemisahan Environment:** Konfigurasi kredensial dipisahkan via Environment Variables (`.env` dan Vercel Dashboard).
