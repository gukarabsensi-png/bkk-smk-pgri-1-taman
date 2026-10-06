import React, { useState, useMemo } from 'react';
import type { GaleriItem, SiteSettings } from '../types.js';
import { getMediaThumbnail, KATEGORI_GALERI } from '../utils/mediaHelpers.js';
import { MediaViewerModal } from './MediaViewerModal.js';

interface PublicGaleriViewProps {
  galeri: GaleriItem[];
  settings: SiteSettings;
  onNavigate: (route: string) => void;
}

export const PublicGaleriView: React.FC<PublicGaleriViewProps> = ({
  galeri,
  settings,
  onNavigate
}) => {
  // Hanya tampilkan media yang berstatus 'publik'
  const publicItems = useMemo(() => {
    return galeri.filter((g) => g.status === 'publik');
  }, [galeri]);

  // Filter States
  const [filterTipe, setFilterTipe] = useState<'all' | 'foto' | 'video'>('all');
  const [selectedKategori, setSelectedKategori] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Viewer State
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // Available Categories from Existing Public Items
  const availableCategories = useMemo(() => {
    const list = publicItems.map((g) => g.kategori).filter(Boolean);
    const combined = Array.from(new Set([...KATEGORI_GALERI, ...list]));
    return combined;
  }, [publicItems]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return publicItems.filter((item) => {
      if (filterTipe !== 'all' && item.tipe !== filterTipe) return false;
      if (selectedKategori !== 'all' && item.kategori !== selectedKategori) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.judul.toLowerCase().includes(q);
        const matchDesc = (item.deskripsi || '').toLowerCase().includes(q);
        const matchKat = item.kategori.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchKat) return false;
      }
      return true;
    });
  }, [publicItems, filterTipe, selectedKategori, searchQuery]);

  const activeItem = activeItemIndex !== null ? filteredItems[activeItemIndex] : null;

  const countFoto = useMemo(() => publicItems.filter((g) => g.tipe === 'foto').length, [publicItems]);
  const countVideo = useMemo(() => publicItems.filter((g) => g.tipe === 'video').length, [publicItems]);

  return (
    <div className="wrap" style={{ paddingTop: '28px', paddingBottom: '70px' }}>
      {/* Header Banner Halaman */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
          borderRadius: '20px',
          padding: '40px 32px',
          color: '#ffffff',
          marginBottom: '32px',
          boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              marginBottom: '14px',
              backdropFilter: 'blur(4px)'
            }}
          >
            <span>📸</span> DOKUMENTASI VISUAL & KEGIATAN BKK
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.25 }}>
            Galeri Foto & Video Resmi
          </h1>
          <p style={{ fontSize: '15px', color: '#e0f2fe', margin: 0, lineHeight: 1.6 }}>
            Kumpulan dokumentasi kegiatan bursa kerja khusus, rekrutmen kampus bersama mitra industri, kunjungan industri, pelatihan kesiapan kerja, serta video profil resmi {settings.siteName || 'BKK SMK PGRI 1 Taman'}.
          </p>
        </div>

        {/* Decorative circle */}
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            bottom: '-60px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Filter Tipe & Pencarian */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
          backgroundColor: '#ffffff',
          padding: '16px 20px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {/* Tab Filter Tipe */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${filterTipe === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterTipe('all')}
            style={{ fontWeight: 600, borderRadius: '20px', padding: '6px 16px' }}
          >
            Semua Media ({publicItems.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filterTipe === 'foto' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterTipe('foto')}
            style={{ fontWeight: 600, borderRadius: '20px', padding: '6px 16px' }}
          >
            📷 Foto ({countFoto})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filterTipe === 'video' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterTipe('video')}
            style={{ fontWeight: 600, borderRadius: '20px', padding: '6px 16px' }}
          >
            🎬 Video ({countVideo})
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari dokumentasi kegiatan..."
            style={{
              width: '100%',
              padding: '8px 36px 8px 14px',
              fontSize: '13px',
              borderRadius: '20px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc'
            }}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ✕
            </button>
          ) : (
            <span
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '14px',
                pointerEvents: 'none'
              }}
            >
              🔍
            </span>
          )}
        </div>
      </div>

      {/* Pill Filter Kategori */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '28px',
          scrollbarWidth: 'thin'
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedKategori('all')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12.5px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            border: selectedKategori === 'all' ? '1px solid #2563eb' : '1px solid #e2e8f0',
            backgroundColor: selectedKategori === 'all' ? '#eff6ff' : '#ffffff',
            color: selectedKategori === 'all' ? '#1d4ed8' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Semua Kategori
        </button>

        {availableCategories.map((kat) => (
          <button
            key={kat}
            type="button"
            onClick={() => setSelectedKategori(kat)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12.5px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              border: selectedKategori === kat ? '1px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: selectedKategori === kat ? '#eff6ff' : '#ffffff',
              color: selectedKategori === kat ? '#1d4ed8' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {kat}
          </button>
        ))}
      </div>

      {/* Grid Kartu Media */}
      {filteredItems.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0'
          }}
        >
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>📷</span>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#0f172a' }}>
            Tidak ada foto atau video yang ditemukan
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#64748b', maxWidth: '420px', marginInline: 'auto' }}>
            {searchQuery || selectedKategori !== 'all' || filterTipe !== 'all'
              ? 'Silakan coba sesuaikan kata kunci pencarian atau pilih kategori yang berbeda.'
              : 'Belum ada dokumentasi yang dipublikasikan saat ini. Silakan kunjungi kembali nanti.'}
          </p>
          {(searchQuery || selectedKategori !== 'all' || filterTipe !== 'all') && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setFilterTipe('all');
                setSelectedKategori('all');
                setSearchQuery('');
              }}
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px'
          }}
        >
          {filteredItems.map((item, idx) => {
            const thumb = getMediaThumbnail(item.tipe, item.url, item.thumbnailUrl, item.youtubeId);
            const isVideo = item.tipe === 'video';

            return (
              <div
                key={item.id}
                onClick={() => setActiveItemIndex(idx)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px -6px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                }}
              >
                {/* Media Thumbnail Container */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '58%',
                    backgroundColor: '#090d16',
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={thumb}
                    alt={item.judul}
                    loading="lazy"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.3s ease'
                    }}
                  />

                  {/* Play Button Overlay untuk Video */}
                  {isVideo ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.38)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(220, 38, 38, 0.92)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '22px',
                          boxShadow: '0 8px 20px rgba(220, 38, 38, 0.45)',
                          paddingLeft: '4px'
                        }}
                      >
                        ▶
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0)',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <span
                        style={{
                          opacity: 0,
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          color: '#0f172a',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 700,
                          transform: 'scale(0.9)',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                        className="zoom-hover-badge"
                      >
                        🔍 Perbesar Foto
                      </span>
                    </div>
                  )}

                  {/* Badge Tipe di Sudut Kiri Atas */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: isVideo ? '#dc2626' : '#2563eb',
                        color: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.25)'
                      }}
                    >
                      {isVideo ? '🎬 VIDEO' : '📷 FOTO'}
                    </span>
                  </div>

                  {/* Badge Featured di Sudut Kanan Atas */}
                  {item.isFeatured && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#f59e0b',
                          color: '#ffffff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.25)'
                        }}
                      >
                        ⭐ Sorotan
                      </span>
                    </div>
                  )}
                </div>

                {/* Info & Caption Body */}
                <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#0284c7',
                        backgroundColor: '#e0f2fe',
                        padding: '3px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      {item.kategori}
                    </span>
                    {item.tanggal && (
                      <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                        📅 {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      margin: '0 0 8px',
                      fontSize: '16px',
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
                  </h3>

                  {item.deskripsi && (
                    <p
                      style={{
                        margin: '0 0 16px',
                        fontSize: '13px',
                        color: '#64748b',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {item.deskripsi}
                    </p>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: isVideo ? '#dc2626' : '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {isVideo ? 'Putar Video Langsung ▶' : 'Lihat Foto Penuh 🔍'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {item.dibuatOleh || 'BKK'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Lightbox & Video Player */}
      {activeItem && (
        <MediaViewerModal
          item={activeItem}
          onClose={() => setActiveItemIndex(null)}
          onNext={() => {
            if (activeItemIndex !== null && activeItemIndex < filteredItems.length - 1) {
              setActiveItemIndex(activeItemIndex + 1);
            }
          }}
          onPrev={() => {
            if (activeItemIndex !== null && activeItemIndex > 0) {
              setActiveItemIndex(activeItemIndex - 1);
            }
          }}
          hasNext={activeItemIndex !== null && activeItemIndex < filteredItems.length - 1}
          hasPrev={activeItemIndex !== null && activeItemIndex > 0}
        />
      )}
    </div>
  );
};
