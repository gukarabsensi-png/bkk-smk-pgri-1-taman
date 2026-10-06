import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import type { Lowongan, Perusahaan, Kategori, Agenda, Pengumuman, SiteSettings, GaleriItem } from '../types.js';
import {
  fmtDate,
  initials,
  JENIS_PEKERJAAN_MAP,
  STATUS_PERUSAHAAN_MAP
} from '../utils/formatters.js';
import { getMediaThumbnail } from '../utils/mediaHelpers.js';
import { MediaViewerModal } from './MediaViewerModal.js';

interface PublicProps {
  lowongan: Lowongan[];
  perusahaan: Perusahaan[];
  kategori: Kategori[];
  agenda: Agenda[];
  pengumuman: Pengumuman[];
  galeri?: GaleriItem[];
  settings: SiteSettings;
  onNavigate: (route: string) => void;
  onApplyJob: (job: Lowongan) => void;
  hasApplied: (jobId: string) => boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// ----------------- BERANDA -----------------
export const BerandaView: React.FC<PublicProps> = ({
  lowongan,
  perusahaan,
  agenda,
  pengumuman,
  galeri = [],
  onNavigate
}) => {
  const [keyword, setKeyword] = useState('');
  const [previewGaleri, setPreviewGaleri] = useState<GaleriItem | null>(null);

  const activeJobs = lowongan.filter((j) => j.status === 'published');
  const verifiedCompanies = perusahaan.filter((p) => p.statusVerifikasi === 'verified');
  const upcomingAgendas = agenda.filter((a) => a.status === 'published').slice(0, 3);
  const latestPengumuman = pengumuman.filter((p) => p.status === 'published').slice(0, 3);

  const publicGaleri = galeri.filter((g) => g.status === 'publik');
  const showcaseGaleri = [...publicGaleri]
    .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0))
    .slice(0, 4);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      onNavigate(`lowongan?q=${encodeURIComponent(keyword.trim())}`);
    } else {
      onNavigate('lowongan');
    }
  };

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-decor" />
        <div className="wrap hero-inner">
          <span className="badge blue" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>
            🎓 Portal Bursa Kerja Khusus SMK PGRI 1 Taman
          </span>
          <h1 style={{ marginTop: '16px' }}>Satu langkah lagi menuju karier impianmu.</h1>
          <p>
            BKK SMK PGRI 1 Taman menghubungkan siswa dan alumni dengan puluhan perusahaan mitra industri
            terpercaya. Temukan lowongan kerja resmi, magang, dan agenda rekrutmen terbaru langsung dari sekolah.
          </p>
          <form onSubmit={handleSearch} className="hero-search">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari lowongan, misalnya: Operator Mesin CNC, Admin Gudang, Mekanik..."
            />
            <button className="btn btn-primary" type="submit">
              Cari Lowongan
            </button>
          </form>
        </div>
      </div>

      {/* Stats Counter */}
      <div className="wrap">
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-num">{activeJobs.length}</div>
            <div className="stat-label">Lowongan Aktif</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{verifiedCompanies.length}</div>
            <div className="stat-label">Perusahaan Mitra</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">1.250+</div>
            <div className="stat-label">Alumni Terdaftar</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">840+</div>
            <div className="stat-label">Tersalurkan Kerja</div>
          </div>
        </div>
      </div>

      {/* Featured Jobs */}
      <div className="section wrap">
        <div className="section-head">
          <div>
            <h2>Lowongan Terbaru</h2>
            <p>Peluang kerja resmi terverifikasi BKK SMK PGRI 1 Taman</p>
          </div>
          <button onClick={() => onNavigate('lowongan')} className="btn btn-ghost">
            Lihat Semua Lowongan →
          </button>
        </div>
        <div className="grid grid-3">
          {activeJobs.slice(0, 6).map((job) => {
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
                    <h3 className="job-title">{job.judul}</h3>
                    <p className="job-company">{prs?.namaPerusahaan || 'Perusahaan Mitra'}</p>
                  </div>
                </div>
                <div className="tag-row">
                  <span className="tag blue">📍 {job.lokasi}</span>
                  <span className="tag green">{JENIS_PEKERJAAN_MAP[job.jenisPekerjaan] || job.jenisPekerjaan}</span>
                  {job.jurusan && <span className="tag amber">{job.jurusan}</span>}
                </div>
                <div className="job-meta">
                  🎓 Pendidikan: {job.pendidikanMinimal}
                </div>
                <div className="job-foot">
                  <span className="job-meta">Batas: {fmtDate(job.tanggalTutup)}</span>
                  <span className="link-btn">Lihat Detail →</span>
                </div>
              </div>
            );
          })}
          {activeJobs.length === 0 && (
            <div className="empty" style={{ gridColumn: '1/-1' }}>
              <div className="ic">💼</div>
              Belum ada lowongan aktif yang dipublikasikan saat ini.
            </div>
          )}
        </div>
      </div>

      {/* Verified Companies */}
      <div className="section wrap" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <div>
            <h2>Perusahaan Mitra Industri</h2>
            <p>Dunia Usaha & Dunia Industri (DUDI) yang bekerja sama dalam rekrutmen alumni</p>
          </div>
          <button onClick={() => onNavigate('perusahaan')} className="btn btn-ghost">
            Lihat Semua Mitra →
          </button>
        </div>
        <div className="grid grid-3">
          {verifiedCompanies.slice(0, 3).map((prs) => {
            const count = lowongan.filter((l) => l.perusahaanId === prs.id && l.status === 'published').length;
            return (
              <div
                key={prs.id}
                className="card job-card"
                onClick={() => onNavigate(`perusahaan/${prs.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="top">
                  <div className="logo-box">{initials(prs.namaPerusahaan)}</div>
                  <div>
                    <h3 className="job-title">{prs.namaPerusahaan}</h3>
                    <p className="job-company">{prs.bidangUsaha}</p>
                  </div>
                </div>
                <div className="job-meta">📍 {prs.kabupaten}, {prs.provinsi || 'Jawa Timur'}</div>
                <div className="job-foot">
                  <span className="tag blue">{count} lowongan aktif</span>
                  <span className="link-btn">Lihat Profil →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda & Pengumuman */}
      <div className="section wrap" style={{ paddingTop: 0 }}>
        <div className="grid grid-2">
          <div>
            <div className="section-head">
              <div>
                <h2>Agenda & Job Fair</h2>
              </div>
              <button onClick={() => onNavigate('agenda')} className="btn btn-ghost">
                Semua Agenda →
              </button>
            </div>
            <div className="card">
              {upcomingAgendas.map((a) => (
                <div key={a.id} className="list-row">
                  <div className="avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    📅
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{a.judul}</div>
                    <div className="job-meta">
                      {fmtDate(a.tanggalMulai)} · 📍 {a.lokasi}
                    </div>
                  </div>
                </div>
              ))}
              {upcomingAgendas.length === 0 && <div className="empty">Belum ada agenda terdekat.</div>}
            </div>
          </div>
          <div>
            <div className="section-head">
              <div>
                <h2>Pengumuman Resmi</h2>
              </div>
              <button onClick={() => onNavigate('pengumuman')} className="btn btn-ghost">
                Semua Pengumuman →
              </button>
            </div>
            <div className="card">
              {latestPengumuman.map((p) => (
                <div key={p.id} className="list-row" onClick={() => onNavigate(`pengumuman/${p.slug || p.id}`)} style={{ cursor: 'pointer' }}>
                  <div className="avatar" style={{ background: 'var(--accent-light)', color: '#9A6400' }}>
                    📣
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{p.judul}</div>
                    <div className="job-meta">{fmtDate(p.publishedAt || p.createdAt)}</div>
                  </div>
                </div>
              ))}
              {latestPengumuman.length === 0 && <div className="empty">Belum ada pengumuman.</div>}
            </div>
          </div>
        </div>

        {/* Showcase Galeri Dokumentasi & Video Kegiatan */}
        {publicGaleri.length > 0 && (
          <div style={{ marginTop: '52px', marginBottom: '24px' }}>
            <div className="section-head" style={{ marginBottom: '20px' }}>
              <div>
                <span className="badge blue" style={{ marginBottom: '6px' }}>📸 Dokumentasi & Liputan Visual</span>
                <h2>Galeri Kegiatan & Video Resmi BKK</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0' }}>
                  Saksikan dokumentasi bursa kerja, rekrutmen alumni, kunjungan industri, dan video profil layanan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('galeri')}
                className="btn btn-outline"
                style={{ fontWeight: 600 }}
              >
                Lihat Semua Galeri ({publicGaleri.length}) →
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '20px'
              }}
            >
              {showcaseGaleri.map((item) => {
                const thumb = getMediaThumbnail(item.tipe, item.url, item.thumbnailUrl, item.youtubeId);
                const isVideo = item.tipe === 'video';
                return (
                  <div
                    key={item.id}
                    onClick={() => setPreviewGaleri(item)}
                    style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 10px 20px -4px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', paddingBottom: '60%', backgroundColor: '#0f172a' }}>
                      <img
                        src={thumb}
                        alt={item.judul}
                        loading="lazy"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isVideo ? '#dc2626' : '#2563eb',
                            color: '#ffffff'
                          }}
                        >
                          {isVideo ? '🎬 VIDEO' : '📷 FOTO'}
                        </span>
                      </div>
                      {isVideo && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(220, 38, 38, 0.9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', paddingLeft: '3px' }}>
                            ▶
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600, marginBottom: '4px' }}>
                        {item.kategori}
                      </div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#0f172a',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {item.judul}
                      </h4>
                      <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ color: isVideo ? '#dc2626' : '#2563eb', fontWeight: 600 }}>
                          {isVideo ? 'Putar Video ▶' : 'Lihat Foto 🔍'}
                        </span>
                        <span style={{ color: '#94a3b8' }}>
                          {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Preview Media untuk Beranda */}
      {previewGaleri && (
        <MediaViewerModal
          item={previewGaleri}
          onClose={() => setPreviewGaleri(null)}
        />
      )}
    </div>
  );
};

// ----------------- LOWONGAN LIST -----------------
export const LowonganListView: React.FC<PublicProps & { currentQuery?: string }> = ({
  lowongan,
  perusahaan,
  kategori,
  onNavigate,
  currentQuery = ''
}) => {
  const [q, setQ] = useState(currentQuery);
  const [kat, setKat] = useState('');
  const [jenis, setJenis] = useState('');
  const [lokasi, setLokasi] = useState('');

  let list = lowongan.filter((l) => l.status === 'published');

  if (q.trim()) {
    const kw = q.toLowerCase();
    list = list.filter((l) => {
      const prs = perusahaan.find((p) => p.id === l.perusahaanId);
      return (
        l.judul.toLowerCase().includes(kw) ||
        (prs && prs.namaPerusahaan.toLowerCase().includes(kw)) ||
        (l.jurusan && l.jurusan.toLowerCase().includes(kw))
      );
    });
  }

  if (kat) {
    list = list.filter((l) => l.kategoriId === kat);
  }

  if (jenis) {
    list = list.filter((l) => l.jenisPekerjaan === jenis);
  }

  if (lokasi.trim()) {
    list = list.filter((l) => l.lokasi.toLowerCase().includes(lokasi.toLowerCase()));
  }

  return (
    <div className="section wrap">
      <div className="section-head">
        <div>
          <h2>Lowongan Pekerjaan BKK</h2>
          <p>Daftar {list.length} lowongan kerja dan magang aktif dari perusahaan mitra</p>
        </div>
      </div>

      {/* Filter box */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="row-2" style={{ gap: '12px', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', alignItems: 'end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Kata Kunci</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Posisi, jurusan, perusahaan..."
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Kategori</label>
            <select value={kat} onChange={(e) => setKat(e.target.value)}>
              <option value="">Semua Kategori</option>
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Jenis</label>
            <select value={jenis} onChange={(e) => setJenis(e.target.value)}>
              <option value="">Semua Jenis</option>
              {Object.entries(JENIS_PEKERJAAN_MAP).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Lokasi</label>
            <input
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              placeholder="Kota / Daerah"
            />
          </div>
          <button
            className="btn btn-outline"
            onClick={() => {
              setQ('');
              setKat('');
              setJenis('');
              setLokasi('');
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-3">
        {list.map((job) => {
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
                  <h3 className="job-title">{job.judul}</h3>
                  <p className="job-company">{prs?.namaPerusahaan || '-'}</p>
                </div>
              </div>
              <div className="tag-row">
                <span className="tag blue">📍 {job.lokasi}</span>
                <span className="tag green">{JENIS_PEKERJAAN_MAP[job.jenisPekerjaan] || job.jenisPekerjaan}</span>
                {job.jurusan && <span className="tag">{job.jurusan}</span>}
              </div>
              <div className="job-meta">
                🎓 Pendidikan: {job.pendidikanMinimal}
              </div>
              <div className="job-foot">
                <span className="job-meta">Batas: {fmtDate(job.tanggalTutup)}</span>
                <span className="link-btn">Lihat Detail →</span>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="empty" style={{ gridColumn: '1/-1' }}>
            <div className="ic">🔍</div>
            Tidak ada lowongan yang sesuai dengan kriteria filter Anda.
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------- LOWONGAN DETAIL -----------------
export const LowonganDetailView: React.FC<
  PublicProps & { jobIdentifier: string }
> = ({
  lowongan,
  perusahaan,
  kategori,
  jobIdentifier,
  onNavigate,
  onApplyJob,
  hasApplied
}) => {
  const { currentUser, isUser } = useAuth();
  const job = lowongan.find((l) => l.slug === jobIdentifier || l.id === jobIdentifier);

  if (!job) {
    return (
      <div className="wrap section helper-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '48px' }}>🔎</div>
        <h1>Lowongan Tidak Ditemukan</h1>
        <p>Lowongan yang Anda cari tidak tersedia atau sudah ditutup.</p>
        <button onClick={() => onNavigate('lowongan')} className="btn btn-primary" style={{ marginTop: '14px' }}>
          Kembali ke Daftar Lowongan
        </button>
      </div>
    );
  }

  const prs = perusahaan.find((p) => p.id === job.perusahaanId);
  const kat = kategori.find((k) => k.id === job.kategoriId);
  const isClosed = job.status !== 'published' || new Date(job.tanggalTutup).getTime() < Date.now();
  const alreadyApplied = hasApplied(job.id);

  return (
    <div className="wrap section">
      <div className="card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="logo-box" style={{ width: '60px', height: '60px', fontSize: '20px' }}>
              {initials(prs?.namaPerusahaan || 'BKK')}
            </div>
            <div>
              <h1 style={{ fontSize: '24px', margin: '0 0 6px', fontWeight: 800 }}>{job.judul}</h1>
              {prs ? (
                <button
                  onClick={() => onNavigate(`perusahaan/${prs.id}`)}
                  className="link-btn"
                  style={{ fontSize: '15px' }}
                >
                  🏢 {prs.namaPerusahaan}
                </button>
              ) : (
                <span className="job-company">Perusahaan Mitra BKK</span>
              )}
            </div>
          </div>

          <div>
            {isClosed ? (
              <span className="badge grey" style={{ padding: '8px 14px', fontSize: '14px' }}>
                Lowongan Telah Ditutup
              </span>
            ) : alreadyApplied ? (
              <span className="badge green" style={{ padding: '8px 14px', fontSize: '14px' }}>
                ✓ Lamaran Sudah Terkirim
              </span>
            ) : isUser ? (
              <button onClick={() => onApplyJob(job)} className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '15px' }}>
                Lamar Sekarang 🚀
              </button>
            ) : currentUser ? (
              <span className="job-meta">Login sebagai pencari kerja untuk melamar</span>
            ) : (
              <button onClick={() => onNavigate('login')} className="btn btn-primary">
                Masuk untuk Melamar
              </button>
            )}
          </div>
        </div>

        <div className="tag-row" style={{ marginTop: '20px' }}>
          <span className="tag blue">📍 {job.lokasi}</span>
          <span className="tag green">{JENIS_PEKERJAAN_MAP[job.jenisPekerjaan] || job.jenisPekerjaan}</span>
          <span className="tag">🎓 {job.pendidikanMinimal}</span>
          {job.jurusan && <span className="tag amber">Jurusan: {job.jurusan}</span>}
        </div>

        <div className="divider" />

        <div className="grid grid-2">
          <div>
            <h3 style={{ fontSize: '16px', marginTop: 0 }}>Deskripsi Pekerjaan</h3>
            <p style={{ fontSize: '14.5px', color: 'var(--text)', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {job.deskripsi}
            </p>

            <h3 style={{ fontSize: '16px', marginTop: '24px' }}>Persyaratan & Kualifikasi</h3>
            <p style={{ fontSize: '14.5px', color: 'var(--text)', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {job.persyaratan}
            </p>
          </div>

          <div>
            <div className="card" style={{ background: 'var(--bg)' }}>
              <h3 style={{ fontSize: '15px', marginTop: 0, marginBottom: '14px' }}>Ringkasan Lowongan</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Kategori</td>
                    <td><b>{kat?.nama || '-'}</b></td>
                  </tr>
                  <tr>
                    <td>Kebutuhan</td>
                    <td>{job.jumlahKebutuhan} orang</td>
                  </tr>
                  <tr>
                    <td>Jurusan Target</td>
                    <td>{job.jurusan || 'Semua Jurusan'}</td>
                  </tr>
                  <tr>
                    <td>Pengalaman</td>
                    <td>{job.pengalamanMinimal || 'Fresh graduate'}</td>
                  </tr>
                  <tr>
                    <td>Rentang Usia</td>
                    <td>{job.usiaMinimal || 18} – {job.usiaMaksimal || 25} tahun</td>
                  </tr>
                  <tr>
                    <td>Tanggal Buka</td>
                    <td>{fmtDate(job.tanggalBuka)}</td>
                  </tr>
                  <tr>
                    <td>Batas Lamar</td>
                    <td><b style={{ color: 'var(--primary)' }}>{fmtDate(job.tanggalTutup)}</b></td>
                  </tr>
                  <tr>
                    <td>Penyaluran Kerja</td>
                    <td><b>BKK SMK PGRI 1 Taman</b></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {prs && (
              <div className="card" style={{ marginTop: '16px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Tentang Perusahaan</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  {prs.deskripsi || `${prs.namaPerusahaan} adalah mitra resmi DUDI BKK SMK PGRI 1 Taman.`}
                </p>
                <div style={{ marginTop: '10px' }}>
                  <button onClick={() => onNavigate(`perusahaan/${prs.id}`)} className="link-btn">
                    Lihat Profil Perusahaan →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------- PERUSAHAAN LIST -----------------
export const PerusahaanListView: React.FC<PublicProps> = ({
  perusahaan,
  lowongan,
  onNavigate
}) => {
  const verified = perusahaan.filter((p) => p.statusVerifikasi === 'verified');

  return (
    <div className="wrap section">
      <div className="section-head">
        <div>
          <h2>Perusahaan Mitra Industri (DUDI)</h2>
          <p>{verified.length} perusahaan telah terverifikasi bekerja sama dengan BKK SMK PGRI 1 Taman</p>
        </div>
      </div>
      <div className="grid grid-3">
        {verified.map((prs) => {
          const jobCount = lowongan.filter((l) => l.perusahaanId === prs.id && l.status === 'published').length;
          return (
            <div
              key={prs.id}
              className="card job-card"
              onClick={() => onNavigate(`perusahaan/${prs.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="top">
                <div className="logo-box">{initials(prs.namaPerusahaan)}</div>
                <div>
                  <h3 className="job-title">{prs.namaPerusahaan}</h3>
                  <p className="job-company">{prs.bidangUsaha}</p>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0' }}>
                {prs.deskripsi ? prs.deskripsi.slice(0, 110) + '...' : 'Mitra resmi penempatan alumni.'}
              </p>
              <div className="job-meta">
                📍 {prs.alamat ? `${prs.alamat}, ${prs.kabupaten}` : `${prs.kabupaten}, ${prs.provinsi || 'Jawa Timur'}`}
              </div>
              <div className="job-foot">
                <span className="tag blue">{jobCount} lowongan aktif</span>
                <span className="link-btn">Lihat Detail →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ----------------- PERUSAHAAN DETAIL -----------------
export const PerusahaanDetailView: React.FC<PublicProps & { companyId: string }> = ({
  perusahaan,
  lowongan,
  companyId,
  onNavigate
}) => {
  const { isAdmin, perusahaan: userPerusahaan } = useAuth();
  const prs = perusahaan.find((p) => p.id === companyId);
  if (!prs) {
    return (
      <div className="wrap section helper-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '48px' }}>🏢</div>
        <h1>Perusahaan Tidak Ditemukan</h1>
        <button onClick={() => onNavigate('perusahaan')} className="btn btn-primary" style={{ marginTop: '14px' }}>
          Kembali ke Daftar Perusahaan
        </button>
      </div>
    );
  }

  // Hak akses info kontak sensitif: Hanya Admin atau Akun Perusahaan pemilik yang bersangkutan
  const canViewSensitiveContact = isAdmin || (userPerusahaan && userPerusahaan.id === prs.id);
  const jobs = lowongan.filter((j) => j.perusahaanId === prs.id && j.status === 'published');

  // Alamat publik yang ditampilkan
  const alamatLengkap = [prs.alamat, prs.kecamatan, prs.kabupaten, prs.provinsi || 'Jawa Timur']
    .filter(Boolean)
    .join(', ');

  return (
    <div className="wrap section">
      <div className="card" style={{ padding: '26px' }}>
        <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
          <div className="logo-box" style={{ width: '64px', height: '64px', fontSize: '22px' }}>
            {initials(prs.namaPerusahaan)}
          </div>
          <div>
            <h1 style={{ fontSize: '24px', margin: '0 0 4px', fontWeight: 800 }}>{prs.namaPerusahaan}</h1>
            <div className="job-meta">
              🏢 Bidang Usaha: <b>{prs.bidangUsaha}</b>
            </div>
            <div className="job-meta" style={{ marginTop: '4px' }}>
              📍 Alamat: <b>{alamatLengkap || `${prs.kabupaten}, ${prs.provinsi || 'Jawa Timur'}`}</b>
            </div>
          </div>
        </div>
        <p style={{ marginTop: '16px', fontSize: '14.5px', lineHeight: 1.6 }}>
          {prs.deskripsi || 'Perusahaan mitra resmi BKK SMK PGRI 1 Taman dalam penyerapan tenaga kerja alumni.'}
        </p>

        {/* Informasi Kontak Sensitif (Hanya Admin & Perusahaan Pemilik) */}
        {canViewSensitiveContact ? (
          <div style={{ marginTop: '18px', padding: '12px 16px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🔒 Informasi Kontak Resmi (Khusus Admin & Pengelola Perusahaan)
            </div>
            <div className="tag-row">
              {prs.website && <span className="tag blue">🌐 {prs.website}</span>}
              {prs.email && <span className="tag">✉️ {prs.email}</span>}
              {prs.noTelepon && <span className="tag">📞 {prs.noTelepon}</span>}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>ℹ️</span>
            <span>Seluruh proses komunikasi dan lamaran kerja dilakukan terpusat melalui portal BKK SMK PGRI 1 Taman.</span>
          </div>
        )}
      </div>

      <div className="section-head" style={{ marginTop: '36px' }}>
        <div>
          <h2>Lowongan Terbuka dari {prs.namaPerusahaan}</h2>
          <p>{jobs.length} posisi yang sedang membuka pendaftaran</p>
        </div>
      </div>

      <div className="grid grid-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="card job-card"
            onClick={() => onNavigate(`lowongan/${job.slug || job.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <div className="top">
              <div className="logo-box">{initials(prs.namaPerusahaan)}</div>
              <div>
                <h3 className="job-title">{job.judul}</h3>
                <p className="job-company">{prs.namaPerusahaan}</p>
              </div>
            </div>
            <div className="tag-row">
              <span className="tag blue">📍 {job.lokasi}</span>
              <span className="tag green">{JENIS_PEKERJAAN_MAP[job.jenisPekerjaan] || job.jenisPekerjaan}</span>
            </div>
            <div className="job-meta">
              🎓 Pendidikan: {job.pendidikanMinimal}
            </div>
            <div className="job-foot">
              <span className="job-meta">Batas: {fmtDate(job.tanggalTutup)}</span>
              <span className="link-btn">Lihat Lowongan →</span>
            </div>
          </div>
        ))}
        {jobs.length === 0 && (
          <div className="empty" style={{ gridColumn: '1/-1' }}>
            <div className="ic">💼</div>
            Saat ini belum ada lowongan aktif dari perusahaan ini.
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------- AGENDA VIEW -----------------
export const AgendaView: React.FC<PublicProps> = ({ agenda }) => {
  const published = agenda.filter((a) => a.status === 'published');
  return (
    <div className="wrap section">
      <div className="section-head">
        <div>
          <h2>Agenda BKK SMK PGRI 1 Taman</h2>
          <p>Jadwal Job Fair, pelatihan wawancara, psikotes, dan kunjungan industri</p>
        </div>
      </div>
      <div className="grid grid-2">
        {published.map((a) => (
          <div key={a.id} className="card">
            <span className="badge blue">{fmtDate(a.tanggalMulai)}</span>
            <h3 style={{ margin: '12px 0 6px', fontSize: '17px', fontWeight: 700 }}>{a.judul}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
              {a.deskripsi}
            </p>
            <div className="job-meta">
              📍 <b>Lokasi:</b> {a.lokasi} · <b>Penyelenggara:</b> {a.penyelenggara}
            </div>
          </div>
        ))}
        {published.length === 0 && <div className="empty">Belum ada agenda kegiatan yang dijadwalkan.</div>}
      </div>
    </div>
  );
};

// ----------------- PENGUMUMAN LIST & DETAIL -----------------
export const PengumumanListView: React.FC<PublicProps> = ({ pengumuman, onNavigate }) => {
  const published = pengumuman.filter((p) => p.status === 'published');
  return (
    <div className="wrap section">
      <div className="section-head">
        <div>
          <h2>Pengumuman Resmi BKK</h2>
          <p>Informasi jadwal seleksi, verifikasi dokumen, dan pengumuman hasil rekrutmen</p>
        </div>
      </div>
      <div className="grid grid-2">
        {published.map((p) => (
          <div
            key={p.id}
            className="card"
            onClick={() => onNavigate(`pengumuman/${p.slug || p.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <div className="job-meta">{fmtDate(p.publishedAt || p.createdAt)}</div>
            <h3 style={{ margin: '8px 0', fontSize: '17px', fontWeight: 700 }}>{p.judul}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              {p.isi.slice(0, 150)}...
            </p>
            <div style={{ marginTop: '12px' }}>
              <span className="link-btn">Baca Selengkapnya →</span>
            </div>
          </div>
        ))}
        {published.length === 0 && <div className="empty">Belum ada pengumuman resmi.</div>}
      </div>
    </div>
  );
};

export const PengumumanDetailView: React.FC<PublicProps & { slug: string }> = ({
  pengumuman,
  slug,
  onNavigate
}) => {
  const item = pengumuman.find((p) => p.slug === slug || p.id === slug);
  if (!item) {
    return (
      <div className="wrap section helper-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '48px' }}>📣</div>
        <h1>Pengumuman Tidak Ditemukan</h1>
        <button onClick={() => onNavigate('pengumuman')} className="btn btn-primary" style={{ marginTop: '14px' }}>
          Kembali ke Pengumuman
        </button>
      </div>
    );
  }
  return (
    <div className="wrap section helper-page">
      <div className="job-meta" style={{ marginBottom: '8px' }}>
        Diterbitkan: {fmtDate(item.publishedAt || item.createdAt)}
      </div>
      <h1 style={{ marginBottom: '18px' }}>{item.judul}</h1>
      <div style={{ fontSize: '15px', lineHeight: 1.7, whiteSpace: 'pre-line', marginBottom: '28px' }}>
        {item.isi}
      </div>
      <button onClick={() => onNavigate('pengumuman')} className="btn btn-outline">
        ← Kembali ke Pengumuman
      </button>
    </div>
  );
};

// ----------------- TENTANG BKK -----------------
export const TentangView: React.FC<{ settings: SiteSettings }> = ({ settings }) => {
  return (
    <div className="wrap section helper-page">
      <h1>Tentang BKK SMK PGRI 1 Taman</h1>
      <p style={{ fontSize: '15px', lineHeight: 1.7 }}>
        Bursa Kerja Khusus (BKK) SMK PGRI 1 Taman adalah unit pelaksana penempatan tenaga kerja resmi di bawah
        naungan SMK PGRI 1 Taman, Sidoarjo, yang terdaftar di Dinas Tenaga Kerja. BKK berfungsi sebagai jembatan
        penghubung antara alumni lulusan sekolah dengan Dunia Usaha dan Dunia Industri (DUDI).
      </p>

      <h3>Tugas & Layanan Utama BKK</h3>
      <div className="pill-check">✅ Pendataan dan penelusuran tamatan (Tracer Study) alumni SMK PGRI 1 Taman.</div>
      <div className="pill-check">✅ Publikasi lowongan kerja resmi, magang industri, dan rekrutmen massal.</div>
      <div className="pill-check">✅ Pembekalan kesiapan kerja (Pelatihan CV ATS, etos kerja industri, simulasi wawancara).</div>
      <div className="pill-check">✅ Penyelenggaraan Job Fair dan proses rekrutmen langsung (Walk-in Interview).</div>
      <div className="pill-check">✅ Kerja sama kemitraan industri (MoU) penyaluran tenaga kerja terampil.</div>

      <h3>Visi & Misi</h3>
      <p style={{ fontSize: '15px', lineHeight: 1.7 }}>
        <b>Visi:</b> Menjadi pusat layanan penempatan kerja lulusan SMK yang unggul, terpercaya, dan adaptif terhadap
        kebutuhan kompetensi era industri modern.
        <br /><br />
        <b>Misi:</b>
        <br />1. Menjalin kemitraan strategis dengan dunia usaha dan industri manufaktur, jasa, dan teknologi.
        <br />2. Meningkatkan serapan kerja lulusan SMK PGRI 1 Taman di pasar kerja lokal maupun nasional.
        <br />3. Memberikan pelayanan rekrutmen transparan, cepat, dan terdigitalisasi berbasis cloud database.
      </p>

      <h3>Alamat & Kontak Kantor BKK</h3>
      <p style={{ fontSize: '14.5px', color: 'var(--text-muted)' }}>
        {settings.siteAddress}
        <br />Email: {settings.siteEmail} · Telepon: {settings.sitePhone}
      </p>
    </div>
  );
};

// ----------------- FAQ -----------------
export const FaqView: React.FC = () => {
  const faqs = [
    {
      q: 'Siapa saja yang boleh mendaftar di portal BKK ini?',
      a: 'Portal BKK SMK PGRI 1 Taman dapat digunakan oleh seluruh alumni, siswa tingkat akhir yang bersiap lulus, serta perwakilan HRD perusahaan yang ingin bermitra mencari tenaga kerja.'
    },
    {
      q: 'Apakah pendaftaran dan pelamaran kerja dipungut biaya?',
      a: 'Tidak sama sekali. Seluruh layanan pendaftaran, pelamaran pekerjaan, hingga proses seleksi di BKK SMK PGRI 1 Taman GRATIS 100% tanpa dipungut biaya apapun.'
    },
    {
      q: 'Bagaimana cara melamar lowongan kerja?',
      a: 'Daftar akun sebagai "Pencari Kerja" atau masuk via Google Login, lengkapi profil biodata serta unggah CV Anda, lalu pilih lowongan yang diminati dan klik tombol "Lamar Sekarang".'
    },
    {
      q: 'Bagaimana alur pendaftaran untuk Perusahaan Mitra?',
      a: 'Pilih "Daftar sebagai Perusahaan", isi data legalitas perusahaan serta PIC HRD. Akun perusahaan akan diverifikasi oleh Admin BKK dalam 1-2 hari kerja sebelum dapat mempublikasikan lowongan secara publik.'
    },
    {
      q: 'Apakah data saya aman?',
      a: 'Ya, seluruh data tersinkronisasi langsung ke Firebase Authentication dan Cloud Firestore berstandar enkripsi enterprise dari Google Cloud.'
    }
  ];

  return (
    <div className="wrap section helper-page">
      <h1>Pertanyaan yang Sering Diajukan (FAQ)</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        Temukan jawaban cepat seputar penggunaan sistem BKK SMK PGRI 1 Taman.
      </p>
      {faqs.map((f, i) => (
        <div key={i} className="card" style={{ marginBottom: '14px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>{f.q}</h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.a}</p>
        </div>
      ))}
    </div>
  );
};

// ----------------- KONTAK -----------------
export const KontakView: React.FC<{ settings: SiteSettings; showToast: (msg: string, type?: 'success' | 'error') => void }> = ({
  settings,
  showToast
}) => {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [pesan, setPesan] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Pesan Anda berhasil dikirim ke pengurus BKK SMK PGRI 1 Taman!', 'success');
    setNama('');
    setEmail('');
    setPesan('');
  };

  return (
    <div className="wrap section">
      <div className="grid grid-2">
        <div className="helper-page" style={{ margin: 0 }}>
          <h1>Hubungi Pengurus BKK</h1>
          <p>Ada pertanyaan, ingin menjalin kerja sama industri, atau butuh bantuan pendaftaran alumni?</p>
          <table style={{ marginTop: '20px' }}>
            <tbody>
              <tr>
                <td><b>Alamat Kampus</b></td>
                <td>{settings.siteAddress}</td>
              </tr>
              <tr>
                <td><b>Telepon / WA</b></td>
                <td>{settings.sitePhone}</td>
              </tr>
              <tr>
                <td><b>Email Resmi</b></td>
                <td>{settings.siteEmail}</td>
              </tr>
              <tr>
                <td><b>Jam Operasional</b></td>
                <td>Senin – Jumat: 07.30 – 15.00 WIB</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Kirim Pesan Langsung</h3>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Nama Lengkap</label>
              <input required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Anda" />
            </div>
            <div className="field">
              <label>Email Kontak</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" />
            </div>
            <div className="field">
              <label>Pesan / Keperluan</label>
              <textarea required value={pesan} onChange={(e) => setPesan(e.target.value)} placeholder="Tulis pesan atau pertanyaan Anda di sini..." />
            </div>
            <button className="btn btn-primary btn-block" type="submit">
              Kirim Pesan Sekarang
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ----------------- LOGIN -----------------
export const LoginView: React.FC<{ onNavigate: (route: string) => void; showToast: (msg: string, type?: 'success' | 'error') => void }> = ({
  onNavigate,
  showToast
}) => {
  const { loginWithGoogle, loginWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password);
      showToast('Berhasil masuk!', 'success');
      onNavigate('');
    } catch (err: any) {
      showToast('Login gagal: ' + (err.message || 'Periksa email dan password'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      showToast('Berhasil masuk via Akun Google!', 'success');
      onNavigate('');
    } catch (err: any) {
      showToast('Gagal login Google: ' + (err.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card form-card">
        <h2 style={{ marginTop: 0 }}>Masuk ke Portal BKK</h2>
        <p className="page-sub">Gunakan akun pencari kerja, perusahaan mitra, atau admin.</p>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={isSubmitting || loading}
          className="btn btn-outline btn-block"
          style={{ marginBottom: '16px', gap: '10px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Masuk dengan Akun Google
        </button>

        <div style={{ textAlign: 'center', margin: '14px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
          — ATAU DENGAN EMAIL —
        </div>

        <form onSubmit={handleEmailLogin}>
          <div className="field">
            <label>Alamat Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={isSubmitting || loading}>
            {isSubmitting ? 'Memproses...' : 'Masuk Sekarang'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13.5px', marginTop: '18px', color: 'var(--text-muted)' }}>
          Belum punya akun?{' '}
          <button onClick={() => onNavigate('register')} className="link-btn" style={{ fontWeight: 700 }}>
            Daftar Sekarang
          </button>
        </p>
      </div>
    </div>
  );
};

// ----------------- REGISTER -----------------
export const RegisterView: React.FC<{
  mode?: 'user' | 'company';
  onNavigate: (route: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}> = ({ mode = 'user', onNavigate, showToast }) => {
  const { registerUser, loginWithGoogle, loading } = useAuth();
  const [currentMode, setCurrentMode] = useState<'user' | 'company'>(mode);
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [hp, setHp] = useState('');
  const [jk, setJk] = useState('L');
  const [tahunLulus, setTahunLulus] = useState('2024');
  const [jurusan, setJurusan] = useState('');

  // Perusahaan fields
  const [bidang, setBidang] = useState('');
  const [kabupaten, setKabupaten] = useState('Sidoarjo');
  const [jabatan, setJabatan] = useState('HRD Manager');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) {
      showToast('Konfirmasi password tidak cocok', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password minimal 6 karakter', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentMode === 'user') {
        await registerUser(email.trim(), password, nama.trim(), 'user', {
          noHp: hp,
          jenisKelamin: jk,
          tahunLulus,
          jurusan
        });
        showToast('Pendaftaran Pencari Kerja berhasil!', 'success');
        onNavigate('user/dashboard');
      } else {
        await registerUser(email.trim(), password, nama.trim(), 'company', {
          namaPerusahaan: nama.trim(),
          bidangUsaha: bidang,
          kabupaten,
          jabatanPic: jabatan,
          noTelepon: hp
        });
        showToast('Pendaftaran Perusahaan berhasil! Menunggu verifikasi admin.', 'success');
        onNavigate('perusahaan-app/dashboard');
      }
    } catch (err: any) {
      showToast('Pendaftaran gagal: ' + (err.message || 'Periksa input Anda'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card form-card" style={{ maxWidth: '560px' }}>
        <h2 style={{ marginTop: 0 }}>Buat Akun Baru BKK</h2>
        <div className="chip-tabs">
          <button
            type="button"
            className={`chip-tab ${currentMode === 'user' ? 'active' : ''}`}
            onClick={() => setCurrentMode('user')}
          >
            🎓 Pencari Kerja (Alumni/Siswa)
          </button>
          <button
            type="button"
            className={`chip-tab ${currentMode === 'company' ? 'active' : ''}`}
            onClick={() => setCurrentMode('company')}
          >
            🏢 Perusahaan Mitra (DUDI)
          </button>
        </div>

        {/* Daftar / Masuk dengan Google */}
        <button
          type="button"
          onClick={async () => {
            try {
              await loginWithGoogle();
              showToast('Berhasil terhubung dengan Akun Google!', 'success');
              onNavigate('');
            } catch (err: any) {
              showToast('Gagal daftar/login Google: ' + (err.message || 'Terjadi kesalahan'), 'error');
            }
          }}
          disabled={isSubmitting || loading}
          className="btn btn-outline btn-block"
          style={{ marginBottom: '16px', gap: '10px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Daftar / Masuk Cepat dengan Akun Google
        </button>

        <div style={{ textAlign: 'center', margin: '14px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
          — ATAU ISI FORMULIR LENGKAP —
        </div>

        <form onSubmit={handleRegister}>
          {currentMode === 'user' ? (
            <>
              <div className="row-2">
                <div className="field">
                  <label>Nama Lengkap <span className="req-star">*</span></label>
                  <input required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap Anda" />
                </div>
                <div className="field">
                  <label>Alamat Email <span className="req-star">*</span></label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" />
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label>Nomor WhatsApp/HP <span className="req-star">*</span></label>
                  <input required value={hp} onChange={(e) => setHp(e.target.value)} placeholder="08xxxxxxxxxx" />
                </div>
                <div className="field">
                  <label>Jenis Kelamin</label>
                  <select value={jk} onChange={(e) => setJk(e.target.value)}>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label>Tahun Lulus</label>
                  <input type="number" value={tahunLulus} onChange={(e) => setTahunLulus(e.target.value)} placeholder="2024" />
                </div>
                <div className="field">
                  <label>Jurusan SMK</label>
                  <input value={jurusan} onChange={(e) => setJurusan(e.target.value)} placeholder="Cth: Teknik Kendaraan Ringan" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="row-2">
                <div className="field">
                  <label>Nama Perusahaan <span className="req-star">*</span></label>
                  <input required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="PT Mitra Sejahtera" />
                </div>
                <div className="field">
                  <label>Bidang Usaha <span className="req-star">*</span></label>
                  <input required value={bidang} onChange={(e) => setBidang(e.target.value)} placeholder="Manufaktur & Otomotif" />
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label>Email Perusahaan <span className="req-star">*</span></label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hrd@perusahaan.com" />
                </div>
                <div className="field">
                  <label>Nomor Telepon Kantor <span className="req-star">*</span></label>
                  <input required value={hp} onChange={(e) => setHp(e.target.value)} placeholder="(031) xxx-xxxx" />
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label>Kabupaten / Kota <span className="req-star">*</span></label>
                  <input required value={kabupaten} onChange={(e) => setKabupaten(e.target.value)} placeholder="Sidoarjo" />
                </div>
                <div className="field">
                  <label>Jabatan PIC</label>
                  <input value={jabatan} onChange={(e) => setJabatan(e.target.value)} placeholder="HRD Manager" />
                </div>
              </div>
              <div className="skeleton-note">
                Akun perusahaan baru akan diverifikasi oleh Admin BKK SMK PGRI 1 Taman untuk menjamin keamanan para pelamar alumni.
              </div>
            </>
          )}

          <div className="row-2">
            <div className="field">
              <label>Password <span className="req-star">*</span></label>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder="Minimal 6 karakter" />
            </div>
            <div className="field">
              <label>Konfirmasi Password <span className="req-star">*</span></label>
              <input required type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} minLength={6} placeholder="Ulangi password" />
            </div>
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={isSubmitting || loading}>
            {isSubmitting ? 'Mendaftarkan...' : `Daftar sebagai ${currentMode === 'user' ? 'Pencari Kerja' : 'Perusahaan'}`}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13.5px', marginTop: '16px', color: 'var(--text-muted)' }}>
          Sudah memiliki akun?{' '}
          <button onClick={() => onNavigate('login')} className="link-btn" style={{ fontWeight: 700 }}>
            Masuk di sini
          </button>
        </p>
      </div>
    </div>
  );
};
