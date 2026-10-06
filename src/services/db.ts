import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase.js';
import { handleFirestoreError, OperationType } from './firestoreErrors.js';
import type {
  UserProfile,
  PencariKerja,
  Perusahaan,
  Kategori,
  Lowongan,
  Lamaran,
  RiwayatLamaran,
  Agenda,
  Pengumuman,
  Notifikasi,
  Penempatan,
  AuditLog,
  SiteSettings,
  BroadcastHistory,
  GaleriItem
} from '../types.js';

// ================= DEFAULT STARTER DATA (FALLBACK) =================
export const DEFAULT_KATEGORI: Kategori[] = [
  { id: 'kat_adm', nama: 'Administrasi', slug: 'administrasi', status: true },
  { id: 'kat_tek', nama: 'Teknik', slug: 'teknik', status: true },
  { id: 'kat_prod', nama: 'Produksi', slug: 'produksi', status: true },
  { id: 'kat_it', nama: 'IT & Rekayasa Perangkat Lunak', slug: 'it', status: true },
  { id: 'kat_mkt', nama: 'Marketing & Penjualan', slug: 'marketing', status: true },
  { id: 'kat_akt', nama: 'Akuntansi & Keuangan', slug: 'akuntansi', status: true },
  { id: 'kat_htl', nama: 'Perhotelan & Pariwisata', slug: 'perhotelan', status: true },
  { id: 'kat_oto', nama: 'Otomotif & Alat Berat', slug: 'otomotif', status: true },
  { id: 'kat_log', nama: 'Logistik & Pergudangan', slug: 'logistik', status: true }
];

export const DEFAULT_PERUSAHAAN: Perusahaan[] = [
  {
    id: 'prs_mitra_teknindo',
    userId: 'usr_pt1',
    namaPerusahaan: 'PT Mitra Teknindo Presisi',
    bidangUsaha: 'Manufaktur Komponen Otomotif & Mesin',
    deskripsi: 'Perusahaan manufaktur presisi berstandar ISO 9001 yang memproduksi suku cadang kendaraan bermotor untuk pasar nasional dan ekspor.',
    alamat: 'Kawasan Industri Taman, Jl. Industri Raya No. 8',
    kecamatan: 'Taman',
    kabupaten: 'Sidoarjo',
    provinsi: 'Jawa Timur',
    website: 'https://mitrateknindo.co.id',
    email: 'hrd@mitrateknindo.co.id',
    noTelepon: '(031) 788-9900',
    namaPic: 'Budi Santoso, S.T.',
    jabatanPic: 'HRD & Recruitment Manager',
    statusVerifikasi: 'verified',
    createdAt: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'prs_karya_logistik',
    userId: 'usr_pt2',
    namaPerusahaan: 'CV Karya Logistik Nusantara',
    bidangUsaha: 'Logistik, Ekspedisi & Distribusi',
    deskripsi: 'Penyedia jasa pergudangan modern dan rantai pasok terintegrasi untuk wilayah Jawa Timur dan Indonesia Timur.',
    alamat: 'Kawasan Pergudangan Sirie, Blok B-12',
    kecamatan: 'Taman',
    kabupaten: 'Sidoarjo',
    provinsi: 'Jawa Timur',
    website: 'https://karyalogistik.id',
    email: 'hr@karyalogistik.id',
    noTelepon: '(031) 787-4321',
    namaPic: 'Rina Wijaya, S.Psi.',
    jabatanPic: 'Talent Acquisition Lead',
    statusVerifikasi: 'verified',
    createdAt: '2026-08-05T00:00:00.000Z'
  },
  {
    id: 'prs_bumi_hospitality',
    userId: 'usr_pt3',
    namaPerusahaan: 'PT Bumi Hospitality Sejahtera',
    bidangUsaha: 'Perhotelan, Food & Beverage',
    deskripsi: 'Operator hotel berbintang 4 dan pusat konvensi modern di kawasan gerbang Surabaya-Sidoarjo.',
    alamat: 'Jl. Raya Geluran No. 45',
    kecamatan: 'Taman',
    kabupaten: 'Sidoarjo',
    provinsi: 'Jawa Timur',
    website: 'https://bumihotel.com',
    email: 'recruitment@bumihotel.com',
    noTelepon: '(031) 855-1200',
    namaPic: 'Andi Prasetyo',
    jabatanPic: 'HR Supervisor',
    statusVerifikasi: 'verified',
    createdAt: '2026-08-10T00:00:00.000Z'
  },
  {
    id: 'prs_digital_solusi',
    userId: 'usr_pt4',
    namaPerusahaan: 'PT Digital Solusi Prima',
    bidangUsaha: 'Teknologi Informasi & Software Development',
    deskripsi: 'Software house pengembang aplikasi ERP, sistem POS, dan solusi digital transformasi untuk UKM dan industri.',
    alamat: 'Ruko Sepanjang Square No. 10',
    kecamatan: 'Taman',
    kabupaten: 'Sidoarjo',
    provinsi: 'Jawa Timur',
    website: 'https://digitalsolusi.id',
    email: 'careers@digitalsolusi.id',
    noTelepon: '(031) 788-7788',
    namaPic: 'Maya Sari, M.Kom.',
    jabatanPic: 'Head of People & Culture',
    statusVerifikasi: 'pending',
    createdAt: '2026-08-15T00:00:00.000Z'
  }
];

