import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import {
  testConnection,
  getAllLowongan,
  getAllPerusahaan,
  getAllKategori,
  getAllAgenda,
  getAllPengumuman,
  getAllLamaran,
  getLamaranByUser,
  getAllPencariKerja,
  getAllUsers,
  getAllPenempatan,
  getAllAuditLogs,
  getSiteSettings,
  saveLamaran,
  saveRiwayat,
  saveNotifikasi,
  getAllBroadcasts,
  getAllGaleri,
  seedInitialDataToFirestore
} from './services/db.js';
import type {
  Lowongan,
  Perusahaan,
  Kategori,
  Agenda,
  Pengumuman,
  Lamaran,
  PencariKerja,
  UserProfile,
  Penempatan,
  AuditLog,
  SiteSettings,
  RiwayatLamaran,
  BroadcastHistory,
  GaleriItem
} from './types.js';
import { uid } from './utils/formatters.js';
import { Navigation } from './components/Navigation.js';
import { Footer } from './components/Footer.js';
import { ToastContainer, type ToastMessage } from './components/Toast.js';
import {
  BerandaView,
  LowonganListView,
  LowonganDetailView,
  PerusahaanListView,
  PerusahaanDetailView,
  AgendaView,
  PengumumanListView,
  PengumumanDetailView,
  TentangView,
  FaqView,
  KontakView,
  LoginView,
  RegisterView
} from './components/PublicViews.js';
import { PublicGaleriView } from './components/PublicGaleriView.js';
import {
  UserDashboardView,
  UserProfilView,
  UserCVView,
  UserLamaranView,
  UserNotifikasiView
} from './components/UserViews.js';
import {
  CompanyDashboardView,
  CompanyProfilView,
  CompanyLowonganListView,
  CompanyLowonganFormView,
  CompanyPelamarView,
  CompanyLaporanView
} from './components/CompanyViews.js';
import {
  AdminDashboardView,
  AdminUsersView,
  AdminPencariKerjaView,
  AdminPerusahaanView,
  AdminKategoriView,
  AdminLowonganView,
  AdminVerifikasiLamaranView,
  AdminTracerStudyView,
  AdminAgendaView,
  AdminPengumumanView,
  AdminLaporanView,
  AdminSettingsView
} from './components/AdminViews.js';
import { AdminBroadcastView } from './components/AdminBroadcastView.js';
import { AdminGaleriView } from './components/AdminGaleriView.js';

