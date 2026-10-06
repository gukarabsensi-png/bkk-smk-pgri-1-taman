import React, { useState, useMemo } from 'react';
import type { GaleriItem, MediaTipe } from '../types.js';
import {
  extractYouTubeId,
  getMediaThumbnail,
  compressImageFile,
  KATEGORI_GALERI
} from '../utils/mediaHelpers.js';
import { saveGaleriItem, deleteGaleriItem, deleteBatchGaleriItems, logAudit } from '../services/db.js';
import { MediaViewerModal } from './MediaViewerModal.js';
import { useAuth } from '../context/AuthContext.js';

interface AdminGaleriViewProps {
  galeri: GaleriItem[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshData: () => Promise<void>;
}

export const AdminGaleriView: React.FC<AdminGaleriViewProps> = ({
  galeri,
  showToast,
  onRefreshData
}) => {
  const { userProfile } = useAuth();

  // Mode Tampilan: 'table' atau 'grid'
  const [displayMode, setDisplayMode] = useState<'table' | 'grid'>('table');

  // Modal Tambah Media Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Modal Edit Media
  const [editingItem, setEditingItem] = useState<GaleriItem | null>(null);

  // Modal Konfirmasi Hapus (Single & Batch)
  const [deleteTargetItem, setDeleteTargetItem] = useState<GaleriItem | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState<boolean>(false);

  // Multi-selection untuk aksi massal
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter & Search
  const [filterTipe, setFilterTipe] = useState<'all' | 'foto' | 'video'>('all');
  const [filterKategori, setFilterKategori] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'publik' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State (digunakan untuk Tambah dan Edit)
  const [formTipe, setFormTipe] = useState<MediaTipe>('foto');
  const [formJudul, setFormJudul] = useState<string>('');
  const [formKategori, setFormKategori] = useState<string>('Kegiatan BKK');
  const [formCustomKategori, setFormCustomKategori] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formDeskripsi, setFormDeskripsi] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'publik' | 'draft'>('publik');
  const [formIsFeatured, setFormIsFeatured] = useState<boolean>(false);

  // Upload Foto State
  const [uploadSource, setUploadSource] = useState<'file' | 'url'>('file');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [compressInfo, setCompressInfo] = useState<string | null>(null);

  // Loading indicator untuk proses penyimpanan / penghapusan
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal Preview (Lightbox / Video Player)
  const [previewItem, setPreviewItem] = useState<GaleriItem | null>(null);

  // Reset form ke nilai awal
  const resetFormState = () => {
    setFormTipe('foto');
    setFormJudul('');
    setFormKategori('Kegiatan BKK');
    setFormCustomKategori('');
    setFormTanggal(new Date().toISOString().slice(0, 10));
    setFormDeskripsi('');
    setFormUrl('');
    setFormThumbnailUrl('');
    setFormStatus('publik');
    setFormIsFeatured(false);
    setUploadSource('file');
    setCompressInfo(null);
  };

  // Buka Modal Tambah
  const handleOpenAddModal = () => {
    resetFormState();
    setIsAddModalOpen(true);
  };

  // Buka Modal Edit dengan mengisi form secara lengkap
  const handleOpenEditModal = (item: GaleriItem) => {
    setEditingItem(item);
    setFormTipe(item.tipe);
    setFormJudul(item.judul);
    if (KATEGORI_GALERI.includes(item.kategori)) {
      setFormKategori(item.kategori);
      setFormCustomKategori('');
    } else {
      setFormKategori('Lainnya');
      setFormCustomKategori(item.kategori);
    }
    setFormTanggal(item.tanggal || new Date().toISOString().slice(0, 10));
    setFormDeskripsi(item.deskripsi || '');
    setFormUrl(item.url || '');
    setFormThumbnailUrl(item.thumbnailUrl || '');
    setFormStatus(item.status);
    setFormIsFeatured(item.isFeatured || false);
    setUploadSource(item.url.startsWith('data:') ? 'file' : 'url');
    setCompressInfo(null);
  };

