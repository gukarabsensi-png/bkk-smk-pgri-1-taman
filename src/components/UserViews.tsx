import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import type {
  Lowongan,
  Perusahaan,
  Lamaran,
  RiwayatLamaran,
  Notifikasi,
  PencariKerja,
  EducationItem,
  ExperienceItem,
  SkillItem,
  DocumentItem
} from '../types.js';
import {
  fmtDate,
  fmtDateTime,
  initials,
  timeAgo,
  STATUS_LAMARAN_MAP,
  STATUS_VERIFIKASI_LAMARAN_MAP
} from '../utils/formatters.js';
import { saveUserProfile, savePencariKerja, saveLamaran, saveRiwayat, saveNotifikasi } from '../services/db.js';
import { uid } from '../utils/formatters.js';
import { printOrDownloadCV, downloadFile } from '../utils/cvExporter.js';

// Helper kompresi dan resize foto agar hemat ruang Firestore
function compressAndResizeImage(file: File, maxWidth = 480, maxHeight = 480, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memuat gambar foto'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file foto'));
    reader.readAsDataURL(file);
  });
}

interface UserViewsProps {
  lowongan: Lowongan[];
  perusahaan: Perusahaan[];
  lamaran: Lamaran[];
  notifikasi: Notifikasi[];
  onNavigate: (route: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshData: () => Promise<void>;
}

// ----------------- USER DASHBOARD -----------------
export const UserDashboardView: React.FC<UserViewsProps> = ({
  lowongan,
  perusahaan,
  lamaran,
  onNavigate
}) => {
  const { userProfile, pencariKerja } = useAuth();
  const myApps = lamaran.filter((l) => l.userId === userProfile?.id || (pencariKerja && l.pencariKerjaId === pencariKerja.id));
  const inProcess = myApps.filter((a) => !['diterima', 'ditolak', 'dibatalkan', 'tidak_lulus'].includes(a.status)).length;
  const interview = myApps.filter((a) => ['dipanggil_interview', 'interview'].includes(a.status)).length;
  const accepted = myApps.filter((a) => a.status === 'diterima').length;

  const recommendations = lowongan
    .filter((l) => l.status === 'published')
    .slice(0, 3);

  return (
    <div>
      <h1 className="page-title">Selamat Datang, {userProfile?.name?.split(' ')[0] || 'Alumni'} 👋</h1>
      <p className="page-sub">Pantau status lamaran kerja dan peluang karier rekomendasi BKK SMK PGRI 1 Taman.</p>

      {/* Pengingat Kelengkapan Pas Foto CV jika belum ada */}
      {!pencariKerja?.foto && (
        <div
          style={{
            background: 'var(--accent-light)',
            border: '1px solid var(--accent)',
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>📸</span>
            <div style={{ fontSize: '13px' }}>
              <strong>Lengkapi Foto Profil CV:</strong> Anda belum mengunggah pas foto formal di menu <b>CV & Portofolio</b>. Pas foto meningkatkan kredibilitas berkas lamaran Anda di mata HRD.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => onNavigate('user/cv')}
            style={{ whiteSpace: 'nowrap' }}
          >
            Unggah Foto Sekarang →
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi">
        <div className="card">
          <div className="n">{myApps.length}</div>
          <div className="l">Total Lamaran</div>
        </div>
        <div className="card">
          <div className="n">{inProcess}</div>
          <div className="l">Dalam Proses Seleksi</div>
        </div>
        <div className="card">
          <div className="n">{interview}</div>
          <div className="l">Panggilan Interview</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: 'var(--secondary)' }}>{accepted}</div>
          <div className="l">Diterima Kerja</div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Rekomendasi Lowongan */}
        <div>
          <div className="section-head">
            <div>
              <h2 style={{ fontSize: '16px' }}>Lowongan Terbaru</h2>
            </div>
            <button onClick={() => onNavigate('user/lowongan')} className="link-btn">
              Cari Lainnya →
            </button>
          </div>
          <div className="grid" style={{ gap: '12px' }}>
            {recommendations.map((job) => {
              const prs = perusahaan.find((p) => p.id === job.perusahaanId);
              return (
                <div
                  key={job.id}
                  className="card job-card"
                  onClick={() => onNavigate(`lowongan/${job.slug || job.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="top">
                    <div className="logo-box">{initials(prs?.namaPerusahaan || 'BKK')}</div>
                    <div>
                      <h4 className="job-title" style={{ fontSize: '14.5px' }}>{job.judul}</h4>
                      <p className="job-company">{prs?.namaPerusahaan}</p>
                    </div>
                  </div>
                  <div className="job-foot">
                    <span className="tag blue">📍 {job.lokasi}</span>
                    <span className="link-btn">Lamar →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lamaran Terbaru */}
        <div>
          <div className="section-head">
            <div>
              <h2 style={{ fontSize: '16px' }}>Riwayat Lamaran Saya</h2>
            </div>
            <button onClick={() => onNavigate('user/lamaran')} className="link-btn">
              Lihat Semua →
            </button>
          </div>
          <div className="card">
            {myApps.slice(0, 5).map((app) => {
              const job = lowongan.find((l) => l.id === app.lowonganId);
              const prs = job ? perusahaan.find((p) => p.id === job.perusahaanId) : null;
              const statusCfg = STATUS_LAMARAN_MAP[app.status] || { label: app.status, cls: 'grey' };
              return (
                <div key={app.id} className="list-row">
                  <div className="logo-box" style={{ width: '40px', height: '40px', fontSize: '13px' }}>
                    {initials(prs?.namaPerusahaan || 'BKK')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{job?.judul || 'Lowongan'}</div>
                    <div className="job-meta">{prs?.namaPerusahaan || '-'} · {fmtDate(app.tanggalLamar)}</div>
                  </div>
                  <span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span>
                </div>
              );
            })}
            {myApps.length === 0 && (
              <div className="empty">
                <div className="ic">📝</div>
                Anda belum mengajukan lamaran pekerjaan apapun.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------- USER PROFIL -----------------
export const UserProfilView: React.FC<{
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ showToast }) => {
  const { pencariKerja, refreshProfile } = useAuth();
  const [formData, setFormData] = useState({
    namaLengkap: pencariKerja?.namaLengkap || '',
    jenisKelamin: pencariKerja?.jenisKelamin || 'L',
    tempatLahir: pencariKerja?.tempatLahir || '',
    tanggalLahir: pencariKerja?.tanggalLahir || '',
    noHp: pencariKerja?.noHp || '',
    kabupaten: pencariKerja?.kabupaten || 'Sidoarjo',
    alamat: pencariKerja?.alamat || '',
    tahunLulus: pencariKerja?.tahunLulus || '2024',
    jurusan: pencariKerja?.jurusan || '',
    bio: pencariKerja?.bio || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pencariKerja) return;
    setSaving(true);
    try {
      const updated: PencariKerja = {
        ...pencariKerja,
        ...formData
      };
      await savePencariKerja(updated);
      await refreshProfile();
      showToast('Profil biodata berhasil disimpan ke Firebase!', 'success');
    } catch (err: any) {
      showToast('Gagal menyimpan profil: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Profil Saya</h1>
      <p className="page-sub">Informasi data diri Anda akan dilihat oleh HRD perusahaan mitra saat melamar.</p>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '720px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          <div
            style={{
              width: '64px',
              height: '76px',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '2px solid var(--border)',
              background: 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              flexShrink: 0
            }}
          >
            {pencariKerja?.foto ? (
              <img
                src={pencariKerja.foto}
                alt={pencariKerja.namaLengkap}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '26px' }}>👤</span>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{pencariKerja?.namaLengkap || 'Alumni'}</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {pencariKerja?.foto ? (
                <span className="tag green" style={{ display: 'inline-block' }}>✓ Foto Profil CV Aktif</span>
              ) : (
                <span className="tag amber" style={{ display: 'inline-block' }}>⚠️ Belum ada pas foto CV</span>
              )}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--primary)', marginTop: '4px' }}>
              ℹ️ Anda dapat mengganti pas foto resmi pada menu <b>CV & Portofolio</b>.
            </div>
          </div>
        </div>

        <h3 style={{ marginTop: 0 }}>Identitas Pribadi</h3>
        <div className="row-2">
          <div className="field">
            <label>Nama Lengkap</label>
            <input
              required
              value={formData.namaLengkap}
              onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Jenis Kelamin</label>
            <select
              value={formData.jenisKelamin}
              onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value })}
            >
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
        </div>

        <div className="row-2">
          <div className="field">
            <label>Tempat Lahir</label>
            <input
              value={formData.tempatLahir}
              onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
              placeholder="Sidoarjo / Surabaya"
            />
          </div>
          <div className="field">
            <label>Tanggal Lahir</label>
            <input
              type="date"
              value={formData.tanggalLahir}
              onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
            />
          </div>
        </div>

        <div className="divider" />
        <h3>Kontak & Domisili</h3>
        <div className="row-2">
          <div className="field">
            <label>Nomor WhatsApp / HP Aktif</label>
            <input
              required
              value={formData.noHp}
              onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
              placeholder="08123456789"
            />
          </div>
          <div className="field">
            <label>Kabupaten / Kota</label>
            <input
              value={formData.kabupaten}
              onChange={(e) => setFormData({ ...formData, kabupaten: e.target.value })}
              placeholder="Sidoarjo"
            />
          </div>
        </div>
        <div className="field">
          <label>Alamat Lengkap</label>
          <textarea
            value={formData.alamat}
            onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
            placeholder="Nama jalan, RT/RW, kelurahan, kecamatan..."
          />
        </div>

        <div className="divider" />
        <h3>Pendidikan SMK PGRI 1 Taman</h3>
        <div className="row-2">
          <div className="field">
            <label>Tahun Kelulusan</label>
            <input
              type="number"
              value={formData.tahunLulus}
              onChange={(e) => setFormData({ ...formData, tahunLulus: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Konsentrasi Jurusan</label>
            <input
              value={formData.jurusan}
              onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })}
              placeholder="Teknik Pemesinan / TKR / RPL..."
            />
          </div>
        </div>

        <div className="field">
          <label>Bio Singkat (Deskripsi Diri)</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Ceritakan minat kerja, keahlian utama, dan motivasi karier Anda..."
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Menyimpan ke Firebase...' : 'Simpan Perubahan'}
        </button>
      </form>
    </div>
  );
};

// ----------------- USER CV -----------------
export const UserCVView: React.FC<{
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ showToast }) => {
  const { pencariKerja, userProfile, refreshProfile } = useAuth();
  const [eduModal, setEduModal] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [skillModal, setSkillModal] = useState(false);
  const [docModal, setDocModal] = useState(false);
  const [selectedDocJenis, setSelectedDocJenis] = useState<'ijazah' | 'sertifikat' | 'ktp' | 'lainnya'>('sertifikat');
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Form states for modals
  const [edu, setEdu] = useState<Partial<EducationItem>>({
    jenjang: 'SMK',
    institusi: 'SMK PGRI 1 Taman',
    jurusan: '',
    tahunMasuk: 2021,
    tahunLulus: 2024
  });

  const [exp, setExp] = useState<Partial<ExperienceItem>>({
    jabatan: '',
    perusahaan: '',
    tanggalMulai: '',
    tanggalSelesai: '',
    deskripsi: ''
  });

  const [skill, setSkill] = useState<{ nama: string; level: 'pemula' | 'menengah' | 'mahir' }>({
    nama: '',
    level: 'menengah'
  });

  // Handler Upload Foto Profil CV
  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pencariKerja) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      showToast('Format foto harus berupa JPG, PNG, atau WebP', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file foto maksimal 5 MB', 'error');
      return;
    }

    setUploadingFoto(true);
    try {
      const base64Data = await compressAndResizeImage(file, 480, 480, 0.85);

      // Simpan ke data pencariKerja
      const updatedPk = {
        ...pencariKerja,
        foto: base64Data
      };
      await savePencariKerja(updatedPk);

      // Sinkronkan ke userProfile jika tersedia
      if (userProfile) {
        await saveUserProfile({
          ...userProfile,
          photoURL: base64Data
        });
      }

      await refreshProfile();
      showToast('Foto profil CV & Portofolio berhasil diperbarui!', 'success');
    } catch (err: any) {
      showToast('Gagal memproses foto: ' + err.message, 'error');
    } finally {
      setUploadingFoto(false);
      e.target.value = '';
    }
  };

  const handleRemoveFoto = async () => {
    if (!pencariKerja) return;
    if (!confirm('Apakah Anda yakin ingin menghapus foto profil CV ini?')) return;

    setUploadingFoto(true);
    try {
      const updatedPk = {
        ...pencariKerja,
        foto: null
      };
      await savePencariKerja(updatedPk);

      if (userProfile) {
        await saveUserProfile({
          ...userProfile,
          photoURL: ''
        });
      }

      await refreshProfile();
      showToast('Foto profil CV berhasil dihapus', 'info');
    } catch (err: any) {
      showToast('Gagal menghapus foto: ' + err.message, 'error');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleAddEdu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pencariKerja) return;
    const newItem: EducationItem = {
      id: uid('edu'),
      jenjang: edu.jenjang || 'SMK',
      institusi: edu.institusi || '',
      jurusan: edu.jurusan || '',
      tahunMasuk: edu.tahunMasuk,
      tahunLulus: edu.tahunLulus
    };
    const updated = {
      ...pencariKerja,
      pendidikan: [...(pencariKerja.pendidikan || []), newItem]
    };
    await savePencariKerja(updated);
    await refreshProfile();
    setEduModal(false);
    showToast('Pendidikan ditambahkan!', 'success');
  };

  const handleAddExp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pencariKerja) return;
    const newItem: ExperienceItem = {
      id: uid('exp'),
      jabatan: exp.jabatan || '',
      perusahaan: exp.perusahaan || '',
      tanggalMulai: exp.tanggalMulai || '',
      tanggalSelesai: exp.tanggalSelesai,
      deskripsi: exp.deskripsi
    };
    const updated = {
      ...pencariKerja,
      pengalaman: [...(pencariKerja.pengalaman || []), newItem]
    };
    await savePencariKerja(updated);
    await refreshProfile();
    setExpModal(false);
    showToast('Pengalaman kerja ditambahkan!', 'success');
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pencariKerja || !skill.nama.trim()) return;
    const newItem: SkillItem = {
      id: uid('sk'),
      nama: skill.nama.trim(),
      level: skill.level
    };
    const updated = {
      ...pencariKerja,
      keahlian: [...(pencariKerja.keahlian || []), newItem]
    };
    await savePencariKerja(updated);
    await refreshProfile();
    setSkillModal(false);
    showToast('Keahlian ditambahkan!', 'success');
  };

  const handleDeleteItem = async (type: 'pendidikan' | 'pengalaman' | 'keahlian' | 'dokumen', id: string) => {
    if (!pencariKerja) return;
    const updated = {
      ...pencariKerja,
      [type]: (pencariKerja[type] as any[]).filter((x) => x.id !== id)
    };
    await savePencariKerja(updated);
    await refreshProfile();
    showToast('Item berhasil dihapus', 'info');
  };

  const handleUploadCV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pencariKerja) return;
    if (file.type !== 'application/pdf') {
      showToast('Format dokumen CV harus berformat PDF', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran file dokumen PDF maksimal 2 MB agar dapat disimpan ke database', 'error');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const fileData = ev.target?.result as string;
        const newDoc: DocumentItem = {
          id: uid('doc'),
          jenis: 'cv',
          namaFile: file.name,
          ukuran: file.size,
          url: fileData,
          createdAt: Date.now()
        };
        const filtered = (pencariKerja.dokumen || []).filter((d) => d.jenis !== 'cv');
        const updated = {
          ...pencariKerja,
          dokumen: [...filtered, newDoc]
        };
        await savePencariKerja(updated);
        await refreshProfile();
        showToast('Dokumen CV PDF berhasil diunggah & disimpan!', 'success');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast('Gagal mengunggah file CV: ' + err.message, 'error');
    }
  };

  const handleUploadLampiran = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pencariKerja) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran berkas maksimal 2 MB agar dapat disimpan ke database', 'error');
      return;
    }

    setUploadingDoc(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const fileData = ev.target?.result as string;
        const newDoc: DocumentItem = {
          id: uid('doc'),
          jenis: selectedDocJenis,
          namaFile: file.name,
          ukuran: file.size,
          url: fileData,
          createdAt: Date.now()
        };
        const updated = {
          ...pencariKerja,
          dokumen: [...(pencariKerja.dokumen || []), newDoc]
        };
        await savePencariKerja(updated);
        await refreshProfile();
        showToast(`Berkas ${selectedDocJenis.toUpperCase()} berhasil diunggah!`, 'success');
        setDocModal(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast('Gagal mengunggah berkas: ' + err.message, 'error');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <h1 className="page-title">Curriculum Vitae (CV) & Portofolio</h1>
      <p className="page-sub">Lengkapi pas foto profil, riwayat pendidikan, pengalaman magang/kerja, serta keahlian teknis Anda.</p>

      {/* Kolom Upload Foto Profil CV & Portofolio */}
      <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📸</span> Foto Profil & Portofolio CV Alumni
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Unggah pas foto formal atau foto profil profesional Anda. Foto ini akan muncul pada kartu lamaran alumni, dokumen CV, dan dilihat oleh HRD perusahaan mitra.
            </p>
          </div>
          {pencariKerja?.foto ? (
            <span className="badge green" style={{ padding: '6px 12px', fontSize: '12px' }}>✓ Foto Terpasang</span>
          ) : (
            <span className="badge amber" style={{ padding: '6px 12px', fontSize: '12px' }}>⚠️ Belum Ada Foto</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* Box Foto */}
          <div
            style={{
              position: 'relative',
              width: '110px',
              height: '140px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid var(--border)',
              background: 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
              flexShrink: 0
            }}
          >
            {pencariKerja?.foto ? (
              <img
                src={pencariKerja.foto}
                alt={pencariKerja.namaLengkap}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '10px' }}>
                <div style={{ fontSize: '38px', lineHeight: 1 }}>👤</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '6px' }}>
                  Pas Foto
                </div>
              </div>
            )}
          </div>

          {/* Kolom Aksi & Keterangan Upload */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label
                className="btn btn-primary"
                style={{
                  cursor: uploadingFoto ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: 0,
                  opacity: uploadingFoto ? 0.7 : 1
                }}
              >
                <span>{uploadingFoto ? '⏳' : '📤'}</span>
                <span>{uploadingFoto ? 'Mengunggah & Memproses...' : pencariKerja?.foto ? 'Ganti Foto' : 'Pilih & Unggah Foto'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  style={{ display: 'none' }}
                  onChange={handleFotoUpload}
                  disabled={uploadingFoto}
                />
              </label>

              {pencariKerja?.foto && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleRemoveFoto}
                  disabled={uploadingFoto}
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                >
                  🗑️ Hapus Foto
                </button>
              )}
            </div>

            <div className="hint" style={{ marginTop: '10px', lineHeight: 1.6, fontSize: '12.5px' }}>
              💡 <b>Ketentuan Foto:</b>
              <br />
              • Format file: <b>JPG, PNG, atau WebP</b> (Ukuran maksimal 5 MB).
              <br />
              • Disarankan pas foto formal (rasio 3:4 atau 1:1) dengan seragam sekolah / pakaian kerja rapi.
              <br />
              • Foto otomatis dikompresi dan disimpan ke Firebase untuk performa cepat.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div>
          {/* Riwayat Pendidikan */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>Riwayat Pendidikan</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setEduModal(true)}>
                + Tambah
              </button>
            </div>
            {(pencariKerja?.pendidikan || []).map((p) => (
              <div key={p.id} className="list-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '13.5px' }}>
                    {p.institusi} · <span className="tag blue">{p.jenjang}</span>
                  </div>
                  <div className="job-meta">
                    {p.jurusan} · {p.tahunMasuk || '?'} – {p.tahunLulus || '?'}
                  </div>
                </div>
                <button className="icon-btn" onClick={() => handleDeleteItem('pendidikan', p.id)}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Pengalaman Kerja */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>Pengalaman Kerja & Magang</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setExpModal(true)}>
                + Tambah
              </button>
            </div>
            {(pencariKerja?.pengalaman || []).map((p) => (
              <div key={p.id} className="list-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '13.5px' }}>
                    {p.jabatan} — <span style={{ color: 'var(--primary)' }}>{p.perusahaan}</span>
                  </div>
                  <div className="job-meta">
                    {fmtDate(p.tanggalMulai)} – {p.tanggalSelesai ? fmtDate(p.tanggalSelesai) : 'Sekarang'}
                  </div>
                </div>
                <button className="icon-btn" onClick={() => handleDeleteItem('pengalaman', p.id)}>
                  ✕
                </button>
              </div>
            ))}
            {(pencariKerja?.pengalaman || []).length === 0 && (
              <div className="empty" style={{ padding: '24px 10px' }}>
                Belum ada pengalaman kerja / magang industri.
              </div>
            )}
          </div>
        </div>

        <div>
          {/* Keahlian Teknis */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>Keahlian & Kompetensi</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setSkillModal(true)}>
                + Tambah
              </button>
            </div>
            <div className="tag-row">
              {(pencariKerja?.keahlian || []).map((k) => (
                <span key={k.id} className="tag blue">
                  {k.nama} · <small>({k.level})</small>
                  <span
                    onClick={() => handleDeleteItem('keahlian', k.id)}
                    style={{ cursor: 'pointer', marginLeft: '6px', fontWeight: 800 }}
                  >
                    ✕
                  </span>
                </span>
              ))}
              {(pencariKerja?.keahlian || []).length === 0 && (
                <span className="job-meta">Belum ada keahlian ditambahkan.</span>
              )}
            </div>
          </div>

          {/* Dokumen CV */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '15px' }}>Berkas CV Utama (PDF)</h3>
            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0 }}>Unggah CV Terbaru</label>
                {pencariKerja && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => printOrDownloadCV(pencariKerja)}
                    style={{ fontSize: '12px', padding: '3px 8px' }}
                  >
                    🖨️ Cetak / Unduh CV Format BKK
                  </button>
                )}
              </div>
              <input type="file" accept=".pdf" onChange={handleUploadCV} />
              <div className="hint">Format file PDF, ukuran maksimal 2 MB. Dokumen tersimpan aman ke database.</div>
            </div>

            {(pencariKerja?.dokumen || [])
              .filter((d) => d.jenis === 'cv')
              .map((d) => (
                <div key={d.id} className="list-row">
                  <div className="avatar" style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>
                    📄
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{d.namaFile}</div>
                    <div className="job-meta">PDF · {(d.ukuran / 1024).toFixed(0)} KB · Tersimpan</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {d.url && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => downloadFile(d.url!, d.namaFile)}
                        title="Unduh file PDF"
                      >
                        📥 Unduh
                      </button>
                    )}
                    <button className="icon-btn" onClick={() => handleDeleteItem('dokumen', d.id)} title="Hapus berkas">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Dokumen & Berkas Pendukung (Ijazah, Sertifikat, KTP, dll) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Berkas Pendukung Terlampir</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Ijazah, Sertifikat Kompetensi/PKL, KTP/Kartu Pelajar, atau Berkas Lainnya
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setDocModal(true)}
              >
                + Unggah Berkas
              </button>
            </div>

            {(pencariKerja?.dokumen || []).filter((d) => d.jenis !== 'cv').length === 0 ? (
              <div className="job-meta" style={{ padding: '8px 0' }}>
                Belum ada berkas pendukung yang diunggah. Unggah Ijazah atau Sertifikat keahlian Anda untuk meningkatkan peluang diterima perusahaan.
              </div>
            ) : (
              (pencariKerja?.dokumen || [])
                .filter((d) => d.jenis !== 'cv')
                .map((d) => {
                  const iconMap: Record<string, string> = {
                    ijazah: '🎓',
                    sertifikat: '📜',
                    ktp: '🪪',
                    lainnya: '📎'
                  };
                  return (
                    <div key={d.id} className="list-row">
                      <div className="avatar" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        {iconMap[d.jenis] || '📎'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{d.namaFile}</div>
                        <div className="job-meta">
                          <span className="tag blue" style={{ fontSize: '10.5px', padding: '1px 5px', marginRight: '6px' }}>
                            {d.jenis.toUpperCase()}
                          </span>
                          {(d.ukuran / 1024).toFixed(0)} KB
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {d.url && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => downloadFile(d.url!, d.namaFile)}
                            title="Unduh berkas"
                          >
                            📥 Unduh
                          </button>
                        )}
                        <button className="icon-btn" onClick={() => handleDeleteItem('dokumen', d.id)} title="Hapus berkas">
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Modal Tambah Pendidikan */}
      {eduModal && (
        <div className="modal-bg" onClick={() => setEduModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Tambah Riwayat Pendidikan</h3>
              <button className="icon-btn" onClick={() => setEduModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddEdu}>
              <div className="row-2">
                <div className="field">
                  <label>Jenjang</label>
                  <input
                    value={edu.jenjang}
                    onChange={(e) => setEdu({ ...edu, jenjang: e.target.value })}
                    placeholder="SMK / D3 / S1"
                  />
                </div>
                <div className="field">
                  <label>Nama Sekolah / Kampus</label>
                  <input
                    required
                    value={edu.institusi}
                    onChange={(e) => setEdu({ ...edu, institusi: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label>Jurusan</label>
                <input
                  value={edu.jurusan}
                  onChange={(e) => setEdu({ ...edu, jurusan: e.target.value })}
                  placeholder="Teknik Pemesinan"
                />
              </div>
              <div className="row-2">
                <div className="field">
                  <label>Tahun Masuk</label>
                  <input
                    type="number"
                    value={edu.tahunMasuk}
                    onChange={(e) => setEdu({ ...edu, tahunMasuk: Number(e.target.value) })}
                  />
                </div>
                <div className="field">
                  <label>Tahun Lulus</label>
                  <input
                    type="number"
                    value={edu.tahunLulus}
                    onChange={(e) => setEdu({ ...edu, tahunLulus: Number(e.target.value) })}
                  />
                </div>
              </div>
              <button className="btn btn-primary btn-block" type="submit">
                Simpan Pendidikan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Pengalaman */}
      {expModal && (
        <div className="modal-bg" onClick={() => setExpModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Tambah Pengalaman Kerja / Magang</h3>
              <button className="icon-btn" onClick={() => setExpModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddExp}>
              <div className="row-2">
                <div className="field">
                  <label>Jabatan / Posisi</label>
                  <input
                    required
                    value={exp.jabatan}
                    onChange={(e) => setExp({ ...exp, jabatan: e.target.value })}
                    placeholder="Operator Magang / Staff"
                  />
                </div>
                <div className="field">
                  <label>Nama Perusahaan</label>
                  <input
                    required
                    value={exp.perusahaan}
                    onChange={(e) => setExp({ ...exp, perusahaan: e.target.value })}
                    placeholder="PT Mitra Industri"
                  />
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label>Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={exp.tanggalMulai}
                    onChange={(e) => setExp({ ...exp, tanggalMulai: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Tanggal Selesai (Kosongkan bila masih aktif)</label>
                  <input
                    type="date"
                    value={exp.tanggalSelesai}
                    onChange={(e) => setExp({ ...exp, tanggalSelesai: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label>Deskripsi Tugas & Tanggung Jawab</label>
                <textarea
                  value={exp.deskripsi}
                  onChange={(e) => setExp({ ...exp, deskripsi: e.target.value })}
                  placeholder="Ceritakan aktivitas harian atau pencapaian Anda..."
                />
              </div>
              <button className="btn btn-primary btn-block" type="submit">
                Simpan Pengalaman
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Skill */}
      {skillModal && (
        <div className="modal-bg" onClick={() => setSkillModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Tambah Keahlian</h3>
              <button className="icon-btn" onClick={() => setSkillModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSkill}>
              <div className="field">
                <label>Nama Keahlian</label>
                <input
                  required
                  value={skill.nama}
                  onChange={(e) => setSkill({ ...skill, nama: e.target.value })}
                  placeholder="Mengoperasikan Bubut CNC, Microsoft Excel, Servis Motor..."
                />
              </div>
              <div className="field">
                <label>Tingkat Kemahiran</label>
                <select
                  value={skill.level}
                  onChange={(e) => setSkill({ ...skill, level: e.target.value as any })}
                >
                  <option value="pemula">Pemula (Dasar)</option>
                  <option value="menengah">Menengah (Kompeten)</option>
                  <option value="mahir">Mahir (Advanced)</option>
                </select>
              </div>
              <button className="btn btn-primary btn-block" type="submit">
                Simpan Keahlian
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Unggah Berkas & Dokumen Pendukung */}
      {docModal && (
        <div className="modal-bg" onClick={() => setDocModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Unggah Berkas Pendukung</h3>
              <button className="icon-btn" onClick={() => setDocModal(false)}>✕</button>
            </div>
            <div>
              <div className="field">
                <label>Jenis Dokumen</label>
                <select
                  value={selectedDocJenis}
                  onChange={(e) => setSelectedDocJenis(e.target.value as any)}
                >
                  <option value="ijazah">🎓 Ijazah / SKL SMK</option>
                  <option value="sertifikat">📜 Sertifikat PKL / Uji Kompetensi Keahlian (UKK)</option>
                  <option value="ktp">🪪 KTP / Kartu Identitas Siswa</option>
                  <option value="lainnya">📎 Dokumen / Portofolio Lainnya</option>
                </select>
              </div>

              <div className="field">
                <label>Pilih File (PDF atau Gambar JPG/PNG)</label>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/jpg"
                  onChange={handleUploadLampiran}
                  disabled={uploadingDoc}
                />
                <div className="hint">Maksimal ukuran file 2 MB. Dokumen dapat langsung diunduh oleh HRD perusahaan mitra dan admin BKK.</div>
              </div>

              {uploadingDoc && (
                <div style={{ textAlign: 'center', padding: '10px', color: 'var(--primary)', fontWeight: 600 }}>
                  ⏳ Sedang mengunggah dan menyimpan berkas...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------- USER LAMARAN -----------------
export const UserLamaranView: React.FC<UserViewsProps> = ({
  lowongan,
  perusahaan,
  lamaran,
  showToast,
  onRefreshData
}) => {
  const { userProfile, pencariKerja } = useAuth();
  const [selectedApp, setSelectedApp] = useState<Lamaran | null>(null);

  const myApps = lamaran
    .filter((l) => l.userId === userProfile?.id || (pencariKerja && l.pencariKerjaId === pencariKerja.id))
    .sort((a, b) => new Date(b.tanggalLamar).getTime() - new Date(a.tanggalLamar).getTime());

  const handleCancelApplication = async (app: Lamaran) => {
    if (confirm('Yakin ingin membatalkan lamaran pekerjaan ini?')) {
      const updated: Lamaran = {
        ...app,
        status: 'dibatalkan'
      };
      await saveLamaran(updated);
      const riw: RiwayatLamaran = {
        id: uid('riw'),
        lamaranId: app.id,
        statusLama: app.status,
        statusBaru: 'dibatalkan',
        catatan: 'Dibatalkan oleh pelamar',
        diubahOleh: userProfile?.id,
        createdAt: new Date().toISOString()
      };
      await saveRiwayat(riw);
      await onRefreshData();
      setSelectedApp(null);
      showToast('Lamaran berhasil dibatalkan.', 'info');
    }
  };

  return (
    <div>
      <h1 className="page-title">Lamaran Saya</h1>
      <p className="page-sub">Pantau proses seleksi administrasi, interview, hingga hasil penerimaan kerja secara real-time.</p>

      <div className="card table-card">
        <div className="overflow-x">
          <table>
            <thead>
              <tr>
                <th>Posisi Pekerjaan</th>
                <th>Perusahaan</th>
                <th>Tanggal Lamar</th>
                <th>Screening Awal BKK</th>
                <th>Status Seleksi HRD</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {myApps.map((a) => {
                const j = lowongan.find((l) => l.id === a.lowonganId);
                const prs = j ? perusahaan.find((p) => p.id === j.perusahaanId) : null;
                const statusCfg = STATUS_LAMARAN_MAP[a.status] || { label: a.status, cls: 'grey' };
                const verifStatus = a.statusVerifikasi || 'menunggu_verifikasi';
                const verifCfg = STATUS_VERIFIKASI_LAMARAN_MAP[verifStatus] || {
                  label: 'Menunggu Screening',
                  cls: 'amber',
                  icon: '⏳'
                };

                return (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'normal', fontWeight: 600 }}>{j?.judul || '-'}</td>
                    <td>{prs?.namaPerusahaan || '-'}</td>
                    <td>{fmtDate(a.tanggalLamar)}</td>
                    <td>
                      <span className={`badge ${verifCfg.cls}`} style={{ display: 'inline-flex', gap: '4px' }}>
                        <span>{verifCfg.icon}</span> {verifCfg.label}
                      </span>
                    </td>
                    <td><span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => setSelectedApp(a)}>
                        Detail Alur
                      </button>
                    </td>
                  </tr>
                );
              })}
              {myApps.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">Anda belum pernah mengajukan lamaran kerja di sistem BKK ini.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Status Lamaran */}
      {selectedApp && (
        <div className="modal-bg" onClick={() => setSelectedApp(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const job = lowongan.find((l) => l.id === selectedApp.lowonganId);
              const prs = job ? perusahaan.find((p) => p.id === job.perusahaanId) : null;
              const statusCfg = STATUS_LAMARAN_MAP[selectedApp.status] || { label: selectedApp.status, cls: 'grey' };
              const isTerminal = ['diterima', 'ditolak', 'dibatalkan', 'tidak_lulus'].includes(selectedApp.status);
              const verifStatus = selectedApp.statusVerifikasi || 'menunggu_verifikasi';
              const verifCfg = STATUS_VERIFIKASI_LAMARAN_MAP[verifStatus] || {
                label: 'Menunggu Screening',
                cls: 'amber',
                icon: '⏳'
              };

              return (
                <>
                  <div className="modal-head">
                    <div>
                      <h3 style={{ margin: 0 }}>{job?.judul || 'Detail Lamaran'}</h3>
                      <div className="job-meta">{prs?.namaPerusahaan} · Diajukan {fmtDateTime(selectedApp.tanggalLamar)}</div>
                    </div>
                    <button className="icon-btn" onClick={() => setSelectedApp(null)}>✕</button>
                  </div>

                  {/* Status Box Screening BKK */}
                  <div
                    style={{
                      background: verifStatus === 'disetujui' ? 'var(--secondary-light)' : verifStatus === 'diblokir' ? 'var(--danger-light)' : 'var(--accent-light)',
                      border: `1px solid ${verifStatus === 'disetujui' ? 'var(--secondary)' : verifStatus === 'diblokir' ? 'var(--danger)' : 'var(--accent)'}`,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      margin: '14px 0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13.5px' }}>
                        Screening BKK SMK PGRI 1 Taman
                      </div>
                      <span className={`badge ${verifCfg.cls}`}>
                        {verifCfg.icon} {verifCfg.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text)' }}>
                      {verifStatus === 'menunggu_verifikasi' && (
                        <span>⏳ Berkas lamaran Anda sedang dalam tahap screening awal oleh tim BKK sebelum diteruskan ke HRD perusahaan mitra.</span>
                      )}
                      {verifStatus === 'disetujui' && (
                        <span>✓ Berkas lamaran Anda telah disetujui tim BKK dan telah diteruskan ke panel HRD perusahaan untuk tahap seleksi selanjutnya.</span>
                      )}
                      {verifStatus === 'diblokir' && (
                        <span>🔒 Berkas lamaran tidak dapat diteruskan ke HRD perusahaan mitra.</span>
                      )}
                    </div>
                    {selectedApp.catatanVerifikasi && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(0,0,0,0.1)', fontSize: '12.5px' }}>
                        <strong>Keterangan BKK:</strong> {selectedApp.catatanVerifikasi}
                      </div>
                    )}
                  </div>

                  <div style={{ margin: '14px 0' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Status Seleksi HRD:</div>
                    <span className={`badge ${statusCfg.cls}`} style={{ fontSize: '14px', padding: '6px 14px' }}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {selectedApp.catatan && (
                    <div className="skeleton-note" style={{ margin: '12px 0' }}>
                      <b>Catatan HRD:</b> {selectedApp.catatan}
                    </div>
                  )}

                  <h4 style={{ fontSize: '14px', marginTop: '18px', marginBottom: '8px' }}>Alur Proses Rekrutmen</h4>
                  <ul className="timeline">
                    <li>
                      <div className="tdot done">✓</div>
                      <div>
                        <div className="titem-title">Lamaran Berhasil Diajukan</div>
                        <div className="titem-date">{fmtDateTime(selectedApp.tanggalLamar)}</div>
                      </div>
                    </li>
                    <li>
                      <div className={`tdot ${verifStatus === 'disetujui' ? 'done' : verifStatus === 'diblokir' ? 'rejected' : 'amber'}`}>
                        {verifStatus === 'disetujui' ? '✓' : verifStatus === 'diblokir' ? '✕' : '⏳'}
                      </div>
                      <div>
                        <div className="titem-title">Screening BKK: {verifCfg.label}</div>
                        <div className="titem-date">
                          {selectedApp.tanggalVerifikasi ? fmtDateTime(selectedApp.tanggalVerifikasi) : 'Sedang Diproses'}
                        </div>
                      </div>
                    </li>
                    {selectedApp.status !== 'diajukan' && (
                      <li>
                        <div className={`tdot ${isTerminal && selectedApp.status !== 'diterima' ? 'rejected' : 'done'}`}>
                          {isTerminal && selectedApp.status !== 'diterima' ? '✕' : '✓'}
                        </div>
                        <div>
                          <div className="titem-title">Status: {statusCfg.label}</div>
                          <div className="titem-date">Terkini</div>
                        </div>
                      </li>
                    )}
                  </ul>

                  {selectedApp.status === 'diajukan' && (
                    <div style={{ marginTop: '24px' }}>
                      <button
                        className="btn btn-outline btn-block"
                        style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        onClick={() => handleCancelApplication(selectedApp)}
                      >
                        Batalkan Lamaran Ini
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------- USER NOTIFIKASI -----------------
export const UserNotifikasiView: React.FC<UserViewsProps> = ({
  notifikasi,
  onNavigate,
  onRefreshData
}) => {
  const { userProfile } = useAuth();
  const myNotifs = notifikasi
    .filter((n) => n.userId === userProfile?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleRead = async (notif: Notifikasi) => {
    if (!notif.dibacaAt) {
      await saveNotifikasi({ ...notif, dibacaAt: new Date().toISOString() });
      await onRefreshData();
    }
    if (notif.url) {
      onNavigate(notif.url.replace(/^#\/?/, ''));
    }
  };

  return (
    <div>
      <h1 className="page-title">Pemberitahuan & Notifikasi</h1>
      <p className="page-sub">Informasi terbaru seputar status lamaran dan pengumuman BKK.</p>

      <div className="card table-card">
        {myNotifs.map((n) => (
          <div
            key={n.id}
            className="list-row"
            onClick={() => handleRead(n)}
            style={{
              padding: '14px 18px',
              cursor: 'pointer',
              background: n.dibacaAt ? 'transparent' : 'var(--primary-light)'
            }}
          >
            <div className="avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              🔔
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{n.judul}</div>
              <div className="job-meta">{n.pesan}</div>
              <div className="job-meta" style={{ marginTop: '2px' }}>{timeAgo(n.createdAt)}</div>
            </div>
            {!n.dibacaAt && <span className="badge blue">Baru</span>}
          </div>
        ))}
        {myNotifs.length === 0 && (
          <div className="empty">
            <div className="ic">🔔</div>
            Belum ada notifikasi baru untuk akun Anda.
          </div>
        )}
      </div>
    </div>
  );
};