export const DEFAULT_LOWONGAN: Lowongan[] = [
  {
    id: 'low_op_produksi',
    perusahaanId: 'prs_mitra_teknindo',
    kategoriId: 'kat_prod',
    judul: 'Operator Produksi Mesin CNC & Bubut',
    slug: 'operator-produksi-mesin-cnc-pt-mitra-teknindo',
    deskripsi: 'Mengoperasikan mesin CNC dan bubut presisi sesuai SOP pabrik. Melakukan setup benda kerja, pemantauan proses pemesinan, dan pencatatan output produksi harian.',
    persyaratan: '1. Pria / Wanita, usia 18 - 25 tahun.\n2. Lulusan SMK jurusan Teknik Pemesinan / Teknik Kendaraan Ringan / Otomotif.\n3. Teliti, disiplin, dan mampu membaca gambar teknik.\n4. Bersedia bekerja dalam 3 shift.',
    lokasi: 'Taman, Sidoarjo, Jawa Timur',
    jenisPekerjaan: 'full_time',
    pendidikanMinimal: 'SMK Sederajat',
    jurusan: 'Teknik Pemesinan / Otomotif',
    pengalamanMinimal: 'Fresh graduate dipersilakan',
    usiaMinimal: 18,
    usiaMaksimal: 25,
    gajiMinimal: 3800000,
    gajiMaksimal: 4400000,
    jumlahKebutuhan: 8,
    tanggalBuka: '2026-09-01T00:00:00.000Z',
    tanggalTutup: '2026-10-31T00:00:00.000Z',
    kontak: 'hrd@mitrateknindo.co.id',
    status: 'published',
    createdAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'low_teknisi_maint',
    perusahaanId: 'prs_mitra_teknindo',
    kategoriId: 'kat_tek',
    judul: 'Teknisi Maintenance & Elektrikal',
    slug: 'teknisi-maintenance-elektrikal-pt-mitra-teknindo',
    deskripsi: 'Melakukan pemeliharaan preventif mesin-mesin industri, troubleshooting panel listrik, inverter, PLC dasar, dan perbaikan mekanik pabrik.',
    persyaratan: '1. Pria, usia maks. 27 tahun.\n2. Lulusan SMK Teknik Ketenagalistrikan / Teknik Elektronika Industri / Teknik Mesin.\n3. Paham kelistrikan industri 3-phase dan dasar mekanik motor listrik.\n4. Sehat jasmani dan tidak buta warna.',
    lokasi: 'Taman, Sidoarjo, Jawa Timur',
    jenisPekerjaan: 'full_time',
    pendidikanMinimal: 'SMK Sederajat',
    jurusan: 'Teknik Elektro / Teknik Mesin',
    pengalamanMinimal: 'Fresh graduate atau pengalaman 1 tahun',
    usiaMinimal: 18,
    usiaMaksimal: 27,
    gajiMinimal: 4100000,
    gajiMaksimal: 5000000,
    jumlahKebutuhan: 3,
    tanggalBuka: '2026-09-05T00:00:00.000Z',
    tanggalTutup: '2026-10-25T00:00:00.000Z',
    kontak: 'hrd@mitrateknindo.co.id',
    status: 'published',
    createdAt: '2026-09-05T00:00:00.000Z'
  },
  {
    id: 'low_admin_gudang',
    perusahaanId: 'prs_karya_logistik',
    kategoriId: 'kat_log',
    judul: 'Staff Administrasi & Inventori Gudang',
    slug: 'staff-administrasi-inventori-gudang-cv-karya-logistik',
    deskripsi: 'Mencatat arus keluar-masuk barang, menyusun surat jalan, rekonsiliasi data stok fisik dengan sistem WMS (Warehouse Management System), serta filing dokumen invoice.',
    persyaratan: '1. Pria / Wanita, usia 18 - 24 tahun.\n2. Lulusan SMK Akuntansi / Administrasi Perkantoran / Manajemen Logistik.\n3. Menguasai Microsoft Excel (VLOOKUP, IF, Pivot Table dasar).\n4. Jujur, detail, dan rapi.',
    lokasi: 'Sidoarjo, Jawa Timur',
    jenisPekerjaan: 'full_time',
    pendidikanMinimal: 'SMK Sederajat',
    jurusan: 'Akuntansi / Administrasi Perkantoran',
    pengalamanMinimal: 'Fresh graduate diperbolehkan',
    usiaMinimal: 18,
    usiaMaksimal: 24,
    gajiMinimal: 3500000,
    gajiMaksimal: 4000000,
    jumlahKebutuhan: 4,
    tanggalBuka: '2026-09-10T00:00:00.000Z',
    tanggalTutup: '2026-10-30T00:00:00.000Z',
    kontak: 'hr@karyalogistik.id',
    status: 'published',
    createdAt: '2026-09-10T00:00:00.000Z'
  },
  {
    id: 'low_front_office',
    perusahaanId: 'prs_bumi_hospitality',
    kategoriId: 'kat_htl',
    judul: 'Front Desk Agent & Guest Relation',
    slug: 'front-desk-agent-guest-relation-pt-bumi-hospitality',
    deskripsi: 'Menyambut tamu hotel, proses check-in / check-out kamar, menangani reservasi langsung dan telepon, serta memberikan informasi fasilitas hotel secara ramah dan profesional.',
    persyaratan: '1. Pria / Wanita, berpenampilan rapi dan komunikatif.\n2. Lulusan SMK Perhotelan / Usaha Layanan Wisata / Bahasa.\n3. Memiliki kemampuan bahasa Inggris percakapan dasar.\n4. Bersedia bekerja shift.',
    lokasi: 'Taman, Sidoarjo',
    jenisPekerjaan: 'full_time',
    pendidikanMinimal: 'SMK Sederajat',
    jurusan: 'Perhotelan / Pariwisata',
    pengalamanMinimal: 'Fresh graduate dipersilakan',
    usiaMinimal: 18,
    usiaMaksimal: 25,
    gajiMinimal: 3600000,
    gajiMaksimal: 4200000,
    jumlahKebutuhan: 3,
    tanggalBuka: '2026-09-12T00:00:00.000Z',
    tanggalTutup: '2026-10-28T00:00:00.000Z',
    kontak: 'recruitment@bumihotel.com',
    status: 'published',
    createdAt: '2026-09-12T00:00:00.000Z'
  },
  {
    id: 'low_web_intern',
    perusahaanId: 'prs_digital_solusi',
    kategoriId: 'kat_it',
    judul: 'Junior Web & Frontend Developer',
    slug: 'junior-web-frontend-developer-pt-digital-solusi',
    deskripsi: 'Membantu pengembangan antarmuka aplikasi web berbasis React, Tailwind CSS, dan integrasi REST API / Firebase.',
    persyaratan: '1. Lulusan atau siswa tingkat akhir SMK jurusan Rekayasa Perangkat Lunak (RPL) / TKJ.\n2. Menguasai HTML, CSS, JavaScript dasar.\n3. Mau belajar dan bekerja dalam tim agile.',
    lokasi: 'Taman, Sidoarjo (Hybrid)',
    jenisPekerjaan: 'internship',
    pendidikanMinimal: 'SMK Sederajat',
    jurusan: 'Rekayasa Perangkat Lunak (RPL)',
    pengalamanMinimal: 'Memiliki portofolio tugas / projek sekolah',
    usiaMinimal: 17,
    usiaMaksimal: 23,
    gajiMinimal: 2200000,
    gajiMaksimal: 3000000,
    jumlahKebutuhan: 2,
    tanggalBuka: '2026-09-15T00:00:00.000Z',
    tanggalTutup: '2026-11-15T00:00:00.000Z',
    kontak: 'careers@digitalsolusi.id',
    status: 'published',
    createdAt: '2026-09-15T00:00:00.000Z'
  }
];

