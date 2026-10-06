import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import type { SiteSettings } from '../types.js';

interface NavigationProps {
  settings: SiteSettings;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  settings,
  currentRoute,
  onNavigate
}) => {
  const { currentUser, userProfile, pencariKerja, isAdmin, isCompany, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = [
    { route: '', label: 'Beranda' },
    { route: 'lowongan', label: 'Lowongan' },
    { route: 'perusahaan', label: 'Perusahaan' },
    { route: 'agenda', label: 'Agenda' },
    { route: 'pengumuman', label: 'Pengumuman' },
    { route: 'galeri', label: 'Galeri' },
    { route: 'tentang', label: 'Tentang' },
    { route: 'kontak', label: 'Kontak' }
  ];

  const getDashboardRoute = () => {
    if (isAdmin) return 'admin/dashboard';
    if (isCompany) return 'perusahaan-app/dashboard';
    return 'user/dashboard';
  };

  const isCurrentActive = (route: string) => {
    if (route === '') return currentRoute === '' || currentRoute === '/';
    return currentRoute.startsWith(route);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setLogoutModalOpen(false);
      onNavigate('');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="topbar">
      <div className="wrap topbar-inner">
        <div
          className="brand"
          onClick={() => onNavigate('')}
          style={{ cursor: 'pointer' }}
        >
          {settings.siteLogo ? (
            <img
              src={settings.siteLogo}
              alt="Logo BKK"
              style={{
                width: '38px',
                height: '38px',
                objectFit: 'contain',
                borderRadius: '8px',
                flexShrink: 0
              }}
            />
          ) : (
            <span className="mark">BKK</span>
          )}
          <span>
            {settings.siteName || 'BKK SMK PGRI 1 Taman'}
            <small>Bursa Kerja Khusus & Penempatan Alumni</small>
          </span>
        </div>

        <nav className="navlinks">
          {navItems.map((item) => (
            <button
              key={item.route}
              type="button"
              className={`navlink ${isCurrentActive(item.route) ? 'active' : ''}`}
              onClick={() => onNavigate(item.route)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="nav-cta">
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onNavigate(getDashboardRoute())}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {pencariKerja?.foto || userProfile?.photoURL ? (
                  <img
                    src={pencariKerja?.foto || userProfile?.photoURL}
                    alt="Foto Profil"
                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : null}
                <span>Panel {isAdmin ? 'Admin' : isCompany ? 'Perusahaan' : 'Alumni'}</span>
              </button>
              <button
                type="button"
                onClick={() => setLogoutModalOpen(true)}
                className="btn btn-primary btn-sm"
              >
                Keluar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="btn btn-outline btn-sm"
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="btn btn-primary btn-sm"
              >
                Daftar
              </button>
            </div>
          )}

          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu open">
          {navItems.map((item) => (
            <button
              key={item.route}
              type="button"
              className="navlink"
              onClick={() => {
                onNavigate(item.route);
                setMobileMenuOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
          {currentUser ? (
            <>
              <button
                type="button"
                className="navlink"
                onClick={() => {
                  onNavigate(getDashboardRoute());
                  setMobileMenuOpen(false);
                }}
              >
                Panel Dashboard
              </button>
              <button
                type="button"
                className="navlink"
                style={{ color: 'var(--danger)' }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLogoutModalOpen(true);
                }}
              >
                Keluar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="navlink"
                onClick={() => {
                  onNavigate('login');
                  setMobileMenuOpen(false);
                }}
              >
                Masuk
              </button>
              <button
                type="button"
                className="navlink"
                onClick={() => {
                  onNavigate('register');
                  setMobileMenuOpen(false);
                }}
              >
                Daftar Akun
              </button>
            </>
          )}
        </div>
      )}

      {/* Popup Konfirmasi Keluar (Logout) */}
      {logoutModalOpen && (
        <div
          className="modal-bg"
          onClick={() => !isLoggingOut && setLogoutModalOpen(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="modal"
            style={{ maxWidth: '440px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-head"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '14px',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🚪</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                  Konfirmasi Keluar
                </h3>
              </div>
              <button
                className="icon-btn"
                type="button"
                disabled={isLoggingOut}
                onClick={() => setLogoutModalOpen(false)}
                title="Tutup"
                style={{ fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ paddingTop: '18px' }}>
              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  lineHeight: 1.5
                }}
              >
                Apakah Anda Yakin ingin Keluar?
              </p>

              {currentUser && (
                <div
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'var(--primary-light, #e0f2fe)',
                      color: 'var(--primary, #0284c7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '15px',
                      flexShrink: 0
                    }}
                  >
                    {userProfile?.name?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {userProfile?.name || 'Pengguna'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentUser?.email || userProfile?.email || '-'}
                    </div>
                  </div>
                  <span className="tag blue" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                    {isAdmin ? 'Admin' : isCompany ? 'Perusahaan' : 'Alumni'}
                  </span>
                </div>
              )}

              <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Sesi login Anda saat ini akan diakhiri. Anda perlu masuk kembali menggunakan email atau akun Google untuk mengakses panel dashboard.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={isLoggingOut}
                  onClick={() => setLogoutModalOpen(false)}
                  style={{ minWidth: '85px' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    background: 'var(--danger, #ef4444)',
                    borderColor: 'var(--danger, #ef4444)',
                    minWidth: '105px'
                  }}
                  disabled={isLoggingOut}
                  onClick={handleConfirmLogout}
                >
                  {isLoggingOut ? 'Memproses...' : 'Ya, Keluar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
