import React from 'react';
import type { SiteSettings } from '../types.js';

export const Footer: React.FC<{
  settings: SiteSettings;
  onNavigate: (route: string) => void;
}> = ({ settings, onNavigate }) => {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="brand" style={{ color: '#fff', marginBottom: '12px' }}>
              {settings.siteLogo ? (
                <img
                  src={settings.siteLogo}
                  alt="Logo"
                  style={{
                    width: '38px',
                    height: '38px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    background: '#ffffff',
                    padding: '2px',
                    flexShrink: 0
                  }}
                />
              ) : (
                <span className="mark">BKK</span>
              )}
              <span>{settings.siteName || 'BKK SMK PGRI 1 Taman'}</span>
            </div>
            <p style={{ color: '#B9CFE4', fontSize: '13.5px', maxWidth: '300px', lineHeight: 1.6 }}>
              Bursa Kerja Khusus (BKK) SMK PGRI 1 Taman, Pemalang, Jawa Tengah. Menghubungkan lulusan kompeten dengan
              Dunia Usaha & Dunia Industri (DUDI) melalui sistem rekrutmen terintegrasi.
            </p>
          </div>

          <div>
            <h4>Navigasi Utama</h4>
            <a href="#/lowongan" onClick={(e) => { e.preventDefault(); onNavigate('lowongan'); }}>
              Lowongan Kerja
            </a>
            <a href="#/perusahaan" onClick={(e) => { e.preventDefault(); onNavigate('perusahaan'); }}>
              Perusahaan Mitra
            </a>
            <a href="#/agenda" onClick={(e) => { e.preventDefault(); onNavigate('agenda'); }}>
              Agenda & Job Fair
            </a>
            <a href="#/pengumuman" onClick={(e) => { e.preventDefault(); onNavigate('pengumuman'); }}>
              Pengumuman Resmi
            </a>
            <a href="#/galeri" onClick={(e) => { e.preventDefault(); onNavigate('galeri'); }}>
              Galeri Foto & Video
            </a>
          </div>

          <div>
            <h4>Bantuan & Info</h4>
            <a href="#/tentang" onClick={(e) => { e.preventDefault(); onNavigate('tentang'); }}>
              Tentang BKK
            </a>
            <a href="#/faq" onClick={(e) => { e.preventDefault(); onNavigate('faq'); }}>
              Tanya Jawab (FAQ)
            </a>
            <a href="#/kontak" onClick={(e) => { e.preventDefault(); onNavigate('kontak'); }}>
              Kontak BKK
            </a>
            <a href="#/login" onClick={(e) => { e.preventDefault(); onNavigate('login'); }}>
              Masuk / Daftar Akun
            </a>
          </div>

          <div>
            <h4>Sekretariat BKK</h4>
            <p style={{ color: '#B9CFE4', fontSize: '13px', margin: '4px 0' }}>
              📍 {settings.siteAddress}
            </p>
            <p style={{ color: '#B9CFE4', fontSize: '13px', margin: '4px 0' }}>
              📞 {settings.sitePhone}
            </p>
            <p style={{ color: '#B9CFE4', fontSize: '13px', margin: '4px 0' }}>
              ✉️ {settings.siteEmail}
            </p>
          </div>
        </div>

        <div className="bottom">
          <span>
            © {new Date().getFullYear()} {settings.siteName || 'BKK SMK PGRI 1 Taman'}. Powered by Tim IT BKK Resi Karya.
          </span>
        </div>
      </div>
    </footer>
  );
};