export const DEFAULT_AGENDA: Agenda[] = [
  {
    id: 'agd_job_fair_2026',
    judul: 'BKK Job Fair & Rekrutmen Akbar SMK PGRI 1 Taman 2026',
    slug: 'bkk-job-fair-rekrutmen-akbar-2026',
    deskripsi: 'Bursa kerja khusus mempertemukan lebih dari 25 perusahaan manufaktur, otomotif, ritel, dan perhotelan dengan alumni serta siswa kelas XII.',
    tanggalMulai: '2026-10-10T08:00:00.000Z',
    tanggalSelesai: '2026-10-11T15:00:00.000Z',
    lokasi: 'Aula Utama & Lapangan Indoor SMK PGRI 1 Taman',
    penyelenggara: 'Pengurus BKK SMK PGRI 1 Taman',
    status: 'published',
    createdAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'agd_workshop_cv',
    judul: 'Workshop: Bedah CV ATS-Friendly & Simulasi Wawancara HRD',
    slug: 'workshop-bedah-cv-simulasi-wawancara-hrd',
    deskripsi: 'Pelatihan persiapan kerja langsung dimentori praktisi HRD dari PT Mitra Teknindo dan BKK untuk meningkatkan rasio kelulusan seleksi alumni.',
    tanggalMulai: '2026-10-02T09:00:00.000Z',
    tanggalSelesai: '2026-10-02T13:00:00.000Z',
    lokasi: 'Ruang Multimedia 1, Kampus SMK PGRI 1 Taman',
    penyelenggara: 'BKK & Tim Bimbingan Konseling',
    status: 'published',
    createdAt: '2026-09-05T00:00:00.000Z'
  }
];

