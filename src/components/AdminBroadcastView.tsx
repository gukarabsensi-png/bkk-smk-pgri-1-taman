import React, { useState, useMemo } from 'react';
import type {
  PencariKerja,
  Perusahaan,
  Kategori,
  Lowongan,
  SiteSettings,
  BroadcastHistory,
  Notifikasi
} from '../types.js';
import { formatWhatsAppNumber, buildWhatsAppLink, uid, fmtDateTime } from '../utils/formatters.js';
import { sendViaWhatsAppGateway } from '../services/whatsappBroadcast.js';
import { saveBroadcast, deleteBroadcast, saveNotifikasi, logAudit } from '../services/db.js';
import { useAuth } from '../context/AuthContext.js';

interface AdminBroadcastViewProps {
  pencariKerja: PencariKerja[];
  perusahaan: Perusahaan[];
  kategori: Kategori[];
  lowongan: Lowongan[];
  settings: SiteSettings;
  broadcasts: BroadcastHistory[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshData: () => Promise<void>;
  onNavigate: (route: string) => void;
}

interface RecipientTarget {
  id: string;
  userId?: string;
  nama: string;
  tipe: 'alumni' | 'perusahaan';
  phone: string;
  detail: string;
  statusKirim: 'ready' | 'sending' | 'sent' | 'failed';
  errorMsg?: string;
}

export const AdminBroadcastView: React.FC<AdminBroadcastViewProps> = ({
  pencariKerja,
  perusahaan,
  kategori,
  lowongan,
  settings,
  broadcasts,
  showToast,
  onRefreshData,
  onNavigate
}) => {
  const { userProfile } = useAuth();

  // Target Filter States
  const [targetGroup, setTargetGroup] = useState<'semua_alumni' | 'alumni_filter' | 'semua_perusahaan' | 'perusahaan_filter' | 'semua'>('semua_alumni');
  const [filterJurusan, setFilterJurusan] = useState<string>('all');
  const [filterTahun, setFilterTahun] = useState<string>('all');
  const [filterStatusKerja, setFilterStatusKerja] = useState<string>('all');
  const [filterStatusPerusahaan, setFilterStatusPerusahaan] = useState<string>('all');
  const [filterBidangPerusahaan, setFilterBidangPerusahaan] = useState<string>('all');

  // Form Message States
  const [judulSiaran, setJudulSiaran] = useState<string>('');
  const [pesanSiaran, setPesanSiaran] = useState<string>('');
  const [simpanNotifInApp, setSimpanNotifInApp] = useState<boolean>(true);

  // Sending States
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [recipientStatuses, setRecipientStatuses] = useState<Record<string, 'ready' | 'sending' | 'sent' | 'failed'>>({});
  const [recipientErrors, setRecipientErrors] = useState<Record<string, string>>({});
  const [autoQueueIndex, setAutoQueueIndex] = useState<number>(-1);

  // Detail Modal State
  const [selectedBroadcastDetail, setSelectedBroadcastDetail] = useState<BroadcastHistory | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Unique Jurusan List
  const jurusanList = useMemo(() => {
    const list = pencariKerja.map((p) => p.jurusan).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [pencariKerja]);

  // Unique Tahun List
  const tahunList = useMemo(() => {
    const list = pencariKerja.map((p) => String(p.tahunLulus || '')).filter(Boolean);
    return Array.from(new Set(list)).sort().reverse();
  }, [pencariKerja]);

  // Unique Bidang Perusahaan List
  const bidangList = useMemo(() => {
    const list = perusahaan.map((p) => p.bidangUsaha).filter(Boolean);
    return Array.from(new Set(list));
  }, [perusahaan]);

  // Compute Active Recipients List based on Target Filter
  const activeRecipients: RecipientTarget[] = useMemo(() => {
    const list: RecipientTarget[] = [];

    // 1. Alumni Group
    if (targetGroup === 'semua_alumni' || targetGroup === 'alumni_filter' || targetGroup === 'semua') {
      pencariKerja.forEach((pk) => {
        if (targetGroup === 'alumni_filter') {
          if (filterJurusan !== 'all' && pk.jurusan !== filterJurusan) return;
          if (filterTahun !== 'all' && String(pk.tahunLulus) !== filterTahun) return;
          if (filterStatusKerja !== 'all') {
            const status = pk.status?.toLowerCase() || '';
            if (filterStatusKerja === 'bekerja' && !status.includes('kerja') && !status.includes('bekerja')) return;
            if (filterStatusKerja === 'mencari' && (status.includes('kerja') || status.includes('bekerja'))) return;
          }
        }
        list.push({
          id: pk.id,
          userId: pk.userId,
          nama: pk.namaLengkap,
          tipe: 'alumni',
          phone: pk.noHp || '',
          detail: `${pk.jurusan || 'Alumni'} (${pk.tahunLulus || '-'})`,
          statusKirim: recipientStatuses[pk.id] || (formatWhatsAppNumber(pk.noHp) ? 'ready' : 'failed'),
          errorMsg: recipientErrors[pk.id]
        });
      });
    }

    // 2. Perusahaan Group
    if (targetGroup === 'semua_perusahaan' || targetGroup === 'perusahaan_filter' || targetGroup === 'semua') {
      perusahaan.forEach((prs) => {
        if (targetGroup === 'perusahaan_filter') {
          if (filterStatusPerusahaan !== 'all' && prs.statusVerifikasi !== filterStatusPerusahaan) return;
          if (filterBidangPerusahaan !== 'all' && prs.bidangUsaha !== filterBidangPerusahaan) return;
        }
        list.push({
          id: prs.id,
          userId: prs.userId,
          nama: prs.namaPerusahaan,
          tipe: 'perusahaan',
          phone: prs.noTelepon || '',
          detail: `PIC: ${prs.namaPic || 'HRD'} • ${prs.bidangUsaha || 'Mitra'}`,
          statusKirim: recipientStatuses[prs.id] || (formatWhatsAppNumber(prs.noTelepon) ? 'ready' : 'failed'),
          errorMsg: recipientErrors[prs.id]
        });
      });
    }

    return list;
  }, [
    targetGroup,
    filterJurusan,
    filterTahun,
    filterStatusKerja,
    filterStatusPerusahaan,
    filterBidangPerusahaan,
    pencariKerja,
    perusahaan,
    recipientStatuses,
    recipientErrors
  ]);

  const validPhoneRecipients = useMemo(() => {
    return activeRecipients.filter((r) => !!formatWhatsAppNumber(r.phone));
  }, [activeRecipients]);

  const hasGatewayConfig = !!(settings.waGatewayApiKey || settings.waGatewayUrl);

  // Template Quick Loader
  const handleApplyTemplate = (type: 'lowongan' | 'agenda' | 'tracer' | 'mitra' | 'pengumuman') => {
    const site = settings.siteName || 'BKK SMK PGRI 1 Taman';
    const origin = window.location.origin;

    if (type === 'lowongan') {
      setJudulSiaran('Informasi Lowongan Kerja Terbaru BKK');
      setPesanSiaran(
`📢 *INFORMASI LOWONGAN KERJA TERBARU - ${site.toUpperCase()}*

Halo Sdr/i *{nama}*,
Terdapat peluang karir dan lowongan pekerjaan terbaru yang sesuai dengan kualifikasi alumni:

📌 Silakan cek rincian posisi, syarat kualifikasi, dan batas pendaftaran melalui tautan resmi BKK:
👉 ${origin}#lowongan

Segera lengkapi berkas dan kirimkan lamaran Anda sebelum kuota terpenuhi!
Semoga sukses meraih karir impian. 🚀

_Layanan Karir & Penempatan Alumni ${site}_`
      );
    } else if (type === 'agenda') {
      setJudulSiaran('Undangan Agenda & Job Fair BKK');
      setPesanSiaran(
`🗓️ *UNDANGAN AGENDA & JOB FAIR - ${site.toUpperCase()}*

Halo Sdr/i *{nama}*,
Kami mengundang Anda untuk menghadiri agenda kegiatan karir resmi:

📌 *Agenda BKK SMK PGRI 1 Taman*
📍 Lokasi: Aula SMK PGRI 1 Taman
🏢 Dihadiri puluhan Perusahaan Mitra Industri ternama

Jadwal selengkapnya & registrasi peserta dapat diakses di:
👉 ${origin}#agenda

Jangan lewatkan kesempatan emas ini!
Salam hangat,
_${site}_`
      );
    } else if (type === 'tracer') {
      setJudulSiaran('Pembaruan Data Tracer Study Alumni');
      setPesanSiaran(
`📈 *PEMBERITAHUAN PENGISIAN TRACER STUDY ALUMNI*

Halo Kak *{nama}* ({jurusan} - Angkatan {tahun_lulus}),
Mohon kesediaannya untuk memperbarui data status pekerjaan/pendidikan terkini Anda pada sistem Tracer Study BKK SMK PGRI 1 Taman.

Data Anda sangat berharga bagi evaluasi mutu sekolah dan penyaluran kesempatan kerja alumni:
👉 ${origin}#profil

Pengisian hanya membutuhkan waktu 2 menit. Terima kasih atas partisipasi dan kerjasamanya! 🙏

_${site}_`
      );
    } else if (type === 'mitra') {
      setJudulSiaran('Undangan Kemitraan & Rekrutmen Perusahaan Mitra BKK');
      setPesanSiaran(
`🤝 *KERJASAMA REKRUTMEN & KEMITRAAN - ${site.toUpperCase()}*

Yth. Pimpinan / HRD *{nama}*,
Salam hangat dari Bursa Kerja Khusus (BKK) SMK PGRI 1 Taman.

Kami mengundang instansi/perusahaan Bapak/Ibu untuk mempublikasikan lowongan kerja atau mengadakan rekrutmen bersama alumni berkompeten kami secara gratis:
👉 ${origin}#perusahaan

Portal BKK kami siap memfasilitasi proses screening berkas dan penyaluran tenaga kerja siap pakai.

Hormat kami,
_Tim Hubungan Industri & BKK SMK PGRI 1 Taman_`
      );
    } else if (type === 'pengumuman') {
      setJudulSiaran('Pengumuman Resmi Penting BKK');
      setPesanSiaran(
`📢 *PENGUMUMAN RESMI ${site.toUpperCase()}*

Kepada Yth. *{nama}*,
Berikut kami sampaikan informasi penting dari manajemen BKK SMK PGRI 1 Taman:

[Tuliskan poin penting pengumuman di sini...]

Informasi resmi selengkapnya dapat diakses melalui portal kami:
👉 ${origin}

Terima kasih atas perhatiannya.
Salam hormat,
_${site}_`
      );
    }
    showToast('Template siaran berhasil diterapkan!', 'info');
  };

  // Helper formatting for dynamic text
  const formatTextForTarget = (rawText: string, target: RecipientTarget) => {
    return rawText
      .replace(/{nama}/g, target.nama || 'Rekan')
      .replace(/{jurusan}/g, target.detail || '')
      .replace(/{tahun_lulus}/g, target.detail || '')
      .replace(/{perusahaan}/g, target.nama || '')
      .replace(/{tanggal}/g, new Date().toLocaleDateString('id-ID'))
      .replace(/{link_portal}/g, window.location.origin);
  };

  // Copy Broadcast Text to Clipboard
  const handleCopyText = () => {
    if (!pesanSiaran.trim()) {
      showToast('Tulis isi pesan siaran terlebih dahulu!', 'error');
      return;
    }
    const sample = formatTextForTarget(pesanSiaran, {
      id: 'demo',
      nama: 'Rekan Alumni / Mitra',
      tipe: 'alumni',
      phone: '',
      detail: 'Alumni',
      statusKirim: 'ready'
    });
    navigator.clipboard.writeText(sample);
    setCopied(true);
    showToast('Pesan siaran berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  // Kirim 1 Kontak Manual via WhatsApp Web
  const handleOpenIndividualChat = (target: RecipientTarget) => {
    const cleanPhone = formatWhatsAppNumber(target.phone);
    if (!cleanPhone) {
      showToast(`Nomor HP untuk ${target.nama} tidak valid`, 'error');
      return;
    }
    const text = formatTextForTarget(pesanSiaran || 'Halo, ini adalah pesan resmi dari BKK SMK PGRI 1 Taman.', target);
    const link = buildWhatsAppLink(cleanPhone, text);
    window.open(link, '_blank');

    setRecipientStatuses((prev) => ({ ...prev, [target.id]: 'sent' }));
    showToast(`Membuka percakapan WhatsApp untuk ${target.nama}...`, 'info');
  };

  // Pengiriman Otomatis via API Gateway
  const handleSendBroadcastViaGateway = async () => {
    if (!hasGatewayConfig) {
      showToast('API Gateway WhatsApp belum dikonfigurasi. Atur di menu Pengaturan Situs.', 'error');
      return;
    }
    if (!judulSiaran.trim()) {
      showToast('Masukkan judul / subjek siaran terlebih dahulu', 'error');
      return;
    }
    if (!pesanSiaran.trim()) {
      showToast('Tuliskan isi pesan siaran yang akan dikirim', 'error');
      return;
    }
    if (validPhoneRecipients.length === 0) {
      showToast('Tidak ada nomor WhatsApp yang valid pada sasaran filter saat ini', 'error');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastProgress({ current: 0, total: validPhoneRecipients.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validPhoneRecipients.length; i++) {
      const target = validPhoneRecipients[i];
      setRecipientStatuses((prev) => ({ ...prev, [target.id]: 'sending' }));

      const text = formatTextForTarget(pesanSiaran, target);

      // Send via Gateway API
      const res = await sendViaWhatsAppGateway(
        target.phone,
        text,
        settings.waGatewayUrl,
        settings.waGatewayApiKey
      );

      if (res.success) {
        successCount++;
        setRecipientStatuses((prev) => ({ ...prev, [target.id]: 'sent' }));

        // Simpan Notifikasi Akun In-App jika dicentang
        if (simpanNotifInApp && target.userId) {
          try {
            await saveNotifikasi({
              id: uid('notif'),
              userId: target.userId,
              judul: `📡 ${judulSiaran.trim()}`,
              pesan: text.slice(0, 150) + (text.length > 150 ? '...' : ''),
              url: '#notifikasi',
              createdAt: new Date().toISOString()
            });
          } catch {
            // ignore
          }
        }
      } else {
        failCount++;
        setRecipientStatuses((prev) => ({ ...prev, [target.id]: 'failed' }));
        setRecipientErrors((prev) => ({ ...prev, [target.id]: res.message }));
      }

      setBroadcastProgress({ current: i + 1, total: validPhoneRecipients.length });
      // Jeda aman 700ms antar pengiriman
      await new Promise((r) => setTimeout(r, 700));
    }

    // Catat ke Koleksi Riwayat Broadcast di Cloud Firestore
    const historyItem: BroadcastHistory = {
      id: uid('bcast'),
      judul: judulSiaran.trim(),
      pesan: pesanSiaran.trim(),
      targetKategori: targetGroup === 'alumni_filter' ? 'alumni_jurusan' : (targetGroup as any),
      filterDetail:
        targetGroup === 'alumni_filter'
          ? `Jurusan: ${filterJurusan} • Tahun: ${filterTahun}`
          : targetGroup === 'perusahaan_filter'
          ? `Status: ${filterStatusPerusahaan} • Bidang: ${filterBidangPerusahaan}`
          : targetGroup,
      totalPenerima: validPhoneRecipients.length,
      totalBerhasil: successCount,
      totalGagal: failCount,
      metode: 'gateway_api',
      dikirimOleh: userProfile?.name || 'Admin BKK',
      createdAt: new Date().toISOString()
    };

    try {
      await saveBroadcast(historyItem);
      await logAudit(
        `KIRIM_BROADCAST_WA: ${judulSiaran.trim()} (${successCount} terkirim)`,
        'BROADCAST',
        historyItem.id,
        userProfile
      );
      await onRefreshData();
    } catch {
      // non-blocking
    }

    setIsBroadcasting(false);
    if (successCount > 0) {
      showToast(`Siaran selesai! ${successCount} WhatsApp berhasil dikirim via Gateway API.`, 'success');
    }
    if (failCount > 0) {
      showToast(`${failCount} kontak gagal dikirim. Cek rincian error pada tabel penerima.`, 'error');
    }
  };

  // Antrean Pengiriman Cepat Berurutan (WhatsApp Web Mode)
  const handleStartAutoQueue = () => {
    if (validPhoneRecipients.length === 0) {
      showToast('Tidak ada kontak dengan nomor valid untuk diantrekan', 'error');
      return;
    }
    if (!pesanSiaran.trim()) {
      showToast('Tulis isi pesan siaran terlebih dahulu', 'error');
      return;
    }
    setAutoQueueIndex(0);
    showToast(`Antrean siaran dimulai (${validPhoneRecipients.length} kontak). Klik "Buka WA Kontak Selanjutnya".`, 'info');
  };

  const handleNextInQueue = () => {
    if (autoQueueIndex >= 0 && autoQueueIndex < validPhoneRecipients.length) {
      const current = validPhoneRecipients[autoQueueIndex];
      handleOpenIndividualChat(current);
      if (autoQueueIndex + 1 < validPhoneRecipients.length) {
        setAutoQueueIndex(autoQueueIndex + 1);
      } else {
        setAutoQueueIndex(-1);
        showToast('Seluruh antrean siaran selesai dikirimkan!', 'success');
      }
    }
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteBroadcast(id);
      await onRefreshData();
      showToast('Riwayat broadcast berhasil dihapus.', 'info');
    } catch (err: any) {
      showToast('Gagal menghapus riwayat: ' + err.message, 'error');
    }
  };

  return (
    <div>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>📡</span> Broadcast Notifikasi WhatsApp
          </h1>
          <p className="page-sub" style={{ margin: '4px 0 0' }}>
            Kirimkan pengumuman & pesan massal resmi ke seluruh nomor WhatsApp alumni, perusahaan mitra, atau filter kategori khusus via API Gateway.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {hasGatewayConfig ? (
            <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
              <span>⚡</span> API Gateway Aktif
            </span>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ borderColor: 'var(--amber)', color: 'var(--amber)', fontSize: '12px', gap: '6px' }}
              onClick={() => onNavigate('admin/settings')}
            >
              <span>⚠️</span> Pasang Token Gateway di Pengaturan
            </button>
          )}
          <span className="badge badge-blue" style={{ padding: '6px 12px' }}>
            👥 {validPhoneRecipients.length} Kontak Terpilih
          </span>
        </div>
      </div>

      {/* Grid: Form Broadcast & Live Preview */}
      <div className="grid grid-2" style={{ marginBottom: '24px' }}>
        {/* Kolom 1: Konfigurasi Sasaran & Form Pesan */}
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯</span> 1. Pilih Sasaran Penerima
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {/* Opsi Target Utama */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${targetGroup === 'semua_alumni' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '12px', padding: '8px 10px', justifyContent: 'center' }}
                onClick={() => setTargetGroup('semua_alumni')}
              >
                🎓 Seluruh Alumni ({pencariKerja.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${targetGroup === 'alumni_filter' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '12px', padding: '8px 10px', justifyContent: 'center' }}
                onClick={() => setTargetGroup('alumni_filter')}
              >
                🔍 Alumni per Jurusan / Angkatan
              </button>
              <button
                type="button"
                className={`btn btn-sm ${targetGroup === 'semua_perusahaan' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '12px', padding: '8px 10px', justifyContent: 'center' }}
                onClick={() => setTargetGroup('semua_perusahaan')}
              >
                🏢 Seluruh Perusahaan ({perusahaan.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${targetGroup === 'perusahaan_filter' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '12px', padding: '8px 10px', justifyContent: 'center' }}
                onClick={() => setTargetGroup('perusahaan_filter')}
              >
                🏭 Perusahaan per Kategori
              </button>
              <button
                type="button"
                className={`btn btn-sm ${targetGroup === 'semua' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '12px', padding: '8px 10px', justifyContent: 'center' }}
                onClick={() => setTargetGroup('semua')}
              >
                🌐 Gabungan Semua Kontak
              </button>
            </div>

            {/* Filter Khusus Alumni */}
            {targetGroup === 'alumni_filter' && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700 }}>Filter Jurusan:</label>
                  <select value={filterJurusan} onChange={(e) => setFilterJurusan(e.target.value)} style={{ fontSize: '12.5px', padding: '6px 8px' }}>
                    <option value="all">Semua Jurusan</option>
                    {jurusanList.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700 }}>Filter Tahun Lulus:</label>
                  <select value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)} style={{ fontSize: '12.5px', padding: '6px 8px' }}>
                    <option value="all">Semua Tahun</option>
                    {tahunList.map((t) => (
                      <option key={t} value={t}>Tahun {t}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700 }}>Status Bekerja:</label>
                  <select value={filterStatusKerja} onChange={(e) => setFilterStatusKerja(e.target.value)} style={{ fontSize: '12.5px', padding: '6px 8px' }}>
                    <option value="all">Semua Status</option>
                    <option value="mencari">Mencari Kerja (Belum Bekerja)</option>
                    <option value="bekerja">Sudah Bekerja / Ditempatkan</option>
                  </select>
                </div>
              </div>
            )}

