# 🎓 Portal Bursa Kerja Khusus (BKK) SMK PGRI 1 Taman

Sistem Informasi Manajemen Bursa Kerja Khusus (BKK) dan Penelusuran Tamatan (Tracer Study) **SMK PGRI 1 Taman, Sidoarjo, Jawa Timur**. Sistem ini telah terintegrasi penuh dengan **Firebase Authentication** dan **Google Cloud Firestore Database**, dirancang modular, aman, dan siap pakai untuk diunggah langsung ke GitHub serta dipublikasikan ke layanan hosting (Vercel, Netlify, atau Firebase Hosting).

---

## 🌟 Fitur Utama

### 1. Portal Publik & Informasi Lowongan
* **Katalog Lowongan Real-time**: Menampilkan seluruh lowongan kerja dan magang aktif dari perusahaan mitra DUDI yang telah terverifikasi.
* **Filter & Pencarian Pintar**: Filter lowongan berdasarkan kata kunci, kategori bidang, jenis pekerjaan (full-time, part-time, magang), serta lokasi.
* **Detail Lowongan Lengkap**: Rincian kualifikasi jurusan, usia, rentang gaji, batas pendaftaran, serta tombol *Lamar Sekarang* 1-klik bagi alumni.
* **Direktori Perusahaan Mitra**: Menampilkan profil industri yang menjalin kerja sama rekrutmen dengan sekolah.
* **Agenda & Pengumuman**: Jadwal Job Fair, pelatihan wawancara HRD, tes psikotes, dan pengumuman resmi kelulusan administrasi.

### 2. Panel Pencari Kerja (Alumni & Siswa)
* **Autentikasi Fleksibel**: Mendukung **Masuk dengan Akun Google (1-Klik)** dan pendaftaran email/password.
* **Curriculum Vitae (CV) & Portofolio Digital**: Form interaktif untuk mencatat riwayat pendidikan, pengalaman kerja/magang, daftar keahlian kompetensi, serta upload berkas CV PDF.
* **Pelacakan Lamaran Interaktif**: Timeline alur proses seleksi (Diajukan ➔ Dilihat HRD ➔ Seleksi Administrasi ➔ Panggilan Interview ➔ Diterima / Ditolak) secara transparan dan real-time.
* **Notifikasi Sistem**: Pemberitahuan otomatis ketika HRD memperbarui status lamaran Anda.

### 3. Panel Perusahaan Mitra (DUDI)
* **Profil Legalitas Perusahaan**: Pengelolaan data identitas perusahaan, NIB, NPWP, alamat kantor/pabrik, dan PIC HRD.
* **Manajemen Lowongan**: Membuat draf lowongan baru, mengajukan verifikasi ke pihak BKK, mengedit rincian posisi, serta menutup lowongan.
* **Seleksi Berkas Pelamar**: Meninjau data alumni yang melamar, melihat keahlian & CV PDF, memperbarui status tahapan seleksi, serta memberikan catatan/undangan tes bagi pelamar.
* **Laporan Rekrutmen**: Grafik analitik distribusi pelamar dan tingkat penerimaan kandidat.

### 4. Panel Admin & Operator BKK
* **Verifikasi DUDI**: Menyetujui atau menolak pendaftaran perusahaan baru demi keamanan data siswa.
* **Moderasi Lowongan**: Memeriksa kelayakan dan transparansi lowongan kerja sebelum tayang ke publik.
* **Database Alumni (Tracer Study)**: Rekapitulasi seluruh pencari kerja dan status penyerapan alumni di dunia kerja.
* **Manajemen Agenda & Pengumuman**: Publikasi jadwal kegiatan sekolah dan pengumuman massal.
* **Utilitas Sinkronisasi Firebase**: Tombol otomatis untuk inisialisasi / *seeding* data awal ke Cloud Firestore dengan sekali klik.

---

## 📁 Struktur Kode Siap Pakai

