import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import type {
  Lowongan,
  Perusahaan,
  Lamaran,
  PencariKerja,
  Kategori,
  JobType,
  ApplicationStatus,
  RiwayatLamaran,
  Penempatan
} from '../types.js';
import {
  fmtDate,
  fmtDateTime,
  initials,
  uid,
  slugify,
  STATUS_LOWONGAN_MAP,
  STATUS_LAMARAN_MAP,
  STATUS_PERUSAHAAN_MAP,
  JENIS_PEKERJAAN_MAP,
  exportCSVFile
} from '../utils/formatters.js';
import { printOrDownloadCV, downloadFile } from '../utils/cvExporter.js';
import {
  savePerusahaan,
  saveLowongan,
  saveLamaran,
  saveRiwayat,
  saveNotifikasi,
  savePenempatan
} from '../services/db.js';

interface CompanyViewsProps {
  lowongan: Lowongan[];
  perusahaan: Perusahaan[];
  lamaran: Lamaran[];
  pencariKerja: PencariKerja[];
  kategori: Kategori[];
  onNavigate: (route: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshData: () => Promise<void>;
  subParam?: string;
}

// ----------------- COMPANY DASHBOARD -----------------
export const CompanyDashboardView: React.FC<CompanyViewsProps> = ({
  lowongan,
  lamaran,
  pencariKerja,
  onNavigate
}) => {
  const { perusahaan } = useAuth();
  const myJobs = lowongan.filter((l) => l.perusahaanId === perusahaan?.id);
  const myJobIds = myJobs.map((j) => j.id);
  // Hanya lamaran yang telah disetujui BKK yang tampil di dashboard perusahaan
  const myApps = lamaran.filter((a) => myJobIds.includes(a.lowonganId) && a.statusVerifikasi === 'disetujui');
  const newApps = myApps.filter((a) => ['diajukan', 'dilihat'].includes(a.status));
  const accepted = myApps.filter((a) => a.status === 'diterima');

  return (
    <div>
      <h1 className="page-title">Dashboard HRD Perusahaan</h1>
      <p className="page-sub">
        {perusahaan?.namaPerusahaan} · Status:{' '}
        <span className={`badge ${STATUS_PERUSAHAAN_MAP[perusahaan?.statusVerifikasi || 'pending']?.cls || 'amber'}`}>
          {STATUS_PERUSAHAAN_MAP[perusahaan?.statusVerifikasi || 'pending']?.label || 'Menunggu Verifikasi'}
        </span>
      </p>

      {perusahaan?.statusVerifikasi === 'pending' && (
        <div className="skeleton-note">
          ⏳ Akun perusahaan Anda saat ini sedang dalam proses verifikasi oleh Admin BKK SMK PGRI 1 Taman. Anda dapat
          melengkapi profil dan membuat draf lowongan, namun publikasi live membutuhkan verifikasi sekolah.
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi">
        <div className="card">
          <div className="n">{myJobs.length}</div>
          <div className="l">Total Lowongan</div>
        </div>
        <div className="card">
          <div className="n">{myJobs.filter((j) => j.status === 'published').length}</div>
          <div className="l">Lowongan Aktif</div>
        </div>
        <div className="card">
          <div className="n">{myApps.length}</div>
          <div className="l">Total Pelamar Alumni</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: 'var(--primary)' }}>{newApps.length}</div>
          <div className="l">Pelamar Perlu Direview</div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Lowongan Terkini */}
        <div>
          <div className="section-head">
            <div>
              <h2 style={{ fontSize: '16px' }}>Lowongan Kerja Terkini</h2>
            </div>
            <button onClick={() => onNavigate('perusahaan-app/lowongan')} className="link-btn">
              Kelola Semua →
            </button>
          </div>
          <div className="card">
            {myJobs.slice(0, 5).map((j) => {
              const appCount = lamaran.filter((a) => a.lowonganId === j.id).length;
              const statusCfg = STATUS_LOWONGAN_MAP[j.status] || { label: j.status, cls: 'grey' };
              return (
                <div key={j.id} className="list-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{j.judul}</div>
                    <div className="job-meta">
                      {appCount} pelamar · Batas: {fmtDate(j.tanggalTutup)}
                    </div>
                  </div>
                  <span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span>
                </div>
              );
            })}
            {myJobs.length === 0 && (
              <div className="empty">
                Belum ada lowongan dibuat. Silakan tambahkan lowongan kerja pertama Anda.
              </div>
            )}
          </div>
        </div>

        {/* Pelamar Terkini */}
        <div>
          <div className="section-head">
            <div>
              <h2 style={{ fontSize: '16px' }}>Pelamar Terbaru</h2>
            </div>
            <button onClick={() => onNavigate('perusahaan-app/pelamar')} className="link-btn">
              Seleksi Pelamar →
            </button>
          </div>
          <div className="card">
            {myApps.slice(0, 5).map((app) => {
              const pk = pencariKerja.find((p) => p.id === app.pencariKerjaId);
              const job = lowongan.find((l) => l.id === app.lowonganId);
              const statusCfg = STATUS_LAMARAN_MAP[app.status] || { label: app.status, cls: 'grey' };
              return (
                <div key={app.id} className="list-row">
                  <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                    {initials(pk?.namaLengkap || 'Alumni')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{pk?.namaLengkap || 'Pelamar'}</div>
                    <div className="job-meta">{job?.judul || 'Lowongan'} · {fmtDate(app.tanggalLamar)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span>
                    {pk && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: '11px', padding: '2px 6px' }}
                        onClick={() => printOrDownloadCV(pk, job?.judul, perusahaan?.namaPerusahaan)}
                        title="Unduh CV Format BKK"
                      >
                        🖨️ CV
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {myApps.length === 0 && <div className="empty">Belum ada berkas lamaran masuk.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------- COMPANY PROFIL -----------------
export const CompanyProfilView: React.FC<{
  showToast: (msg: string, type?: 'success' | 'error') => void;
}> = ({ showToast }) => {
  const { perusahaan, refreshProfile } = useAuth();
  const [formData, setFormData] = useState({
    namaPerusahaan: perusahaan?.namaPerusahaan || '',
    bidangUsaha: perusahaan?.bidangUsaha || '',
    deskripsi: perusahaan?.deskripsi || '',
    alamat: perusahaan?.alamat || '',
    kecamatan: perusahaan?.kecamatan || '',
    kabupaten: perusahaan?.kabupaten || 'Sidoarjo',
    provinsi: perusahaan?.provinsi || 'Jawa Timur',
    website: perusahaan?.website || '',
    email: perusahaan?.email || '',
    noTelepon: perusahaan?.noTelepon || '',
    namaPic: perusahaan?.namaPic || '',
    jabatanPic: perusahaan?.jabatanPic || 'HRD Manager',
    nib: perusahaan?.nib || '',
    npwp: perusahaan?.npwp || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perusahaan) return;
    setSaving(true);
    try {
      const updated: Perusahaan = {
        ...perusahaan,
        ...formData
      };
      await savePerusahaan(updated);
      await refreshProfile();
      showToast('Profil perusahaan berhasil disimpan ke Firebase!', 'success');
    } catch (err: any) {
      showToast('Gagal menyimpan profil: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Profil Perusahaan Mitra</h1>
      <p className="page-sub">Lengkapi profil legalitas dan identitas industri Anda untuk ditampilkan pada alumni.</p>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '740px' }}>
        <div className="row-2">
          <div className="field">
            <label>Nama Perusahaan (PT/CV)</label>
            <input
              required
              value={formData.namaPerusahaan}
              onChange={(e) => setFormData({ ...formData, namaPerusahaan: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Bidang Usaha</label>
            <input
              required
              value={formData.bidangUsaha}
              onChange={(e) => setFormData({ ...formData, bidangUsaha: e.target.value })}
              placeholder="Manufaktur, Logistik, IT..."
            />
          </div>
        </div>

        <div className="field">
          <label>Deskripsi & Profil Singkat Perusahaan</label>
          <textarea
            value={formData.deskripsi}
            onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
            placeholder="Jelaskan sejarah, spesialisasi produk/jasa, dan skala perusahaan Anda..."
          />
        </div>

        <div className="divider" />
        <h3>Legalitas & Kontak</h3>
        <div className="row-2">
          <div className="field">
            <label>NIB (Nomor Induk Berusaha)</label>
            <input
              value={formData.nib}
              onChange={(e) => setFormData({ ...formData, nib: e.target.value })}
              placeholder="1234567890123"
            />
          </div>
          <div className="field">
            <label>NPWP Perusahaan</label>
            <input
              value={formData.npwp}
              onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
              placeholder="00.000.000.0-000.000"
            />
          </div>
        </div>

        <div className="row-2">
          <div className="field">
            <label>Website Resmi</label>
            <input
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="field">
            <label>Nomor Telepon Kantor / WA</label>
            <input
              required
              value={formData.noTelepon}
              onChange={(e) => setFormData({ ...formData, noTelepon: e.target.value })}
            />
          </div>
        </div>

        <div className="row-2">
          <div className="field">
            <label>Nama PIC HRD</label>
            <input
              required
              value={formData.namaPic}
              onChange={(e) => setFormData({ ...formData, namaPic: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Jabatan PIC</label>
            <input
              value={formData.jabatanPic}
              onChange={(e) => setFormData({ ...formData, jabatanPic: e.target.value })}
            />
          </div>
        </div>

        <div className="row-2">
          <div className="field">
            <label>Kabupaten / Kota</label>
            <input
              required
              value={formData.kabupaten}
              onChange={(e) => setFormData({ ...formData, kabupaten: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Provinsi</label>
            <input
              value={formData.provinsi}
              onChange={(e) => setFormData({ ...formData, provinsi: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label>Alamat Pabrik / Kantor</label>
          <textarea
            value={formData.alamat}
            onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
            placeholder="Jalan, kawasan industri, nomor gedung..."
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Profil Perusahaan'}
        </button>
      </form>
    </div>
  );
};

// ----------------- COMPANY LOWONGAN LIST & FORM -----------------
export const CompanyLowonganListView: React.FC<CompanyViewsProps> = ({
  lowongan,
  lamaran,
  onNavigate,
  showToast,
  onRefreshData
}) => {
  const { perusahaan } = useAuth();
  const myJobs = lowongan.filter((l) => l.perusahaanId === perusahaan?.id);

  const handleCloseJob = async (job: Lowongan) => {
    if (confirm(`Yakin ingin menutup pendaftaran lowongan "${job.judul}"?`)) {
      await saveLowongan({ ...job, status: 'closed' });
      await onRefreshData();
      showToast('Lowongan ditutup.', 'info');
    }
  };

  const handleSubmitForReview = async (job: Lowongan) => {
    await saveLowongan({ ...job, status: 'pending' });
    await onRefreshData();
    showToast('Lowongan diajukan ke Admin BKK untuk verifikasi publikasi.', 'success');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Lowongan Kerja Perusahaan</h1>
          <p className="page-sub">Kelola posisi pekerjaan dan status penayangan di portal BKK.</p>
        </div>
        <button onClick={() => onNavigate('perusahaan-app/lowongan-form/new')} className="btn btn-primary">
          + Tambah Lowongan Baru
        </button>
      </div>

      <div className="card table-card">
        <div className="overflow-x">
          <table>
            <thead>
              <tr>
                <th>Judul Lowongan</th>
                <th>Jenis</th>
                <th>Pelamar</th>
                <th>Batas Pendaftaran</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {myJobs.map((j) => {
                const appCount = lamaran.filter((a) => a.lowonganId === j.id).length;
                const statusCfg = STATUS_LOWONGAN_MAP[j.status] || { label: j.status, cls: 'grey' };
                return (
                  <tr key={j.id}>
                    <td style={{ whiteSpace: 'normal', fontWeight: 600 }}>{j.judul}</td>
                    <td>{JENIS_PEKERJAAN_MAP[j.jenisPekerjaan] || j.jenisPekerjaan}</td>
                    <td><b>{appCount}</b> orang</td>
                    <td>{fmtDate(j.tanggalTutup)}</td>
                    <td><span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => onNavigate(`perusahaan-app/lowongan-form/${j.id}`)}
                        >
                          Edit
                        </button>
                        {j.status === 'draft' && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleSubmitForReview(j)}
                          >
                            Ajukan Verifikasi
                          </button>
                        )}
                        {j.status === 'published' && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleCloseJob(j)}
                          >
                            Tutup
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {myJobs.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      Belum ada lowongan dibuat. Klik tombol "+ Tambah Lowongan Baru" di atas.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const CompanyLowonganFormView: React.FC<CompanyViewsProps> = ({
  lowongan,
  kategori,
  subParam,
  onNavigate,
  showToast,
  onRefreshData
}) => {
  const { perusahaan } = useAuth();
  const isNew = !subParam || subParam === 'new';
  const existingJob = !isNew ? lowongan.find((l) => l.id === subParam) : null;

  const [judul, setJudul] = useState(existingJob?.judul || '');
  const [kategoriId, setKategoriId] = useState(existingJob?.kategoriId || (kategori[0]?.id ?? 'kat_prod'));
  const [deskripsi, setDeskripsi] = useState(existingJob?.deskripsi || '');
  const [persyaratan, setPersyaratan] = useState(existingJob?.persyaratan || '');
  const [lokasi, setLokasi] = useState(existingJob?.lokasi || `${perusahaan?.kabupaten || 'Sidoarjo'}, Jawa Timur`);
  const [jenisPekerjaan, setJenisPekerjaan] = useState<JobType>(existingJob?.jenisPekerjaan || 'full_time');
  const [pendidikanMinimal, setPendidikanMinimal] = useState(existingJob?.pendidikanMinimal || 'SMK Sederajat');
  const [jurusan, setJurusan] = useState(existingJob?.jurusan || '');
  const [pengalamanMinimal, setPengalamanMinimal] = useState(existingJob?.pengalamanMinimal || 'Fresh graduate diperbolehkan');
  const [jumlahKebutuhan, setJumlahKebutuhan] = useState(existingJob?.jumlahKebutuhan || 2);
  const [usiaMinimal, setUsiaMinimal] = useState(existingJob?.usiaMinimal || 18);
  const [usiaMaksimal, setUsiaMaksimal] = useState(existingJob?.usiaMaksimal || 25);
  const [gajiMinimal] = useState(existingJob?.gajiMinimal || 0);
  const [gajiMaksimal] = useState(existingJob?.gajiMaksimal || 0);
  const [tanggalTutup, setTanggalTutup] = useState(
    existingJob?.tanggalTutup?.slice(0, 10) ||
      new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (submitType: 'draft' | 'pending') => {
    if (!perusahaan) {
      showToast('Profil perusahaan tidak ditemukan', 'error');
      return;
    }
    if (!judul.trim() || !deskripsi.trim() || !persyaratan.trim()) {
      showToast('Harap lengkapi semua kolom wajib!', 'error');
      return;
    }

    setSaving(true);
    try {
      const jobId = existingJob ? existingJob.id : uid('low');
      const jobSlug = existingJob?.slug || slugify(`${judul}-${perusahaan.namaPerusahaan.slice(0, 15)}-${Date.now().toString(36)}`);

      const jobData: Lowongan = {
        id: jobId,
        perusahaanId: perusahaan.id,
        kategoriId,
        judul: judul.trim(),
        slug: jobSlug,
        deskripsi: deskripsi.trim(),
        persyaratan: persyaratan.trim(),
        lokasi: lokasi.trim(),
        jenisPekerjaan,
        pendidikanMinimal,
        jurusan: jurusan.trim(),
        pengalamanMinimal,
        jumlahKebutuhan: Number(jumlahKebutuhan),
        usiaMinimal: Number(usiaMinimal),
        usiaMaksimal: Number(usiaMaksimal),
        gajiMinimal: Number(gajiMinimal),
        gajiMaksimal: Number(gajiMaksimal),
        tanggalBuka: existingJob?.tanggalBuka || new Date().toISOString(),
        tanggalTutup: new Date(tanggalTutup).toISOString(),
        kontak: perusahaan.email,
        status: submitType === 'pending' ? 'pending' : 'draft',
        createdAt: existingJob?.createdAt || new Date().toISOString()
      };

      await saveLowongan(jobData);
      await onRefreshData();
      if (submitType === 'pending') {
        showToast(
          isNew
            ? 'Lowongan berhasil dibuat & diajukan! Menunggu verifikasi dari Admin BKK sebelum tayang publik.'
            : 'Perubahan lowongan berhasil diajukan! Menunggu verifikasi dari Admin BKK.',
          'success'
        );
      } else {
        showToast('Lowongan berhasil disimpan sebagai draft.', 'info');
      }
      onNavigate('perusahaan-app/lowongan');
    } catch (err: any) {
      showToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">{isNew ? 'Tambah Lowongan Kerja' : 'Edit Lowongan Kerja'}</h1>
      <p className="page-sub">Isi rincian posisi dan kualifikasi yang dicari. Lowongan akan diverifikasi oleh Admin BKK sebelum dipublikasikan ke portal publik.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit('pending');
        }}
        className="card"
        style={{ maxWidth: '780px' }}
      >
        <div className="row-2">
          <div className="field">
            <label>Judul Lowongan <span className="req-star">*</span></label>
            <input required value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Cth: Operator Mesin Bubut CNC" />
          </div>
          <div className="field">
            <label>Kategori Pekerjaan <span className="req-star">*</span></label>
            <select value={kategoriId} onChange={(e) => setKategoriId(e.target.value)}>
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Deskripsi Pekerjaan <span className="req-star">*</span></label>
          <textarea
            required
            rows={4}
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            placeholder="Jelaskan tugas harian, sistem shift, dan peran yang akan dijalankan..."
          />
        </div>

        <div className="field">
          <label>Persyaratan & Kualifikasi <span className="req-star">*</span></label>
          <textarea
            required
            rows={4}
            value={persyaratan}
            onChange={(e) => setPersyaratan(e.target.value)}
            placeholder="Kriteria usia, keahlian khusus, kondisi fisik, dan berkas yang diperlukan..."
          />
        </div>

        <div className="row-2">
          <div className="field">
            <label>Lokasi Kerja</label>
            <input value={lokasi} onChange={(e) => setLokasi(e.target.value)} />
          </div>
          <div className="field">
            <label>Jenis Pekerjaan</label>
            <select value={jenisPekerjaan} onChange={(e) => setJenisPekerjaan(e.target.value as JobType)}>
              {Object.entries(JENIS_PEKERJAAN_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="row-2">
          <div className="field">
            <label>Pendidikan Minimum</label>
            <input value={pendidikanMinimal} onChange={(e) => setPendidikanMinimal(e.target.value)} />
          </div>
          <div className="field">
            <label>Jurusan Spesifik (Opsional)</label>
            <input value={jurusan} onChange={(e) => setJurusan(e.target.value)} placeholder="Teknik Mesin / TKR / RPL" />
          </div>
        </div>

        <div className="row-2">
          <div className="field">
            <label>Batas Usia (Min - Max)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" value={usiaMinimal} onChange={(e) => setUsiaMinimal(Number(e.target.value))} placeholder="Min" />
              <input type="number" value={usiaMaksimal} onChange={(e) => setUsiaMaksimal(Number(e.target.value))} placeholder="Max" />
            </div>
          </div>
          <div className="field">
            <label>Batas Akhir Pendaftaran</label>
            <input type="date" value={tanggalTutup} onChange={(e) => setTanggalTutup(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-outline"
            disabled={saving}
            onClick={() => handleSubmit('draft')}
          >
            Simpan sebagai Draft
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan & Ajukan Verifikasi ke Admin'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ----------------- COMPANY PELAMAR -----------------
export const CompanyPelamarView: React.FC<CompanyViewsProps> = ({
  lowongan,
  lamaran,
  pencariKerja,
  showToast,
  onRefreshData
}) => {
  const { perusahaan, userProfile } = useAuth();
  const myJobs = lowongan.filter((l) => l.perusahaanId === perusahaan?.id);
  const myJobIds = myJobs.map((j) => j.id);
  const [selectedFilterJob, setSelectedFilterJob] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<Lamaran | null>(null);

  const [newStatus, setNewStatus] = useState<ApplicationStatus>('seleksi_administrasi');
  const [statusNote, setStatusNote] = useState('');
  const [saving, setSaving] = useState(false);

  let filteredApps = lamaran.filter((a) => myJobIds.includes(a.lowonganId) && a.statusVerifikasi === 'disetujui');
  if (selectedFilterJob !== 'all') {
    filteredApps = filteredApps.filter((a) => a.lowonganId === selectedFilterJob);
  }

  const handleUpdateStatus = async () => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      const oldStatus = selectedApp.status;
      const updatedApp: Lamaran = {
        ...selectedApp,
        status: newStatus,
        catatan: statusNote
      };
      await saveLamaran(updatedApp);

      // Tambahkan riwayat status
      const riw: RiwayatLamaran = {
        id: uid('riw'),
        lamaranId: selectedApp.id,
        statusLama: oldStatus,
        statusBaru: newStatus,
        catatan: statusNote,
        diubahOleh: userProfile?.id,
        createdAt: new Date().toISOString()
      };
      await saveRiwayat(riw);

      // Kirim notifikasi otomatis ke pelamar
      const job = lowongan.find((l) => l.id === selectedApp.lowonganId);
      await saveNotifikasi({
        id: uid('ntf'),
        userId: selectedApp.userId,
        judul: `Status Lamaran: ${job?.judul || 'Pekerjaan'}`,
        pesan: `Perusahaan ${perusahaan?.namaPerusahaan} memperbarui status Anda menjadi "${STATUS_LAMARAN_MAP[newStatus]?.label}". Catatan: ${statusNote || '-'}`,
        url: '#/user/lamaran',
        createdAt: new Date().toISOString()
      });

      // Jika diterima, catat ke data penempatan kerja
      if (newStatus === 'diterima' && perusahaan) {
        const pen: Penempatan = {
          id: uid('pen'),
          lamaranId: selectedApp.id,
          perusahaanId: perusahaan.id,
          pencariKerjaId: selectedApp.pencariKerjaId,
          jabatan: job?.judul || 'Staff',
          tanggalMasuk: new Date().toISOString(),
          status: 'aktif',
          catatan: statusNote,
          createdAt: Date.now()
        };
        await savePenempatan(pen);
      }

      await onRefreshData();
      showToast('Status seleksi pelamar berhasil diperbarui!', 'success');
      setSelectedApp(null);
      setStatusNote('');
    } catch (err: any) {
      showToast('Gagal update status: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Manajemen Berkas Pelamar Alumni</h1>
      <p className="page-sub">Tinjau profil lulusan, CV, dan ubah status proses tahapan seleksi.</p>

      {/* Filter by Job */}
      <div className="chip-tabs">
        <button
          className={`chip-tab ${selectedFilterJob === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedFilterJob('all')}
        >
          Semua Lowongan ({myAppsCount(lamaran, myJobIds)})
        </button>
        {myJobs.map((j) => {
          const count = lamaran.filter((a) => a.lowonganId === j.id).length;
          return (
            <button
              key={j.id}
              className={`chip-tab ${selectedFilterJob === j.id ? 'active' : ''}`}
              onClick={() => setSelectedFilterJob(j.id)}
            >
              {j.judul} ({count})
            </button>
          );
        })}
      </div>

      <div className="card table-card">
        <div className="overflow-x">
          <table>
            <thead>
              <tr>
                <th>Nama Pelamar</th>
                <th>Jurusan & Kelulusan</th>
                <th>Posisi Dilamar</th>
                <th>Tanggal Lamar</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((a) => {
                const pk = pencariKerja.find((p) => p.id === a.pencariKerjaId);
                const job = lowongan.find((l) => l.id === a.lowonganId);
                const statusCfg = STATUS_LAMARAN_MAP[a.status] || { label: a.status, cls: 'grey' };
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar" style={{ width: '34px', height: '34px', fontSize: '12px', overflow: 'hidden', borderRadius: '8px', flexShrink: 0 }}>
                          {pk?.foto ? (
                            <img src={pk.foto} alt={pk.namaLengkap} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            initials(pk?.namaLengkap || 'A')
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{pk?.namaLengkap || 'Alumni'}</div>
                          <div className="job-meta">{pk?.noHp || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{pk?.jurusan || 'Alumni'}</div>
                      <div className="job-meta">Lulus: {pk?.tahunLulus || '-'}</div>
                    </td>
                    <td>{job?.judul || '-'}</td>
                    <td>{fmtDate(a.tanggalLamar)}</td>
                    <td><span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setSelectedApp(a);
                            setNewStatus(a.status);
                            setStatusNote(a.catatan || '');
                          }}
                        >
                          👁️ Tinjau Profil & Seleksi
                        </button>
                        {pk && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => printOrDownloadCV(pk, job?.judul, perusahaan?.namaPerusahaan)}
                            title="Unduh / Cetak CV Pelamar Format BKK"
                          >
                            🖨️ Unduh CV
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">Belum ada pelamar pada kategori lowongan ini.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Review Pelamar & Update Status */}
      {selectedApp && (
        <div className="modal-bg" onClick={() => setSelectedApp(null)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            {(() => {
              const pk = pencariKerja.find((p) => p.id === selectedApp.pencariKerjaId);
              const job = lowongan.find((l) => l.id === selectedApp.lowonganId);
              const cvDoc = pk?.dokumen?.find((d) => d.jenis === 'cv');

              return (
                <>
                  <div className="modal-head">
                    <h3>Seleksi Pelamar: {pk?.namaLengkap}</h3>
                    <button className="icon-btn" onClick={() => setSelectedApp(null)}>✕</button>
                  </div>

                  <div className="job-meta" style={{ marginBottom: '16px' }}>
                    Posisi: <b>{job?.judul}</b> · Dilamar pada {fmtDateTime(selectedApp.tanggalLamar)}
                  </div>

                  {/* Ringkasan Profil Pelamar */}
                  <div className="card" style={{ background: 'var(--bg)', marginBottom: '16px', padding: '14px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '80px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                        }}
                      >
                        {pk?.foto ? (
                          <img src={pk.foto} alt={pk.namaLengkap} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '26px' }}>👤</span>
                        )}
                      </div>
                      <div className="row-2" style={{ gap: '8px', fontSize: '13px', flex: 1 }}>
                        <div><b>No. Kontak:</b> {pk?.noHp || '-'}</div>
                        <div><b>Tahun Lulus:</b> {pk?.tahunLulus || '-'}</div>
                        <div><b>Jurusan:</b> {pk?.jurusan || '-'}</div>
                        <div><b>Domisili:</b> {pk?.kabupaten || '-'}</div>
                      </div>
                    </div>

                    {/* Riwayat Pendidikan Singkat */}
                    {(pk?.pendidikan || []).length > 0 && (
                      <div style={{ marginTop: '10px', fontSize: '12.5px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                        <b>Pendidikan:</b>{' '}
                        {pk?.pendidikan.map((e) => `${e.institusi} (${e.jurusan || e.jenjang} - ${e.tahunLulus})`).join(' · ')}
                      </div>
                    )}

                    {/* Keahlian Teknis */}
                    {(pk?.keahlian || []).length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '12.5px' }}>
                        <b>Keahlian Teknis:</b>{' '}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {pk?.keahlian.map((k) => (
                            <span key={k.id} className="tag blue" style={{ fontSize: '11px', padding: '2px 6px' }}>
                              {k.nama} ({k.level})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dokumen & Seluruh Berkas Pendukung Terlampir */}
                    <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>
                          📁 Berkas & Dokumen Pendukung Terlampir ({(pk?.dokumen || []).length})
                        </div>
                        {pk && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => printOrDownloadCV(pk, job?.judul, perusahaan?.namaPerusahaan)}
                            title="Unduh dan simpan formulir CV lengkap pelamar dalam format PDF"
                          >
                            🖨️ Cetak / Unduh CV Format BKK
                          </button>
                        )}
                      </div>

                      {(pk?.dokumen || []).length === 0 ? (
                        <div className="job-meta">Pelamar belum melampirkan berkas file dokumen.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(pk?.dokumen || []).map((d) => {
                            const iconMap: Record<string, string> = {
                              cv: '📄',
                              ijazah: '🎓',
                              sertifikat: '📜',
                              ktp: '🪪',
                              lainnya: '📎'
                            };
                            return (
                              <div
                                key={d.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '6px',
                                  gap: '10px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                  <span style={{ fontSize: '16px' }}>{iconMap[d.jenis] || '📎'}</span>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {d.namaFile}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      <span className="tag blue" style={{ fontSize: '10px', padding: '1px 5px', marginRight: '6px' }}>
                                        {d.jenis.toUpperCase()}
                                      </span>
                                      {(d.ukuran / 1024).toFixed(0)} KB
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  {d.url ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-primary"
                                      style={{ fontSize: '12px', padding: '3px 9px' }}
                                      onClick={() => downloadFile(d.url!, d.namaFile)}
                                      title={`Unduh ${d.namaFile}`}
                                    >
                                      📥 Unduh Berkas
                                    </button>
                                  ) : (
                                    <span className="job-meta" style={{ fontSize: '11px' }}>Tersimpan</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Update Status */}
                  <div className="field">
                    <label>Perbarui Tahap Seleksi</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                    >
                      {Object.entries(STATUS_LAMARAN_MAP).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Catatan / Instruksi HRD (Akan diteruskan ke pelamar)</label>
                    <textarea
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Cth: Diharapkan hadir tes wawancara pada hari Rabu pukul 09.00 WIB membawa seragam rapi..."
                    />
                  </div>

                  <button
                    className="btn btn-primary btn-block"
                    onClick={handleUpdateStatus}
                    disabled={saving}
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Status & Beritahu Pelamar'}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

function myAppsCount(apps: Lamaran[], myJobIds: string[]) {
  return apps.filter((a) => myJobIds.includes(a.lowonganId)).length;
}

// ----------------- COMPANY LAPORAN -----------------
export const CompanyLaporanView: React.FC<CompanyViewsProps> = ({
  lowongan,
  lamaran,
  pencariKerja,
  showToast
}) => {
  const { perusahaan } = useAuth();
  const myJobs = lowongan.filter((l) => l.perusahaanId === perusahaan?.id);
  const myJobIds = myJobs.map((j) => j.id);
  // Hanya lamaran yang disetujui BKK
  const myApps = lamaran.filter((a) => myJobIds.includes(a.lowonganId) && a.statusVerifikasi === 'disetujui');

  const statusCounts: Record<string, number> = {};
  Object.keys(STATUS_LAMARAN_MAP).forEach((k) => {
    statusCounts[k] = myApps.filter((a) => a.status === k).length;
  });

  const maxVal = Math.max(1, ...Object.values(statusCounts));

  const handleDownloadCSV = () => {
    if (myApps.length === 0) {
      showToast?.('Belum ada data pelamar untuk diekspor ke CSV', 'info');
      return;
    }
    const headers = [
      'ID Lamaran',
      'Nama Pelamar',
      'Jurusan',
      'Tahun Lulus',
      'No WhatsApp / HP',
      'Posisi Lowongan',
      'Tanggal Melamar',
      'Status Seleksi',
      'Catatan HRD'
    ];
    const rows = myApps.map((a) => {
      const pk = pencariKerja.find((p) => p.id === a.pencariKerjaId);
      const job = lowongan.find((l) => l.id === a.lowonganId);
      const statusLabel = STATUS_LAMARAN_MAP[a.status]?.label || a.status;
      return [
        a.id,
        pk?.namaLengkap || 'Alumni',
        pk?.jurusan || '-',
        pk?.tahunLulus || '-',
        pk?.noHp || '-',
        job?.judul || '-',
        fmtDate(a.tanggalLamar),
        statusLabel,
        a.catatan || '-'
      ];
    });

    const compName = slugify(perusahaan?.namaPerusahaan || 'perusahaan');
    const dateStr = new Date().toISOString().slice(0, 10);
    exportCSVFile(headers, rows, `laporan_rekrutmen_${compName}_${dateStr}`);
    showToast?.('Laporan CSV rekrutmen berhasil diunduh!', 'success');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Laporan Analitik Rekrutmen</h1>
          <p className="page-sub">Statistik performa lowongan kerja dan penyerapan kandidat alumni SMK PGRI 1 Taman.</p>
        </div>
        <button
          onClick={handleDownloadCSV}
          className="btn btn-primary"
          style={{ gap: '8px', display: 'inline-flex', alignItems: 'center' }}
        >
          📥 Download Laporan CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div className="n">{myJobs.length}</div>
          <div className="l">Total Lowongan Dibuat</div>
        </div>
        <div className="card">
          <div className="n">{myApps.length}</div>
          <div className="l">Total Pelamar Masuk</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: 'var(--primary)' }}>
            {myApps.filter((a) => ['dipanggil_interview', 'interview'].includes(a.status)).length}
          </div>
          <div className="l">Tahap Wawancara</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: 'var(--secondary)' }}>
            {myApps.filter((a) => a.status === 'diterima').length}
          </div>
          <div className="l">Kandidat Diterima Kerja</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '15px' }}>Distribusi Tahapan Seleksi Pelamar</h3>
          <button
            onClick={handleDownloadCSV}
            className="btn btn-sm btn-outline"
          >
            Ekspor CSV Data Ini
          </button>
        </div>
        <div className="bars">
          {Object.entries(statusCounts).map(([k, v]) => (
            <div key={k} className="bar-col">
              <div
                className="bar"
                style={{ height: `${Math.max(6, (v / maxVal) * 120)}px` }}
                title={`${STATUS_LAMARAN_MAP[k]?.label}: ${v}`}
              />
              <div className="bar-label">{v}</div>
            </div>
          ))}
        </div>
        <div className="tag-row" style={{ marginTop: '12px', justifyContent: 'center' }}>
          {Object.keys(statusCounts).map((k) => (
            <span key={k} className="tag">
              {STATUS_LAMARAN_MAP[k]?.label}: <b>{statusCounts[k]}</b>
            </span>
          ))}
        </div>
      </div>

      {/* Table of recruitment records */}
      <div className="card table-card">
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '15px' }}>Daftar Rekap Pelamar Rekrutmen</h3>
          <button onClick={handleDownloadCSV} className="btn btn-sm btn-primary">
            📥 Download Laporan CSV
          </button>
        </div>
        <div className="overflow-x">
          <table>
            <thead>
              <tr>
                <th>Nama Pelamar</th>
                <th>Jurusan</th>
                <th>Tahun Lulus</th>
                <th>No WhatsApp</th>
                <th>Posisi Lowongan</th>
                <th>Tgl Lamar</th>
                <th>Status Seleksi</th>
              </tr>
            </thead>
            <tbody>
              {myApps.map((a) => {
                const pk = pencariKerja.find((p) => p.id === a.pencariKerjaId);
                const job = lowongan.find((l) => l.id === a.lowonganId);
                const statusCfg = STATUS_LAMARAN_MAP[a.status] || { label: a.status, cls: 'grey' };
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{pk?.namaLengkap || 'Alumni'}</td>
                    <td>{pk?.jurusan || '-'}</td>
                    <td>{pk?.tahunLulus || '-'}</td>
                    <td>{pk?.noHp || '-'}</td>
                    <td>{job?.judul || '-'}</td>
                    <td>{fmtDate(a.tanggalLamar)}</td>
                    <td><span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span></td>
                  </tr>
                );
              })}
              {myApps.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">Belum ada pelamar masuk untuk dianalisis.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