            {/* Filter Khusus Perusahaan */}
            {targetGroup === 'perusahaan_filter' && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700 }}>Status Verifikasi:</label>
                  <select value={filterStatusPerusahaan} onChange={(e) => setFilterStatusPerusahaan(e.target.value)} style={{ fontSize: '12.5px', padding: '6px 8px' }}>
                    <option value="all">Semua Status</option>
                    <option value="verified">Terverifikasi (Aktif)</option>
                    <option value="pending">Menunggu Verifikasi</option>
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700 }}>Bidang Industri:</label>
                  <select value={filterBidangPerusahaan} onChange={(e) => setFilterBidangPerusahaan(e.target.value)} style={{ fontSize: '12.5px', padding: '6px 8px' }}>
                    <option value="all">Semua Bidang</option>
                    {bidangList.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Quick Template Picker */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              ⚡ Template Cepat:
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-sm btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => handleApplyTemplate('lowongan')}>
                💼 Info Lowongan
              </button>
              <button type="button" className="btn btn-sm btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => handleApplyTemplate('agenda')}>
                🗓️ Job Fair / Agenda
              </button>
              <button type="button" className="btn btn-sm btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => handleApplyTemplate('tracer')}>
                📝 Tracer Study
              </button>
              <button type="button" className="btn btn-sm btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => handleApplyTemplate('mitra')}>
                🤝 Kemitraan Mitra
              </button>
              <button type="button" className="btn btn-sm btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => handleApplyTemplate('pengumuman')}>
                📢 Pengumuman
              </button>
            </div>
          </div>

          {/* Judul & Isi Pesan */}
          <div className="field">
            <label style={{ fontSize: '13px', fontWeight: 700 }}>Subjek / Judul Siaran:</label>
            <input
              required
              value={judulSiaran}
              onChange={(e) => setJudulSiaran(e.target.value)}
              placeholder="Contoh: Lowongan Kerja Operator Produksi PT Astra Honda Motor"
            />
          </div>

          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700 }}>Isi Pesan WhatsApp:</label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Variabel: <code>{'{nama}'}</code>, <code>{'{jurusan}'}</code>, <code>{'{link_portal}'}</code>
              </span>
            </div>
            <textarea
              required
              rows={8}
              value={pesanSiaran}
              onChange={(e) => setPesanSiaran(e.target.value)}
              placeholder="Tuliskan format pesan siaran lengkap di sini..."
              style={{ fontFamily: 'monospace', fontSize: '12.5px', lineHeight: 1.5 }}
            />
          </div>

          {/* Checkbox In-App Notification */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px' }}>
              <input
                type="checkbox"
                checked={simpanNotifInApp}
                onChange={(e) => setSimpanNotifInApp(e.target.checked)}
                style={{ accentColor: 'var(--primary)' }}
              />
              <span>Simpan juga sebagai pemberitahuan resmi di aplikasi (Portal Pengguna)</span>
            </label>
          </div>

          {/* Progress Bar saat Broadcast */}
          {isBroadcasting && (
            <div style={{ marginBottom: '16px', background: 'var(--bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                <span>Sedang Mengirim via WhatsApp Gateway...</span>
                <span>{broadcastProgress.current} / {broadcastProgress.total}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    background: '#25D366',
                    width: `${broadcastProgress.total > 0 ? (broadcastProgress.current / broadcastProgress.total) * 100 : 0}%`,
                    transition: 'width 0.3s'
                  }}
                />
              </div>
            </div>
          )}

          {/* Tombol Eksekusi Siaran */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {hasGatewayConfig ? (
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#128C7E', borderColor: '#128C7E', color: '#fff', gap: '8px' }}
                onClick={handleSendBroadcastViaGateway}
                disabled={isBroadcasting || validPhoneRecipients.length === 0}
              >
                {isBroadcasting ? '⏳ Mengirim via Gateway...' : `🚀 Kirim Massal via Gateway API (${validPhoneRecipients.length} Nomor)`}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', gap: '8px' }}
                onClick={handleStartAutoQueue}
                disabled={validPhoneRecipients.length === 0}
              >
                ⏩ Mulai Antrean Cepat WhatsApp Web ({validPhoneRecipients.length} Kontak)
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleCopyText}
              disabled={!pesanSiaran.trim()}
              style={{ gap: '6px' }}
            >
              {copied ? '✓ Tersalin!' : '📋 Salin Teks Format WA'}
            </button>
          </div>
        </div>

        {/* Kolom 2: Live WhatsApp Mockup Preview */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📱</span> Pratinjau Tampilan WhatsApp Penerima
          </h3>

          <div
            style={{
              flex: 1,
              background: '#efeae2',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #d1d7db',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            {/* Header Mockup WhatsApp */}
            <div
              style={{
                background: '#075E54',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px'
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#25D366',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}
              >
                🏫
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>
                  {settings.siteName || 'BKK SMK PGRI 1 Taman'} (Akun Resmi)
                </div>
                <div style={{ fontSize: '11px', opacity: 0.85 }}>Online • Layanan Broadcast Karir</div>
              </div>
            </div>

            {/* Chat Bubble WhatsApp */}
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '92%',
                background: '#ffffff',
                color: '#111b21',
                padding: '12px 14px',
                borderRadius: '0 12px 12px 12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                fontSize: '12.5px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              {pesanSiaran ? (
                formatTextForTarget(pesanSiaran, {
                  id: 'demo',
                  nama: 'Ahmad Fauzi (Contoh Alumni)',
                  tipe: 'alumni',
                  phone: '081234567890',
                  detail: 'Teknik Komputer & Jaringan (2024)',
                  statusKirim: 'ready'
                })
              ) : (
                <span style={{ color: '#8696a0', fontStyle: 'italic' }}>
                  Belum ada pesan yang ditulis. Ketik pesan atau pilih salah satu template cepat di sebelah kiri untuk melihat simulasi tampilan pada handphone penerima...
                </span>
              )}
              <div style={{ textAlign: 'right', fontSize: '10px', color: '#667781', marginTop: '6px' }}>
                {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ✓✓
              </div>
            </div>

            {/* Info Box Footer Mockup */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11.5px',
                color: '#54656f'
              }}
            >
              <span>🔒 Terenkripsi ujung-ke-ujung resmi BKK</span>
              <span>Total: {validPhoneRecipients.length} Nomor Aktif</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Penerima Aktif */}
      <div className="card table-card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px' }}>
              Daftar Kontak Sasaran ({activeRecipients.length} Penerima)
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {validPhoneRecipients.length} kontak memiliki nomor WhatsApp valid. Kontak tanpa nomor akan dilewati otomatis.
            </div>
          </div>

          {/* Antrean Manual Controls jika sedang aktif */}
          {autoQueueIndex >= 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                onClick={handleNextInQueue}
              >
                ➡️ Buka WA Berikutnya ({autoQueueIndex + 1}/{validPhoneRecipients.length})
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setAutoQueueIndex(-1)}
              >
                Hentikan Antrean
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x" style={{ maxHeight: '320px', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '35px' }}>No</th>
                <th>Nama Penerima</th>
                <th>Kategori / Instansi</th>
                <th>Nomor Handphone / WhatsApp</th>
                <th>Status Siaran</th>
                <th style={{ textAlign: 'center', width: '130px' }}>Aksi Chat</th>
              </tr>
            </thead>
            <tbody>
              {activeRecipients.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Tidak ada kontak yang cocok dengan filter sasaran yang dipilih.
                  </td>
                </tr>
              ) : (
                activeRecipients.map((r, idx) => {
                  const clean = formatWhatsAppNumber(r.phone);
                  const isCurrentInQueue =
                    autoQueueIndex >= 0 && validPhoneRecipients[autoQueueIndex]?.id === r.id;

                  return (
                    <tr
                      key={r.id}
                      style={{
                        background: isCurrentInQueue ? 'rgba(37, 211, 102, 0.15)' : undefined
                      }}
                    >
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.nama}</div>
                        <span className={`tag ${r.tipe === 'alumni' ? 'blue' : 'amber'}`} style={{ fontSize: '10px' }}>
                          {r.tipe === 'alumni' ? 'Alumni' : 'Mitra Industri'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.detail}</td>
                      <td>
                        {clean ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#128C7E' }}>
                            +{clean}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--danger)', fontSize: '11px', fontStyle: 'italic' }}>
                            Nomor Tidak Tersedia
                          </span>
                        )}
                      </td>
                      <td>
                        {r.statusKirim === 'sent' && (
                          <span className="badge badge-green" style={{ fontSize: '11px' }}>
                            ✓ Terkirim
                          </span>
                        )}
                        {r.statusKirim === 'sending' && (
                          <span className="badge badge-amber" style={{ fontSize: '11px' }}>
                            ⏳ Mengirim...
                          </span>
                        )}
                        {r.statusKirim === 'ready' && clean && (
                          <span className="badge badge-blue" style={{ fontSize: '11px' }}>
                            Siap Kirim
                          </span>
                        )}
                        {(!clean || r.statusKirim === 'failed') && (
                          <span className="badge badge-red" style={{ fontSize: '11px' }} title={r.errorMsg}>
                            ✕ {r.errorMsg ? 'Gagal' : 'Tanpa No. HP'}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {clean ? (
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
                            onClick={() => handleOpenIndividualChat(r)}
                            title="Buka Chat WhatsApp Kontak"
                          >
                            📲 Chat WA
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabel Riwayat Broadcast Sebelumnya */}
      <div className="card table-card">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px' }}>
              Riwayat Pengiriman Siaran ({broadcasts.length})
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Catatan audit pengiriman notifikasi broadcast WhatsApp oleh admin.
            </p>
          </div>
        </div>

        <div className="overflow-x">
          <table>
            <thead>
              <tr>
                <th>Waktu Kirim</th>
                <th>Judul Siaran</th>
                <th>Kategori Sasaran</th>
                <th>Status Terkirim</th>
                <th>Pengirim</th>
                <th style={{ textAlign: 'center', width: '130px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Belum ada riwayat broadcast notifikasi yang dikirimkan.
                  </td>
                </tr>
              ) : (
                broadcasts.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {fmtDateTime(b.createdAt)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.judul}</td>
                    <td>
                      <span className="tag blue" style={{ fontSize: '11px' }}>
                        {b.targetKategori.replace('_', ' ')}
                      </span>
                      {b.filterDetail && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {b.filterDetail}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-green" style={{ fontSize: '11.5px' }}>
                        ✓ {b.totalBerhasil} Berhasil
                      </span>
                      {b.totalGagal > 0 && (
                        <span className="badge badge-red" style={{ fontSize: '11.5px', marginLeft: '6px' }}>
                          ✕ {b.totalGagal} Gagal
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {b.dikirimOleh || 'Admin'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          style={{ padding: '4px 8px', fontSize: '11.5px' }}
                          onClick={() => setSelectedBroadcastDetail(b)}
                          title="Lihat rincian teks pesan siaran"
                        >
                          👁️ Rincian
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteHistory(b.id)}
                          title="Hapus riwayat siaran ini"
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

      {/* Modal Detail Riwayat Siaran */}
      {selectedBroadcastDetail && (
        <div className="modal-bg" onClick={() => setSelectedBroadcastDetail(null)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Rincian Riwayat Broadcast Notifikasi</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedBroadcastDetail(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Subjek Siaran:</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{selectedBroadcastDetail.judul}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px', background: 'var(--bg)', padding: '10px 14px', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Waktu Pengiriman:</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{fmtDateTime(selectedBroadcastDetail.createdAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sasaran Penerima:</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{selectedBroadcastDetail.filterDetail || selectedBroadcastDetail.targetKategori}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hasil Pengiriman:</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--secondary)' }}>
                  {selectedBroadcastDetail.totalBerhasil} Berhasil / {selectedBroadcastDetail.totalGagal} Gagal
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Metode:</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                  {selectedBroadcastDetail.metode === 'gateway_api' ? '⚡ API Gateway' : '📲 WhatsApp Web'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Isi Pesan Siaran:</div>
              <div
                style={{
                  background: '#efeae2',
                  color: '#111b21',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}
              >
                {selectedBroadcastDetail.pesan}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setJudulSiaran(selectedBroadcastDetail.judul);
                  setPesanSiaran(selectedBroadcastDetail.pesan);
                  setSelectedBroadcastDetail(null);
                  showToast('Pesan dimuat ke form siaran. Anda dapat menyiarkannya kembali.', 'info');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                🔁 Muat Ulang ke Form Siaran
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedBroadcastDetail(null)}
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
