export type UserRole = 'admin' | 'operator' | 'company' | 'user';
export type UserStatus = 'active' | 'blocked';
export type CompanyStatus = 'pending' | 'verified' | 'rejected' | 'blocked';
export type JobStatus = 'draft' | 'pending' | 'published' | 'closed' | 'rejected';
export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';

export type ApplicationStatus =
  | 'diajukan'
  | 'dilihat'
  | 'seleksi_administrasi'
  | 'lulus_administrasi'
  | 'tidak_lulus'
  | 'dipanggil_interview'
  | 'interview'
  | 'diterima'
  | 'ditolak'
  | 'dibatalkan';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
  photoURL?: string;
  createdAt: string | number;
}

export interface EducationItem {
  id: string;
  jenjang: string;
  institusi: string;
  jurusan: string;
  tahunMasuk?: number | string;
  tahunLulus?: number | string;
  nilai?: number | string;
}

export interface ExperienceItem {
  id: string;
  jabatan: string;
  perusahaan: string;
  tanggalMulai: string;
  tanggalSelesai?: string;
  deskripsi?: string;
}

export interface SkillItem {
  id: string;
  nama: string;
  level: 'pemula' | 'menengah' | 'mahir';
}

export interface DocumentItem {
  id: string;
  jenis: 'cv' | 'ijazah' | 'sertifikat' | 'ktp' | 'lainnya';
  namaFile: string;
  ukuran: number;
  url?: string;
  createdAt: number | string;
}

export interface PencariKerja {
  id: string;
  userId: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P' | string;
  tempatLahir?: string;
  tanggalLahir?: string;
  noHp: string;
  alamat?: string;
  desa?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
  kodePos?: string;
  tahunLulus?: string | number;
  jurusan?: string;
  foto?: string | null;
  bio?: string;
  status?: string;
  pendidikan: EducationItem[];
  pengalaman: ExperienceItem[];
  keahlian: SkillItem[];
  dokumen: DocumentItem[];
  createdAt: string | number;
}

export interface Perusahaan {
  id: string;
  userId: string;
  namaPerusahaan: string;
  bidangUsaha: string;
  deskripsi?: string;
  alamat?: string;
  kecamatan?: string;
  kabupaten: string;
  provinsi?: string;
  website?: string;
  email: string;
  noTelepon: string;
  namaPic: string;
  jabatanPic?: string;
  nib?: string;
  npwp?: string;
  statusVerifikasi: CompanyStatus;
  createdAt: string | number;
}

export interface Kategori {
  id: string;
  nama: string;
  slug: string;
  status: boolean;
}

export interface Lowongan {
  id: string;
  perusahaanId: string;
  kategoriId: string;
  judul: string;
  slug: string;
  deskripsi: string;
  persyaratan: string;
  lokasi: string;
  jenisPekerjaan: JobType;
  pendidikanMinimal: string;
  jurusan?: string;
  pengalamanMinimal?: string;
  usiaMinimal?: number | null;
  usiaMaksimal?: number | null;
  gajiMinimal?: number | null;
  gajiMaksimal?: number | null;
  jumlahKebutuhan: number;
  tanggalBuka: string;
  tanggalTutup: string;
  kontak: string;
  status: JobStatus;
  createdAt: string | number;
}

export type VerifikasiLamaranStatus = 'menunggu_verifikasi' | 'disetujui' | 'diblokir';

export interface Lamaran {
  id: string;
  lowonganId: string;
  pencariKerjaId: string;
  userId: string;
  coverLetter?: string;
  status: ApplicationStatus;
  statusVerifikasi?: VerifikasiLamaranStatus;
  catatanVerifikasi?: string;
  verifikasiOleh?: string;
  tanggalVerifikasi?: string;
  catatan?: string;
  tanggalLamar: string;
  createdAt: string | number;
}

export interface RiwayatLamaran {
  id: string;
  lamaranId: string;
  statusLama: ApplicationStatus | null;
  statusBaru: ApplicationStatus;
  catatan?: string;
  diubahOleh?: string | null;
  createdAt: string;
}

export interface Agenda {
  id: string;
  judul: string;
  slug: string;
  deskripsi: string;
  tanggalMulai: string;
  tanggalSelesai?: string | null;
  lokasi: string;
  penyelenggara: string;
  status: 'draft' | 'published' | 'closed';
  createdAt: string | number;
}

export interface Pengumuman {
  id: string;
  judul: string;
  slug: string;
  isi: string;
  status: 'draft' | 'published';
  publishedAt: string;
  createdAt: string | number;
}

export interface Notifikasi {
  id: string;
  userId: string;
  judul: string;
  pesan: string;
  url?: string;
  dibacaAt?: string | null;
  createdAt: string;
}

export interface Penempatan {
  id: string;
  lamaranId?: string;
  perusahaanId: string;
  pencariKerjaId: string;
  jabatan: string;
  tanggalMasuk: string;
  status: string;
  catatan?: string;
  createdAt: string | number;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  userName: string;
  aksi: string;
  modul: string;
  recordId?: string;
  createdAt: string;
}

export interface SiteSettings {
  siteName: string;
  siteEmail: string;
  sitePhone: string;
  siteAddress: string;
  siteCity?: string;
  siteLogo?: string;
  waGatewayUrl?: string;
  waGatewayApiKey?: string;
  autoBroadcastWa?: boolean;
}

export interface BroadcastHistory {
  id: string;
  judul: string;
  pesan: string;
  targetKategori: 'semua_alumni' | 'alumni_jurusan' | 'alumni_tahun' | 'semua_perusahaan' | 'semua';
  filterDetail?: string;
  totalPenerima: number;
  totalBerhasil: number;
  totalGagal: number;
  metode: 'gateway_api' | 'manual_queue';
  dikirimOleh?: string;
  createdAt: string;
}

export type MediaTipe = 'foto' | 'video';

export interface GaleriItem {
  id: string;
  tipe: MediaTipe; // 'foto' | 'video'
  judul: string;
  deskripsi?: string;
  kategori: string; // e.g. 'Kegiatan BKK', 'Kunjungan Industri', 'Job Fair', 'Rekrutmen Kampus', 'Pelatihan', 'Profil BKK', 'Lainnya'
  tanggal: string; // YYYY-MM-DD
  url: string; // Image URL / Base64 or Video URL (YouTube embed or video stream)
  thumbnailUrl?: string; // Preview thumbnail for video or photo
  youtubeId?: string; // YouTube ID if applicable
  status: 'publik' | 'draft';
  isFeatured?: boolean; // Tampil di showcase beranda
  dibuatOleh?: string;
  createdAt: string;
  updatedAt?: string;
}


