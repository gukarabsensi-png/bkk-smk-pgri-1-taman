import React, { useState, useEffect, useMemo } from 'react';
import { Agenda, Pengumuman, PencariKerja, SiteSettings } from '../types.js';
import { formatWhatsAppNumber, buildWhatsAppLink } from '../utils/formatters.js';
import {
  formatAgendaWAMessage,
  formatPengumumanWAMessage,
  sendViaWhatsAppGateway,
  sendViaWhatsAppGatewayBatch,
  checkWhatsAppGatewayStatus,
  WhatsAppBroadcastRecipient
} from '../services/whatsappBroadcast.js';

interface WhatsAppBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'agenda' | 'pengumuman';
  agenda?: Agenda | null;
  pengumuman?: Pengumuman | null;
  alumniList: PencariKerja[];
  settings: SiteSettings;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const WhatsAppBroadcastModal: React.FC<WhatsAppBroadcastModalProps> = ({
  isOpen,
  onClose,
  type,
  agenda,
  pengumuman,
  alumniList,
  settings,
  showToast
}) => {
  const [filterJurusan, setFilterJurusan] = useState<string>('all');
  const [filterTahun, setFilterTahun] = useState<string>('all');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isEditingMessage, setIsEditingMessage] = useState<boolean>(false);
  const [recipientsStatus, setRecipientsStatus] = useState<Record<string, 'ready' | 'sending' | 'sent' | 'failed'>>({});
  const [recipientErrors, setRecipientErrors] = useState<Record<string, string>>({});
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [autoQueueIndex, setAutoQueueIndex] = useState<number>(-1);
  const [copied, setCopied] = useState<boolean>(false);
  const [gatewayOnline, setGatewayOnline] = useState<boolean>(false);

  // Periksa status server WhatsApp Gateway saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;
    checkWhatsAppGatewayStatus().then((status) => {
      setGatewayOnline(status.online);
    });
  }, [isOpen]);

  // Generate default message when modal opens or item changes
  useEffect(() => {
    if (!isOpen) return;
    if (type === 'agenda' && agenda) {
      setCustomMessage(formatAgendaWAMessage(agenda, '{nama_alumni}', settings.siteName || 'BKK SMK PGRI 1 Taman'));
    } else if (type === 'pengumuman' && pengumuman) {
      setCustomMessage(formatPengumumanWAMessage(pengumuman, '{nama_alumni}', settings.siteName || 'BKK SMK PGRI 1 Taman'));
    }
    // Reset statuses
    setRecipientsStatus({});
    setRecipientErrors({});
    setIsBroadcasting(false);
    setAutoQueueIndex(-1);
  }, [isOpen, type, agenda, pengumuman, settings.siteName]);

  // Unique jurusan list
  const jurusanOptions = useMemo(() => {
    const list = alumniList.map((a) => a.jurusan).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [alumniList]);

  // Unique tahun lulus list
  const tahunOptions = useMemo(() => {
    const list = alumniList.map((a) => String(a.tahunLulus || '')).filter(Boolean);
    return Array.from(new Set(list)).sort().reverse();
  }, [alumniList]);

  // Filtered recipients
  const filteredAlumni = useMemo(() => {
    return alumniList.filter((a) => {
      if (filterJurusan !== 'all' && a.jurusan !== filterJurusan) return false;
      if (filterTahun !== 'all' && String(a.tahunLulus) !== filterTahun) return false;
      return true;
    });
  }, [alumniList, filterJurusan, filterTahun]);

  // Count alumni with valid WhatsApp numbers
  const validPhoneCount = useMemo(() => {
    return filteredAlumni.filter((a) => !!formatWhatsAppNumber(a.noHp)).length;
  }, [filteredAlumni]);

  if (!isOpen) return null;

  const title = type === 'agenda' ? agenda?.judul || 'Agenda BKK' : pengumuman?.judul || 'Pengumuman BKK';
  const hasGatewayConfig = !!(settings.waGatewayApiKey || settings.waGatewayUrl);

  // Handler to copy formatted message to clipboard
  const handleCopyMessage = () => {
    const sampleMsg = customMessage.replace('{nama_alumni}', 'Rekan Alumni');
    navigator.clipboard.writeText(sampleMsg);
    setCopied(true);
    showToast('Teks pesan siaran berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  // Helper to get formatted message for a specific alumnus
  const getMessageForAlumnus = (alumnusName: string) => {
    return customMessage.replace('{nama_alumni}', alumnusName || 'Alumni');
  };

  // Kirim manual 1 orang via WhatsApp Web / App
  const handleOpenWhatsAppChat = (alumnus: PencariKerja) => {
    const cleanPhone = formatWhatsAppNumber(alumnus.noHp);
    if (!cleanPhone) {
      showToast(`Nomor HP untuk ${alumnus.namaLengkap} tidak valid atau kosong`, 'error');
      return;
    }
    const text = getMessageForAlumnus(alumnus.namaLengkap);
    const link = buildWhatsAppLink(cleanPhone, text);
    window.open(link, '_blank');

    setRecipientsStatus((prev) => ({ ...prev, [alumnus.id]: 'sent' }));
    showToast(`Membuka WhatsApp untuk ${alumnus.namaLengkap}...`, 'info');
  };

  // Kirim via SMS
  const handleOpenSMS = (alumnus: PencariKerja) => {
    const cleanPhone = formatWhatsAppNumber(alumnus.noHp);
    if (!cleanPhone) {
      showToast(`Nomor HP untuk ${alumnus.namaLengkap} tidak valid`, 'error');
      return;
    }
    const text = encodeURIComponent(getMessageForAlumnus(alumnus.namaLengkap));
    window.open(`sms:${cleanPhone}?body=${text}`, '_blank');
    setRecipientsStatus((prev) => ({ ...prev, [alumnus.id]: 'sent' }));
  };

  // Kirim otomatis menggunakan WhatsApp Gateway API (Background 100% Otomatis)
  const handleBroadcastViaGateway = async () => {
    const targets = filteredAlumni.filter((a) => !!formatWhatsAppNumber(a.noHp));
    if (targets.length === 0) {
      showToast('Tidak ada alumni dengan nomor HP yang valid untuk disiarkan.', 'error');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastProgress({ current: 0, total: targets.length });
    let successCount = 0;
    let failCount = 0;

    showToast(`Memulai pengiriman background otomatis ke ${targets.length} nomor alumni...`, 'info');

    for (let i = 0; i < targets.length; i++) {
      const alumnus = targets[i];
      setRecipientsStatus((prev) => ({ ...prev, [alumnus.id]: 'sending' }));
      setBroadcastProgress({ current: i + 1, total: targets.length });

      const text = getMessageForAlumnus(alumnus.namaLengkap);
      const res = await sendViaWhatsAppGateway(
        alumnus.noHp,
        text,
        settings.waGatewayUrl,
        settings.waGatewayApiKey
      );

      if (res.success) {
        successCount++;
        setRecipientsStatus((prev) => ({ ...prev, [alumnus.id]: 'sent' }));
      } else {
        failCount++;
        setRecipientsStatus((prev) => ({ ...prev, [alumnus.id]: 'failed' }));
        setRecipientErrors((prev) => ({ ...prev, [alumnus.id]: res.message }));
      }

      // Delay teratur agar pengiriman stabil
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsBroadcasting(false);
    if (successCount > 0) {
      showToast(`Pengiriman background selesai! ${successCount} WhatsApp alumni berhasil tersampaikan otomatis.`, 'success');
    }
    if (failCount > 0) {
      showToast(`${failCount} pengiriman gagal via gateway. Cek pesan error pada daftar.`, 'error');
    }
  };

  // Antrean Otomatis Buka WhatsApp Web Berurutan
  const handleStartAutoQueue = () => {
    const targets = filteredAlumni.filter((a) => !!formatWhatsAppNumber(a.noHp));
    if (targets.length === 0) {
      showToast('Tidak ada alumni dengan nomor HP terdaftar.', 'error');
      return;
    }
    setAutoQueueIndex(0);
    showToast(`Antrean pengiriman dimulai (${targets.length} nomor). Klik "Kirim Selanjutnya" untuk tiap alumni.`, 'info');
  };

  const handleNextInQueue = () => {
    const targets = filteredAlumni.filter((a) => !!formatWhatsAppNumber(a.noHp));
    if (autoQueueIndex >= 0 && autoQueueIndex < targets.length) {
      const current = targets[autoQueueIndex];
      handleOpenWhatsAppChat(current);
      if (autoQueueIndex + 1 < targets.length) {
        setAutoQueueIndex(autoQueueIndex + 1);
      } else {
        setAutoQueueIndex(-1);
        showToast('Seluruh antrean siaran WhatsApp selesai dikirimkan!', 'success');
      }
    }
  };

  const handleStopQueue = () => {
    setAutoQueueIndex(-1);
    showToast('Antrean siaran dihentikan.', 'info');
  };

  const sentCount = Object.values(recipientsStatus).filter((s) => s === 'sent').length;

  return (
    <div className="modal-bg" style={{ zIndex: 9999 }} onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: '840px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '14px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#25D366',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)'
              }}
            >
              📲
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                  Pusat Siaran WhatsApp & No. HP Alumni
                </h2>
                <span className="badge badge-green" style={{ fontSize: '11px' }}>
                  Otomatisasi BKK
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Siarkan langsung {type === 'agenda' ? 'agenda & kegiatan karir' : 'pengumuman resmi'} ke nomor handphone alumni
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Info Box Target Konten */}
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <span
              className={`badge ${type === 'agenda' ? 'badge-blue' : 'badge-amber'}`}
              style={{ marginBottom: '4px', display: 'inline-block' }}
            >
              {type === 'agenda' ? '🗓️ Agenda Terbit' : '📢 Pengumuman Terbit'}
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
              {title}
            </div>
            {type === 'agenda' && agenda?.tanggalMulai && (
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                📍 {agenda.lokasi || 'SMK PGRI 1 Taman'} • ⏰ {new Date(agenda.tanggalMulai).toLocaleString('id-ID')}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sasaran Penerima:</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
              {validPhoneCount} / {filteredAlumni.length} Alumni Memiliki No. HP
            </div>
          </div>
        </div>

        {/* Filter Penerima */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '12px', fontWeight: 700 }}>Filter Jurusan Alumni:</label>
            <select
              value={filterJurusan}
              onChange={(e) => setFilterJurusan(e.target.value)}
              style={{ fontSize: '13px', padding: '8px 10px' }}
            >
              <option value="all">Semua Jurusan ({alumniList.length} alumni)</option>
              {jurusanOptions.map((j) => (
                <option key={j} value={j}>
                  {j} ({alumniList.filter((a) => a.jurusan === j).length} alumni)
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '12px', fontWeight: 700 }}>Filter Tahun Lulus / Angkatan:</label>
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              style={{ fontSize: '13px', padding: '8px 10px' }}
            >
              <option value="all">Semua Angkatan</option>
              {tahunOptions.map((t) => (
                <option key={t} value={t}>
                  Tahun Lulus {t} ({alumniList.filter((a) => String(a.tahunLulus) === t).length} alumni)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pratinjau Teks WhatsApp */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '18px',
            background: 'var(--card-bg)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
              💬 Format Pesan WhatsApp & SMS:
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ fontSize: '12px', padding: '4px 10px' }}
                onClick={() => setIsEditingMessage(!isEditingMessage)}
              >
                {isEditingMessage ? 'Selesai Edit' : '✏️ Kustomisasi Pesan'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ fontSize: '12px', padding: '4px 10px' }}
                onClick={handleCopyMessage}
              >
                {copied ? '✓ Tersalin!' : '📋 Salin Teks Format WA'}
              </button>
            </div>
          </div>

          {isEditingMessage ? (
            <div>
              <textarea
                rows={6}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '12.5px',
                  fontFamily: 'monospace',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)'
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Tip: Gunakan tag <code>{'{nama_alumni}'}</code> untuk menyisipkan nama lengkap alumni secara personal.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#e5ddd5',
                color: '#111b21',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                whiteSpace: 'pre-wrap',
                maxHeight: '160px',
                overflowY: 'auto',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                borderLeft: '4px solid #25D366',
                lineHeight: 1.5
              }}
            >
              {customMessage.replace('{nama_alumni}', 'Nama Alumni')}
            </div>
          )}
        </div>

        {/* Action Bar / Kontrol Siaran Massal */}
        <div
          style={{
            background: 'rgba(37, 211, 102, 0.08)',
            border: '1px solid rgba(37, 211, 102, 0.3)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '18px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#128C7E' }}>
                ⚡ Metode Pengiriman Siaran:
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {sentCount} dari {validPhoneCount} nomor telah terkirim
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {/* Opsi 1: Pengiriman Background Otomatis 100% via Gateway API */}
              <button
                type="button"
                className="btn btn-sm btn-primary"
                style={{ background: '#128C7E', borderColor: '#128C7E', color: '#fff', gap: '6px', fontWeight: 700 }}
                onClick={handleBroadcastViaGateway}
                disabled={isBroadcasting || validPhoneCount === 0}
              >
                {isBroadcasting ? (
                  <span>⏳ Mengirim Latar Belakang ({broadcastProgress.current}/{broadcastProgress.total})...</span>
                ) : (
                  <span>🚀 Kirim Otomatis via Gateway API ({validPhoneCount} Alumni)</span>
                )}
              </button>

              {/* Opsi 2: Antrean Berurutan WhatsApp Web */}
              {autoQueueIndex === -1 ? (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', gap: '6px' }}
                  onClick={handleStartAutoQueue}
                  disabled={isBroadcasting}
                >
                  ⏩ Antrean WhatsApp Web
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                    onClick={handleNextInQueue}
                  >
                    ➡️ Buka WA Berikutnya ({autoQueueIndex + 1}/{validPhoneCount})
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleStopQueue}
                  >
                    Hentikan
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Live Progress Bar saat Pengiriman Background Berjalan */}
          {isBroadcasting && (
            <div style={{ marginTop: '14px', background: '#fff', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(18, 140, 126, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#128C7E', marginBottom: '6px' }}>
                <span>⚡ Proses Pengiriman WhatsApp di Latar Belakang:</span>
                <span>{broadcastProgress.current} / {broadcastProgress.total} Alumni ({Math.round((broadcastProgress.current / (broadcastProgress.total || 1)) * 100)}%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(broadcastProgress.current / (broadcastProgress.total || 1)) * 100}%`,
                    height: '100%',
                    background: '#128C7E',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          )}

          {/* Status Gateway & Tips */}
          <div
            style={{
              marginTop: '10px',
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: gatewayOnline ? '#22c55e' : '#128C7E' }} />
              <span>
                <strong>Gateway Engine:</strong> {gatewayOnline ? 'Online (Express Server Proxy Aktif)' : 'Siap Kirim Otomatis di Latar Belakang'}
              </span>
            </div>
            <div>
              {hasGatewayConfig ? (
                <span className="badge badge-green" style={{ fontSize: '10.5px' }}>✓ Provider API Token Aktif</span>
              ) : (
                <span className="badge badge-blue" style={{ fontSize: '10.5px' }}>⚡ Auto Background Dispatcher Aktif</span>
              )}
            </div>
          </div>
        </div>

        {/* Daftar Alumni Penerima */}
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700 }}>
              Daftar Alumni Penerima ({filteredAlumni.length}):
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Klik tombol hijau untuk mengirim langsung ke kontak alumni
            </div>
          </div>

          <div
            className="overflow-x"
            style={{
              maxHeight: '280px',
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '8px'
            }}
          >
            <table style={{ margin: 0, fontSize: '12.5px' }}>
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>No</th>
                  <th>Nama Lengkap</th>
                  <th>Jurusan / Lulus</th>
                  <th>No. Handphone / WA</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center', width: '180px' }}>Aksi Kirim</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlumni.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      Tidak ada alumni yang sesuai dengan filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  filteredAlumni.map((a, idx) => {
                    const cleanPhone = formatWhatsAppNumber(a.noHp);
                    const status = recipientsStatus[a.id] || (cleanPhone ? 'ready' : 'failed');
                    const err = recipientErrors[a.id];

                    return (
                      <tr
                        key={a.id}
                        style={{
                          background:
                            autoQueueIndex >= 0 &&
                            filteredAlumni.filter((x) => !!formatWhatsAppNumber(x.noHp))[autoQueueIndex]?.id === a.id
                              ? 'rgba(37, 211, 102, 0.12)'
                              : undefined
                        }}
                      >
                        <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{a.namaLengkap}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                          {a.jurusan || '-'} ({a.tahunLulus || '-'})
                        </td>
                        <td>
                          {cleanPhone ? (
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#128C7E' }}>
                              +{cleanPhone}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--danger)', fontSize: '11px', fontStyle: 'italic' }}>
                              Belum ada No. HP
                            </span>
                          )}
                        </td>
                        <td>
                          {status === 'sent' && (
                            <span className="badge badge-green" style={{ fontSize: '11px' }}>
                              ✓ Terkirim
                            </span>
                          )}
                          {status === 'sending' && (
                            <span className="badge badge-amber" style={{ fontSize: '11px' }}>
                              ⏳ Mengirim...
                            </span>
                          )}
                          {status === 'ready' && cleanPhone && (
                            <span className="badge badge-blue" style={{ fontSize: '11px' }}>
                              Siap Kirim
                            </span>
                          )}
                          {(!cleanPhone || status === 'failed') && (
                            <span
                              className="badge badge-red"
                              style={{ fontSize: '11px' }}
                              title={err || 'No HP Kosong'}
                            >
                              ✕ {err ? 'Gagal' : 'Tidak Ada No. HP'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            {cleanPhone ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  style={{
                                    background: '#25D366',
                                    borderColor: '#25D366',
                                    fontSize: '11.5px',
                                    padding: '4px 8px',
                                    gap: '4px'
                                  }}
                                  onClick={() => handleOpenWhatsAppChat(a)}
                                  title="Buka Chat WhatsApp"
                                >
                                  📲 Chat WA
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline"
                                  style={{ fontSize: '11px', padding: '4px 8px' }}
                                  onClick={() => handleOpenSMS(a)}
                                  title="Kirim via SMS Handphone"
                                >
                                  💬 SMS
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border)',
            paddingTop: '14px'
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Total {filteredAlumni.length} alumni terdata dalam sistem BKK SMK PGRI 1 Taman
          </div>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Tutup Jendela
          </button>
        </div>
      </div>
    </div>
  );
};
