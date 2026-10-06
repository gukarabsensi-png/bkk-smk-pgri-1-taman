import React, { useEffect } from 'react';
import type { GaleriItem } from '../types.js';
import { getEmbedVideoUrl, getMediaThumbnail } from '../utils/mediaHelpers.js';

interface MediaViewerModalProps {
  item: GaleriItem | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  item,
  onClose,
  onNext,
  onPrev,
  hasPrev,
  hasNext
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext && hasNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev && hasPrev) onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, hasNext, hasPrev]);

  if (!item) return null;

  const isVideo = item.tipe === 'video';
  const embedUrl = isVideo ? getEmbedVideoUrl(item.url, item.youtubeId, true) : '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      {/* Container Konten Modal */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isVideo ? '920px' : '980px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: isVideo ? '#fef2f2' : '#eff6ff',
                color: isVideo ? '#dc2626' : '#2563eb',
                border: `1px solid ${isVideo ? '#fecaca' : '#bfdbfe'}`
              }}
            >
              {isVideo ? '🎬 Video Kegiatan' : '📷 Foto Dokumentasi'}
            </span>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: '#f1f5f9',
                color: '#475569'
              }}
            >
              {item.kategori}
            </span>
            {item.tanggal && (
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                📅 {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isVideo && item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                download={`dokumentasi-bkk-${item.id}.jpg`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  textDecoration: 'none',
                  fontWeight: 500
                }}
                title="Buka atau Unduh Foto Ukuran Penuh"
              >
                📥 Unduh Foto
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '22px',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px 8px',
                lineHeight: 1,
                borderRadius: '6px'
              }}
              title="Tutup (ESC)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Media Frame (Video atau Foto) */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#090d16',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: isVideo ? '360px' : '400px',
            maxHeight: '68vh',
            overflow: 'hidden'
          }}
        >
          {isVideo ? (
            embedUrl.includes('youtube') || embedUrl.includes('vimeo') ? (
              <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={embedUrl}
                  title={item.judul}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                />
              </div>
            ) : (
              <video
                src={item.url}
                controls
                autoPlay
                style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain' }}
              />
            )
          ) : (
            <img
              src={item.url || getMediaThumbnail(item.tipe, item.url, item.thumbnailUrl)}
              alt={item.judul}
              style={{
                maxWidth: '100%',
                maxHeight: '68vh',
                objectFit: 'contain',
                userSelect: 'none'
              }}
            />
          )}

          {/* Navigasi Prev/Next */}
          {hasPrev && onPrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                color: '#0f172a',
                border: 'none',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: 10
              }}
              title="Sebelumnya (Panah Kiri)"
            >
              ‹
            </button>
          )}

          {hasNext && onNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                color: '#0f172a',
                border: 'none',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: 10
              }}
              title="Berikutnya (Panah Kanan)"
            >
              ›
            </button>
          )}
        </div>

        {/* Footer Info & Caption */}
        <div style={{ padding: '16px 20px', backgroundColor: '#ffffff', overflowY: 'auto', maxHeight: '18vh' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '17px', color: '#0f172a', fontWeight: 700 }}>
            {item.judul}
          </h3>
          {item.deskripsi && (
            <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>
              {item.deskripsi}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