export const DEFAULT_PENGUMUMAN: Pengumuman[] = [
  {
    id: 'png_pembukaan_bkk',
    judul: 'Pembukaan Pendaftaran dan Verifikasi Berkas Alumni Tahun Lulus 2024–2026',
    slug: 'pembukaan-pendaftaran-verifikasi-alumni',
    isi: 'Diberitahukan kepada seluruh alumni dan calon lulusan SMK PGRI 1 Taman bahwa portal online BKK telah terintegrasi dengan Firebase Cloud Database. Silakan lengkapi profil, unggah CV, dan mulai mengajukan lamaran ke lowongan perusahaan mitra yang telah terverifikasi.',
    status: 'published',
    publishedAt: '2026-09-18T00:00:00.000Z',
    createdAt: '2026-09-18T00:00:00.000Z'
  },
  {
    id: 'png_jadwal_psikotes',
    judul: 'Pemberitahuan Jadwal Tes Fisik & Wawancara PT Mitra Teknindo',
    slug: 'pemberitahuan-jadwal-tes-mitra-teknindo',
    isi: 'Pelamar yang status lamarannya telah berubah menjadi "Lulus Administrasi" diimbau untuk mengecek menu "Lamaran Saya" secara berkala untuk instruksi kehadiran tes fisik dan wawancara di sekolah.',
    status: 'published',
    publishedAt: '2026-09-20T00:00:00.000Z',
    createdAt: '2026-09-20T00:00:00.000Z'
  }
];

export const DEFAULT_GALERI: GaleriItem[] = [
  {
    id: 'gal_1',
    tipe: 'foto',
    judul: 'Pelaksanaan Job Fair & Bursa Kerja Khusus SMK PGRI 1 Taman',
    kategori: 'Job Fair & Bursa Kerja',
    deskripsi: 'Antusiasme ribuan alumni dan pencari kerja menghadiri bursa kerja khusus menghadirkan lebih dari 35 perusahaan mitra industri ternama.',
    tanggal: '2026-08-15',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
    status: 'publik',
    isFeatured: true,
    dibuatOleh: 'Administrator BKK',
    createdAt: '2026-08-15T10:00:00.000Z'
  },
  {
    id: 'gal_2',
    tipe: 'video',
    judul: 'Video Profil & Fasilitas Layanan Bursa Kerja Khusus (BKK)',
    kategori: 'Profil BKK',
    deskripsi: 'Pengenalan komprehensif layanan penempatan kerja, bimbingan karir, sertifikasi keahlian, dan kemitraan DUDI di SMK PGRI 1 Taman.',
    tanggal: '2026-07-20',
    url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    youtubeId: 'ScMzIvxBSi4',
    thumbnailUrl: 'https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg',
    status: 'publik',
    isFeatured: true,
    dibuatOleh: 'Administrator BKK',
    createdAt: '2026-07-20T14:30:00.000Z'
  },
  {
    id: 'gal_3',
    tipe: 'foto',
    judul: 'Kunjungan Industri & Penandatanganan MoU dengan PT Astra International',
    kategori: 'Kunjungan Industri',
    deskripsi: 'Kunjungan studi lapangan dan pembaruan kesepakatan kerjasama rekrutmen prioritas bagi siswa jurusan Teknik dan Otomotif.',
    tanggal: '2026-06-10',
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80',
    status: 'publik',
    isFeatured: true,
    dibuatOleh: 'Administrator BKK',
    createdAt: '2026-06-10T09:15:00.000Z'
  },
  {
    id: 'gal_4',
    tipe: 'foto',
    judul: 'Workshop Kesiapan Kerja & Simulasi Wawancara HRD untuk Calon Lulusan',
    kategori: 'Pelatihan & Workshop',
    deskripsi: 'Pelatihan intensif pembuatan CV ATS-friendly, personal branding LinkedIn, dan simulasi interview langsung bersama praktisi HR.',
    tanggal: '2026-05-18',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80',
    status: 'publik',
    isFeatured: false,
    dibuatOleh: 'Administrator BKK',
    createdAt: '2026-05-18T11:00:00.000Z'
  },
  {
    id: 'gal_5',
    tipe: 'video',
    judul: 'Dokumentasi Rekrutmen Kampus & Psikotes PT Kalbe Farma Tbk',
    kategori: 'Rekrutmen Kampus',
    deskripsi: 'Suasana seleksi tertulis, tes psikotes, dan tahapan wawancara user oleh tim Talent Acquisition PT Kalbe Farma bertempat di Aula SMK PGRI 1 Taman.',
    tanggal: '2026-04-22',
    url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
    youtubeId: 'LXb3EKWsInQ',
    thumbnailUrl: 'https://img.youtube.com/vi/LXb3EKWsInQ/hqdefault.jpg',
    status: 'publik',
    isFeatured: true,
    dibuatOleh: 'Administrator BKK',
    createdAt: '2026-04-22T13:45:00.000Z'
  }
];

