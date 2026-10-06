import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import type {
  UserProfile,
  UserRole,
  UserStatus,
  PencariKerja,
  Perusahaan,
  Kategori,
  Lowongan,
  Lamaran,
  VerifikasiLamaranStatus,
  Agenda,
  Pengumuman,
  Penempatan,
  AuditLog,
  SiteSettings
} from '../types.js';
import {
  fmtDate,
  fmtDateTime,
  initials,
  uid,
  slugify,
  STATUS_LOWONGAN_MAP,
  STATUS_PERUSAHAAN_MAP,
  STATUS_LAMARAN_MAP,
  STATUS_VERIFIKASI_LAMARAN_MAP,
  exportCSVFile,
  formatWhatsAppNumber,
  buildWhatsAppLink
} from '../utils/formatters.js';
import { printOrDownloadCV, downloadFile } from '../utils/cvExporter.js';
import {
  buildTracerStudyList,
  printTracerStudyReport,
  resolveBkkCity,
  type TracerStudyItem
} from '../utils/tracerStudyExporter.js';
import {
  saveUserProfile,
  deleteUserProfile,
  savePencariKerja,
  deletePencariKerja,
  savePerusahaan,
  deletePerusahaan,
  saveLowongan,
  saveLamaran,
  saveRiwayat,
  saveNotifikasi,
  saveKategori,
  deleteKategori,
  saveAgenda,
  deleteAgenda,
  savePengumuman,
  deletePengumuman,
  saveSiteSettings,
  resetAllDataExceptAdmin,
  seedInitialDataToFirestore
} from '../services/db.js';
import { WhatsAppBroadcastModal } from './WhatsAppBroadcastModal.js';
import { sendViaWhatsAppGateway } from '../services/whatsappBroadcast.js';

interface AdminViewsProps {
  users: UserProfile[];
  pencariKerja: PencariKerja[];
  perusahaan: Perusahaan[];
  kategori: Kategori[];
  lowongan: Lowongan[];
  lamaran: Lamaran[];
  agenda: Agenda[];
  pengumuman: Pengumuman[];
  penempatan: Penempatan[];
  auditLogs: AuditLog[];
  settings: SiteSettings;
  onNavigate: (route: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshData: () => Promise<void>;
}

// ----------------- ADMIN DASHBOARD -----------------
export const AdminDashboardView: React.FC<AdminViewsProps> = ({
  users,
  pencariKerja,
  perusahaan,
  lowongan,
  lamaran,
  penempatan,
  onNavigate
}) => {
  const pendingCompanies = perusahaan.filter((p) => p.statusVerifikasi === 'pending');
  const pendingJobs = lowongan.filter((j) => j.status === 'pending');
  const pendingLamaran = lamaran.filter((a) => !a.statusVerifikasi || a.statusVerifikasi === 'menunggu_verifikasi');

  return (
    <div>
      <h1 className="page-title">Dashboard Pengelola BKK</h1>
      <p className="page-sub">Panel administrasi terintegrasi Google Firebase Cloud Firestore.</p>

      {/* KPI Cards */}
      <div className="kpi">
        <div className="card">
          <div className="n">{pencariKerja.length}</div>
          <div className="l">Total Pencari Kerja Alumni</div>
        </div>
        <div className="card">
          <div className="n">{perusahaan.length}</div>
          <div className="l">Perusahaan Mitra (DUDI)</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: pendingLamaran.length > 0 ? 'var(--accent)' : undefined }}>
            {pendingLamaran.length}
          </div>
          <div className="l">Lamaran Menunggu Screening BKK</div>
        </div>
        <div className="card" onClick={() => onNavigate('admin/tracer-study')} style={{ cursor: 'pointer' }} title="Klik untuk membuka Tracer Study alumni">
          <div className="n" style={{ color: 'var(--secondary)' }}>
            {penempatan.length}
          </div>
          <div className="l">Alumni Terserap Kerja (Tracer Study ↗)</div>
        </div>
      </div>

      {/* Banner Notifikasi Screening jika ada lamaran pending */}
      {pendingLamaran.length > 0 && (
        <div
          style={{
            background: 'var(--accent-light)',
            border: '1px solid var(--accent)',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>📋</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent-hover)' }}>
                Terdapat {pendingLamaran.length} Berkas Lamaran Menunggu Screening Awal
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Lamaran perlu disetujui BKK terlebih dahulu agar dapat muncul dan diproses di panel HRD perusahaan.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('admin/verifikasi-lamaran')}
            className="btn btn-sm btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            Buka Verifikasi Lamaran →
          </button>
        </div>
      )}