function MainApplication() {
  const { currentUser, userProfile, pencariKerja, perusahaan, isAdmin, isCompany, isUser, logout } = useAuth();

  // Application Data States
  const [lowongan, setLowongan] = useState<Lowongan[]>([]);
  const [perusahaanList, setPerusahaanList] = useState<Perusahaan[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [agenda, setAgenda] = useState<Agenda[]>([]);
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [lamaran, setLamaran] = useState<Lamaran[]>([]);
  const [allPencariKerja, setAllPencariKerja] = useState<PencariKerja[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [penempatan, setPenempatan] = useState<Penempatan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastHistory[]>([]);
  const [galeri, setGaleri] = useState<GaleriItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: 'BKK SMK PGRI 1 Taman',
    siteEmail: 'bkk@smkpgri1taman.sch.id',
    sitePhone: '(031) 788-1234',
    siteAddress: 'Jl. Raya Wonocolo No. 24, Taman, Pemalang, Jawa Tengah',
    siteCity: 'Pemalang'
  });

  // UI state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [currentRoute, setCurrentRoute] = useState<string>('');

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = uid('tst');
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Hash-based routing sync
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      setCurrentRoute(hash);
      window.scrollTo(0, 0);
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (route: string) => {
    window.location.hash = `#/${route}`;
  };

  // Muat data dari Firestore
  const loadData = useCallback(async () => {
    try {
      await testConnection();

      // 1. Data Publik (Aman diakses tanpa autentikasi)
      const [
        jobsData,
        compData,
        katData,
        agdData,
        pngData,
        penData,
        setData,
        galData
      ] = await Promise.all([
        getAllLowongan().catch(() => []),
        getAllPerusahaan().catch(() => []),
        getAllKategori().catch(() => []),
        getAllAgenda().catch(() => []),
        getAllPengumuman().catch(() => []),
        getAllPenempatan().catch(() => []),
        getSiteSettings().catch(() => null),
        getAllGaleri().catch(() => [])
      ]);

      setLowongan(jobsData);
      setPerusahaanList(compData);
      setKategori(katData);
      setAgenda(agdData);
      setPengumuman(pngData);
      setPenempatan(penData);
      if (setData) setSettings(setData);
      setGaleri(galData);

      // 2. Data Terautentikasi (Hanya diakses saat pengguna login)
      if (currentUser) {
        let lamData: Lamaran[] = [];
        let pkData: PencariKerja[] = [];
        let usersData: UserProfile[] = [];
        let logsData: AuditLog[] = [];
        let bcastData: BroadcastHistory[] = [];

        if (isAdmin) {
          [lamData, pkData, usersData, logsData, bcastData] = await Promise.all([
            getAllLamaran().catch(() => []),
            getAllPencariKerja().catch(() => []),
            getAllUsers().catch(() => []),
            getAllAuditLogs().catch(() => []),
            getAllBroadcasts().catch(() => [])
          ]);
        } else if (isCompany) {
          const [allLams, pk] = await Promise.all([
            getAllLamaran().catch(() => []),
            getAllPencariKerja().catch(() => [])
          ]);
          // Hanya lamaran yang telah lolos screening BKK yang tampil di panel HRD perusahaan
          lamData = allLams.filter((a) => a.statusVerifikasi === 'disetujui');
          pkData = pk;
        } else {
          lamData = await getLamaranByUser(currentUser.uid).catch(() => []);
        }

        setLamaran(lamData);
        setAllPencariKerja(pkData);
        setAllUsers(usersData);
        setAuditLogs(logsData);
        setBroadcasts(bcastData);
      } else {
        setLamaran([]);
        setAllPencariKerja([]);
        setAllUsers([]);
        setAuditLogs([]);
        setBroadcasts([]);
      }
    } catch (err) {
      console.error('Error loading Firestore data:', err);
    }
  }, [currentUser, isAdmin, isCompany]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Apply Job
  const handleApplyJob = async (job: Lowongan) => {
    if (!currentUser) {
      navigateTo('login');
      return;
    }
    if (!isUser) {
      showToast('Hanya akun pencari kerja yang dapat melamar posisi pekerjaan!', 'error');
      return;
    }
    if (!pencariKerja) {
      showToast('Profil pencari kerja Anda belum lengkap.', 'error');
      navigateTo('user/profil');
      return;
    }

    const already = lamaran.some(
      (a) => a.lowonganId === job.id && (a.userId === currentUser.uid || a.pencariKerjaId === pencariKerja.id)
    );
    if (already) {
      showToast('Anda sudah mengajukan lamaran ke posisi ini!', 'info');
      return;
    }

    try {
      const lamaranId = uid('lam');
      const now = new Date().toISOString();
      const newLamaran: Lamaran = {
        id: lamaranId,
        lowonganId: job.id,
        pencariKerjaId: pencariKerja.id,
        userId: currentUser.uid,
        status: 'diajukan',
        statusVerifikasi: 'menunggu_verifikasi',
        catatanVerifikasi: 'Berkas telah diterima dan sedang dalam tahap screening awal oleh Tim BKK SMK PGRI 1 Taman sebelum diteruskan ke perusahaan.',
        coverLetter: `Saya ${pencariKerja.namaLengkap} alumni SMK PGRI 1 Taman mengajukan lamaran untuk posisi ${job.judul}.`,
        tanggalLamar: now,
        createdAt: now
      };
      await saveLamaran(newLamaran);

      const riw: RiwayatLamaran = {
        id: uid('riw'),
        lamaranId,
        statusLama: null,
        statusBaru: 'diajukan',
        catatan: 'Lamaran diajukan online oleh pelamar alumni (menunggu screening BKK)',
        diubahOleh: currentUser.uid,
        createdAt: now
      };
      await saveRiwayat(riw);

      // Notifikasi ke Pelamar bahwa lamaran sedang dalam screening awal BKK
      await saveNotifikasi({
        id: uid('ntf'),
        userId: currentUser.uid,
        judul: 'Lamaran Berhasil Diajukan',
        pesan: `Lamaran Anda untuk posisi "${job.judul}" telah masuk dan sedang dalam proses screening awal BKK SMK PGRI 1 Taman sebelum diteruskan ke perusahaan mitra.`,
        url: 'user/lamaran',
        createdAt: now
      });

      await loadData();
      showToast('Lamaran berhasil dikirim! Menunggu proses screening awal BKK.', 'success');
      navigateTo('user/lamaran');
    } catch (err: any) {
      showToast('Gagal mengajukan lamaran: ' + err.message, 'error');
    }
  };

  const hasApplied = (jobId: string) => {
    if (!currentUser) return false;
    return lamaran.some(
      (a) => a.lowonganId === jobId && (a.userId === currentUser.uid || (pencariKerja && a.pencariKerjaId === pencariKerja.id))
    );
  };

  // Route Parser
  const routeParts = currentRoute.split('/').filter(Boolean);
  const rootSegment = routeParts[0] || '';
  const subSegment = routeParts[1] || '';
  const isDashboardRoute =
    rootSegment === 'user' || rootSegment === 'perusahaan-app' || rootSegment === 'admin';

  // Render Component Based on Route
  const renderContent = () => {
    // 1. PUBLIC ROUTES
    if (!rootSegment) {
      return (
        <BerandaView
          lowongan={lowongan}
          perusahaan={perusahaanList}
          kategori={kategori}
          agenda={agenda}
          pengumuman={pengumuman}
          galeri={galeri}
          settings={settings}
          onNavigate={navigateTo}
          onApplyJob={handleApplyJob}
          hasApplied={hasApplied}
          showToast={showToast}
        />
      );
    }

    if (rootSegment === 'lowongan') {
      if (subSegment) {
        return (
          <LowonganDetailView
            jobIdentifier={subSegment}
            lowongan={lowongan}
            perusahaan={perusahaanList}
            kategori={kategori}
            agenda={agenda}
            pengumuman={pengumuman}
            settings={settings}
            onNavigate={navigateTo}
            onApplyJob={handleApplyJob}
            hasApplied={hasApplied}
            showToast={showToast}
          />
        );
      }
      const qParam = new URLSearchParams(window.location.hash.split('?')[1] || '').get('q') || '';
      return (
        <LowonganListView
          currentQuery={qParam}
          lowongan={lowongan}
          perusahaan={perusahaanList}
          kategori={kategori}
          agenda={agenda}
          pengumuman={pengumuman}
          settings={settings}
          onNavigate={navigateTo}
          onApplyJob={handleApplyJob}
          hasApplied={hasApplied}
          showToast={showToast}
        />
      );
    }

    if (rootSegment === 'perusahaan') {
      if (subSegment) {
        return (
          <PerusahaanDetailView
            companyId={subSegment}
            lowongan={lowongan}
            perusahaan={perusahaanList}
            kategori={kategori}
            agenda={agenda}
            pengumuman={pengumuman}
            settings={settings}
            onNavigate={navigateTo}
            onApplyJob={handleApplyJob}
            hasApplied={hasApplied}
            showToast={showToast}
          />
        );
      }
      return (
        <PerusahaanListView
          lowongan={lowongan}
          perusahaan={perusahaanList}
          kategori={kategori}
          agenda={agenda}
          pengumuman={pengumuman}
          settings={settings}
          onNavigate={navigateTo}
          onApplyJob={handleApplyJob}
          hasApplied={hasApplied}
          showToast={showToast}
        />
      );
    }

    if (rootSegment === 'agenda') {
      return (
        <AgendaView
          lowongan={lowongan}
          perusahaan={perusahaanList}
          kategori={kategori}
          agenda={agenda}
          pengumuman={pengumuman}
          settings={settings}
          onNavigate={navigateTo}
          onApplyJob={handleApplyJob}
          hasApplied={hasApplied}
          showToast={showToast}
        />
      );
    }

    if (rootSegment === 'pengumuman') {
      if (subSegment) {
        return (
          <PengumumanDetailView
            slug={subSegment}
            lowongan={lowongan}
            perusahaan={perusahaanList}
            kategori={kategori}
            agenda={agenda}
            pengumuman={pengumuman}
            settings={settings}
            onNavigate={navigateTo}
            onApplyJob={handleApplyJob}
            hasApplied={hasApplied}
            showToast={showToast}
          />
        );
      }
      return (
        <PengumumanListView
          lowongan={lowongan}
          perusahaan={perusahaanList}
          kategori={kategori}
          agenda={agenda}
          pengumuman={pengumuman}
          settings={settings}
          onNavigate={navigateTo}
          onApplyJob={handleApplyJob}
          hasApplied={hasApplied}
          showToast={showToast}
        />
      );
    }

    if (rootSegment === 'galeri') {
      return (
        <PublicGaleriView
          galeri={galeri}
          settings={settings}
          onNavigate={navigateTo}
        />
      );
    }

    if (rootSegment === 'tentang') return <TentangView settings={settings} />;
    if (rootSegment === 'faq') return <FaqView />;
    if (rootSegment === 'kontak') return <KontakView settings={settings} showToast={showToast} />;
    if (rootSegment === 'login') return <LoginView onNavigate={navigateTo} showToast={showToast} />;
    if (rootSegment === 'register') {
      const mode = subSegment === 'company' ? 'company' : 'user';
      return <RegisterView mode={mode} onNavigate={navigateTo} showToast={showToast} />;
    }

    // 2. USER DASHBOARD ROUTES
    if (rootSegment === 'user') {
      if (!currentUser) {
        return <LoginView onNavigate={navigateTo} showToast={showToast} />;
      }
      return (
        <div className="app-shell">
          <div className="sidebar">
            <div className="who" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)',
                  flexShrink: 0
                }}
              >
                {pencariKerja?.foto || userProfile?.photoURL ? (
                  <img
                    src={pencariKerja?.foto || userProfile?.photoURL}
                    alt={userProfile?.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '18px' }}>👤</span>
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userProfile?.name || 'Alumni'}
                </div>
                <div className="role">Pencari Kerja / Alumni</div>
              </div>
            </div>
            <div
              className={`side-link ${subSegment === 'dashboard' || !subSegment ? 'active' : ''}`}
              onClick={() => navigateTo('user/dashboard')}
            >
              <span className="ic">🏠</span> Dashboard
            </div>
            <div
              className={`side-link ${subSegment === 'profil' ? 'active' : ''}`}
              onClick={() => navigateTo('user/profil')}
            >
              <span className="ic">👤</span> Profil Saya
            </div>
            <div
              className={`side-link ${subSegment === 'cv' ? 'active' : ''}`}
              onClick={() => navigateTo('user/cv')}
            >
              <span className="ic">📄</span> CV & Portofolio
            </div>
            <div
              className={`side-link ${subSegment === 'lowongan' ? 'active' : ''}`}
              onClick={() => navigateTo('lowongan')}
            >
              <span className="ic">💼</span> Cari Lowongan
            </div>
            <div
              className={`side-link ${subSegment === 'lamaran' ? 'active' : ''}`}
              onClick={() => navigateTo('user/lamaran')}
            >
              <span className="ic">📥</span> Lamaran Saya
            </div>
            <div
              className={`side-link ${subSegment === 'notifikasi' ? 'active' : ''}`}
              onClick={() => navigateTo('user/notifikasi')}
            >
              <span className="ic">🔔</span> Notifikasi
            </div>
          </div>
          <div className="main">
            {(!subSegment || subSegment === 'dashboard') && (
              <UserDashboardView
                lowongan={lowongan}
                perusahaan={perusahaanList}
                lamaran={lamaran}
                notifikasi={[]}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'profil' && <UserProfilView showToast={showToast} />}
            {subSegment === 'cv' && <UserCVView showToast={showToast} />}
            {subSegment === 'lamaran' && (
              <UserLamaranView
                lowongan={lowongan}
                perusahaan={perusahaanList}
                lamaran={lamaran}
                notifikasi={[]}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'notifikasi' && (
              <UserNotifikasiView
                lowongan={lowongan}
                perusahaan={perusahaanList}
                lamaran={lamaran}
                notifikasi={[]}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
          </div>
        </div>
      );
    }

    // 3. COMPANY DASHBOARD ROUTES
    if (rootSegment === 'perusahaan-app') {
      if (!currentUser) {
        return <LoginView onNavigate={navigateTo} showToast={showToast} />;
      }
      return (
        <div className="app-shell">
          <div className="sidebar">
            <div className="who">
              <div className="name">{perusahaan?.namaPerusahaan || userProfile?.name}</div>
              <div className="role">Mitra Perusahaan (DUDI)</div>
            </div>
            <div
              className={`side-link ${subSegment === 'dashboard' || !subSegment ? 'active' : ''}`}
              onClick={() => navigateTo('perusahaan-app/dashboard')}
            >
              <span className="ic">🏠</span> Dashboard
            </div>
            <div
              className={`side-link ${subSegment === 'profil' ? 'active' : ''}`}
              onClick={() => navigateTo('perusahaan-app/profil')}
            >
              <span className="ic">🏢</span> Profil Perusahaan
            </div>
            <div
              className={`side-link ${subSegment.startsWith('lowongan') ? 'active' : ''}`}
              onClick={() => navigateTo('perusahaan-app/lowongan')}
            >
              <span className="ic">💼</span> Lowongan Saya
            </div>
            <div
              className={`side-link ${subSegment === 'pelamar' ? 'active' : ''}`}
              onClick={() => navigateTo('perusahaan-app/pelamar')}
            >
              <span className="ic">📥</span> Seleksi Pelamar
            </div>
            <div
              className={`side-link ${subSegment === 'laporan' ? 'active' : ''}`}
              onClick={() => navigateTo('perusahaan-app/laporan')}
            >
              <span className="ic">📊</span> Laporan Rekrutmen
            </div>
          </div>
          <div className="main">
            {(!subSegment || subSegment === 'dashboard') && (
              <CompanyDashboardView
                lowongan={lowongan}
                perusahaan={perusahaanList}
                lamaran={lamaran}
                pencariKerja={allPencariKerja}
                kategori={kategori}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'profil' && <CompanyProfilView showToast={showToast} />}
            {subSegment === 'lowongan' && (
              <CompanyLowonganListView
                lowongan={lowongan}
                perusahaan={perusahaanList}
                lamaran={lamaran}
                pencariKerja={allPencariKerja}
                kategori={kategori}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'lowongan-form' && (
              <CompanyLowonganFormView
                subParam={routeParts[2] || 'new'}
                lowongan={lowongan}
                perusahaan={perusahaanList}
                lamaran={lamaran}
                pencariKerja={allPencariKerja}
                kategori={kategori}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'pelamar' && (
              <CompanyPelamarView
                lowongan={lowongan}
                perusahaan={perusahaanList}
                lamaran={lamaran}
                pencariKerja={allPencariKerja}
                kategori={kategori}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'laporan' && (
              <CompanyLaporanView
                lowongan={lowongan}
                perusahaan={perusahaanList}
                lamaran={lamaran}
                pencariKerja={allPencariKerja}
                kategori={kategori}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
          </div>
        </div>
      );
    }

    // 4. ADMIN DASHBOARD ROUTES
    if (rootSegment === 'admin') {
      if (!currentUser) {
        return <LoginView onNavigate={navigateTo} showToast={showToast} />;
      }
      return (
        <div className="app-shell">
          <div className="sidebar">
            <div className="who">
              <div className="name">{userProfile?.name}</div>
              <div className="role">Administrator BKK</div>
            </div>
            <div
              className={`side-link ${subSegment === 'dashboard' || !subSegment ? 'active' : ''}`}
              onClick={() => navigateTo('admin/dashboard')}
            >
              <span className="ic">🏠</span> Dashboard
            </div>
            <div className="side-group-label">Master Data</div>
            <div
              className={`side-link ${subSegment === 'users' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/users')}
            >
              <span className="ic">👥</span> Pengguna
            </div>
            <div
              className={`side-link ${subSegment === 'pencari-kerja' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/pencari-kerja')}
            >
              <span className="ic">🎓</span> Pencari Kerja
            </div>
            <div
              className={`side-link ${subSegment === 'tracer-study' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/tracer-study')}
            >
              <span className="ic">📈</span> Tracer Study
            </div>
            <div
              className={`side-link ${subSegment === 'perusahaan' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/perusahaan')}
            >
              <span className="ic">🏢</span> Perusahaan Mitra
            </div>
            <div
              className={`side-link ${subSegment === 'kategori' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/kategori')}
            >
              <span className="ic">🏷️</span> Kategori
            </div>
            <div className="side-group-label">Rekrutmen</div>
            <div
              className={`side-link ${subSegment === 'lowongan' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/lowongan')}
            >
              <span className="ic">💼</span> Lowongan
              {lowongan.filter((j) => j.status === 'pending').length > 0 && (
                <span className="badge amber" style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 7px' }}>
                  {lowongan.filter((j) => j.status === 'pending').length}
                </span>
              )}
            </div>
            <div
              className={`side-link ${subSegment === 'verifikasi-lamaran' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/verifikasi-lamaran')}
            >
              <span className="ic">📋</span> Verifikasi Lamaran
              {lamaran.filter((a) => !a.statusVerifikasi || a.statusVerifikasi === 'menunggu_verifikasi').length > 0 && (
                <span className="badge amber" style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 7px' }}>
                  {lamaran.filter((a) => !a.statusVerifikasi || a.statusVerifikasi === 'menunggu_verifikasi').length}
                </span>
              )}
            </div>
            <div
              className={`side-link ${subSegment === 'laporan' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/laporan')}
            >
              <span className="ic">📊</span> Laporan Rekrutmen
            </div>
            <div className="side-group-label">Konten & Pengaturan</div>
            <div
              className={`side-link ${subSegment === 'agenda' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/agenda')}
            >
              <span className="ic">📅</span> Agenda
            </div>
            <div
              className={`side-link ${subSegment === 'pengumuman' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/pengumuman')}
            >
              <span className="ic">📣</span> Pengumuman
            </div>
            <div
              className={`side-link ${subSegment === 'galeri' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/galeri')}
            >
              <span className="ic">🖼️</span> Galeri Foto & Video
              <span className="badge" style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 7px' }}>
                {galeri.length}
              </span>
            </div>
            <div
              className={`side-link ${subSegment === 'broadcast' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/broadcast')}
            >
              <span className="ic">📡</span> Broadcast Notifikasi
            </div>
            <div
              className={`side-link ${subSegment === 'settings' ? 'active' : ''}`}
              onClick={() => navigateTo('admin/settings')}
            >
              <span className="ic">⚙️</span> Pengaturan & Firebase
            </div>
          </div>
          <div className="main">
            {(!subSegment || subSegment === 'dashboard') && (
              <AdminDashboardView
                users={allUsers}
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                lamaran={lamaran}
                agenda={agenda}
                pengumuman={pengumuman}
                penempatan={penempatan}
                auditLogs={auditLogs}
                settings={settings}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'users' && (
              <AdminUsersView
                users={allUsers}
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                lamaran={lamaran}
                agenda={agenda}
                pengumuman={pengumuman}
                penempatan={penempatan}
                auditLogs={auditLogs}
                settings={settings}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'pencari-kerja' && (
              <AdminPencariKerjaView
                users={allUsers}
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                lamaran={lamaran}
                agenda={agenda}
                pengumuman={pengumuman}
                penempatan={penempatan}
                auditLogs={auditLogs}
                settings={settings}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'tracer-study' && (
              <AdminTracerStudyView
                users={allUsers}
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                lamaran={lamaran}
                agenda={agenda}
                pengumuman={pengumuman}
                penempatan={penempatan}
                auditLogs={auditLogs}
                settings={settings}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'perusahaan' && (
              <AdminPerusahaanView
                users={allUsers}
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                lamaran={lamaran}
                agenda={agenda}
                pengumuman={pengumuman}
                penempatan={penempatan}
                auditLogs={auditLogs}
                settings={settings}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'kategori' && (
              <AdminKategoriView
                users={allUsers}
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                lamaran={lamaran}
                agenda={agenda}
                pengumuman={pengumuman}
                penempatan={penempatan}
                auditLogs={auditLogs}
                settings={settings}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'lowongan' && (
              <AdminLowonganView
                users={allUsers}
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                lamaran={lamaran}
                agenda={agenda}
                pengumuman={pengumuman}
                penempatan={penempatan}
                auditLogs={auditLogs}
                settings={settings}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'verifikasi-lamaran' && (
              <AdminVerifikasiLamaranView
                users={allUsers}
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                lamaran={lamaran}
                agenda={agenda}
                pengumuman={pengumuman}
                penempatan={penempatan}
                auditLogs={auditLogs}
                settings={settings}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'agenda' && (
              <AdminAgendaView
                users={allUsers}
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                lamaran={lamaran}
                agenda={agenda}
                pengumuman={pengumuman}
                penempatan={penempatan}
                auditLogs={auditLogs}
                settings={settings}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'pengumuman' && (
              <AdminPengumumanView
                users={allUsers}
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                lamaran={lamaran}
                agenda={agenda}
                pengumuman={pengumuman}
                penempatan={penempatan}
                auditLogs={auditLogs}
                settings={settings}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'laporan' && (
              <AdminLaporanView
                users={allUsers}
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                lamaran={lamaran}
                agenda={agenda}
                pengumuman={pengumuman}
                penempatan={penempatan}
                auditLogs={auditLogs}
                settings={settings}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'broadcast' && (
              <AdminBroadcastView
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                settings={settings}
                broadcasts={broadcasts}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'galeri' && (
              <AdminGaleriView
                galeri={galeri}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
            {subSegment === 'settings' && (
              <AdminSettingsView
                users={allUsers}
                pencariKerja={allPencariKerja}
                perusahaan={perusahaanList}
                kategori={kategori}
                lowongan={lowongan}
                lamaran={lamaran}
                agenda={agenda}
                pengumuman={pengumuman}
                penempatan={penempatan}
                auditLogs={auditLogs}
                settings={settings}
                onNavigate={navigateTo}
                showToast={showToast}
                onRefreshData={loadData}
              />
            )}
          </div>
        </div>
      );
    }

    // 404
    return (
      <div className="wrap section helper-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '48px' }}>🔎</div>
        <h1>Halaman Tidak Ditemukan</h1>
        <p>Halaman yang Anda tuju tidak tersedia.</p>
        <button onClick={() => navigateTo('')} className="btn btn-primary">
          Kembali ke Beranda
        </button>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navigation
        settings={settings}
        currentRoute={currentRoute}
        onNavigate={navigateTo}
      />
      <main style={{ flex: 1 }}>{renderContent()}</main>
      {!isDashboardRoute && <Footer settings={settings} onNavigate={navigateTo} />}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApplication />
    </AuthProvider>
  );
}