// Validasi Koneksi ke Firestore saat boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Perhatian: Firestore client offline. Periksa konfigurasi Firebase Anda.');
    }
    return false;
  }
}

// ================= HELPER SANITASI DATA FIRESTORE =================
export function cleanData<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === 'object' && item !== null ? cleanData(item) : item)) as any;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        result[key] = cleanData(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// ================= USER PROFILES =================
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as UserProfile) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveUserProfile(user: UserProfile): Promise<void> {
  const userId = user.id || auth.currentUser?.uid;
  if (!userId) {
    throw new Error('ID pengguna tidak valid');
  }
  const cleanUser = cleanData({ ...user, id: userId });
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, 'users', userId), cleanUser, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteUserProfile(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('ID pengguna tidak valid untuk dihapus');
  }
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  if (!auth.currentUser) return [];
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// ================= PENCARI KERJA =================
export async function getPencariKerjaByUserId(userId: string): Promise<PencariKerja | null> {
  if (!userId) return null;
  const path = 'pencariKerja';
  try {
    const q = query(collection(db, 'pencariKerja'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as PencariKerja;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function savePencariKerja(pk: PencariKerja): Promise<void> {
  const pkId = pk.id;
  if (!pkId) throw new Error('ID pencari kerja tidak valid');
  const path = `pencariKerja/${pkId}`;
  try {
    await setDoc(doc(db, 'pencariKerja', pkId), cleanData(pk), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deletePencariKerja(pkId: string): Promise<void> {
  if (!pkId) return;
  const path = `pencariKerja/${pkId}`;
  try {
    await deleteDoc(doc(db, 'pencariKerja', pkId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function getAllPencariKerja(): Promise<PencariKerja[]> {
  const path = 'pencariKerja';
  try {
    const snap = await getDocs(collection(db, 'pencariKerja'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PencariKerja));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// ================= PERUSAHAAN =================
export async function getPerusahaanByUserId(userId: string): Promise<Perusahaan | null> {
  if (!userId) return null;
  const path = 'perusahaan';
  try {
    const q = query(collection(db, 'perusahaan'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as Perusahaan;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function savePerusahaan(prs: Perusahaan): Promise<void> {
  const prsId = prs.id;
  if (!prsId) throw new Error('ID perusahaan tidak valid');
  const path = `perusahaan/${prsId}`;
  try {
    await setDoc(doc(db, 'perusahaan', prsId), cleanData(prs), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deletePerusahaan(prsId: string): Promise<void> {
  if (!prsId) return;
  const path = `perusahaan/${prsId}`;
  try {
    await deleteDoc(doc(db, 'perusahaan', prsId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function getAllPerusahaan(): Promise<Perusahaan[]> {
  const path = 'perusahaan';
  try {
    const snap = await getDocs(collection(db, 'perusahaan'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Perusahaan));
  } catch {
    return [];
  }
}

// ================= KATEGORI =================
export async function getAllKategori(): Promise<Kategori[]> {
  const path = 'kategori';
  try {
    const snap = await getDocs(collection(db, 'kategori'));
    if (snap.empty) return DEFAULT_KATEGORI;
    return snap.docs.map((d) => d.data() as Kategori);
  } catch {
    return DEFAULT_KATEGORI;
  }
}

export async function saveKategori(kat: Kategori): Promise<void> {
  const path = `kategori/${kat.id}`;
  try {
    await setDoc(doc(db, 'kategori', kat.id), cleanData(kat), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteKategori(id: string): Promise<void> {
  const path = `kategori/${id}`;
  try {
    await deleteDoc(doc(db, 'kategori', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ================= LOWONGAN =================
export async function getAllLowongan(): Promise<Lowongan[]> {
  const path = 'lowongan';
  try {
    const snap = await getDocs(collection(db, 'lowongan'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lowongan));
  } catch {
    return [];
  }
}

export async function saveLowongan(job: Lowongan): Promise<void> {
  const path = `lowongan/${job.id}`;
  try {
    await setDoc(doc(db, 'lowongan', job.id), cleanData(job), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteLowongan(id: string): Promise<void> {
  const path = `lowongan/${id}`;
  try {
    await deleteDoc(doc(db, 'lowongan', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ================= LAMARAN =================
export async function getAllLamaran(): Promise<Lamaran[]> {
  if (!auth.currentUser) return [];
  const path = 'lamaran';
  try {
    const snap = await getDocs(collection(db, 'lamaran'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lamaran));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function getLamaranByUser(userId: string): Promise<Lamaran[]> {
  if (!auth.currentUser) return [];
  const path = 'lamaran';
  try {
    const q = query(collection(db, 'lamaran'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Lamaran);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveLamaran(lamaran: Lamaran): Promise<void> {
  const path = `lamaran/${lamaran.id}`;
  try {
    await setDoc(doc(db, 'lamaran', lamaran.id), cleanData(lamaran), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// ================= RIWAYAT LAMARAN =================
export async function getRiwayatByLamaran(lamaranId: string): Promise<RiwayatLamaran[]> {
  const path = 'riwayat';
  try {
    const q = query(collection(db, 'riwayat'), where('lamaranId', '==', lamaranId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as RiwayatLamaran);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveRiwayat(riw: RiwayatLamaran): Promise<void> {
  const path = `riwayat/${riw.id}`;
  try {
    await setDoc(doc(db, 'riwayat', riw.id), cleanData(riw), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// ================= AGENDA =================
export async function getAllAgenda(): Promise<Agenda[]> {
  const path = 'agenda';
  try {
    const snap = await getDocs(collection(db, 'agenda'));
    return snap.docs.map((d) => d.data() as Agenda);
  } catch {
    return [];
  }
}

export async function saveAgenda(agenda: Agenda): Promise<void> {
  const path = `agenda/${agenda.id}`;
  try {
    await setDoc(doc(db, 'agenda', agenda.id), cleanData(agenda), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteAgenda(id: string): Promise<void> {
  const path = `agenda/${id}`;
  try {
    await deleteDoc(doc(db, 'agenda', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ================= PENGUMUMAN =================
export async function getAllPengumuman(): Promise<Pengumuman[]> {
  const path = 'pengumuman';
  try {
    const snap = await getDocs(collection(db, 'pengumuman'));
    return snap.docs.map((d) => d.data() as Pengumuman);
  } catch {
    return [];
  }
}

export async function savePengumuman(p: Pengumuman): Promise<void> {
  const path = `pengumuman/${p.id}`;
  try {
    await setDoc(doc(db, 'pengumuman', p.id), cleanData(p), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deletePengumuman(id: string): Promise<void> {
  const path = `pengumuman/${id}`;
  try {
    await deleteDoc(doc(db, 'pengumuman', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ================= NOTIFIKASI =================
export async function getNotifikasiByUser(userId: string): Promise<Notifikasi[]> {
  if (!auth.currentUser) return [];
  const path = 'notifikasi';
  try {
    const q = query(collection(db, 'notifikasi'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Notifikasi);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveNotifikasi(notif: Notifikasi): Promise<void> {
  const path = `notifikasi/${notif.id}`;
  try {
    await setDoc(doc(db, 'notifikasi', notif.id), cleanData(notif), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// ================= PENEMPATAN =================
export async function getAllPenempatan(): Promise<Penempatan[]> {
  const path = 'penempatan';
  try {
    const snap = await getDocs(collection(db, 'penempatan'));
    return snap.docs.map((d) => d.data() as Penempatan);
  } catch {
    return [];
  }
}

export async function savePenempatan(pen: Penempatan): Promise<void> {
  const path = `penempatan/${pen.id}`;
  try {
    await setDoc(doc(db, 'penempatan', pen.id), cleanData(pen), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// ================= BROADCAST NOTIFIKASI =================
export async function getAllBroadcasts(): Promise<BroadcastHistory[]> {
  const path = 'broadcasts';
  try {
    const snap = await getDocs(collection(db, 'broadcasts'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as BroadcastHistory))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export async function saveBroadcast(item: BroadcastHistory): Promise<void> {
  const path = `broadcasts/${item.id}`;
  try {
    await setDoc(doc(db, 'broadcasts', item.id), cleanData(item), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteBroadcast(id: string): Promise<void> {
  const path = `broadcasts/${id}`;
  try {
    await deleteDoc(doc(db, 'broadcasts', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ================= GALERI FOTO & VIDEO =================
export async function getAllGaleri(): Promise<GaleriItem[]> {
  try {
    const snap = await getDocs(collection(db, 'galeri'));

    // Cek apakah koleksi galeri sudah pernah diinisialisasi
    let isInitialized = false;
    try {
      const initDoc = await getDoc(doc(db, 'settings', 'galeri_initialized'));
      isInitialized = initDoc.exists() && !!initDoc.data()?.initialized;
    } catch {
      isInitialized = false;
    }

    // Jika belum pernah diinisialisasi dan koleksi masih kosong, masukkan DEFAULT_GALERI ke Firestore
    if (snap.empty && !isInitialized) {
      const initialItems: GaleriItem[] = [...DEFAULT_GALERI];
      try {
        for (const item of initialItems) {
          await setDoc(doc(db, 'galeri', item.id), cleanData(item), { merge: true });
        }
        await setDoc(doc(db, 'settings', 'galeri_initialized'), {
          initialized: true,
          initializedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Gagal seeding otomatis galeri ke Firestore:', err);
      }
      return initialItems;
    }

    // Jika sudah diinisialisasi dan koleksi kosong, berarti admin memang sengaja menghapus semua item
    if (snap.empty && isInitialized) {
      return [];
    }

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GaleriItem));
    return items.sort((a, b) => new Date(b.tanggal || b.createdAt).getTime() - new Date(a.tanggal || a.createdAt).getTime());
  } catch (err) {
    console.warn('Error fetching galeri:', err);
    return DEFAULT_GALERI;
  }
}

export async function saveGaleriItem(item: GaleriItem): Promise<void> {
  const path = `galeri/${item.id}`;
  try {
    await setDoc(doc(db, 'galeri', item.id), cleanData(item), { merge: true });
    // Pastikan flag initialized tersimpan agar penghapusan berikutnya tidak mengembalikan default
    await setDoc(doc(db, 'settings', 'galeri_initialized'), {
      initialized: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteGaleriItem(id: string): Promise<void> {
  const path = `galeri/${id}`;
  try {
    await deleteDoc(doc(db, 'galeri', id));
    // Tandai bahwa galeri sudah diinisialisasi sehingga penghapusan item tidak menimbulkan default data lagi
    await setDoc(doc(db, 'settings', 'galeri_initialized'), {
      initialized: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function deleteBatchGaleriItems(ids: string[]): Promise<void> {
  try {
    for (const id of ids) {
      await deleteDoc(doc(db, 'galeri', id));
    }
    await setDoc(doc(db, 'settings', 'galeri_initialized'), {
      initialized: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'galeri/batch');
  }
}

// ================= AUDIT LOG =================
export async function logAudit(aksi: string, modul: string, recordId?: string, user?: UserProfile | null): Promise<void> {
  if (!auth.currentUser) return;
  const id = 'adt_' + Math.random().toString(36).slice(2, 9);
  const log: AuditLog = {
    id,
    userId: user ? user.id : auth.currentUser.uid,
    userName: user ? user.name : (auth.currentUser.displayName || 'Pengguna'),
    aksi,
    modul,
    recordId,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'auditLog', id), cleanData(log));
  } catch {
    // Non-blocking log
  }
}

export async function getAllAuditLogs(): Promise<AuditLog[]> {
  if (!auth.currentUser) return [];
  const path = 'auditLog';
  try {
    const snap = await getDocs(collection(db, 'auditLog'));
    return snap.docs
      .map((d) => d.data() as AuditLog)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// ================= SETTINGS =================
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'general'));
    if (snap.exists()) {
      return snap.data() as SiteSettings;
    }
  } catch {
    // fallback default
  }
  return {
    siteName: 'BKK SMK PGRI 1 Taman',
    siteEmail: 'bkk@smkpgri1taman.sch.id',
    sitePhone: '(031) 788-1234',
    siteAddress: 'Jl. Raya Wonocolo No. 24, Taman, Sidoarjo, Jawa Timur'
  };
}

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  const path = 'settings/general';
  try {
    await setDoc(doc(db, 'settings', 'general'), cleanData(settings), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// ================= RESET ALL DATA (EXCEPT ADMIN) =================
export async function resetAllDataExceptAdmin(): Promise<{ success: boolean; message: string }> {
  if (!auth.currentUser) {
    return {
      success: false,
      message: 'Silakan login sebagai administrator untuk melakukan reset data.'
    };
  }

  try {
    // 1. Reset non-admin users
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const d of usersSnap.docs) {
      const u = d.data() as UserProfile;
      const isAdminUser =
        u.role === 'admin' ||
        u.email === 'gukarabsensi@gmail.com' ||
        d.id === auth.currentUser.uid;
      if (!isAdminUser) {
        await deleteDoc(d.ref);
      }
    }

    // 2. Reset Pencari Kerja
    const pkSnap = await getDocs(collection(db, 'pencariKerja'));
    for (const d of pkSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 3. Reset Perusahaan
    const prsSnap = await getDocs(collection(db, 'perusahaan'));
    for (const d of prsSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 4. Reset Lowongan
    const lowSnap = await getDocs(collection(db, 'lowongan'));
    for (const d of lowSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 5. Reset Lamaran
    const lamSnap = await getDocs(collection(db, 'lamaran'));
    for (const d of lamSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 6. Reset Riwayat
    const riwSnap = await getDocs(collection(db, 'riwayat'));
    for (const d of riwSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 7. Reset Agenda
    const agdSnap = await getDocs(collection(db, 'agenda'));
    for (const d of agdSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 8. Reset Pengumuman
    const pngSnap = await getDocs(collection(db, 'pengumuman'));
    for (const d of pngSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 9. Reset Notifikasi
    const notifSnap = await getDocs(collection(db, 'notifikasi'));
    for (const d of notifSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 10. Reset Penempatan
    const penSnap = await getDocs(collection(db, 'penempatan'));
    for (const d of penSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 11. Reset Audit Log
    const logSnap = await getDocs(collection(db, 'auditLog'));
    for (const d of logSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 12. Reset Riwayat Broadcast
    const bcastSnap = await getDocs(collection(db, 'broadcasts'));
    for (const d of bcastSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 13. Reset Galeri Foto & Video
    const galeriSnap = await getDocs(collection(db, 'galeri'));
    for (const d of galeriSnap.docs) {
      await deleteDoc(d.ref);
    }

    // Pastikan kategori dasar tetap tersedia
    for (const kat of DEFAULT_KATEGORI) {
      await setDoc(doc(db, 'kategori', kat.id), kat, { merge: true });
    }

    // Catat log reset
    const logId = 'adt_reset_' + Date.now().toString(36);
    await setDoc(doc(db, 'auditLog', logId), {
      id: logId,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || 'Administrator',
      aksi: 'RESET_DATA_SYSTEM',
      modul: 'PENGATURAN',
      createdAt: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Seluruh data sistem berhasil direset! Akun administrator dan kategori dasar tetap aman.'
    };
  } catch (err) {
    console.error('Gagal reset data Firestore:', err);
    return {
      success: false,
      message: 'Gagal melakukan reset: ' + (err instanceof Error ? err.message : String(err))
    };
  }
}

// ================= SEED DATA TO FIRESTORE =================
export async function seedInitialDataToFirestore(): Promise<{ success: boolean; message: string }> {
  if (!auth.currentUser) {
    return {
      success: false,
      message: 'Silakan login terlebih dahulu untuk menyinkronkan data awal ke Cloud Firestore.'
    };
  }

  try {
    // 1. Kategori
    for (const kat of DEFAULT_KATEGORI) {
      await setDoc(doc(db, 'kategori', kat.id), kat, { merge: true });
    }

    // 2. Perusahaan Mitra
    for (const prs of DEFAULT_PERUSAHAAN) {
      await setDoc(doc(db, 'perusahaan', prs.id), prs, { merge: true });
    }

    // 3. Lowongan Kerja
    for (const job of DEFAULT_LOWONGAN) {
      await setDoc(doc(db, 'lowongan', job.id), job, { merge: true });
    }

    // 4. Agenda
    for (const agd of DEFAULT_AGENDA) {
      await setDoc(doc(db, 'agenda', agd.id), agd, { merge: true });
    }

    // 5. Pengumuman
    for (const p of DEFAULT_PENGUMUMAN) {
      await setDoc(doc(db, 'pengumuman', p.id), p, { merge: true });
    }

    // 6. Settings
    const settings: SiteSettings = {
      siteName: 'BKK SMK PGRI 1 Taman',
      siteEmail: 'bkk@smkpgri1taman.sch.id',
      sitePhone: '(031) 788-1234',
      siteAddress: 'Jl. Raya Wonocolo No. 24, Taman, Pemalang, Jawa Tengah',
      siteCity: 'Pemalang'
    };
    await setDoc(doc(db, 'settings', 'general'), settings, { merge: true });

    // 7. Galeri Foto & Video
    for (const gal of DEFAULT_GALERI) {
      await setDoc(doc(db, 'galeri', gal.id), gal, { merge: true });
    }

    return { success: true, message: 'Data awal BKK berhasil disinkronisasikan ke Firebase Firestore!' };
  } catch (err) {
    console.error('Gagal inisialisasi data Firestore:', err);
    return { success: false, message: 'Gagal inisialisasi data: ' + (err instanceof Error ? err.message : String(err)) };
  }
}