      <div className="grid grid-2">
        {/* Verifikasi Perusahaan */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Perusahaan Menunggu Verifikasi</h3>
            <span className="badge amber">{pendingCompanies.length}</span>
          </div>
          {pendingCompanies.slice(0, 4).map((p) => (
            <div key={p.id} className="list-row">
              <div className="logo-box">{initials(p.namaPerusahaan)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{p.namaPerusahaan}</div>
                <div className="job-meta">{p.bidangUsaha} · {p.kabupaten}</div>
              </div>
              <button onClick={() => onNavigate('admin/perusahaan')} className="btn btn-sm btn-outline">
                Tinjau
              </button>
            </div>
          ))}
          {pendingCompanies.length === 0 && (
            <div className="empty" style={{ padding: '20px' }}>
              Tidak ada pendaftaran perusahaan yang tertunda.
            </div>
          )}
        </div>

        {/* Verifikasi Lowongan */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Lowongan Menunggu Verifikasi</h3>
            <span className="badge amber">{pendingJobs.length}</span>
          </div>
          {pendingJobs.slice(0, 4).map((j) => {
            const prs = perusahaan.find((p) => p.id === j.perusahaanId);
            return (
              <div key={j.id} className="list-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{j.judul}</div>
                  <div className="job-meta">{prs?.namaPerusahaan || '-'} · Batas: {fmtDate(j.tanggalTutup)}</div>
                </div>
                <button onClick={() => onNavigate('admin/lowongan')} className="btn btn-sm btn-primary">
                  Tinjau
                </button>
              </div>
            );
          })}
          {pendingJobs.length === 0 && (
            <div className="empty" style={{ padding: '20px' }}>
              Semua lowongan telah diverifikasi.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ----------------- ADMIN USERS -----------------
export const AdminUsersView: React.FC<AdminViewsProps> = ({
  users,
  pencariKerja,
  perusahaan,
  showToast,
  onRefreshData
}) => {
  const { userProfile: currentAdminProfile, refreshProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form states - Tambah
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [newStatus, setNewStatus] = useState<UserStatus>('active');
  const [newJurusan, setNewJurusan] = useState('');
  const [newTahunLulus, setNewTahunLulus] = useState('2024');
  const [newHp, setNewHp] = useState('');
  const [newBidang, setNewBidang] = useState('');
  const [newKota, setNewKota] = useState('Sidoarjo');
  const [submitting, setSubmitting] = useState(false);

  // Form states - Edit
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editJurusan, setEditJurusan] = useState('');
  const [editTahunLulus, setEditTahunLulus] = useState('2024');
  const [editHp, setEditHp] = useState('');
  const [editBidang, setEditBidang] = useState('');
  const [editKota, setEditKota] = useState('Sidoarjo');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [showEditPass, setShowEditPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Toggle show password per row in table
  const toggleRowPassword = (userId: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const roleNameMap: Record<UserRole, { label: string; cls: string }> = {
    admin: { label: 'Administrator', cls: 'red' },
    operator: { label: 'Operator BKK', cls: 'amber' },
    company: { label: 'Perusahaan Mitra', cls: 'green' },
    user: { label: 'Pencari Kerja', cls: 'blue' }
  };

  // 1. Tambah Pengguna Baru
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      showToast('Nama dan email wajib diisi', 'error');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      showToast('Password minimal 6 karakter', 'error');
      return;
    }

    const emailExists = users.some((u) => u.email.toLowerCase() === newEmail.trim().toLowerCase());
    if (emailExists) {
      showToast('Alamat email tersebut sudah terdaftar!', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const newUserId = uid('usr');
      const now = new Date().toISOString();

      const userProfileObj: UserProfile = {
        id: newUserId,
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        status: newStatus,
        password: newPassword ? newPassword.trim() : 'smkpgri1taman',
        createdAt: now
      };

      await saveUserProfile(userProfileObj);

      // Buat entitas terkait sesuai role
      if (newRole === 'user') {
        const pk: PencariKerja = {
          id: uid('pk'),
          userId: newUserId,
          namaLengkap: newName.trim(),
          jenisKelamin: 'L',
          noHp: newHp.trim(),
          tahunLulus: newTahunLulus || '2024',
          jurusan: newJurusan.trim() || 'Alumni SMK',
          kabupaten: newKota || 'Sidoarjo',
          pendidikan: [
            {
              id: uid('edu'),
              jenjang: 'SMK',
              institusi: 'SMK PGRI 1 Taman',
              jurusan: newJurusan.trim() || 'Alumni SMK',
              tahunLulus: newTahunLulus || '2024'
            }
          ],
          pengalaman: [],
          keahlian: [],
          dokumen: [],
          createdAt: now
        };
        await savePencariKerja(pk);
      } else if (newRole === 'company') {
        const prs: Perusahaan = {
          id: uid('prs'),
          userId: newUserId,
          namaPerusahaan: newName.trim(),
          bidangUsaha: newBidang.trim() || 'Manufaktur & Industri',
          kabupaten: newKota || 'Sidoarjo',
          email: newEmail.trim(),
          noTelepon: newHp.trim() || '-',
          namaPic: newName.trim(),
          jabatanPic: 'HRD',
          statusVerifikasi: 'verified',
          createdAt: now
        };
        await savePerusahaan(prs);
      }

      await onRefreshData();
      showToast(`Pengguna "${newName}" (${roleNameMap[newRole].label}) berhasil ditambahkan!`, 'success');
      setAddModalOpen(false);

      // Reset form
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setNewStatus('active');
      setNewJurusan('');
      setNewTahunLulus('2024');
      setNewHp('');
      setNewBidang('');
      setNewKota('Sidoarjo');
    } catch (err: any) {
      showToast('Gagal menambahkan pengguna: ' + (err.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Buka Modal Edit
  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPassword(user.password || '');
    setEditRole(user.role || 'user');
    setEditStatus(user.status || 'active');

    // Cari data terkait
    const pk = pencariKerja.find((p) => p.userId === user.id);
    const prs = perusahaan.find((p) => p.userId === user.id);

    setEditJurusan(pk?.jurusan || '');
    setEditTahunLulus(String(pk?.tahunLulus || '2024'));
    setEditHp(pk?.noHp || prs?.noTelepon || '');
    setEditBidang(prs?.bidangUsaha || '');
    setEditKota(pk?.kabupaten || prs?.kabupaten || 'Sidoarjo');
    setShowEditPass(false);
    setEditModalOpen(true);
  };

  // 3. Simpan Perubahan Pengguna
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editName.trim()) {
      showToast('Nama pengguna tidak boleh kosong', 'error');
      return;
    }
    if (!editEmail.trim()) {
      showToast('Alamat email tidak boleh kosong', 'error');
      return;
    }
    if (editPassword && editPassword.trim().length < 6) {
      showToast('Password minimal 6 karakter', 'error');
      return;
    }

    // Periksa duplikasi email jika diubah
    const emailConflict = users.some(
      (u) => u.id !== selectedUser.id && u.email.toLowerCase() === editEmail.trim().toLowerCase()
    );
    if (emailConflict) {
      showToast('Alamat email tersebut sudah digunakan oleh akun lain!', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const updatedUser: UserProfile = {
        ...selectedUser,
        id: selectedUser.id,
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        status: editStatus,
        password: editPassword.trim() ? editPassword.trim() : (selectedUser.password || 'smkpgri1taman')
      };

      await saveUserProfile(updatedUser);

      // Sinkronkan data profil Pencari Kerja / Perusahaan
      if (editRole === 'user') {
        const existingPk = pencariKerja.find((pk) => pk.userId === selectedUser.id);
        if (existingPk) {
          const updatedPk: PencariKerja = {
            ...existingPk,
            namaLengkap: editName.trim(),
            jurusan: editJurusan.trim() || existingPk.jurusan,
            tahunLulus: editTahunLulus || existingPk.tahunLulus,
            noHp: editHp.trim() || existingPk.noHp,
            kabupaten: editKota.trim() || existingPk.kabupaten
          };
          await savePencariKerja(updatedPk);
        } else {
          const newPk: PencariKerja = {
            id: uid('pk'),
            userId: selectedUser.id,
            namaLengkap: editName.trim(),
            jenisKelamin: 'L',
            noHp: editHp.trim(),
            tahunLulus: editTahunLulus || '2024',
            jurusan: editJurusan.trim() || 'Alumni SMK',
            kabupaten: editKota || 'Sidoarjo',
            pendidikan: [
              {
                id: uid('edu'),
                jenjang: 'SMK',
                institusi: 'SMK PGRI 1 Taman',
                jurusan: editJurusan.trim() || 'Alumni SMK',
                tahunLulus: editTahunLulus || '2024'
              }
            ],
            pengalaman: [],
            keahlian: [],
            dokumen: [],
            createdAt: now
          };
          await savePencariKerja(newPk);
        }
      } else if (editRole === 'company') {
        const existingPrs = perusahaan.find((prs) => prs.userId === selectedUser.id);
        if (existingPrs) {
          const updatedPrs: Perusahaan = {
            ...existingPrs,
            namaPerusahaan: editName.trim(),
            email: editEmail.trim(),
            bidangUsaha: editBidang.trim() || existingPrs.bidangUsaha,
            kabupaten: editKota.trim() || existingPrs.kabupaten,
            noTelepon: editHp.trim() || existingPrs.noTelepon
          };
          await savePerusahaan(updatedPrs);
        } else {
          const newPrs: Perusahaan = {
            id: uid('prs'),
            userId: selectedUser.id,
            namaPerusahaan: editName.trim(),
            bidangUsaha: editBidang.trim() || 'Manufaktur & Industri',
            kabupaten: editKota || 'Sidoarjo',
            email: editEmail.trim(),
            noTelepon: editHp.trim() || '-',
            namaPic: editName.trim(),
            jabatanPic: 'HRD',
            statusVerifikasi: 'verified',
            createdAt: now
          };
          await savePerusahaan(newPrs);
        }
      }

      await onRefreshData();
      if (currentAdminProfile?.id === selectedUser.id) {
        await refreshProfile();
      }
      showToast(`Data akun "${updatedUser.name}" berhasil diperbarui!`, 'success');
      setEditModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      showToast('Gagal mengubah pengguna: ' + (err.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Blokir / Buka Blokir (Direct tanpa dialog window.confirm yang terblokir)
  const handleToggleBlock = async (user: UserProfile) => {
    const nextStatus: UserStatus = user.status === 'blocked' ? 'active' : 'blocked';
    try {
      await saveUserProfile({ ...user, status: nextStatus });
      await onRefreshData();
      showToast(
        nextStatus === 'blocked'
          ? `Akun "${user.name}" telah diblokir.`
          : `Blokir akun "${user.name}" telah dibuka.`,
        'success'
      );
    } catch (err: any) {
      showToast('Gagal mengubah status blokir: ' + (err.message || 'Terjadi kesalahan'), 'error');
    }
  };

  // 5. Eksekusi Hapus Pengguna (dari Modal Konfirmasi Hapus)
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (currentAdminProfile && userToDelete.id === currentAdminProfile.id) {
      showToast('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!', 'error');
      setUserToDelete(null);
      return;
    }

    setDeleting(true);
    try {
      await deleteUserProfile(userToDelete.id);
      const relatedPk = pencariKerja.find((pk) => pk.userId === userToDelete.id);
      if (relatedPk) {
        await deletePencariKerja(relatedPk.id);
      }
      const relatedPrs = perusahaan.find((prs) => prs.userId === userToDelete.id);
      if (relatedPrs) {
        await deletePerusahaan(relatedPrs.id);
      }
      await onRefreshData();
      showToast(`Akun "${userToDelete.name}" (${userToDelete.email}) berhasil dihapus permanen.`, 'info');
      setUserToDelete(null);
    } catch (err: any) {
      showToast('Gagal menghapus akun: ' + (err.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Manajemen Akun Pengguna</h1>
          <p className="page-sub">
            Total <b>{users.length}</b> akun terdaftar ({users.filter((u) => u.status === 'active').length} aktif,{' '}
            {users.filter((u) => u.status === 'blocked').length} diblokir).
          </p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="btn btn-primary"
          style={{ gap: '8px' }}
        >
          + Tambah Pengguna Baru
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '14px 18px' }}>
        <div className="row-2" style={{ gap: '12px', gridTemplateColumns: '2fr 1fr 1fr auto', alignItems: 'end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Cari Pengguna</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Filter Peran (Role)</label>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="all">Semua Peran</option>
              <option value="admin">Administrator</option>
              <option value="operator">Operator BKK</option>
              <option value="company">Perusahaan Mitra</option>
              <option value="user">Pencari Kerja</option>
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Filter Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="blocked">Diblokir</option>
            </select>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => {
              setSearch('');
              setFilterRole('all');
              setFilterStatus('all');
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card table-card">
        <div className="overflow-x">
          <table>
            <thead>
              <tr>
                <th>Nama Pengguna</th>
                <th>Alamat Email</th>
                <th>Password Akun</th>
                <th>Peran (Role)</th>
                <th>Status Akun</th>
                <th>Terdaftar</th>
                <th style={{ textAlign: 'center' }}>Aksi Kelola</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const roleCfg = roleNameMap[u.role] || { label: u.role, cls: 'grey' };
                const isBlocked = u.status === 'blocked';
                const isPassShown = !!showPasswordMap[u.id];
                const displayPass = u.password || 'smkpgri1taman';
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="avatar"
                          style={{
                            width: '32px',
                            height: '32px',
                            fontSize: '12px',
                            background: isBlocked ? 'var(--danger-light)' : undefined,
                            color: isBlocked ? 'var(--danger)' : undefined
                          }}
                        >
                          {initials(u.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          {isBlocked && <span style={{ fontSize: '11px', color: 'var(--danger)' }}>Akun Diblokir</span>}
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      {u.password ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                          <code style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}>
                            {isPassShown ? u.password : '••••••••'}
                          </code>
                          <button
                            type="button"
                            onClick={() => toggleRowPassword(u.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '13px' }}
                            title={isPassShown ? 'Sembunyikan password' : 'Lihat password'}
                          >
                            {isPassShown ? '🙈' : '👁️'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span className="tag blue" style={{ fontSize: '11px', padding: '2px 6px' }}>
                            🔑 Google OAuth
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`tag ${roleCfg.cls}`}>{roleCfg.label}</span>
                    </td>
                    <td>
                      <span className={`badge ${!isBlocked ? 'green' : 'red'}`}>
                        {!isBlocked ? '✓ Aktif' : '✕ Diblokir'}
                      </span>
                    </td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => openEditModal(u)}
                          title="Ubah data pengguna"
                          style={{ gap: '4px' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className={`btn btn-sm btn-outline ${isBlocked ? 'btn-secondary' : ''}`}
                          style={
                            !isBlocked
                              ? { color: 'var(--accent-hover)', borderColor: 'var(--accent)' }
                              : undefined
                          }
                          onClick={() => handleToggleBlock(u)}
                          title={isBlocked ? 'Buka blokir akun ini' : 'Blokir akun ini'}
                        >
                          {isBlocked ? '🔓 Buka Blokir' : '🔒 Blokir'}
                        </button>
                        {(!currentAdminProfile || u.id !== currentAdminProfile.id) && (
                          <button
                            className="btn btn-sm btn-outline"
                            style={{ color: 'var(--danger)', borderColor: 'var(--border)' }}
                            onClick={() => setUserToDelete(u)}
                            title="Hapus akun pengguna"
                          >
                            🗑️ Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">Tidak ada pengguna yang cocok dengan pencarian / filter.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Pengguna */}
      {addModalOpen && (
        <div className="modal-bg" onClick={() => setAddModalOpen(false)}>
          <div className="modal" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Tambah Pengguna Baru</h3>
              <button className="icon-btn" onClick={() => setAddModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="field">
                <label>Nama Lengkap <span className="req-star">*</span></label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama akun / PIC"
                />
              </div>

              <div className="row-2">
                <div className="field">
                  <label>Alamat Email <span className="req-star">*</span></label>
                  <input
                    required
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nama@email.com"
                  />
                </div>
                <div className="field">
                  <label>Password Akun <span className="req-star">*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Default: smkpgri1taman"
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      title={showNewPass ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showNewPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <div className="hint">Kosongkan jika ingin memakai password bawaan <code>smkpgri1taman</code></div>
                </div>
              </div>

              <div className="row-2">
                <div className="field">
                  <label>Peran (Role)</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
                    <option value="user">Pencari Kerja (Alumni)</option>
                    <option value="company">Perusahaan Mitra (DUDI)</option>
                    <option value="operator">Operator BKK</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="field">
                  <label>Status Akun</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as UserStatus)}>
                    <option value="active">Aktif</option>
                    <option value="blocked">Diblokir</option>
                  </select>
                </div>
              </div>

              {/* Tambahan spesifik peran User */}
              {newRole === 'user' && (
                <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                    Data Awal Alumni
                  </div>
                  <div className="row-2">
                    <div className="field" style={{ margin: 0 }}>
                      <label>Jurusan SMK</label>
                      <input
                        value={newJurusan}
                        onChange={(e) => setNewJurusan(e.target.value)}
                        placeholder="Teknik Pemesinan / RPL"
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>Tahun Lulus</label>
                      <input
                        type="number"
                        value={newTahunLulus}
                        onChange={(e) => setNewTahunLulus(e.target.value)}
                        placeholder="2024"
                      />
                    </div>
                  </div>
                  <div className="field" style={{ marginTop: '10px', marginBottom: 0 }}>
                    <label>No WhatsApp / Telepon</label>
                    <input
                      value={newHp}
                      onChange={(e) => setNewHp(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>
              )}

              {/* Tambahan spesifik peran Company */}
              {newRole === 'company' && (
                <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                    Data Profil Perusahaan
                  </div>
                  <div className="row-2">
                    <div className="field" style={{ margin: 0 }}>
                      <label>Bidang Usaha</label>
                      <input
                        value={newBidang}
                        onChange={(e) => setNewBidang(e.target.value)}
                        placeholder="Manufaktur & Logistik"
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>Kabupaten / Kota</label>
                      <input
                        value={newKota}
                        onChange={(e) => setNewKota(e.target.value)}
                        placeholder="Sidoarjo"
                      />
                    </div>
                  </div>
                  <div className="field" style={{ marginTop: '10px', marginBottom: 0 }}>
                    <label>No Telepon Kantor</label>
                    <input
                      value={newHp}
                      onChange={(e) => setNewHp(e.target.value)}
                      placeholder="(031) xxx-xxxx"
                    />
                  </div>
                </div>
              )}

              <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan Pengguna Baru'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Pengguna */}
      {editModalOpen && selectedUser && (
        <div className="modal-bg" onClick={() => !submitting && setEditModalOpen(false)}>
          <div className="modal" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>✏️</span>
                <h3 style={{ margin: 0 }}>Edit Data Pengguna</h3>
              </div>
              <button className="icon-btn" disabled={submitting} onClick={() => setEditModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateUser} style={{ marginTop: '16px' }}>
              <div className="field">
                <label>Nama Lengkap <span className="req-star">*</span></label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nama akun pengguna"
                />
              </div>

              <div className="row-2">
                <div className="field">
                  <label>Alamat Email <span className="req-star">*</span></label>
                  <input
                    required
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="nama@email.com"
                  />
                </div>
                <div className="field">
                  <label>Password Akun</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showEditPass ? 'text' : 'password'}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Ubah password (min 6 kar)..."
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPass(!showEditPass)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      title={showEditPass ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showEditPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <div className="hint">Admin dapat langsung memperbarui password akun ini.</div>
                </div>
              </div>

              <div className="row-2">
                <div className="field">
                  <label>Peran (Role)</label>
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)}>
                    <option value="user">Pencari Kerja (Alumni)</option>
                    <option value="company">Perusahaan Mitra (DUDI)</option>
                    <option value="operator">Operator BKK</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="field">
                  <label>Status Akun</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as UserStatus)}>
                    <option value="active">Aktif</option>
                    <option value="blocked">Diblokir</option>
                  </select>
                </div>
              </div>

              {/* Tambahan spesifik peran User */}
              {editRole === 'user' && (
                <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                    🎓 Data Profil Alumni (Pencari Kerja)
                  </div>
                  <div className="row-2">
                    <div className="field" style={{ margin: 0 }}>
                      <label>Jurusan SMK</label>
                      <input
                        value={editJurusan}
                        onChange={(e) => setEditJurusan(e.target.value)}
                        placeholder="Teknik Pemesinan / RPL"
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>Tahun Lulus</label>
                      <input
                        type="number"
                        value={editTahunLulus}
                        onChange={(e) => setEditTahunLulus(e.target.value)}
                        placeholder="2024"
                      />
                    </div>
                  </div>
                  <div className="row-2" style={{ marginTop: '10px' }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label>No WhatsApp / Telepon</label>
                      <input
                        value={editHp}
                        onChange={(e) => setEditHp(e.target.value)}
                        placeholder="08xxxxxxxxxx"
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>Kabupaten / Kota</label>
                      <input
                        value={editKota}
                        onChange={(e) => setEditKota(e.target.value)}
                        placeholder="Sidoarjo"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tambahan spesifik peran Company */}
              {editRole === 'company' && (
                <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                    🏢 Data Profil Perusahaan Mitra
                  </div>
                  <div className="row-2">
                    <div className="field" style={{ margin: 0 }}>
                      <label>Bidang Usaha</label>
                      <input
                        value={editBidang}
                        onChange={(e) => setEditBidang(e.target.value)}
                        placeholder="Manufaktur & Logistik"
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>Kabupaten / Kota</label>
                      <input
                        value={editKota}
                        onChange={(e) => setEditKota(e.target.value)}
                        placeholder="Sidoarjo"
                      />
                    </div>
                  </div>
                  <div className="field" style={{ marginTop: '10px', marginBottom: 0 }}>
                    <label>No Telepon Kantor</label>
                    <input
                      value={editHp}
                      onChange={(e) => setEditHp(e.target.value)}
                      placeholder="(031) xxx-xxxx"
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={submitting}
                  onClick={() => setEditModalOpen(false)}
                >
                  Batal
                </button>
                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pengguna */}
      {userToDelete && (
        <div className="modal-bg" onClick={() => !deleting && setUserToDelete(null)}>
          <div className="modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head" style={{ borderBottomColor: 'var(--danger-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <h3 style={{ margin: 0, color: 'var(--danger)' }}>Konfirmasi Hapus Akun</h3>
              </div>
              <button className="icon-btn" disabled={deleting} onClick={() => setUserToDelete(null)}>✕</button>
            </div>
            <div style={{ padding: '20px 0 10px' }}>
              <p style={{ margin: '0 0 14px', fontSize: '14.5px', lineHeight: 1.6 }}>
                Apakah Anda yakin ingin menghapus akun pengguna berikut secara permanen?
              </p>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>{userToDelete.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>{userToDelete.email}</div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`tag ${roleNameMap[userToDelete.role]?.cls || 'grey'}`}>
                    {roleNameMap[userToDelete.role]?.label || userToDelete.role}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Status: <b>{userToDelete.status === 'active' ? 'Aktif' : 'Diblokir'}</b>
                  </span>
                </div>
              </div>
              <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '6px', padding: '10px 14px', fontSize: '12.5px', lineHeight: 1.5, marginBottom: '20px' }}>
                Seluruh data profil terkait (berkas pencari kerja, lowongan, dan riwayat akun) akan dihapus secara permanen dari basis data Cloud Firestore.
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={deleting}
                  onClick={() => setUserToDelete(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                >
                  {deleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------- ADMIN PENCARI KERJA -----------------
export const AdminPencariKerjaView: React.FC<AdminViewsProps> = ({
  pencariKerja,
  lamaran,
  lowongan,
  onNavigate
}) => {
  const [selectedPk, setSelectedPk] = useState<PencariKerja | null>(null);
  const [search, setSearch] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('all');

  const jurusans = Array.from(new Set(pencariKerja.map((p) => p.jurusan).filter(Boolean)));

  const filteredPk = pencariKerja.filter((pk) => {
    if (filterJurusan !== 'all' && pk.jurusan !== filterJurusan) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = pk.namaLengkap.toLowerCase().includes(q);
      const matchHp = pk.noHp?.includes(q);
      const matchDom = pk.kabupaten?.toLowerCase().includes(q);
      if (!matchName && !matchHp && !matchDom) return false;
    }
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Database Alumni & Pencari Kerja</h1>
          <p className="page-sub">Total {pencariKerja.length} alumni terdata dalam database portal BKK.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onNavigate('admin/tracer-study')}
          style={{ gap: '6px', display: 'inline-flex', alignItems: 'center' }}
        >
          📈 Buka Laporan Tracer Study →
        </button>
      </div>

      {/* Filter and Search Box */}
      <div className="card" style={{ marginBottom: '16px', padding: '14px 18px' }}>
        <div className="row-2" style={{ gap: '12px', gridTemplateColumns: '2fr 1fr auto', alignItems: 'end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Cari Alumni</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama alumni, no WhatsApp, domisili..."
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Filter Jurusan</label>
            <select value={filterJurusan} onChange={(e) => setFilterJurusan(e.target.value)}>
              <option value="all">Semua Jurusan</option>
              {jurusans.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => {
              setSearch('');
              setFilterJurusan('all');
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="card table-card">
        <div className="overflow-x">
          <table>
            <thead>
              <tr>
                <th>Nama Lengkap</th>
                <th>Jurusan SMK</th>
                <th>Tahun Kelulusan</th>
                <th>No. Telepon / WA</th>
                <th>Domisili</th>
                <th>Total Lamaran</th>
                <th style={{ textAlign: 'center' }}>Aksi Profil & CV</th>
              </tr>
            </thead>
            <tbody>
              {filteredPk.map((pk) => {
                const count = lamaran.filter((l) => l.pencariKerjaId === pk.id).length;
                const cvDoc = pk.dokumen?.find((d) => d.jenis === 'cv');
                return (
                  <tr key={pk.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar" style={{ width: '34px', height: '34px', fontSize: '12px', overflow: 'hidden', borderRadius: '8px', flexShrink: 0 }}>
                          {pk.foto ? (
                            <img src={pk.foto} alt={pk.namaLengkap} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            initials(pk.namaLengkap)
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{pk.namaLengkap}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {cvDoc ? '📄 CV Terunggah' : 'Belum upload PDF'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{pk.jurusan || '-'}</td>
                    <td>{pk.tahunLulus || '-'}</td>
                    <td>{pk.noHp || '-'}</td>
                    <td>{pk.kabupaten || '-'}</td>
                    <td><b>{count}</b> lamaran</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => setSelectedPk(pk)}
                          title="Lihat detail biodata & dokumen"
                        >
                          👁️ Detail
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => printOrDownloadCV(pk)}
                          title="Cetak atau Unduh CV Format Resmi BKK"
                        >
                          🖨️ Cetak / Unduh CV
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPk.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty" style={{ padding: '24px' }}>Tidak ada data alumni ditemukan.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Profil Pencari Kerja */}
      {selectedPk && (
        <div className="modal-bg" onClick={() => setSelectedPk(null)}>
          <div className="modal" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3 style={{ margin: 0 }}>Profil Lengkap Alumni: {selectedPk.namaLengkap}</h3>
              <button className="icon-btn" onClick={() => setSelectedPk(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', margin: '16px 0', padding: '16px', background: 'var(--bg)', borderRadius: '10px' }}>
              <div
                style={{
                  width: '70px',
                  height: '90px',
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
                {selectedPk.foto ? (
                  <img src={selectedPk.foto} alt={selectedPk.namaLengkap} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '32px' }}>👤</span>
                )}
              </div>
              <div style={{ flex: 1, fontSize: '13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><b>Nama:</b> {selectedPk.namaLengkap}</div>
                <div><b>Jurusan:</b> {selectedPk.jurusan || '-'}</div>
                <div><b>Tahun Lulus:</b> {selectedPk.tahunLulus || '-'}</div>
                <div><b>No. WhatsApp:</b> {selectedPk.noHp || '-'}</div>
                <div><b>Jenis Kelamin:</b> {selectedPk.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                <div><b>Domisili:</b> {selectedPk.kabupaten || selectedPk.alamat || '-'}</div>
              </div>
            </div>

            {/* Riwayat Pendidikan */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--primary)' }}>Riwayat Pendidikan</h4>
              {(selectedPk.pendidikan || []).length > 0 ? (
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedPk.pendidikan.map((e) => (
                    <div key={e.id} style={{ padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 700 }}>{e.institusi} ({e.jenjang})</div>
                      <div style={{ color: 'var(--text-muted)' }}>{e.jurusan} · Lulus {e.tahunLulus}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Belum ada data pendidikan.</div>
              )}
            </div>

            {/* Keahlian */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--primary)' }}>Keahlian & Kompetensi</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(selectedPk.keahlian || []).map((k) => (
                  <span key={k.id} className="tag blue">{k.nama} ({k.level})</span>
                ))}
                {(selectedPk.keahlian || []).length === 0 && (
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Belum ada keahlian terdaftar.</span>
                )}
              </div>
            </div>

            {/* Berkas CV & Dokumen Pendukung */}
            <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--bg)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '14px' }}>
                  📁 Berkas & Dokumen Pendukung Terlampir ({(selectedPk.dokumen || []).length})
                </h4>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => printOrDownloadCV(selectedPk)}
                  title="Cetak atau unduh formulir CV lengkap pelamar dalam format PDF"
                >
                  🖨️ Cetak / Unduh CV Format BKK
                </button>
              </div>

              {(selectedPk.dokumen || []).length === 0 ? (
                <div className="job-meta">Alumni ini belum mengunggah berkas dokumen terpisah.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(selectedPk.dokumen || []).map((d) => {
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
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: '12px', padding: '3px 9px' }}
                              onClick={() => downloadFile(d.url!, d.namaFile)}
                              title={`Unduh ${d.namaFile}`}
                            >
                              📥 Unduh
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
        </div>
      )}
    </div>
  );
};

// ----------------- ADMIN PERUSAHAAN -----------------
export const AdminPerusahaanView: React.FC<AdminViewsProps> = ({
  perusahaan,
  showToast,
  onRefreshData
}) => {
  const handleUpdateStatus = async (prs: Perusahaan, status: 'verified' | 'rejected' | 'blocked') => {
    await savePerusahaan({ ...prs, statusVerifikasi: status });
    await onRefreshData();
    showToast(`Status perusahaan diperbarui menjadi ${status}`, 'success');
  };

  return (
    <div>
      <h1 className="page-title">Verifikasi & Kemitraan Perusahaan</h1>
      <p className="page-sub">Kelola legalitas DUDI mitra yang bekerja sama dengan BKK SMK PGRI 1 Taman.</p>

      <div className="card table-card">
        <div className="overflow-x">
          <table>
            <thead>
              <tr>
                <th>Perusahaan</th>
                <th>Bidang Usaha</th>
                <th>Domisili</th>
                <th>Kontak PIC</th>
                <th>Status Verifikasi</th>
                <th>Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody>
              {perusahaan.map((p) => {
                const statusCfg = STATUS_PERUSAHAAN_MAP[p.statusVerifikasi] || { label: p.statusVerifikasi, cls: 'grey' };
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.namaPerusahaan}</div>
                      <div className="job-meta">{p.email}</div>
                    </td>
                    <td>{p.bidangUsaha}</td>
                    <td>{p.kabupaten}</td>
                    <td>
                      <div>{p.namaPic}</div>
                      <div className="job-meta">{p.noTelepon}</div>
                    </td>
                    <td><span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {p.statusVerifikasi === 'pending' && (
                          <>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleUpdateStatus(p, 'verified')}
                            >
                              Setujui
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => handleUpdateStatus(p, 'rejected')}
                            >
                              Tolak
                            </button>
                          </>
                        )}
                        {p.statusVerifikasi === 'verified' && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleUpdateStatus(p, 'blocked')}
                          >
                            Nonaktifkan
                          </button>
                        )}
                        {p.statusVerifikasi === 'blocked' && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleUpdateStatus(p, 'verified')}
                          >
                            Aktifkan Kembali
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ----------------- ADMIN KATEGORI -----------------
export const AdminKategoriView: React.FC<AdminViewsProps> = ({
  kategori,
  lowongan,
  showToast,
  onRefreshData
}) => {
  const [nama, setNama] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;
    const newKat: Kategori = {
      id: uid('kat'),
      nama: nama.trim(),
      slug: slugify(nama.trim()),
      status: true
    };
    await saveKategori(newKat);
    await onRefreshData();
    setNama('');
    showToast('Kategori baru berhasil ditambahkan ke Firebase!', 'success');
  };

  const handleDelete = async (id: string) => {
    const isUsed = lowongan.some((l) => l.kategoriId === id);
    if (isUsed) {
      showToast('Kategori ini masih digunakan oleh lowongan pekerjaan!', 'error');
      return;
    }
    try {
      await deleteKategori(id);
      await onRefreshData();
      showToast('Kategori berhasil dihapus.', 'info');
    } catch (err: any) {
      showToast('Gagal menghapus kategori: ' + (err.message || 'Terjadi kesalahan'), 'error');
    }
  };

  return (
    <div>
      <h1 className="page-title">Kategori Bidang Pekerjaan</h1>
      <p className="page-sub">Kelola kategori untuk klasifikasi pencarian lowongan kerja siswa dan alumni.</p>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: '15px' }}>Tambah Kategori Baru</h3>
          <form onSubmit={handleAdd}>
            <div className="field">
              <label>Nama Kategori</label>
              <input
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Cth: Desain Komunikasi Visual"
              />
            </div>
            <button className="btn btn-primary" type="submit">
              Simpan Kategori
            </button>
          </form>
        </div>

        <div className="card table-card">
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Nama Kategori</th>
                  <th>Jumlah Lowongan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {kategori.map((k) => {
                  const count = lowongan.filter((l) => l.kategoriId === k.id).length;
                  return (
                    <tr key={k.id}>
                      <td style={{ fontWeight: 600 }}>{k.nama}</td>
                      <td>{count} lowongan</td>
                      <td>
                        <button className="icon-btn" onClick={() => handleDelete(k.id)}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------- ADMIN LOWONGAN -----------------
export const AdminLowonganView: React.FC<AdminViewsProps> = ({
  lowongan,
  perusahaan,
  showToast,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'rejected' | 'all'>('pending');
  const [search, setSearch] = useState('');

  const pendingCount = lowongan.filter((j) => j.status === 'pending').length;
  const publishedCount = lowongan.filter((j) => j.status === 'published').length;
  const rejectedCount = lowongan.filter((j) => j.status === 'rejected').length;

  const handleApprove = async (j: Lowongan) => {
    await saveLowongan({ ...j, status: 'published' });
    await onRefreshData();
    showToast(`Lowongan "${j.judul}" telah disetujui & tayang publik!`, 'success');
  };

  const handleReject = async (j: Lowongan) => {
    await saveLowongan({ ...j, status: 'rejected' });
    await onRefreshData();
    showToast(`Lowongan "${j.judul}" ditolak.`, 'info');
  };

  const filteredJobs = lowongan.filter((j) => {
    if (activeTab !== 'all' && j.status !== activeTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const prs = perusahaan.find((p) => p.id === j.perusahaanId);
      const matchTitle = j.judul.toLowerCase().includes(q);
      const matchPrs = prs?.namaPerusahaan.toLowerCase().includes(q);
      if (!matchTitle && !matchPrs) return false;
    }
    return true;
  });

  return (
    <div>
      <h1 className="page-title">Moderasi & Verifikasi Lowongan</h1>
      <p className="page-sub">Tinjau dan verifikasi lowongan dari perusahaan sebelum dipublikasikan ke portal publik alumni.</p>

      {/* Tabs Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="chip-tabs" style={{ margin: 0 }}>
          <button
            type="button"
            className={`chip-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ Menunggu Verifikasi ({pendingCount})
          </button>
          <button
            type="button"
            className={`chip-tab ${activeTab === 'published' ? 'active' : ''}`}
            onClick={() => setActiveTab('published')}
          >
            ✅ Tayang Publik ({publishedCount})
          </button>
          <button
            type="button"
            className={`chip-tab ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            ❌ Ditolak ({rejectedCount})
          </button>
          <button
            type="button"
            className={`chip-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Semua ({lowongan.length})
          </button>
        </div>

        <div style={{ minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Cari lowongan / perusahaan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 12px', fontSize: '13px' }}
          />
        </div>
      </div>

      <div className="card table-card">
        <div className="overflow-x">
          <table>
            <thead>
              <tr>
                <th>Judul Lowongan</th>
                <th>Perusahaan</th>
                <th>Lokasi</th>
                <th>Batas Waktu</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((j) => {
                const prs = perusahaan.find((p) => p.id === j.perusahaanId);
                const statusCfg = STATUS_LOWONGAN_MAP[j.status] || { label: j.status, cls: 'grey' };
                return (
                  <tr key={j.id}>
                    <td style={{ fontWeight: 600, whiteSpace: 'normal' }}>{j.judul}</td>
                    <td>{prs?.namaPerusahaan || '-'}</td>
                    <td>{j.lokasi || '-'}</td>
                    <td>{fmtDate(j.tanggalTutup)}</td>
                    <td><span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {j.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleApprove(j)}
                            >
                              ✓ Setujui & Publikasikan
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => handleReject(j)}
                            >
                              ✕ Tolak
                            </button>
                          </>
                        )}
                        {j.status === 'published' && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => saveLowongan({ ...j, status: 'closed' }).then(onRefreshData)}
                          >
                            Tutup
                          </button>
                        )}
                        {j.status === 'rejected' && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleApprove(j)}
                          >
                            Pulihkan & Publikasikan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      {activeTab === 'pending'
                        ? 'Tidak ada lowongan yang sedang menunggu verifikasi saat ini.'
                        : 'Tidak ada data lowongan ditemukan.'}
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

// ----------------- ADMIN VERIFIKASI LAMARAN -----------------
export const AdminVerifikasiLamaranView: React.FC<AdminViewsProps> = ({
  lamaran,
  lowongan,
  perusahaan,
  pencariKerja,
  showToast,
  onRefreshData
}) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'menunggu_verifikasi' | 'disetujui' | 'diblokir'>('menunggu_verifikasi');
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterJob, setFilterJob] = useState<string>('all');

  // Modal Detail & Verifikasi
  const [selectedApp, setSelectedApp] = useState<Lamaran | null>(null);
  const [viewNoteApp, setViewNoteApp] = useState<Lamaran | null>(null);
  const [verificationAction, setVerificationAction] = useState<'disetujui' | 'diblokir'>('disetujui');
  const [keterangan, setKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Status counters
  const pendingCount = lamaran.filter((a) => !a.statusVerifikasi || a.statusVerifikasi === 'menunggu_verifikasi').length;
  const approvedCount = lamaran.filter((a) => a.statusVerifikasi === 'disetujui').length;
  const blockedCount = lamaran.filter((a) => a.statusVerifikasi === 'diblokir').length;

  // Filter logic
  const filteredApps = lamaran.filter((a) => {
    const currentVerifStatus: VerifikasiLamaranStatus = a.statusVerifikasi || 'menunggu_verifikasi';
    if (activeTab !== 'all' && currentVerifStatus !== activeTab) return false;

    const job = lowongan.find((l) => l.id === a.lowonganId);
    const prs = job ? perusahaan.find((p) => p.id === job.perusahaanId) : null;
    const pk = pencariKerja.find((p) => p.id === a.pencariKerjaId);

    if (filterCompany !== 'all' && job?.perusahaanId !== filterCompany) return false;
    if (filterJob !== 'all' && a.lowonganId !== filterJob) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchPk = pk?.namaLengkap.toLowerCase().includes(q) || (pk?.jurusan ? pk.jurusan.toLowerCase().includes(q) : false);
      const matchJob = job?.judul.toLowerCase().includes(q);
      const matchPrs = prs?.namaPerusahaan.toLowerCase().includes(q);
      if (!matchPk && !matchJob && !matchPrs) return false;
    }

    return true;
  });

  const openVerificationModal = (app: Lamaran, defaultAction: 'disetujui' | 'diblokir' = 'disetujui') => {
    setSelectedApp(app);
    setVerificationAction(defaultAction);
    if (defaultAction === 'disetujui') {
      setKeterangan('Berkas lengkap dan memenuhi kualifikasi jurusan. Diteruskan ke HRD perusahaan.');
    } else {
      setKeterangan('Kualifikasi belum sesuai dengan spesifikasi lowongan yang dibutuhkan perusahaan.');
    }
  };

  const handleProcessVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    if (!keterangan.trim()) {
      showToast('Keterangan pemberitahuan wajib diisi!', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const action = verificationAction;
      const job = lowongan.find((l) => l.id === selectedApp.lowonganId);
      const prs = job ? perusahaan.find((p) => p.id === job.perusahaanId) : null;
      const pk = pencariKerja.find((p) => p.id === selectedApp.pencariKerjaId);

      const updatedLamaran: Lamaran = {
        ...selectedApp,
        statusVerifikasi: action,
        catatanVerifikasi: keterangan.trim(),
        verifikasiOleh: userProfile?.name || 'Admin BKK',
        tanggalVerifikasi: now,
        // Jika diblokir, status seleksi umum diset ke ditolak
        status: action === 'diblokir' ? 'ditolak' : selectedApp.status
      };
      await saveLamaran(updatedLamaran);

      // Simpan riwayat
      await saveRiwayat({
        id: uid('riw'),
        lamaranId: selectedApp.id,
        statusLama: selectedApp.status,
        statusBaru: action === 'diblokir' ? 'ditolak' : selectedApp.status,
        catatan:
          action === 'disetujui'
            ? `[Screening BKK Disetujui]: ${keterangan.trim()}`
            : `[Screening BKK Diblokir]: ${keterangan.trim()}`,
        diubahOleh: userProfile?.name || 'Admin BKK',
        createdAt: now
      });

      // 1. Notifikasi ke Pencari Kerja
      await saveNotifikasi({
        id: uid('ntf'),
        userId: selectedApp.userId,
        judul:
          action === 'disetujui'
            ? `✓ Lamaran Lolos Screening BKK: ${job?.judul || 'Lowongan'}`
            : `🔒 Lamaran Tidak Lolos Screening: ${job?.judul || 'Lowongan'}`,
        pesan:
          action === 'disetujui'
            ? `Selamat! Berkas lamaran Anda untuk posisi "${job?.judul || ''}" di ${prs?.namaPerusahaan || ''} telah disetujui BKK dan diteruskan ke panel HRD perusahaan. Keterangan: "${keterangan.trim()}"`
            : `Mohon maaf, berkas lamaran Anda untuk posisi "${job?.judul || ''}" di ${prs?.namaPerusahaan || ''} tidak dapat diteruskan ke HRD perusahaan mitra. Alasan: "${keterangan.trim()}"`,
        url: 'user/lamaran',
        createdAt: now
      });

      // 2. Jika disetujui, kirim notifikasi ke Perusahaan
      if (action === 'disetujui' && prs && prs.userId) {
        await saveNotifikasi({
          id: uid('ntf'),
          userId: prs.userId,
          judul: `👤 Kandidat Baru Lolos Screening: ${pk?.namaLengkap || 'Alumni'}`,
          pesan: `Kandidat alumni atas nama ${pk?.namaLengkap || 'Alumni'} (${pk?.jurusan || '-'}) untuk posisi "${job?.judul || ''}" telah disetujui tim BKK dan siap ditinjau di menu Pelamar.`,
          url: 'perusahaan-app/pelamar',
          createdAt: now
        });
      }

      await onRefreshData();
      showToast(
        action === 'disetujui'
          ? 'Lamaran berhasil disetujui & diteruskan ke panel perusahaan!'
          : 'Lamaran berhasil diblokir/ditolak dari proses screening.',
        'success'
      );
      setSelectedApp(null);
    } catch (err: any) {
      showToast('Gagal memproses verifikasi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Verifikasi & Screening Lamaran BKK</h1>
          <p className="page-sub">
            Screening awal pencari kerja sebelum berkas diteruskan ke HRD perusahaan mitra. Lamaran yang disetujui baru akan tampil di panel perusahaan.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div className="n">{lamaran.length}</div>
          <div className="l">Total Lamaran Masuk</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: pendingCount > 0 ? 'var(--accent)' : undefined }}>
            {pendingCount}
          </div>
          <div className="l">Menunggu Screening BKK</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: 'var(--secondary)' }}>
            {approvedCount}
          </div>
          <div className="l">Disetujui (Diteruskan ke HRD)</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: blockedCount > 0 ? 'var(--danger)' : undefined }}>
            {blockedCount}
          </div>
          <div className="l">Diblokir / Ditolak BKK</div>
        </div>
      </div>

      {/* Tabs Filter Status */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${activeTab === 'menunggu_verifikasi' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('menunggu_verifikasi')}
          style={{ gap: '6px' }}
        >
          ⏳ Menunggu Screening <span className="badge amber" style={{ marginLeft: '4px' }}>{pendingCount}</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'disetujui' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('disetujui')}
          style={{ gap: '6px' }}
        >
          ✓ Disetujui BKK <span className="badge green" style={{ marginLeft: '4px' }}>{approvedCount}</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'diblokir' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('diblokir')}
          style={{ gap: '6px' }}
        >
          🔒 Diblokir / Ditolak <span className="badge red" style={{ marginLeft: '4px' }}>{blockedCount}</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('all')}
        >
          Semua Lamaran ({lamaran.length})
        </button>
      </div>

      {/* Filter and Search Box */}
      <div className="card" style={{ marginBottom: '20px', padding: '14px 18px' }}>
        <div className="row-2" style={{ gap: '12px', gridTemplateColumns: '2fr 1fr 1fr auto', alignItems: 'end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Cari Pelamar / Lowongan</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik nama pelamar, lowongan, atau jurusan..."
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Filter Perusahaan</label>
            <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
              <option value="all">Semua Perusahaan</option>
              {perusahaan.map((p) => (
                <option key={p.id} value={p.id}>{p.namaPerusahaan}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Filter Lowongan</label>
            <select value={filterJob} onChange={(e) => setFilterJob(e.target.value)}>
              <option value="all">Semua Lowongan</option>
              {lowongan.map((l) => (
                <option key={l.id} value={l.id}>{l.judul}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => {
              setSearch('');
              setFilterCompany('all');
              setFilterJob('all');
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card table-card">
        <div className="overflow-x">
          <table>
            <thead>
              <tr>
                <th>Pelamar Alumni</th>
                <th>Lowongan & Perusahaan</th>
                <th>Tgl Lamar</th>
                <th>Status Screening BKK</th>
                <th>Keterangan / Pemberitahuan</th>
                <th style={{ textAlign: 'center' }}>Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((a) => {
                const pk = pencariKerja.find((p) => p.id === a.pencariKerjaId);
                const job = lowongan.find((l) => l.id === a.lowonganId);
                const prs = job ? perusahaan.find((p) => p.id === job.perusahaanId) : null;
                const verifStatus: VerifikasiLamaranStatus = a.statusVerifikasi || 'menunggu_verifikasi';
                const verifCfg = STATUS_VERIFIKASI_LAMARAN_MAP[verifStatus] || {
                  label: 'Menunggu Screening',
                  cls: 'amber',
                  icon: '⏳'
                };

                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '12px', overflow: 'hidden', borderRadius: '8px', flexShrink: 0 }}>
                          {pk?.foto ? (
                            <img src={pk.foto} alt={pk.namaLengkap} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            initials(pk?.namaLengkap || 'Alumni')
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{pk?.namaLengkap || 'Alumni'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {pk?.jurusan || '-'} · Lulus {pk?.tahunLulus || '-'}
                          </div>
                          {pk?.noHp && (
                            <div style={{ fontSize: '11.5px', color: 'var(--primary)', marginTop: '2px' }}>
                              WA: {pk.noHp}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{job?.judul || '-'}</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                        🏢 {prs?.namaPerusahaan || '-'}
                      </div>
                    </td>
                    <td>{fmtDate(a.tanggalLamar)}</td>
                    <td>
                      <span className={`badge ${verifCfg.cls}`} style={{ display: 'inline-flex', gap: '4px' }}>
                        <span>{verifCfg.icon}</span> {verifCfg.label}
                      </span>
                      {a.tanggalVerifikasi && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Oleh: {a.verifikasiOleh || 'Admin'}
                        </div>
                      )}
                    </td>
                    <td style={{ minWidth: '220px', maxWidth: '300px', verticalAlign: 'top' }}>
                      {a.catatanVerifikasi ? (
                        <div
                          style={{
                            background:
                              verifStatus === 'disetujui'
                                ? 'rgba(16, 185, 129, 0.08)'
                                : verifStatus === 'diblokir'
                                ? 'rgba(239, 68, 68, 0.08)'
                                : 'var(--bg)',
                            border: `1px solid ${
                              verifStatus === 'disetujui'
                                ? 'rgba(16, 185, 129, 0.3)'
                                : verifStatus === 'diblokir'
                                ? 'rgba(239, 68, 68, 0.3)'
                                : 'var(--border)'
                            }`,
                            borderLeft: `3px solid ${
                              verifStatus === 'disetujui'
                                ? 'var(--secondary)'
                                : verifStatus === 'diblokir'
                                ? 'var(--danger)'
                                : 'var(--accent)'
                            }`,
                            borderRadius: '8px',
                            padding: '8px 12px'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                              marginBottom: '4px'
                            }}
                          >
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color:
                                  verifStatus === 'disetujui'
                                    ? 'var(--secondary)'
                                    : verifStatus === 'diblokir'
                                    ? 'var(--danger)'
                                    : 'var(--text-muted)'
                              }}
                            >
                              {verifStatus === 'disetujui'
                                ? '✓ Catatan BKK'
                                : verifStatus === 'diblokir'
                                ? '🔒 Catatan Penolakan'
                                : '📝 Catatan'}
                            </span>
                            {a.tanggalVerifikasi && (
                              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                {fmtDate(a.tanggalVerifikasi)}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              lineHeight: 1.5,
                              color: 'var(--text)',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {a.catatanVerifikasi}
                          </div>
                          {a.catatanVerifikasi.length > 80 && (
                            <button
                              type="button"
                              onClick={() => setViewNoteApp(a)}
                              className="link-btn"
                              style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px', padding: 0 }}
                            >
                              Lihat Selengkapnya →
                            </button>
                          )}
                        </div>
                      ) : a.coverLetter ? (
                        <div
                          style={{
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderLeft: '3px solid var(--primary)',
                            borderRadius: '8px',
                            padding: '8px 12px'
                          }}
                        >
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', marginBottom: '3px' }}>
                            ✉️ Surat Lamaran Pelamar
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontStyle: 'italic',
                              lineHeight: 1.45,
                              color: 'var(--text)',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            "{a.coverLetter}"
                          </div>
                          {a.coverLetter.length > 70 && (
                            <button
                              type="button"
                              onClick={() => setViewNoteApp(a)}
                              className="link-btn"
                              style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px', padding: 0 }}
                            >
                              Lihat Selengkapnya →
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: 'var(--bg)',
                            color: 'var(--text-muted)',
                            fontSize: '11.5px',
                            border: '1px dashed var(--border)'
                          }}
                        >
                          <span>⏳</span>
                          <span>Belum ada catatan</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => openVerificationModal(a, verifStatus === 'diblokir' ? 'disetujui' : 'disetujui')}
                          title="Tinjau berkas & lakukan verifikasi"
                        >
                          🔍 Tinjau
                        </button>
                        {pk && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => printOrDownloadCV(pk, job?.judul, prs?.namaPerusahaan)}
                            title="Unduh / Cetak CV Pelamar Lengkap Format BKK"
                          >
                            🖨️ CV
                          </button>
                        )}
                        {verifStatus === 'menunggu_verifikasi' && (
                          <>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => openVerificationModal(a, 'disetujui')}
                              title="Setujui dan teruskan ke perusahaan"
                            >
                              ✓ Setujui
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                              onClick={() => openVerificationModal(a, 'diblokir')}
                              title="Blokir dari screening BKK"
                            >
                              🔒 Blokir
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty" style={{ padding: '30px' }}>
                      Tidak ada data berkas lamaran pada filter ini.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Catatan Keterangan */}
      {viewNoteApp && (
        <div className="modal-bg" onClick={() => setViewNoteApp(null)} style={{ zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📋</span>
                <h3 style={{ margin: 0 }}>Detail Keterangan & Catatan Lamaran</h3>
              </div>
              <button className="icon-btn" onClick={() => setViewNoteApp(null)}>✕</button>
            </div>
            <div style={{ padding: '16px 0 6px' }}>
              {(() => {
                const pk = pencariKerja.find((p) => p.id === viewNoteApp.pencariKerjaId);
                const job = lowongan.find((l) => l.id === viewNoteApp.lowonganId);
                const prs = job ? perusahaan.find((p) => p.id === job.perusahaanId) : null;
                const vStatus = viewNoteApp.statusVerifikasi || 'menunggu_verifikasi';
                const vMap = STATUS_VERIFIKASI_LAMARAN_MAP[vStatus] || { label: vStatus, cls: 'amber', icon: '⏳' };

                return (
                  <div>
                    <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{pk?.namaLengkap || 'Alumni'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Melamar posisi <b>{job?.judul || '-'}</b> di {prs?.namaPerusahaan || '-'}
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <span className={`badge ${vMap.cls}`} style={{ display: 'inline-flex', gap: '4px' }}>
                          <span>{vMap.icon}</span> {vMap.label}
                        </span>
                      </div>
                    </div>

                    {viewNoteApp.catatanVerifikasi && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>
                          📝 Catatan Pemberitahuan Verifikasi BKK:
                        </div>
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '12px 14px', borderRadius: '8px', fontSize: '13.5px', lineHeight: 1.6 }}>
                          {viewNoteApp.catatanVerifikasi}
                        </div>
                        {viewNoteApp.tanggalVerifikasi && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                            Diverifikasi oleh: <b>{viewNoteApp.verifikasiOleh || 'Admin'}</b> pada {fmtDateTime(viewNoteApp.tanggalVerifikasi)}
                          </div>
                        )}
                      </div>
                    )}

                    {viewNoteApp.coverLetter && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--primary)' }}>
                          ✉️ Surat Lamaran Pengantar dari Pelamar:
                        </div>
                        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.6, fontStyle: 'italic' }}>
                          "{viewNoteApp.coverLetter}"
                        </div>
                      </div>
                    )}

                    {pk?.noHp && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(37, 211, 102, 0.08)', border: '1px solid rgba(37, 211, 102, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#128C7E' }}>WhatsApp Pelamar:</div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{pk.noHp}</div>
                        </div>
                        <a
                          href={buildWhatsAppLink(
                            pk.noHp,
                            `Halo ${pk.namaLengkap}, terkait lamaran Anda untuk posisi ${job?.judul || ''} di ${prs?.namaPerusahaan || ''}:\n\nStatus Screening BKK: ${vMap.label}\nCatatan BKK: ${viewNoteApp.catatanVerifikasi || '-'}\n\nSalam,\nBKK SMK PGRI 1 Taman`
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-primary"
                          style={{ background: '#25D366', borderColor: '#25D366', gap: '6px' }}
                        >
                          📲 Chat WA Pelamar
                        </a>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                      <button type="button" className="btn btn-outline" onClick={() => setViewNoteApp(null)}>
                        Tutup
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail & Form Keterangan Verifikasi */}
      {selectedApp && (
        <div className="modal-bg" onClick={() => setSelectedApp(null)}>
          <div className="modal" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            {(() => {
              const pk = pencariKerja.find((p) => p.id === selectedApp.pencariKerjaId);
              const job = lowongan.find((l) => l.id === selectedApp.lowonganId);
              const prs = job ? perusahaan.find((p) => p.id === job.perusahaanId) : null;
              const currentStatus: VerifikasiLamaranStatus = selectedApp.statusVerifikasi || 'menunggu_verifikasi';

              return (
                <div>
                  <div className="modal-head">
                    <div>
                      <h3 style={{ margin: 0 }}>Screening & Verifikasi Lamaran BKK</h3>
                      <div className="job-meta">
                        Diajukan pada {fmtDateTime(selectedApp.tanggalLamar)}
                      </div>
                    </div>
                    <button className="icon-btn" onClick={() => setSelectedApp(null)}>✕</button>
                  </div>

                  {/* Ringkasan Profil Pelamar & Lowongan */}
                  <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '16px', margin: '16px 0', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
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
                        <div>
                          <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
                            Kandidat Pelamar Alumni
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '15px', marginTop: '2px' }}>
                            {pk?.namaLengkap || 'Alumni'}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Jurusan: <b>{pk?.jurusan || '-'}</b> (Lulus {pk?.tahunLulus || '-'})
                          </div>
                          <div style={{ fontSize: '13px', marginTop: '4px' }}>
                            📱 WhatsApp: <b>{pk?.noHp || '-'}</b>
                          </div>
                          <div style={{ fontSize: '13px', marginTop: '2px' }}>
                            📍 Domisili: {pk?.kabupaten || '-'}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
                          Posisi & Perusahaan Tujuan
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '15px', marginTop: '2px', color: 'var(--primary)' }}>
                          {job?.judul || '-'}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                          🏢 {prs?.namaPerusahaan || '-'}
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Syarat Min: {job?.pendidikanMinimal} · Lokasi: {job?.lokasi}
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Status Saat Ini:{' '}
                          <span className={`badge ${STATUS_VERIFIKASI_LAMARAN_MAP[currentStatus]?.cls || 'amber'}`}>
                            {STATUS_VERIFIKASI_LAMARAN_MAP[currentStatus]?.label || currentStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Surat Lamaran / Pesan dari Pelamar */}
                    {selectedApp.coverLetter && (
                      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                          Surat Lamaran / Pengantar dari Pelamar:
                        </div>
                        <div style={{ fontSize: '13px', background: 'var(--surface)', padding: '10px 14px', borderRadius: '8px', fontStyle: 'italic', border: '1px solid var(--border)' }}>
                          "{selectedApp.coverLetter}"
                        </div>
                      </div>
                    )}

                    {/* Seluruh Berkas & Dokumen Pendukung Terlampir */}
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>
                          📁 Berkas & Dokumen Pendukung Terlampir ({(pk?.dokumen || []).length})
                        </div>
                        {pk && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => printOrDownloadCV(pk, job?.judul, prs?.namaPerusahaan)}
                            title="Cetak atau simpan CV lengkap pelamar dalam format PDF"
                          >
                            🖨️ Cetak / Unduh CV Format BKK
                          </button>
                        )}
                      </div>

                      {(pk?.dokumen || []).length === 0 ? (
                        <div className="job-meta">Pelamar belum melampirkan berkas dokumen terpisah.</div>
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

                  {/* Form Tindakan Screening & Form Keterangan */}
                  <form onSubmit={handleProcessVerification}>
                    <div className="field">
                      <label style={{ fontWeight: 700, fontSize: '13.5px' }}>
                        Keputusan Screening BKK <span className="req-star">*</span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: `2px solid ${verificationAction === 'disetujui' ? 'var(--secondary)' : 'var(--border)'}`,
                            background: verificationAction === 'disetujui' ? 'var(--secondary-light)' : 'var(--surface)',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="radio"
                            name="verifAction"
                            checked={verificationAction === 'disetujui'}
                            onChange={() => {
                              setVerificationAction('disetujui');
                              if (!keterangan || keterangan.includes('Kualifikasi belum sesuai')) {
                                setKeterangan('Berkas lengkap dan memenuhi kualifikasi jurusan. Diteruskan ke HRD perusahaan.');
                              }
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>✓ Setujui Lamaran</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              Lolos screening & langsung muncul di panel HRD perusahaan
                            </div>
                          </div>
                        </label>

                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: `2px solid ${verificationAction === 'diblokir' ? 'var(--danger)' : 'var(--border)'}`,
                            background: verificationAction === 'diblokir' ? 'var(--danger-light)' : 'var(--surface)',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="radio"
                            name="verifAction"
                            checked={verificationAction === 'diblokir'}
                            onChange={() => {
                              setVerificationAction('diblokir');
                              if (!keterangan || keterangan.includes('Berkas lengkap')) {
                                setKeterangan('Kualifikasi belum sesuai dengan spesifikasi lowongan yang dibutuhkan perusahaan.');
                              }
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--danger)' }}>🔒 Blokir / Tolak Lamaran</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              Gagal screening awal & tidak akan tampil di panel HRD
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Form Keterangan Sebagai Pemberitahuan */}
                    <div className="field">
                      <label style={{ fontWeight: 700, fontSize: '13.5px' }}>
                        Form Keterangan & Notifikasi Pelamar <span className="req-star">*</span>
                      </label>
                      <div className="hint" style={{ marginBottom: '6px' }}>
                        Keterangan ini otomatis dikirimkan sebagai notifikasi resmi kepada pelamar alumni dan dicatat dalam riwayat lamaran.
                      </div>
                      <textarea
                        required
                        rows={3}
                        value={keterangan}
                        onChange={(e) => setKeterangan(e.target.value)}
                        placeholder="Tuliskan catatan verifikasi, alasan persetujuan, atau alasan pemblokiran/penolakan..."
                      />

                      {/* Saran Keterangan Cepat */}
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                          Pilihan Cepat Keterangan:
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {verificationAction === 'disetujui' ? (
                            <>
                              <button
                                type="button"
                                className="tag blue"
                                style={{ cursor: 'pointer', border: '1px solid var(--border)' }}
                                onClick={() => setKeterangan('Berkas lengkap dan sesuai kualifikasi jurusan. Diteruskan ke HRD perusahaan.')}
                              >
                                Berkas Lengkap & Sesuai
                              </button>
                              <button
                                type="button"
                                className="tag blue"
                                style={{ cursor: 'pointer', border: '1px solid var(--border)' }}
                                onClick={() => setKeterangan('Kandidat sangat direkomendasikan BKK untuk proses wawancara kerja.')}
                              >
                                Direkomendasikan Wawancara
                              </button>
                              <button
                                type="button"
                                className="tag blue"
                                style={{ cursor: 'pointer', border: '1px solid var(--border)' }}
                                onClick={() => setKeterangan('Persyaratan administrasi terpenuhi. Menunggu jadwal tes dari perusahaan.')}
                              >
                                Administrasi Terpenuhi
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="tag red"
                                style={{ cursor: 'pointer', border: '1px solid var(--border)' }}
                                onClick={() => setKeterangan('Kualifikasi jurusan belum sesuai dengan kriteria yang dibutuhkan lowongan ini.')}
                              >
                                Jurusan Tidak Sesuai
                              </button>
                              <button
                                type="button"
                                className="tag red"
                                style={{ cursor: 'pointer', border: '1px solid var(--border)' }}
                                onClick={() => setKeterangan('Berkas dokumen CV dan identitas pelamar belum lengkap.')}
                              >
                                Berkas Tidak Lengkap
                              </button>
                              <button
                                type="button"
                                className="tag red"
                                style={{ cursor: 'pointer', border: '1px solid var(--border)' }}
                                onClick={() => setKeterangan('Kriteria usia atau syarat teknis tidak memenuhi kualifikasi mitra perusahaan.')}
                              >
                                Syarat Khusus Tidak Terpenuhi
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setSelectedApp(null)}
                        disabled={submitting}
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="btn"
                        disabled={submitting}
                        style={{
                          background: verificationAction === 'disetujui' ? 'var(--secondary)' : 'var(--danger)',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 600
                        }}
                      >
                        {submitting
                          ? 'Menyimpan...'
                          : verificationAction === 'disetujui'
                          ? '✓ Simpan & Setujui (Teruskan ke HRD)'
                          : '🔒 Simpan & Blokir Lamaran'}
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------- ADMIN AGENDA & PENGUMUMAN -----------------
export const AdminAgendaView: React.FC<AdminViewsProps> = ({
  agenda,
  pencariKerja,
  settings,
  showToast,
  onRefreshData
}) => {
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [lokasi, setLokasi] = useState('Aula SMK PGRI 1 Taman');
  const [autoNotifyWA, setAutoNotifyWA] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAgendaForBroadcast, setSelectedAgendaForBroadcast] = useState<Agenda | null>(null);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);

  const alumniWithPhone = pencariKerja.filter((pk) => !!formatWhatsAppNumber(pk.noHp));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !tanggalMulai) return;
    setSubmitting(true);
    try {
      const newAgenda: Agenda = {
        id: uid('agd'),
        judul: judul.trim(),
        slug: slugify(`${judul}-${Date.now().toString(36)}`),
        deskripsi: deskripsi.trim(),
        tanggalMulai: new Date(tanggalMulai).toISOString(),
        lokasi: lokasi.trim(),
        penyelenggara: 'BKK SMK PGRI 1 Taman',
        status: 'published',
        createdAt: new Date().toISOString()
      };
      await saveAgenda(newAgenda);

      // Simpan notifikasi ke akun masing-masing alumni di database
      if (pencariKerja && pencariKerja.length > 0) {
        for (const pk of pencariKerja) {
          if (pk.userId) {
            try {
              await saveNotifikasi({
                id: uid('notif'),
                userId: pk.userId,
                judul: `🗓️ Agenda BKK: ${newAgenda.judul}`,
                pesan: `Ada agenda kegiatan baru: "${newAgenda.judul}" pada ${new Date(newAgenda.tanggalMulai).toLocaleString('id-ID')}. Lokasi: ${newAgenda.lokasi}.`,
                url: '#agenda',
                createdAt: new Date().toISOString()
              });
            } catch {
              // ignore individual failure
            }
          }
        }
      }

      // Jika WhatsApp Gateway terpasang, coba kirim otomatis di background
      if (autoNotifyWA && settings.waGatewayApiKey && alumniWithPhone.length > 0) {
        (async () => {
          for (const pk of alumniWithPhone) {
            try {
              await sendViaWhatsAppGateway(
                pk.noHp,
                `📢 *AGENDA RESMI ${settings.siteName || 'BKK SMK PGRI 1 TAMAN'}*\n\nHalo *${pk.namaLengkap}*,\nAda agenda kegiatan karir baru:\n📌 *${newAgenda.judul}*\n🗓️ Jadwal: ${new Date(newAgenda.tanggalMulai).toLocaleString('id-ID')}\n📍 Lokasi: ${newAgenda.lokasi}\n\nSilakan cek portal BKK:\n${window.location.origin}#agenda`,
                settings.waGatewayUrl,
                settings.waGatewayApiKey
              );
            } catch {
              // background error
            }
          }
        })();
      }

      await onRefreshData();
      setJudul('');
      setDeskripsi('');
      setTanggalMulai('');

      if (autoNotifyWA) {
        setSelectedAgendaForBroadcast(newAgenda);
        setBroadcastModalOpen(true);
        showToast(`Agenda berhasil dipublikasikan & siaran WhatsApp siap untuk ${alumniWithPhone.length} alumni!`, 'success');
      } else {
        showToast('Agenda berhasil dipublikasikan!', 'success');
      }
    } catch (err: any) {
      showToast('Gagal mempublikasikan agenda: ' + (err.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAgenda(id);
      await onRefreshData();
      showToast('Agenda kegiatan berhasil dihapus.', 'info');
    } catch (err: any) {
      showToast('Gagal menghapus agenda: ' + (err.message || 'Terjadi kesalahan'), 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Manajemen Agenda & Kegiatan</h1>
          <p className="page-sub" style={{ margin: '4px 0 0' }}>
            Publikasikan agenda job fair, rekrutmen, dan siarkan otomatis ke nomor WhatsApp alumni.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📲</span> {alumniWithPhone.length} Alumni Terdaftar WhatsApp
          </span>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: '15px' }}>Publikasikan Agenda Baru</h3>
          <form onSubmit={handleAdd}>
            <div className="field">
              <label>Judul Agenda / Job Fair</label>
              <input required value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Contoh: Job Fair Akbar SMK PGRI 1 Taman 2026" />
            </div>
            <div className="field">
              <label>Deskripsi Kegiatan</label>
              <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={3} placeholder="Tulis rincian kegiatan, perusahaan mitra yang hadir, atau persyaratan..." />
            </div>
            <div className="row-2">
              <div className="field">
                <label>Tanggal & Jam Mulai</label>
                <input required type="datetime-local" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} />
              </div>
              <div className="field">
                <label>Lokasi Acara</label>
                <input value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="Aula / Gedung Serbaguna" />
              </div>
            </div>

            {/* Checkbox Otomatisasi Kirim WhatsApp Alumni */}
            <div
              style={{
                background: 'rgba(37, 211, 102, 0.08)',
                border: '1px solid rgba(37, 211, 102, 0.3)',
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '16px'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={autoNotifyWA}
                  onChange={(e) => setAutoNotifyWA(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: '#25D366' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#128C7E' }}>
                    📲 Otomatis Siarkan ke No. Handphone / WhatsApp Alumni ({alumniWithPhone.length} Kontak)
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Saat agenda disimpan, sistem langsung menyiapkan siaran WhatsApp massal dan mengirimkan notifikasi resmi kepada seluruh alumni terdaftar.
                  </div>
                </div>
              </label>
            </div>

            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ gap: '6px' }}>
              {submitting ? 'Menyimpan...' : '🚀 Simpan & Siarkan Agenda'}
            </button>
          </form>
        </div>

        <div className="card table-card">
          <div className="card-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Daftar Agenda Terpublikasi ({agenda.length})</h3>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Judul Kegiatan</th>
                  <th>Tanggal</th>
                  <th>Lokasi</th>
                  <th style={{ textAlign: 'center', width: '150px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {agenda.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      Belum ada agenda yang diterbitkan.
                    </td>
                  </tr>
                ) : (
                  agenda.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'normal' }}>{a.judul}</td>
                      <td style={{ fontSize: '12.5px' }}>{fmtDate(a.tanggalMulai)}</td>
                      <td style={{ fontSize: '12.5px' }}>{a.lokasi}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            style={{
                              background: '#25D366',
                              borderColor: '#25D366',
                              color: '#fff',
                              fontSize: '11px',
                              padding: '4px 8px',
                              gap: '4px'
                            }}
                            onClick={() => {
                              setSelectedAgendaForBroadcast(a);
                              setBroadcastModalOpen(true);
                            }}
                            title="Siarkan informasi agenda ini ke nomor WhatsApp alumni"
                          >
                            📲 Kirim WA
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDelete(a.id)}
                            title="Hapus Agenda"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Siaran WhatsApp Alumni untuk Agenda */}
      {broadcastModalOpen && selectedAgendaForBroadcast && (
        <WhatsAppBroadcastModal
          isOpen={broadcastModalOpen}
          onClose={() => {
            setBroadcastModalOpen(false);
            setSelectedAgendaForBroadcast(null);
          }}
          type="agenda"
          agenda={selectedAgendaForBroadcast}
          alumniList={pencariKerja}
          settings={settings}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export const AdminPengumumanView: React.FC<AdminViewsProps> = ({
  pengumuman,
  pencariKerja,
  settings,
  showToast,
  onRefreshData
}) => {
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [autoNotifyWA, setAutoNotifyWA] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPengumumanForBroadcast, setSelectedPengumumanForBroadcast] = useState<Pengumuman | null>(null);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);

  const alumniWithPhone = pencariKerja.filter((pk) => !!formatWhatsAppNumber(pk.noHp));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !isi.trim()) return;
    setSubmitting(true);
    try {
      const item: Pengumuman = {
        id: uid('png'),
        judul: judul.trim(),
        slug: slugify(`${judul}-${Date.now().toString(36)}`),
        isi: isi.trim(),
        status: 'published',
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      await savePengumuman(item);

      // Simpan notifikasi ke akun masing-masing alumni di database
      if (pencariKerja && pencariKerja.length > 0) {
        for (const pk of pencariKerja) {
          if (pk.userId) {
            try {
              await saveNotifikasi({
                id: uid('notif'),
                userId: pk.userId,
                judul: `📢 Pengumuman Resmi: ${item.judul}`,
                pesan: item.isi.slice(0, 150) + (item.isi.length > 150 ? '...' : ''),
                url: '#pengumuman',
                createdAt: new Date().toISOString()
              });
            } catch {
              // ignore individual failure
            }
          }
        }
      }

      // Jika WhatsApp Gateway terpasang, coba kirim otomatis di background
      if (autoNotifyWA && settings.waGatewayApiKey && alumniWithPhone.length > 0) {
        (async () => {
          for (const pk of alumniWithPhone) {
            try {
              await sendViaWhatsAppGateway(
                pk.noHp,
                `📢 *PENGUMUMAN RESMI ${settings.siteName || 'BKK SMK PGRI 1 TAMAN'}*\n\nHalo *${pk.namaLengkap}*,\nTerdapat pengumuman resmi terbaru:\n📌 *${item.judul}*\n\n${item.isi}\n\nDetail lengkap kunjungi:\n${window.location.origin}#pengumuman`,
                settings.waGatewayUrl,
                settings.waGatewayApiKey
              );
            } catch {
              // background error
            }
          }
        })();
      }

      await onRefreshData();
      setJudul('');
      setIsi('');

      if (autoNotifyWA) {
        setSelectedPengumumanForBroadcast(item);
        setBroadcastModalOpen(true);
        showToast(`Pengumuman resmi diterbitkan & siaran WhatsApp siap untuk ${alumniWithPhone.length} alumni!`, 'success');
      } else {
        showToast('Pengumuman resmi berhasil diterbitkan!', 'success');
      }
    } catch (err: any) {
      showToast('Gagal menerbitkan pengumuman: ' + (err.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePengumuman(id);
      await onRefreshData();
      showToast('Pengumuman berhasil dihapus.', 'info');
    } catch (err: any) {
      showToast('Gagal menghapus pengumuman: ' + (err.message || 'Terjadi kesalahan'), 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Pengumuman & Surat Edaran BKK</h1>
          <p className="page-sub" style={{ margin: '4px 0 0' }}>
            Publikasikan pengumuman resmi dan siarkan otomatis langsung ke nomor handphone / WhatsApp alumni.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📲</span> {alumniWithPhone.length} Alumni Terdaftar WhatsApp
          </span>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: '15px' }}>Tulis Pengumuman Baru</h3>
          <form onSubmit={handleAdd}>
            <div className="field">
              <label>Judul Pengumuman</label>
              <input required value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Contoh: Pengumuman Pembukaan Lowongan PT Astra Honda" />
            </div>
            <div className="field">
              <label>Isi Lengkap Pengumuman</label>
              <textarea required rows={5} value={isi} onChange={(e) => setIsi(e.target.value)} placeholder="Tuliskan isi pengumuman, instruksi bagi alumni, tanggal batas akhir, atau tautan terkait..." />
            </div>

            {/* Checkbox Otomatisasi Kirim WhatsApp Alumni */}
            <div
              style={{
                background: 'rgba(37, 211, 102, 0.08)',
                border: '1px solid rgba(37, 211, 102, 0.3)',
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '16px'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={autoNotifyWA}
                  onChange={(e) => setAutoNotifyWA(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: '#25D366' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#128C7E' }}>
                    📲 Otomatis Siarkan ke No. Handphone / WhatsApp Alumni ({alumniWithPhone.length} Kontak)
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Pengumuman otomatis diteruskan ke nomor handphone alumni secara instan melalui WhatsApp & notifikasi aplikasi.
                  </div>
                </div>
              </label>
            </div>

            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ gap: '6px' }}>
              {submitting ? 'Menerbitkan...' : '📢 Terbitkan & Siarkan ke WhatsApp'}
            </button>
          </form>
        </div>

        <div className="card table-card">
          <div className="card-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Daftar Pengumuman Diterbitkan ({pengumuman.length})</h3>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Tanggal</th>
                  <th style={{ textAlign: 'center', width: '150px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pengumuman.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      Belum ada pengumuman yang diterbitkan.
                    </td>
                  </tr>
                ) : (
                  pengumuman.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'normal' }}>{p.judul}</td>
                      <td style={{ fontSize: '12.5px' }}>{fmtDate(p.publishedAt || p.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            style={{
                              background: '#25D366',
                              borderColor: '#25D366',
                              color: '#fff',
                              fontSize: '11px',
                              padding: '4px 8px',
                              gap: '4px'
                            }}
                            onClick={() => {
                              setSelectedPengumumanForBroadcast(p);
                              setBroadcastModalOpen(true);
                            }}
                            title="Siarkan pengumuman ini ke nomor WhatsApp alumni"
                          >
                            📲 Kirim WA
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDelete(p.id)}
                            title="Hapus Pengumuman"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Siaran WhatsApp Alumni untuk Pengumuman */}
      {broadcastModalOpen && selectedPengumumanForBroadcast && (
        <WhatsAppBroadcastModal
          isOpen={broadcastModalOpen}
          onClose={() => {
            setBroadcastModalOpen(false);
            setSelectedPengumumanForBroadcast(null);
          }}
          type="pengumuman"
          pengumuman={selectedPengumumanForBroadcast}
          alumniList={pencariKerja}
          settings={settings}
          showToast={showToast}
        />
      )}
    </div>
  );
};

// ----------------- ADMIN LAPORAN -----------------
export const AdminLaporanView: React.FC<AdminViewsProps> = ({
  lowongan,
  perusahaan,
  lamaran,
  pencariKerja,
  kategori,
  showToast
}) => {
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  let filteredApps = [...lamaran];
  if (filterCompany !== 'all') {
    const jobIds = lowongan.filter((l) => l.perusahaanId === filterCompany).map((l) => l.id);
    filteredApps = filteredApps.filter((a) => jobIds.includes(a.lowonganId));
  }
  if (filterStatus !== 'all') {
    filteredApps = filteredApps.filter((a) => a.status === filterStatus);
  }

  const handleDownloadCSV = () => {
    if (lamaran.length === 0) {
      showToast?.('Tidak ada data rekrutmen untuk diekspor', 'info');
      return;
    }
    const headers = [
      'ID Lamaran',
      'Nama Pelamar',
      'Jurusan SMK',
      'Tahun Lulus',
      'No WhatsApp',
      'Domisili',
      'Nama Perusahaan',
      'Posisi Lowongan',
      'Kategori',
      'Tanggal Melamar',
      'Status Seleksi',
      'Catatan HRD'
    ];
    const dataToExport = filterCompany !== 'all' || filterStatus !== 'all' ? filteredApps : lamaran;
    const rows = dataToExport.map((a) => {
      const pk = pencariKerja.find((p) => p.id === a.pencariKerjaId);
      const job = lowongan.find((l) => l.id === a.lowonganId);
      const prs = job ? perusahaan.find((p) => p.id === job.perusahaanId) : null;
      const kat = job ? kategori.find((k) => k.id === job.kategoriId) : null;
      const statusLabel = STATUS_LAMARAN_MAP[a.status]?.label || a.status;
      return [
        a.id,
        pk?.namaLengkap || 'Alumni',
        pk?.jurusan || '-',
        pk?.tahunLulus || '-',
        pk?.noHp || '-',
        pk?.kabupaten || '-',
        prs?.namaPerusahaan || '-',
        job?.judul || '-',
        kat?.nama || '-',
        fmtDate(a.tanggalLamar),
        statusLabel,
        a.catatan || '-'
      ];
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    exportCSVFile(headers, rows, `laporan_rekrutmen_bkk_smk_pgri_1_taman_${dateStr}`);
    showToast?.('Laporan CSV berhasil diunduh!', 'success');
  };

  // Status distribution
  const statusCounts: Record<string, number> = {};
  Object.keys(STATUS_LAMARAN_MAP).forEach((k) => {
    statusCounts[k] = lamaran.filter((a) => a.status === k).length;
  });
  const maxVal = Math.max(1, ...Object.values(statusCounts));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Laporan & Rekapitulasi Rekrutmen BKK</h1>
          <p className="page-sub">Data statistik proses rekrutmen alumni di seluruh perusahaan mitra industri.</p>
        </div>
        <button
          onClick={handleDownloadCSV}
          className="btn btn-primary"
          style={{ gap: '8px', display: 'inline-flex', alignItems: 'center' }}
        >
          📥 Download Laporan CSV
        </button>
      </div>

      <div className="kpi">
        <div className="card">
          <div className="n">{lamaran.length}</div>
          <div className="l">Total Berkas Lamaran</div>
        </div>
        <div className="card">
          <div className="n">{lowongan.length}</div>
          <div className="l">Total Lowongan Kerja</div>
        </div>
        <div className="card">
          <div className="n">{perusahaan.length}</div>
          <div className="l">Perusahaan Mitra</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: 'var(--secondary)' }}>
            {lamaran.filter((a) => a.status === 'diterima').length}
          </div>
          <div className="l">Alumni Diterima Kerja</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '15px' }}>Distribusi Tahapan Seleksi Pelamar Alumni</h3>
          <button onClick={handleDownloadCSV} className="btn btn-sm btn-outline">
            Ekspor Semua Data ke CSV
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

      {/* Filter and Table */}
      <div className="card table-card">
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px' }}>Tabel Rekapitulasi Lamaran ({filteredApps.length} Data)</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '13px', width: 'auto' }}
              >
                <option value="all">Semua Perusahaan</option>
                {perusahaan.map((p) => (
                  <option key={p.id} value={p.id}>{p.namaPerusahaan}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '13px', width: 'auto' }}
              >
                <option value="all">Semua Status</option>
                {Object.entries(STATUS_LAMARAN_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
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
                <th>Perusahaan</th>
                <th>Posisi Lowongan</th>
                <th>Tgl Lamar</th>
                <th>Status Seleksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((a) => {
                const pk = pencariKerja.find((p) => p.id === a.pencariKerjaId);
                const job = lowongan.find((l) => l.id === a.lowonganId);
                const prs = job ? perusahaan.find((p) => p.id === job.perusahaanId) : null;
                const statusCfg = STATUS_LAMARAN_MAP[a.status] || { label: a.status, cls: 'grey' };
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{pk?.namaLengkap || 'Alumni'}</td>
                    <td>{pk?.jurusan || '-'}</td>
                    <td>{prs?.namaPerusahaan || '-'}</td>
                    <td>{job?.judul || '-'}</td>
                    <td>{fmtDate(a.tanggalLamar)}</td>
                    <td><span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span></td>
                  </tr>
                );
              })}
              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">Tidak ada data lamaran yang sesuai dengan filter.</div>
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

// ----------------- ADMIN TRACER STUDY -----------------
export const AdminTracerStudyView: React.FC<AdminViewsProps> = ({
  pencariKerja,
  perusahaan,
  penempatan,
  lamaran,
  settings,
  showToast
}) => {
  const [search, setSearch] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('all');
  const [filterTahun, setFilterTahun] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedItem, setSelectedItem] = useState<TracerStudyItem | null>(null);

  // Buat data Tracer Study yang terintegrasi otomatis dengan akun pencari kerja
  const tracerData = React.useMemo(() => {
    return buildTracerStudyList(
      pencariKerja,
      perusahaan,
      penempatan,
      lamaran,
      settings.siteName || 'SMK PGRI 1 Taman'
    );
  }, [pencariKerja, perusahaan, penempatan, lamaran, settings.siteName]);

  // Ekstrak opsi filter
  const jurusans = Array.from(new Set(tracerData.map((t) => t.jurusan).filter(Boolean)));
  const tahunLulusList = Array.from(new Set(tracerData.map((t) => t.tahunLulus).filter((y) => y !== '-'))).sort().reverse();

  // Filter data sesuai kriteria pencarian & filter
  const filteredData = tracerData.filter((item) => {
    if (filterJurusan !== 'all' && item.jurusan !== filterJurusan) return false;
    if (filterTahun !== 'all' && item.tahunLulus !== filterTahun) return false;
    if (filterStatus === 'bekerja' && item.perusahaanList.length === 0) return false;
    if (filterStatus === 'belum' && item.perusahaanList.length > 0) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNama = item.namaAlumni.toLowerCase().includes(q);
      const matchSekolah = item.namaSekolah.toLowerCase().includes(q);
      const matchJurusan = item.jurusan.toLowerCase().includes(q);
      const matchTahun = item.tahunLulus.toLowerCase().includes(q);
      const matchHp = item.noHandphone.includes(q);
      const matchPerusahaan = item.perusahaanList.some((c) => c.toLowerCase().includes(q));
      if (!matchNama && !matchSekolah && !matchJurusan && !matchTahun && !matchHp && !matchPerusahaan) {
        return false;
      }
    }
    return true;
  });

  // Statistik Keterserapan
  const totalAlumni = tracerData.length;
  const sudahBekerjaCount = tracerData.filter((t) => t.perusahaanList.length > 0).length;
  const belumBekerjaCount = totalAlumni - sudahBekerjaCount;
  const persenTerserap = totalAlumni > 0 ? Math.round((sudahBekerjaCount / totalAlumni) * 100) : 0;

  // 1. Fungsi Download CSV Laporan Tracer Study
  const handleDownloadCSV = () => {
    if (filteredData.length === 0) {
      showToast('Tidak ada data Tracer Study untuk diekspor', 'info');
      return;
    }

    const headers = [
      'No',
      'Nama Alumni',
      'Nama Sekolah',
      'Jurusan',
      'Tahun Lulus',
      'Nomer Handphone',
      'Nama Instansi / Perusahaan (DUDI)',
      'Total Perusahaan',
      'Status Keterserapan',
      'Domisili'
    ];

    const rows = filteredData.map((item, idx) => [
      idx + 1,
      item.namaAlumni,
      item.namaSekolah,
      item.jurusan,
      item.tahunLulus,
      item.noHandphone,
      item.perusahaanList.length > 0 ? item.perusahaanList.join('; ') : '-',
      item.perusahaanList.length,
      item.perusahaanList.length > 0 ? 'Bekerja / Magang' : 'Mencari Kerja',
      item.domisili
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    exportCSVFile(headers, rows, `tracer_study_alumni_${dateStr}`);
    showToast('Laporan Tracer Study (CSV) berhasil diunduh!', 'success');
  };

  // 2. Fungsi Cetak Dokumen / Simpan PDF
  const handlePrint = () => {
    if (filteredData.length === 0) {
      showToast('Tidak ada data untuk dicetak', 'info');
      return;
    }
    const currentCity = resolveBkkCity(settings, 'Pemalang');
    printTracerStudyReport(filteredData, settings.siteName || 'SMK PGRI 1 Taman', currentCity);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Tracer Study & Penelusuran Tamatan Alumni</h1>
          <p className="page-sub">
            Monitoring penelusuran keterserapan kerja alumni ke Dunia Usaha & Dunia Industri (DUDI), terintegrasi otomatis dengan akun profil pencari kerja.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              background: 'var(--bg)',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Kota ini otomatis dicantumkan pada bagian tanggal & tanda tangan laporan resmi PDF"
          >
            <span>📍 Titimangsa Cetak:</span>
            <strong style={{ color: 'var(--primary)' }}>{resolveBkkCity(settings, 'Pemalang')}</strong>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handlePrint}
            style={{ gap: '6px', display: 'inline-flex', alignItems: 'center' }}
            title={`Cetak atau simpan dokumen Tracer Study ke PDF (Lokasi titimangsa: ${resolveBkkCity(settings, 'Pemalang')})`}
          >
            🖨️ Cetak / PDF
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownloadCSV}
            style={{ gap: '6px', display: 'inline-flex', alignItems: 'center' }}
            title="Download database tracer study ke format spreadsheet CSV / Excel"
          >
            📥 Download CSV
          </button>
        </div>
      </div>

      {/* KPI Kartu Statistik Tracer Study */}
      <div className="kpi">
        <div className="card">
          <div className="n" style={{ color: 'var(--primary)' }}>{totalAlumni}</div>
          <div className="l">Total Alumni Terdata</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: 'var(--secondary)' }}>{sudahBekerjaCount}</div>
          <div className="l">Terserap Bekerja / Magang ({persenTerserap}%)</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: 'var(--accent)' }}>{belumBekerjaCount}</div>
          <div className="l">Belum Bekerja / Mencari Kerja</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: '#0369a1' }}>
            {Array.from(new Set(tracerData.flatMap((t) => t.perusahaanList))).length}
          </div>
          <div className="l">Mitra Instansi / Perusahaan DUDI</div>
        </div>
      </div>

      {/* Kolom Pencarian dan Filter Lengkap */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 18px' }}>
        <div className="row-2" style={{ gap: '12px', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', alignItems: 'end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Cari Tracer Study</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama alumni, sekolah, jurusan, no HP, atau perusahaan..."
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Filter Jurusan</label>
            <select value={filterJurusan} onChange={(e) => setFilterJurusan(e.target.value)}>
              <option value="all">Semua Jurusan</option>
              {jurusans.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Tahun Lulus</label>
            <select value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}>
              <option value="all">Semua Tahun</option>
              {tahunLulusList.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Status Keterserapan</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Semua Status</option>
              <option value="bekerja">Sudah Bekerja / Magang</option>
              <option value="belum">Belum Bekerja</option>
            </select>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => {
              setSearch('');
              setFilterJurusan('all');
              setFilterTahun('all');
              setFilterStatus('all');
            }}
            title="Reset filter pencarian"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Tabel Data Tracer Study */}
      <div className="card table-card">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 600 }}>
            Menampilkan <b>{filteredData.length}</b> dari {totalAlumni} data alumni
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            🔒 Data bersifat rahasia dan hanya dapat diakses melalui Panel Admin BKK.
          </div>
        </div>

        <div className="overflow-x">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>No</th>
                <th>Nama Alumni</th>
                <th>Nama Sekolah</th>
                <th>Jurusan</th>
                <th style={{ textAlign: 'center' }}>Tahun Lulus</th>
                <th>Nomer Handphone</th>
                <th>Nama Instansi / Perusahaan</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, idx) => {
                const hasCompany = item.perusahaanList.length > 0;
                return (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {idx + 1}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                        {item.namaAlumni}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        📍 {item.domisili}
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {item.namaSekolah}
                    </td>
                    <td>
                      <span className="tag blue" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {item.jurusan}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {item.tahunLulus}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12.5px' }}>
                      {item.noHandphone !== '-' ? (
                        <a
                          href={`https://wa.me/${item.noHandphone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--secondary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Hubungi via WhatsApp"
                        >
                          📱 {item.noHandphone}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {hasCompany ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {item.perusahaanList.map((comp, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13px' }}>🏢</span>
                              <span style={{ fontWeight: 600, fontSize: '13px' }}>{comp}</span>
                              {item.posisiList[i] && (
                                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                  ({item.posisiList[i]})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="tag amber" style={{ fontSize: '11px', padding: '2px 8px' }}>
                          Mencari Kerja / Belum Bekerja
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => setSelectedItem(item)}
                        title="Tinjau detail tracer study alumni"
                      >
                        👁️ Rincian
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty" style={{ padding: '36px 16px' }}>
                      <div className="ic">🔍</div>
                      Tidak ada data alumni yang cocok dengan pencarian atau filter kriteria yang dipilih.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Tracer Study Alumni */}
      {selectedItem && (
        <div className="modal-bg" onClick={() => setSelectedItem(null)}>
          <div className="modal" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3 style={{ margin: 0 }}>Rincian Tracer Study: {selectedItem.namaAlumni}</h3>
              <button className="icon-btn" onClick={() => setSelectedItem(null)}>✕</button>
            </div>

            <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Nama Alumni:</span>
                  <b>{selectedItem.namaAlumni}</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Nama Sekolah:</span>
                  <b>{selectedItem.namaSekolah}</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Jurusan:</span>
                  <b>{selectedItem.jurusan}</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Tahun Lulus:</span>
                  <b>{selectedItem.tahunLulus}</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Nomer Handphone:</span>
                  <b style={{ fontFamily: 'monospace' }}>{selectedItem.noHandphone}</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Domisili:</span>
                  <b>{selectedItem.domisili}</b>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: 'var(--primary)' }}>
                🏢 Daftar Instansi / Perusahaan Tempat Bekerja ({selectedItem.perusahaanList.length})
              </h4>
              {selectedItem.perusahaanList.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedItem.perusahaanList.map((comp, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{comp}</div>
                        {selectedItem.posisiList[idx] && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Posisi / Jabatan: <b>{selectedItem.posisiList[idx]}</b>
                          </div>
                        )}
                      </div>
                      <span className="badge green" style={{ fontSize: '11px' }}>Terserap</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty" style={{ padding: '20px 10px' }}>
                  Alumni ini belum mencantumkan riwayat tempat kerja/magang di profil CV.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              {selectedItem.noHandphone !== '-' && (
                <a
                  href={`https://wa.me/${selectedItem.noHandphone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline"
                  style={{ color: 'var(--secondary)' }}
                >
                  💬 Hubungi Alumni via WhatsApp
                </a>
              )}
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setSelectedItem(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------- ADMIN SETTINGS & SEED -----------------
export const AdminSettingsView: React.FC<AdminViewsProps> = ({
  settings,
  showToast,
  onRefreshData
}) => {
  const [siteName, setSiteName] = useState(settings.siteName || 'BKK SMK PGRI 1 Taman');
  const [siteEmail, setSiteEmail] = useState(settings.siteEmail || 'bkk@smkpgri1taman.sch.id');
  const [sitePhone, setSitePhone] = useState(settings.sitePhone || '(031) 788-1234');
  const [siteAddress, setSiteAddress] = useState(settings.siteAddress || 'Jl. Raya Wonocolo No. 24, Taman, Sidoarjo, Jawa Timur');
  const [siteCity, setSiteCity] = useState(settings.siteCity || resolveBkkCity(settings, 'Pemalang'));
  const [siteLogo, setSiteLogo] = useState(settings.siteLogo || '');
  const [waGatewayUrl, setWaGatewayUrl] = useState(settings.waGatewayUrl || '');
  const [waGatewayApiKey, setWaGatewayApiKey] = useState(settings.waGatewayApiKey || '');
  const [testPhone, setTestPhone] = useState('');
  const [testingWa, setTestingWa] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe file
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Format file logo harus berupa gambar (PNG, JPG, SVG, WebP)', 'error');
      return;
    }

    // Validasi ukuran file (maks 1MB)
    if (file.size > 1024 * 1024) {
      showToast('Ukuran gambar logo maksimal 1 MB agar memuat cepat', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSiteLogo(base64);
      showToast('Logo berhasil dipilih. Klik "Simpan Pengaturan" untuk menyimpan ke Firebase.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSiteLogo('');
    showToast('Logo dihapus. Klik "Simpan Pengaturan" untuk menerapkan kembali ke emblem default.', 'info');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSiteSettings({
        siteName,
        siteEmail,
        sitePhone,
        siteAddress,
        siteCity: siteCity.trim(),
        siteLogo,
        waGatewayUrl: waGatewayUrl.trim(),
        waGatewayApiKey: waGatewayApiKey.trim()
      });
      await onRefreshData();
      showToast('Pengaturan dan konfigurasi WhatsApp berhasil disimpan ke Firebase!', 'success');
    } catch (err: any) {
      showToast('Gagal menyimpan pengaturan: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWa = async () => {
    if (!testPhone.trim()) {
      showToast('Masukkan nomor HP / WhatsApp penerima uji coba terlebih dahulu', 'error');
      return;
    }
    setTestingWa(true);
    try {
      const res = await sendViaWhatsAppGateway(
        testPhone.trim(),
        `Halo! Ini adalah pesan uji coba dari sistem BKK ${siteName}. Integrasi WhatsApp Gateway Anda berfungsi dengan baik! 🚀`,
        waGatewayUrl.trim(),
        waGatewayApiKey.trim()
      );
      if (res.success) {
        showToast('Pesan uji coba WhatsApp berhasil dikirim!', 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast('Uji coba kirim gagal: ' + err.message, 'error');
    } finally {
      setTestingWa(false);
    }
  };

  const handleResetDatabase = async () => {
    const confirmed = confirm(
      '⚠️ PERINGATAN KERAS:\n\nApakah Anda benar-benar yakin ingin MERESET SEMUA DATA?\n\nTindakan ini akan menghapus:\n- Seluruh data lowongan kerja\n- Seluruh berkas lamaran & status seleksi\n- Seluruh data akun pencari kerja / alumni\n- Seluruh data akun perusahaan mitra\n- Seluruh agenda kegiatan & pengumuman\n- Seluruh riwayat audit & penempatan\n\nCATATAN: Akun Administrator (data admin) dan pengaturan situs akan tetap dipertahankan.\n\nKlik OK untuk melanjutkan proses reset.'
    );

    if (confirmed) {
      setResetting(true);
      try {
        const res = await resetAllDataExceptAdmin();
        await onRefreshData();
        if (res.success) {
          showToast(res.message, 'success');
        } else {
          showToast(res.message, 'error');
        }
      } catch (err: any) {
        showToast('Gagal mereset data: ' + err.message, 'error');
      } finally {
        setResetting(false);
      }
    }
  };

  return (
    <div>
      <h1 className="page-title">Pengaturan Sistem & Database Firebase</h1>
      <p className="page-sub">Kelola logo institusi, identitas BKK, dan utilitas sinkronisasi Cloud Firestore.</p>

      <form onSubmit={handleSaveSettings} className="card" style={{ maxWidth: '680px', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0 }}>Identitas Situs & Logo</h3>

        {/* Fitur Upload Logo */}
        <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '10px', marginBottom: '18px', border: '1px solid var(--border)' }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '8px' }}>
            Logo Resmi BKK SMK PGRI 1 Taman
          </label>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Box Preview Logo */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '12px',
                border: '2px dashed var(--border)',
                background: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              {siteLogo ? (
                <img
                  src={siteLogo}
                  alt="Preview Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700 }}>
                  <span style={{ fontSize: '20px', display: 'block' }}>🏫</span>
                  Default
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
                  📁 Pilih Berkas Logo
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {siteLogo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="btn btn-sm btn-outline"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  >
                    ✕ Hapus Logo
                  </button>
                )}
              </div>
              <div className="hint" style={{ marginTop: '6px' }}>
                Format: PNG, JPG, WebP, SVG. Disarankan rasio 1:1 atau gambar transparan, maks. 1 MB. Logo akan tampil di navbar dan footer portal.
              </div>
            </div>
          </div>
        </div>

        <div className="field">
          <label>Nama Unit BKK</label>
          <input required value={siteName} onChange={(e) => setSiteName(e.target.value)} />
        </div>
        <div className="row-2">
          <div className="field">
            <label>Email Kontak Resmi</label>
            <input required type="email" value={siteEmail} onChange={(e) => setSiteEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Telepon / WhatsApp Layanan</label>
            <input required value={sitePhone} onChange={(e) => setSitePhone(e.target.value)} />
          </div>
        </div>
        <div className="row-2">
          <div className="field">
            <label>Alamat Lengkap Kantor BKK</label>
            <textarea
              required
              value={siteAddress}
              onChange={(e) => {
                const val = e.target.value;
                setSiteAddress(val);
                if (!settings.siteCity) {
                  setSiteCity(resolveBkkCity({ ...settings, siteAddress: val }, 'Pemalang'));
                }
              }}
            />
          </div>
          <div className="field">
            <label>Kota / Kabupaten Lokasi BKK (Keterangan Cetak PDF)</label>
            <input
              required
              value={siteCity}
              onChange={(e) => setSiteCity(e.target.value)}
              placeholder="Contoh: Pemalang atau Sidoarjo"
            />
            <div className="hint" style={{ marginTop: '4px' }}>
              Nama kota/kabupaten ini dicetak otomatis pada keterangan tanggal & tanda tangan laporan resmi Tracer Study dan dokumen cetak PDF (Contoh: <strong>{siteCity || 'Pemalang'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>).
            </div>
          </div>
        </div>

        {/* Konfigurasi WhatsApp Gateway (Opsional) */}
        <div style={{ background: 'rgba(37, 211, 102, 0.06)', border: '1px solid rgba(37, 211, 102, 0.25)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>📲</span>
            <h4 style={{ margin: 0, color: '#128C7E', fontSize: '15px' }}>
              Integrasi WhatsApp Gateway & Otomatisasi Siaran (Opsional)
            </h4>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Hubungkan API WhatsApp Gateway (seperti <strong>Fonnte</strong>, <strong>Wablas</strong>, atau webhook khusus) agar agenda, pengumuman, dan broadcast massal dapat terkirim 100% otomatis di latar belakang ke nomor WhatsApp alumni.
          </p>

          {/* Tombol & Kotak Panduan Cara Mendapatkan Token */}
          <div style={{ marginBottom: '14px' }}>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ fontSize: '12px', borderColor: '#128C7E', color: '#128C7E', gap: '6px', background: '#fff' }}
              onClick={() => setShowGuide(!showGuide)}
            >
              <span>📖</span> {showGuide ? 'Sembunyikan Panduan' : 'Lihat Panduan: Cara Mendapatkan URL & Token API WhatsApp'}
            </button>

            {showGuide && (
              <div style={{ marginTop: '10px', background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px 16px', fontSize: '12.5px', lineHeight: 1.6, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                <h5 style={{ margin: '0 0 8px', fontSize: '13.5px', color: '#128C7E', fontWeight: 700 }}>
                  Langkah Mudah Mendapatkan Token WhatsApp Gateway (Menggunakan Fonnte.com):
                </h5>
                <ol style={{ margin: '0 0 10px', paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '4px' }}>
                    <strong>Daftar Akun:</strong> Buka situs resmi <a href="https://fonnte.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline' }}>fonnte.com</a>, lalu klik <strong>Register</strong> atau Masuk.
                  </li>
                  <li style={{ marginBottom: '4px' }}>
                    <strong>Tambah Perangkat (Device):</strong> Pada dashboard Fonnte, buka menu <strong>Device</strong> lalu klik <strong>Add Device</strong> (beri nama misalnya <em>BKK SMK PGRI 1 Taman</em>).
                  </li>
                  <li style={{ marginBottom: '4px' }}>
                    <strong>Hubungkan WhatsApp (Scan QR Code):</strong> Buka aplikasi WhatsApp di smartphone Anda &gt; buka <strong>Perangkat Tertaut (Linked Devices)</strong> &gt; pindai (scan) kode QR yang tampil di layar komputer hingga status di Fonnte berubah menjadi <strong>Connect</strong>.
                  </li>
                  <li style={{ marginBottom: '4px' }}>
                    <strong>Salin API Token:</strong> Lihat kolom <strong>Token</strong> pada perangkat Anda di Fonnte, lalu salin token tersebut (berupa kombinasi huruf/angka unik).
                  </li>
                  <li style={{ marginBottom: '4px' }}>
                    <strong>Tempelkan ke Aplikasi Ini:</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '18px' }}>
                      <li><strong>URL API Gateway:</strong> Biarkan kosong atau isi <code>https://api.fonnte.com/send</code></li>
                      <li><strong>API Token:</strong> Tempelkan token yang baru saja Anda salin dari Fonnte.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Uji Coba Pengiriman:</strong> Masukkan nomor HP Anda pada kolom <em>Uji Coba Pengiriman Pesan</em> di bawah, lalu klik <strong>Tes Kirim WhatsApp</strong>. Jika pesan uji coba masuk ke HP Anda, klik <strong>Simpan Pengaturan & Konfigurasi WA</strong>. Selesai!
                  </li>
                </ol>
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: '#1e40af', marginTop: '8px' }}>
                  💡 <strong>Alternatif Provider:</strong> Anda juga dapat menggunakan penyedia lain seperti <em>Wablas</em> (<code>https://kudus.wablas.com/api/send-message</code>), <em>Whacenter</em>, atau API webhook kustom milik instansi Anda.
                </div>
              </div>
            )}
          </div>

          <div className="field">
            <label style={{ fontSize: '12px' }}>URL API Gateway WhatsApp (Opsional)</label>
            <input
              value={waGatewayUrl}
              onChange={(e) => setWaGatewayUrl(e.target.value)}
              placeholder="https://api.fonnte.com/send (kosongkan untuk default Fonnte)"
              style={{ fontSize: '13px' }}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: '12px' }}>API Token / Kunci Otorisasi Gateway (Opsional)</label>
            <input
              type="password"
              value={waGatewayApiKey}
              onChange={(e) => setWaGatewayApiKey(e.target.value)}
              placeholder="Masukkan API Token / Authorization Token Gateway..."
              style={{ fontSize: '13px' }}
            />
          </div>

          {/* Uji Coba Kirim WhatsApp */}
          <div style={{ borderTop: '1px dashed rgba(37, 211, 102, 0.3)', paddingTop: '12px', marginTop: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              🧪 Uji Coba Pengiriman Pesan WhatsApp:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                style={{ flex: 1, minWidth: '180px', fontSize: '12.5px' }}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ borderColor: '#25D366', color: '#128C7E', gap: '4px' }}
                onClick={handleTestWa}
                disabled={testingWa}
              >
                {testingWa ? '⏳ Menguji...' : '🚀 Tes Kirim WhatsApp'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              * Jika API Gateway tidak diisi, sistem tetap menyediakan mode <strong>Siaran Cepat Berurutan</strong> dan tautan langsung WhatsApp Web untuk seluruh kontak alumni tanpa biaya langganan API.
            </div>
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Menyimpan ke Firebase...' : 'Simpan Pengaturan & Konfigurasi WA'}
        </button>
      </form>

      {/* Fitur Reset Data Sistem */}
      <div className="card" style={{ maxWidth: '680px', border: '1px solid #fecaca', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <h3 style={{ margin: 0, color: 'var(--danger)', fontSize: '16px' }}>Reset Seluruh Data Sistem</h3>
        </div>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 16px' }}>
          Tindakan ini akan <strong>menghapus seluruh data operasional</strong> di Cloud Firestore (lowongan kerja,
          berkas lamaran & tahapan seleksi, profil akun pencari kerja/alumni, profil akun mitra perusahaan, agenda,
          pengumuman, serta penempatan alumni).
          <br />
          <span style={{ display: 'inline-block', marginTop: '6px', color: 'var(--text)', background: 'var(--bg)', padding: '6px 10px', borderRadius: '6px' }}>
            🔒 <strong>Aman:</strong> Seluruh data <strong>akun Administrator</strong> dan konfigurasi identitas situs/logo tidak akan dihapus dan tetap terlindungi.
          </span>
        </p>
        <button
          type="button"
          className="btn"
          style={{
            background: 'var(--danger)',
            color: '#ffffff',
            border: 'none',
            fontWeight: 600,
            padding: '10px 20px',
            cursor: resetting ? 'not-allowed' : 'pointer',
            opacity: resetting ? 0.7 : 1
          }}
          onClick={handleResetDatabase}
          disabled={resetting}
        >
          {resetting ? '⏳ Sedang Mereset Data...' : '🗑️ RESET (Hapus Semua Data Kecuali Admin)'}
        </button>
      </div>
    </div>
  );
};