```
├── .env.example              # Template variabel lingkungan (Firebase config & Gemini)
├── .gitignore                # File & folder yang diabaikan Git
├── index.html                # Entry point HTML aplikasi dengan SEO & Google Fonts
├── metadata.json             # Metadata manifest aplikasi
├── package.json              # Dependensi npm (React 19, Firebase SDK, Tailwind CSS, Lucide)
├── tsconfig.json             # Konfigurasi TypeScript
├── vite.config.ts            # Konfigurasi Vite bundler
├── firestore.rules           # Aturan keamanan database Cloud Firestore
├── firebase-blueprint.json   # Skema blueprint entitas database
├── firebase.js               # Root proxy konfigurasi Firebase
└── src/
    ├── firebase.js           # File inisialisasi Firebase Auth, Firestore & Google Provider
    ├── main.tsx              # React mounting root
    ├── App.tsx               # Komponen utama, router & sinkronisasi data
    ├── index.css             # Tailwind CSS & styling desain sistem BKK
    ├── types.ts              # Definisi interface TypeScript (Lowongan, Lamaran, dsb.)
    ├── context/
    │   └── AuthContext.tsx   # React Context untuk status login & peran pengguna
    ├── services/
    │   ├── db.ts             # Service CRUD Firestore & auto-seed starter data
    │   └── firestoreErrors.ts# Error handler Firestore standar
    ├── utils/
    │   └── formatters.ts     # Helper rupiah, format tanggal, slug, dan mapping status
    └── components/
        ├── Navigation.tsx    # Header & navbar responsif
        ├── Footer.tsx        # Footer informasi BKK
        ├── Toast.tsx         # Notifikasi pop-up
        ├── PublicViews.tsx   # Komponen halaman publik (Beranda, Lowongan, Kontak, dsb.)
        ├── UserViews.tsx     # Komponen dashboard pencari kerja
        ├── CompanyViews.tsx  # Komponen dashboard perusahaan mitra
        └── AdminViews.tsx    # Komponen dashboard admin sekolah
```

---

## ⚙️ Inisialisasi Firebase (`src/firebase.js`)

File `src/firebase.js` telah dikonfigurasi untuk langsung membaca konfigurasi dari `firebase-applet-config.json` lokal atau dari environment variables `VITE_FIREBASE_*`.

Contoh isi konfigurasi di `.env` jika di-deploy ke hosting lain:
```env
VITE_FIREBASE_API_KEY="AIzaSyDZ1tDdIYdAAwWg42tegrAY7tQFu1I_u2k"
VITE_FIREBASE_AUTH_DOMAIN="gen-lang-client-0376668382.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="gen-lang-client-0376668382"
VITE_FIREBASE_DATABASE_ID="ai-studio-d74210e5-8a4c-4fa7-90fd-9afab399dbde"
VITE_FIREBASE_STORAGE_BUCKET="gen-lang-client-0376668382.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="419812768027"
VITE_FIREBASE_APP_ID="1:419812768027:web:ee4330664e271f6b32bbbe"
```

---

## 🚀 Panduan Menjalankan Proyek Lokal

1. **Clone repository atau ekstrak folder proyek**:
   ```bash
   git clone <URL_REPOSITORY_ANDA>
   cd <NAMA_FOLDER>
   ```

2. **Instal dependensi npm**:
   ```bash
   npm install
   ```

3. **Jalankan server pengembangan (Development)**:
   ```bash
   npm run dev
   ```
   Buka browser di `http://localhost:3000`.

4. **Build untuk Produksi**:
   ```bash
   npm run build
   ```

---

## 📤 Panduan Upload ke Repository GitHub

Ikuti langkah-langkah mudah berikut untuk mengunggah proyek ini ke akun GitHub Anda:

1. Buat repository baru di [GitHub](https://github.com/new), misalnya beri nama `bkk-smk-pgri-1-taman`.
2. Di terminal komputer Anda pada folder proyek ini, jalankan:
   ```bash
   git init
   git add .
   git commit -m "feat: inisialisasi portal BKK SMK PGRI 1 Taman terintegrasi Firebase"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/bkk-smk-pgri-1-taman.git
   git push -u origin main
   ```

---

## 🌐 Panduan Publikasi (Deployment)

### Opsi A: Vercel / Netlify
1. Hubungkan repository GitHub Anda ke [Vercel](https://vercel.com) atau [Netlify](https://netlify.com).
2. Framework preset akan otomatis terdeteksi sebagai **Vite**.
3. Masukkan Environment Variables dari `.env.example` ke pengaturan Environment Variables di dashboard hosting.
4. Klik **Deploy**!

### Opsi B: Firebase Hosting
1. Instal Firebase CLI: `npm install -g firebase-tools`
2. Jalankan `firebase login` lalu `firebase init hosting`.
3. Tentukan build directory ke `dist`.
4. Jalankan `npm run build && firebase deploy --only hosting`.

---

## 🔒 Hak Cipta & Lisensi

Dikembangkan untuk **SMK PGRI 1 Taman, Sidoarjo, Jawa Timur**.
Mendukung kemajuan pendidikan vokasi dan keterserapan alumni di Dunia Usaha & Dunia Industri.