  // Tutup Modal Form (Tambah / Edit)
  const handleCloseFormModal = () => {
    setIsAddModalOpen(false);
    setEditingItem(null);
    resetFormState();
  };

  // Upload foto lokal via HTML5 Canvas Compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar (JPG, PNG, WebP)!', 'error');
      return;
    }

    try {
      setIsCompressing(true);
      const res = await compressImageFile(file, 1280, 960, 0.82);
      setFormUrl(res.dataUrl);
      const origKb = Math.round(res.originalSize / 1024);
      const compKb = Math.round(res.compressedSize / 1024);
      setCompressInfo(`Foto dioptimalkan: ${origKb} KB ➜ ${compKb} KB`);
      showToast(`Gambar berhasil dioptimalkan (${compKb} KB)`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses gambar.', 'error');
    } finally {
      setIsCompressing(false);
    }
  };

  // Eksekusi Simpan Data (Create / Update)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formJudul.trim()) {
      showToast('Judul media dokumentasi wajib diisi!', 'error');
      return;
    }

    if (!formUrl.trim()) {
      showToast(formTipe === 'foto' ? 'Harap unggah atau masukkan URL foto!' : 'Harap masukkan URL video!', 'error');
      return;
    }

    const finalKategori = formKategori === 'Lainnya' && formCustomKategori.trim()
      ? formCustomKategori.trim()
      : formKategori;

    setIsSubmitting(true);
    try {
      let youtubeId: string | undefined = undefined;
      let finalThumb = formThumbnailUrl.trim() || undefined;

      if (formTipe === 'video') {
        const yId = extractYouTubeId(formUrl);
        if (yId) {
          youtubeId = yId;
          if (!finalThumb) {
            finalThumb = `https://img.youtube.com/vi/${yId}/hqdefault.jpg`;
          }
        }
      }

      const id = editingItem ? editingItem.id : 'gal_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const itemToSave: GaleriItem = {
        id,
        tipe: formTipe,
        judul: formJudul.trim(),
        deskripsi: formDeskripsi.trim() || undefined,
        kategori: finalKategori,
        tanggal: formTanggal,
        url: formUrl.trim(),
        thumbnailUrl: finalThumb,
        youtubeId,
        status: formStatus,
        isFeatured: formIsFeatured,
        dibuatOleh: userProfile?.name || 'Administrator BKK',
        createdAt: editingItem?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveGaleriItem(itemToSave);
      await logAudit(
        editingItem ? `UPDATE_GALERI: ${itemToSave.judul}` : `CREATE_GALERI: ${itemToSave.judul}`,
        'GALERI_MEDIA',
        itemToSave.id,
        userProfile
      );

      await onRefreshData();
      showToast(
        editingItem
          ? `Media "${itemToSave.judul}" berhasil diperbarui!`
          : `Media "${itemToSave.judul}" berhasil ditambahkan ke galeri!`,
        'success'
      );
      handleCloseFormModal();
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan media: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eksekusi Hapus Satu Media
  const handleConfirmSingleDelete = async () => {
    if (!deleteTargetItem) return;
    setIsSubmitting(true);
    try {
      await deleteGaleriItem(deleteTargetItem.id);
      await logAudit(`DELETE_GALERI: ${deleteTargetItem.judul}`, 'GALERI_MEDIA', deleteTargetItem.id, userProfile);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTargetItem.id));
      await onRefreshData();
      showToast(`Media "${deleteTargetItem.judul}" berhasil dihapus dari sistem.`, 'success');
      setDeleteTargetItem(null);
    } catch (err) {
      showToast('Gagal menghapus: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eksekusi Hapus Massal (Batch Delete)
  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await deleteBatchGaleriItems(selectedIds);
      await logAudit(`DELETE_BATCH_GALERI: ${selectedIds.length} item`, 'GALERI_MEDIA', 'batch', userProfile);
      await onRefreshData();
      showToast(`Sebanyak ${selectedIds.length} media berhasil dihapus permanen!`, 'success');
      setSelectedIds([]);
      setIsBatchDeleteModalOpen(false);
    } catch (err) {
      showToast('Gagal menghapus massal: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Toggle Status Publik <-> Draft
  const handleToggleStatus = async (item: GaleriItem) => {
    const newStatus = item.status === 'publik' ? 'draft' : 'publik';
    try {
      const updated: GaleriItem = { ...item, status: newStatus, updatedAt: new Date().toISOString() };
      await saveGaleriItem(updated);
      await onRefreshData();
      showToast(
        newStatus === 'publik'
          ? `"${item.judul}" kini TAMPIL ke publik!`
          : `"${item.judul}" berhasil DISEMBUNYIKAN (Draft).`,
        'info'
      );
    } catch (err) {
      showToast('Gagal mengubah status: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  // Quick Toggle Featured
  const handleToggleFeatured = async (item: GaleriItem) => {
    try {
      const updated: GaleriItem = { ...item, isFeatured: !item.isFeatured, updatedAt: new Date().toISOString() };
      await saveGaleriItem(updated);
      await onRefreshData();
      showToast(
        !item.isFeatured
          ? `"${item.judul}" kini featured di Beranda!`
          : `"${item.judul}" dilepas dari featured.`,
        'info'
      );
    } catch (err) {
      showToast('Gagal memperbarui status featured: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  // Checkbox Selection
  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredGaleri.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredGaleri.map((g) => g.id));
    }
  };

  // Batch Status Change
  const handleBatchSetStatus = async (status: 'publik' | 'draft') => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      for (const id of selectedIds) {
        const item = galeri.find((g) => g.id === id);
        if (item) {
          await saveGaleriItem({ ...item, status, updatedAt: new Date().toISOString() });
        }
      }
      await onRefreshData();
      showToast(`${selectedIds.length} media berhasil diubah menjadi ${status === 'publik' ? 'Publik' : 'Draft'}!`, 'success');
      setSelectedIds([]);
    } catch (err) {
      showToast('Gagal mengubah status massal.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered List
  const filteredGaleri = useMemo(() => {
    return galeri.filter((item) => {
      if (filterTipe !== 'all' && item.tipe !== filterTipe) return false;
      if (filterKategori !== 'all' && item.kategori !== filterKategori) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.judul.toLowerCase().includes(q);
        const matchDesc = (item.deskripsi || '').toLowerCase().includes(q);
        const matchKat = item.kategori.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchKat) return false;
      }
      return true;
    });
  }, [galeri, filterTipe, filterKategori, filterStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = galeri.length;
    const foto = galeri.filter((g) => g.tipe === 'foto').length;
    const video = galeri.filter((g) => g.tipe === 'video').length;
    const publik = galeri.filter((g) => g.status === 'publik').length;
    const draft = galeri.filter((g) => g.status === 'draft').length;
    const featured = galeri.filter((g) => g.isFeatured).length;
    return { total, foto, video, publik, draft, featured };
  }, [galeri]);

  const detectedYouTubeId = useMemo(() => {
    if (formTipe === 'video' && formUrl) {
      return extractYouTubeId(formUrl);
    }
    return null;
  }, [formTipe, formUrl]);

  return (
    <div className="admin-page-container" style={{ paddingBottom: '70px' }}>
      {/* Header Halaman & Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
          background: '#ffffff',
          padding: '20px 24px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🖼️</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                Kelola Galeri Foto & Video
              </h1>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                Kelola dokumentasi visual kegiatan BKK: Tambah, Pratinjau, <strong>Edit</strong> data, dan <strong>Hapus</strong> media publik.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Switch Table vs Grid */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setDisplayMode('table')}
              style={{
                border: 'none',
                background: displayMode === 'table' ? '#ffffff' : 'transparent',
                color: displayMode === 'table' ? '#0f172a' : '#64748b',
                fontWeight: 600,
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: displayMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              ☰ Tabel
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('grid')}
              style={{
                border: 'none',
                background: displayMode === 'grid' ? '#ffffff' : 'transparent',
                color: displayMode === 'grid' ? '#0f172a' : '#64748b',
                fontWeight: 600,
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: displayMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              ⊞ Kartu Grid
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontWeight: 700 }}
          >
            <span>➕</span> Tambah Media Baru
          </button>
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Media</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{stats.total}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{stats.foto} foto · {stats.video} video</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>📷 Foto Dokumentasi</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>{stats.foto}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Bursa kerja & industri</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>🎬 Video Kegiatan</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>{stats.video}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>YouTube & liputan BKK</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>🌐 Status Publik</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>{stats.publik}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{stats.draft} tersimpan draft</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>⭐ Featured Beranda</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>{stats.featured}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Sorotan halaman utama</div>
        </div>
      </div>

      {/* Floating Toolbar Aksi Massal (Muncul jika ada item yang dicentang) */}
      {selectedIds.length > 0 && (
        <div
          style={{
            position: 'sticky',
            top: '75px',
            zIndex: 90,
            background: '#0f172a',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '12px 20px',
            marginBottom: '16px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>☑️</span>
            <strong>{selectedIds.length} media dipilih</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleBatchSetStatus('publik')}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🌐 Jadikan Publik
            </button>
            <button
              type="button"
              onClick={() => handleBatchSetStatus('draft')}
              style={{
                background: '#ca8a04',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🔒 Jadikan Draft
            </button>
            <button
              type="button"
              onClick={() => setIsBatchDeleteModalOpen(true)}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🗑️</span> Hapus yang Dipilih ({selectedIds.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ✕ Batal
            </button>
          </div>
        </div>
      )}

      {/* FILTER & DAFTAR MEDIA */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        {/* Toolbar Filter & Pencarian */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          {/* Tab Filter Tipe */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${filterTipe === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilterTipe('all')}
            >
              Semua ({galeri.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterTipe === 'foto' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilterTipe('foto')}
            >
              📷 Foto ({stats.foto})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterTipe === 'video' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilterTipe('video')}
            >
              🎬 Video ({stats.video})
            </button>
          </div>

          {/* Filter Kategori, Status & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              style={{ fontSize: '12.5px', padding: '6px 10px', borderRadius: '6px' }}
            >
              <option value="all">Semua Kategori</option>
              {KATEGORI_GALERI.map((kat) => (
                <option key={kat} value={kat}>{kat}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              style={{ fontSize: '12.5px', padding: '6px 10px', borderRadius: '6px' }}
            >
              <option value="all">Semua Status</option>
              <option value="publik">Publik Saja</option>
              <option value="draft">Disembunyikan / Draft</option>
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul media..."
              style={{ fontSize: '12.5px', padding: '6px 12px', width: '180px', borderRadius: '6px' }}
            />
          </div>
        </div>

        {/* Konten Media (Tabel atau Grid) */}
        {filteredGaleri.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <span style={{ fontSize: '42px', display: 'block', marginBottom: '8px' }}>📂</span>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#1e293b' }}>Tidak ada media yang cocok</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px' }}>
              {searchQuery || filterTipe !== 'all' || filterKategori !== 'all'
                ? 'Sesuaikan kata kunci pencarian atau reset filter di atas.'
                : 'Belum ada foto atau video dalam galeri. Klik tombol "Tambah Media Baru" di atas.'}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAddModal}
            >
              ➕ Tambah Media Baru
            </button>
          </div>
        ) : displayMode === 'table' ? (
          /* TAMPILAN TABEL RINCI DENGAN TOMBOL EDIT & HAPUS JELAS */
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                  <th style={{ padding: '12px 14px', width: '36px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredGaleri.length}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer' }}
                      title="Pilih semua media"
                    />
                  </th>
                  <th style={{ padding: '12px 14px', width: '85px' }}>Thumbnail</th>
                  <th style={{ padding: '12px 14px' }}>Judul & Deskripsi</th>
                  <th style={{ padding: '12px 14px', width: '135px' }}>Kategori</th>
                  <th style={{ padding: '12px 14px', width: '105px' }}>Tanggal</th>
                  <th style={{ padding: '12px 14px', width: '115px' }}>Status Publik</th>
                  <th style={{ padding: '12px 14px', width: '85px', textAlign: 'center' }}>Featured</th>
                  <th style={{ padding: '12px 14px', width: '210px', textAlign: 'center' }}>Aksi Kelola (CRUD)</th>
                </tr>
              </thead>
              <tbody>
                {filteredGaleri.map((item) => {
                  const thumb = getMediaThumbnail(item.tipe, item.url, item.thumbnailUrl, item.youtubeId);
                  const isChecked = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        fontSize: '13px',
                        backgroundColor: isChecked ? 'rgba(37, 99, 235, 0.04)' : undefined
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(item.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Thumbnail Preview */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <div
                          onClick={() => setPreviewItem(item)}
                          style={{
                            position: 'relative',
                            width: '76px',
                            height: '50px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            backgroundColor: '#0f172a',
                            border: '1px solid #e2e8f0',
                            flexShrink: 0
                          }}
                          title="Klik untuk membuka pratinjau media"
                        >
                          <img
                            src={thumb}
                            alt={item.judul}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {item.tipe === 'video' && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0, 0, 0, 0.4)'
                              }}
                            >
                              <span style={{ color: '#fff', fontSize: '15px' }}>▶</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Judul & Detail */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: item.tipe === 'video' ? '#fef2f2' : '#eff6ff',
                              color: item.tipe === 'video' ? '#dc2626' : '#2563eb'
                            }}
                          >
                            {item.tipe === 'video' ? '🎬 Video' : '📷 Foto'}
                          </span>
                          <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>
                            {item.judul}
                          </strong>
                        </div>
                        {item.deskripsi && (
                          <div style={{ color: '#64748b', fontSize: '12px', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.deskripsi}
                          </div>
                        )}
                      </td>

                      {/* Kategori */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontSize: '12px',
                            fontWeight: 500
                          }}
                        >
                          {item.kategori}
                        </span>
                      </td>

                      {/* Tanggal */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: '#64748b', fontSize: '12px' }}>
                        {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>

                      {/* Toggle Status Publik */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: item.status === 'publik' ? '#dcfce7' : '#fef9c3',
                            color: item.status === 'publik' ? '#15803d' : '#854d0e'
                          }}
                          title="Klik untuk ubah visibilitas publik"
                        >
                          <span>{item.status === 'publik' ? '● Publik' : '○ Draft'}</span>
                        </button>
                      </td>

                      {/* Toggle Featured */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(item)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: item.isFeatured ? '#f59e0b' : '#cbd5e1'
                          }}
                          title={item.isFeatured ? 'Featured di Beranda (Klik untuk batalkan)' : 'Bukan featured (Klik untuk jadikan featured)'}
                        >
                          {item.isFeatured ? '★' : '☆'}
                        </button>
                      </td>

                      {/* TOMBOL AKSI CRUD YANG JELAS & EKSPLISIT */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Tombol Pratinjau */}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setPreviewItem(item)}
                            title="Pratinjau tampilan publik"
                            style={{ padding: '5px 8px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            <span>👁️</span>
                          </button>

                          {/* Tombol Edit Eksplisit */}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => handleOpenEditModal(item)}
                            title="Ubah data media ini"
                            style={{
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#1d4ed8',
                              borderColor: '#93c5fd',
                              backgroundColor: '#eff6ff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>✏️</span> Edit
                          </button>

                          {/* Tombol Hapus Eksplisit */}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setDeleteTargetItem(item)}
                            title="Hapus media ini secara permanen"
                            style={{
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#dc2626',
                              borderColor: '#fca5a5',
                              backgroundColor: '#fef2f2',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>🗑️</span> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAMPILAN GRID KARTU VISUAL DENGAN TOMBOL EDIT & HAPUS JELAS */
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredGaleri.map((item) => {
              const thumb = getMediaThumbnail(item.tipe, item.url, item.thumbnailUrl, item.youtubeId);
              const isChecked = selectedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: isChecked ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}
                >
                  {/* Checkbox di Sudut Kiri Thumbnail */}
                  <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSelectOne(item.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
                    />
                  </div>

                  {/* Thumbnail */}
                  <div
                    onClick={() => setPreviewItem(item)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      paddingBottom: '56%',
                      backgroundColor: '#0f172a',
                      cursor: 'pointer',
                      overflow: 'hidden'
                    }}
                    title="Klik untuk membuka pratinjau"
                  >
                    <img
                      src={thumb}
                      alt={item.judul}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />

                    {/* Badge Tipe */}
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: item.tipe === 'video' ? '#dc2626' : '#2563eb',
                          color: '#ffffff'
                        }}
                      >
                        {item.tipe === 'video' ? '🎬 VIDEO' : '📷 FOTO'}
                      </span>
                    </div>

                    {item.tipe === 'video' && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(220, 38, 38, 0.9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', paddingLeft: '3px' }}>
                          ▶
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Konten & Info */}
                  <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11.5px', color: '#0284c7', fontWeight: 600, background: '#e0f2fe', padding: '2px 7px', borderRadius: '4px' }}>
                        {item.kategori}
                      </span>
                      <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                        {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                      {item.judul}
                    </h4>

                    {item.deskripsi && (
                      <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.deskripsi}
                      </p>
                    )}

                    {/* Status & Featured Row */}
                    <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: item.status === 'publik' ? '#dcfce7' : '#fef9c3',
                          color: item.status === 'publik' ? '#15803d' : '#854d0e'
                        }}
                      >
                        {item.status === 'publik' ? '● Publik' : '○ Draft'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '18px',
                          cursor: 'pointer',
                          color: item.isFeatured ? '#f59e0b' : '#cbd5e1'
                        }}
                        title={item.isFeatured ? 'Featured di Beranda' : 'Jadikan Featured'}
                      >
                        {item.isFeatured ? '★ Featured' : '☆ Not Featured'}
                      </button>
                    </div>

                    {/* DUA TOMBOL AKSI CRUD JELAS DI BAWAH KARTU */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => handleOpenEditModal(item)}
                        style={{
                          padding: '6px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#1d4ed8',
                          borderColor: '#93c5fd',
                          backgroundColor: '#eff6ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>✏️</span> Edit Data
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setDeleteTargetItem(item)}
                        style={{
                          padding: '6px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#dc2626',
                          borderColor: '#fca5a5',
                          backgroundColor: '#fef2f2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>🗑️</span> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL TAMBAH & EDIT MEDIA (CRUD MODAL) ================= */}
      {(isAddModalOpen || editingItem) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={handleCloseFormModal}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal Form */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{editingItem ? '✏️' : '➕'}</span>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                  {editingItem ? `Edit Media: "${editingItem.judul}"` : 'Tambah Foto atau Video Baru ke Galeri'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseFormModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSaveForm} style={{ padding: '24px' }}>
              {/* Tipe Media Toggle */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Pilih Format Media:
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: formTipe === 'foto' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: formTipe === 'foto' ? '#eff6ff' : '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="formMediaTipe"
                      checked={formTipe === 'foto'}
                      onChange={() => {
                        setFormTipe('foto');
                        if (formUrl.includes('youtube') || formUrl.includes('youtu.be')) setFormUrl('');
                      }}
                      style={{ accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: formTipe === 'foto' ? '#1d4ed8' : '#334155', fontSize: '13.5px' }}>
                        📷 Foto Dokumentasi
                      </div>
                      <small style={{ color: '#64748b' }}>Unggah file gambar atau URL foto</small>
                    </div>
                  </label>

                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: formTipe === 'video' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      background: formTipe === 'video' ? '#fef2f2' : '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="formMediaTipe"
                      checked={formTipe === 'video'}
                      onChange={() => setFormTipe('video')}
                      style={{ accentColor: '#dc2626' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: formTipe === 'video' ? '#b91c1c' : '#334155', fontSize: '13.5px' }}>
                        🎬 Video Kegiatan / Profil
                      </div>
                      <small style={{ color: '#64748b' }}>Tautan YouTube / Vimeo / MP4</small>
                    </div>
                  </label>
                </div>
              </div>

              {/* Judul & Kategori */}
              <div className="row-2">
                <div className="field">
                  <label>Judul Media Kegiatan <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    required
                    value={formJudul}
                    onChange={(e) => setFormJudul(e.target.value)}
                    placeholder={formTipe === 'foto' ? 'Contoh: Job Fair Akbar SMK PGRI 1 Taman' : 'Contoh: Video Profil Layanan BKK'}
                  />
                </div>

                <div className="field">
                  <label>Kategori Kegiatan</label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                  >
                    {KATEGORI_GALERI.map((kat) => (
                      <option key={kat} value={kat}>{kat}</option>
                    ))}
                  </select>
                  {formKategori === 'Lainnya' && (
                    <input
                      style={{ marginTop: '8px' }}
                      value={formCustomKategori}
                      onChange={(e) => setFormCustomKategori(e.target.value)}
                      placeholder="Ketik kategori kegiatan lainnya..."
                    />
                  )}
                </div>
              </div>

              {/* Tanggal & Deskripsi */}
              <div className="row-2">
                <div className="field">
                  <label>Tanggal Kegiatan</label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Deskripsi / Keterangan</label>
                  <textarea
                    rows={2}
                    value={formDeskripsi}
                    onChange={(e) => setFormDeskripsi(e.target.value)}
                    placeholder="Tuliskan keterangan singkat seputar kegiatan ini..."
                  />
                </div>
              </div>

              {/* Input Spesifik FOTO */}
              {formTipe === 'foto' && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '18px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="uploadSourceChoice"
                        checked={uploadSource === 'file'}
                        onChange={() => setUploadSource('file')}
                      />
                      📁 Unggah Foto dari Perangkat (Auto-Kompresi)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="uploadSourceChoice"
                        checked={uploadSource === 'url'}
                        onChange={() => setUploadSource('url')}
                      />
                      🔗 Input URL Gambar
                    </label>
                  </div>

                  {uploadSource === 'file' ? (
                    <div>
                      <label
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '20px',
                          border: '2px dashed #94a3b8',
                          borderRadius: '10px',
                          background: '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <span style={{ fontSize: '28px', marginBottom: '6px' }}>📸</span>
                        <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>
                          {isCompressing ? 'Sedang memproses & mengompres foto...' : 'Klik untuk memilih foto baru dari komputer / ponsel'}
                        </strong>
                        <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          JPG, PNG, WebP. Resolusi disesuaikan otomatis agar ringan dan tajam.
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg, image/png, image/webp"
                          onChange={handlePhotoUpload}
                          disabled={isCompressing}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {compressInfo && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                          ✓ {compressInfo}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        placeholder="https://example.com/foto-kegiatan.jpg"
                      />
                    </div>
                  )}

                  {/* Pratinjau Foto Terpilih */}
                  {formUrl && (
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '14px', background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ width: '100px', height: '65px', borderRadius: '6px', overflow: 'hidden', background: '#000' }}>
                        <img src={formUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#15803d', display: 'block' }}>✓ Foto Siap Digunakan</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          style={{ marginTop: '4px', fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => {
                            setFormUrl('');
                            setCompressInfo(null);
                          }}
                        >
                          ✕ Hapus / Ganti Foto
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Input Spesifik VIDEO */}
              {formTipe === 'video' && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '18px'
                  }}
                >
                  <div className="field">
                    <label>URL Video YouTube / Vimeo / File MP4 <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      required
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                    />
                    <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
                      Sistem otomatis mendeteksi ID YouTube dan menyiapkan thumbnail resolusi tinggi otomatis.
                    </small>
                  </div>

                  <div className="field" style={{ marginTop: '10px' }}>
                    <label>URL Thumbnail Video Kustom (Opsional)</label>
                    <input
                      value={formThumbnailUrl}
                      onChange={(e) => setFormThumbnailUrl(e.target.value)}
                      placeholder="Kosongkan jika ingin menggunakan cover otomatis dari YouTube"
                    />
                  </div>

                  {/* Preview YouTube */}
                  {detectedYouTubeId && (
                    <div style={{ marginTop: '12px', padding: '10px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ position: 'relative', width: '120px', height: '70px', borderRadius: '6px', overflow: 'hidden' }}>
                        <img
                          src={`https://img.youtube.com/vi/${detectedYouTubeId}/hqdefault.jpg`}
                          alt="Cover"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                          <span style={{ fontSize: '18px', color: '#fff' }}>▶</span>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#dc2626' }}>✓ YouTube Terdeteksi (ID: {detectedYouTubeId})</span>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                          Video siap diputar langsung di website oleh pengunjung.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status Publik & Featured */}
              <div
                style={{
                  display: 'flex',
                  gap: '20px',
                  flexWrap: 'wrap',
                  padding: '12px 16px',
                  background: '#f1f5f9',
                  borderRadius: '10px',
                  marginBottom: '20px'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={formStatus === 'publik'}
                    onChange={(e) => setFormStatus(e.target.checked ? 'publik' : 'draft')}
                    style={{ width: '17px', height: '17px', accentColor: '#16a34a' }}
                  />
                  <span>🌐 Tampilkan ke Publik (Status: {formStatus === 'publik' ? 'Publik' : 'Draft / Disembunyikan'})</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    style={{ width: '17px', height: '17px', accentColor: '#d97706' }}
                  />
                  <span>⭐ Tampilkan di Showcase Beranda (Featured)</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCloseFormModal}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || isCompressing}
                  style={{ padding: '10px 24px', fontWeight: 700 }}
                >
                  {isSubmitting
                    ? 'Menyimpan ke Database...'
                    : editingItem
                    ? '💾 Simpan Perubahan Media'
                    : '🚀 Terbitkan Media Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL KONFIRMASI HAPUS SATU MEDIA ================= */}
      {deleteTargetItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setDeleteTargetItem(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '8px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', textAlign: 'center', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Hapus Media dari Galeri?
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', textAlign: 'center', lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus media berikut ini secara permanen dari galeri publik?
            </p>

            {/* Kartu Ringkasan Media yang akan dihapus */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                padding: '12px',
                background: '#fef2f2',
                borderRadius: '10px',
                border: '1px solid #fecaca',
                marginBottom: '20px'
              }}
            >
              <div style={{ width: '70px', height: '50px', borderRadius: '6px', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                <img
                  src={getMediaThumbnail(deleteTargetItem.tipe, deleteTargetItem.url, deleteTargetItem.thumbnailUrl, deleteTargetItem.youtubeId)}
                  alt="Thumb"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {deleteTargetItem.judul}
                </strong>
                <span style={{ fontSize: '11.5px', color: '#dc2626' }}>
                  {deleteTargetItem.tipe === 'video' ? '🎬 Video' : '📷 Foto'} · {deleteTargetItem.kategori}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeleteTargetItem(null)}
                disabled={isSubmitting}
                style={{ flex: 1 }}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', flex: 1, fontWeight: 700 }}
                onClick={handleConfirmSingleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus Media'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL KONFIRMASI HAPUS MASSAL ================= */}
      {isBatchDeleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setIsBatchDeleteModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '8px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', textAlign: 'center', fontSize: '18px', fontWeight: 800, color: '#dc2626' }}>
              Hapus {selectedIds.length} Media Terpilih?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', textAlign: 'center', lineHeight: 1.5 }}>
              Tindakan ini akan menghapus <strong>{selectedIds.length} media sekaligus</strong> dari database dan galeri publik. Data yang dihapus tidak dapat dipulihkan kembali.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isSubmitting}
                style={{ flex: 1 }}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', flex: 1, fontWeight: 700 }}
                onClick={handleConfirmBatchDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menghapus...' : `Hapus ${selectedIds.length} Media`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL PREVIEW MEDIA ================= */}
      {previewItem && (
        <MediaViewerModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
};
