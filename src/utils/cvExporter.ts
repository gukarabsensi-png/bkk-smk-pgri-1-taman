import type { PencariKerja } from '../types.js';
import { fmtDate } from './formatters.js';

/**
 * Mengunduh file dokumen (PDF/gambar) yang diunggah pelamar
 * Jika berupa base64 Data URL, dibuatkan blob dan ditrigger unduhannya.
 * Jika berupa HTTP URL, dibuka atau diunduh via browser.
 */
export function downloadFile(fileUrlOrData: string, filename: string) {
  if (!fileUrlOrData) {
    alert('File tidak ditemukan atau belum diunggah.');
    return;
  }

  // Jika berupa base64 data URL
  if (fileUrlOrData.startsWith('data:')) {
    try {
      const parts = fileUrlOrData.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'dokumen';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    } catch (e) {
      console.error('Error downloading base64:', e);
    }
  }

  // Jika URL biasa
  const a = document.createElement('a');
  a.href = fileUrlOrData;
  a.target = '_blank';
  a.download = filename || 'dokumen';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Menghasilkan Curriculum Vitae (CV) & Biodata Profil Pelamar Alumni
 * dalam format dokumen yang rapi, profesional, dan dapat langsung dicetak / disimpan sebagai PDF via browser print.
 */
export function printOrDownloadCV(pk: PencariKerja, appliedJobTitle?: string, companyName?: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Harap izinkan popup browser untuk mengunduh / mencetak CV.');
    return;
  }

  const fotoHtml = pk.foto
    ? `<img src="${pk.foto}" alt="${pk.namaLengkap}" style="width: 110px; height: 140px; object-fit: cover; border-radius: 8px; border: 2px solid #cbd5e1;" />`
    : `<div style="width: 110px; height: 140px; border-radius: 8px; border: 2px dashed #94a3b8; display: flex; align-items: center; justify-content: center; background: #f8fafc; font-size: 32px; color: #64748b;">👤</div>`;

  const eduRows = (pk.pendidikan || [])
    .map(
      (e) => `
    <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dotted #e2e8f0;">
      <div style="display: flex; justify-content: space-between; font-weight: 700; color: #0f172a; font-size: 14px;">
        <span>${e.institusi || '-'} (${e.jenjang || 'SMK'})</span>
        <span style="color: #64748b; font-weight: 500; font-size: 13px;">${e.tahunMasuk ? `${e.tahunMasuk} – ` : ''}${e.tahunLulus || '-'}</span>
      </div>
      <div style="font-size: 13.5px; color: #0284c7; font-weight: 600;">${e.jurusan || '-'}</div>
      ${e.nilai ? `<div style="font-size: 12.5px; color: #475569;">Nilai Akhir / IPK: <b>${e.nilai}</b></div>` : ''}
    </div>
  `
    )
    .join('');

  const expRows = (pk.pengalaman || [])
    .map(
      (ex) => `
    <div style="margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px dotted #e2e8f0;">
      <div style="display: flex; justify-content: space-between; font-weight: 700; color: #0f172a; font-size: 14px;">
        <span>${ex.jabatan || '-'}</span>
        <span style="color: #64748b; font-weight: 500; font-size: 13px;">${ex.tanggalMulai ? fmtDate(ex.tanggalMulai) : ''} – ${ex.tanggalSelesai ? fmtDate(ex.tanggalSelesai) : 'Sekarang'}</span>
      </div>
      <div style="font-size: 13.5px; color: #1e293b; font-weight: 600; margin-bottom: 4px;">${ex.perusahaan || '-'}</div>
      ${ex.deskripsi ? `<div style="font-size: 13px; color: #475569; white-space: pre-line;">${ex.deskripsi}</div>` : ''}
    </div>
  `
    )
    .join('');

  const skillsHtml = (pk.keahlian || [])
    .map(
      (s) =>
        `<span style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 12.5px; font-weight: 600; margin: 0 6px 6px 0; border: 1px solid #bae6fd;">${s.nama} (${s.level})</span>`
    )
    .join('');

  const docRows = (pk.dokumen || [])
    .map(
      (d) =>
        `<div style="font-size: 13px; color: #334155; margin-bottom: 4px;">• <b>${d.jenis.toUpperCase()}</b>: ${d.namaFile} (${(d.ukuran / 1024).toFixed(0)} KB)</div>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Curriculum Vitae - ${pk.namaLengkap}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      padding: 0;
      margin: 0;
      background: #fff;
    }
    .cv-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }
    .header-table {
      width: 100%;
      border-bottom: 3px solid #0284c7;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .sec-title {
      font-size: 15px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0369a1;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin: 20px 0 12px 0;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 140px 1fr;
      row-gap: 6px;
      font-size: 13.5px;
    }
    .info-label {
      color: #64748b;
      font-weight: 600;
    }
    .info-val {
      color: #0f172a;
      font-weight: 500;
    }
    .school-badge {
      display: inline-block;
      background: #f1f5f9;
      color: #334155;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
      .cv-container { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #0f172a; color: white; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 99;">
    <div style="font-weight: 600; font-size: 14px;">
      📄 Dokumen Profil Pelamar Resmi BKK SMK PGRI 1 Taman
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;">
        🖨️ Cetak / Simpan PDF
      </button>
      <button onclick="window.close()" style="background: #334155; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer;">
        Tutup
      </button>
    </div>
  </div>

  <div class="cv-container">
    <!-- Header Profil -->
    <table class="header-table" style="border-collapse: collapse;">
      <tr>
        <td style="width: 120px; vertical-align: top;">
          ${fotoHtml}
        </td>
        <td style="vertical-align: top; padding-left: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 style="margin: 0; font-size: 24px; color: #0f172a; font-weight: 800;">
                ${pk.namaLengkap}
              </h1>
              <div style="font-size: 15px; color: #0284c7; font-weight: 700; margin-top: 2px;">
                Alumni SMK PGRI 1 Taman · ${pk.jurusan || 'Teknik / Kejuruan'}
              </div>
              <div class="school-badge">
                Lulusan Tahun: ${pk.tahunLulus || '-'} · Status: ${pk.status || 'Siap Kerja'}
              </div>
            </div>
            ${appliedJobTitle ? `
              <div style="text-align: right; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px;">
                <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Melamar Posisi</div>
                <div style="font-size: 13.5px; font-weight: 800; color: #0369a1;">${appliedJobTitle}</div>
                ${companyName ? `<div style="font-size: 12px; color: #475569;">${companyName}</div>` : ''}
              </div>
            ` : ''}
          </div>

          <!-- Kontak Header -->
          <div style="margin-top: 14px; display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #475569;">
            <span>📱 <b>WhatsApp:</b> ${pk.noHp || '-'}</span>
            <span>📍 <b>Domisili:</b> ${pk.kabupaten || pk.alamat || 'Sidoarjo'}</span>
            ${pk.jenisKelamin ? `<span>👤 <b>Jenis Kelamin:</b> ${pk.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>` : ''}
          </div>
        </td>
      </tr>
    </table>

    <!-- Ringkasan / Bio Diri -->
    ${pk.bio ? `
      <div class="sec-title">Ringkasan Pribadi</div>
      <div style="font-size: 13.5px; color: #334155; line-height: 1.6; white-space: pre-line;">
        ${pk.bio}
      </div>
    ` : ''}

    <!-- Biodata Detail -->
    <div class="sec-title">Biodata Pribadi</div>
    <div class="info-grid">
      <div class="info-label">Nama Lengkap</div>
      <div class="info-val">: ${pk.namaLengkap}</div>

      <div class="info-label">Tempat, Tgl Lahir</div>
      <div class="info-val">: ${pk.tempatLahir || '-'}, ${pk.tanggalLahir ? fmtDate(pk.tanggalLahir) : '-'}</div>

      <div class="info-label">Jenis Kelamin</div>
      <div class="info-val">: ${pk.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</div>

      <div class="info-label">Alamat Lengkap</div>
      <div class="info-val">: ${pk.alamat || '-'} ${pk.desa ? `, Desa ${pk.desa}` : ''} ${pk.kecamatan ? `, Kec. ${pk.kecamatan}` : ''} ${pk.kabupaten ? `, ${pk.kabupaten}` : ''} ${pk.provinsi ? `, ${pk.provinsi}` : ''} ${pk.kodePos ? `(${pk.kodePos})` : ''}</div>

      <div class="info-label">No. Telepon / WA</div>
      <div class="info-val">: ${pk.noHp || '-'}</div>

      <div class="info-label">Asal Sekolah</div>
      <div class="info-val">: <b>SMK PGRI 1 TAMAN, SIDOARJO</b></div>

      <div class="info-label">Jurusan / Keahlian</div>
      <div class="info-val">: ${pk.jurusan || '-'} (Lulus ${pk.tahunLulus || '-'})</div>
    </div>

    <!-- Riwayat Pendidikan -->
    <div class="sec-title">Riwayat Pendidikan</div>
    ${eduRows || '<div style="color: #64748b; font-size: 13px;">Belum ada riwayat pendidikan yang dicantumkan.</div>'}

    <!-- Pengalaman Kerja / Magang -->
    <div class="sec-title">Pengalaman Kerja & Praktik Kerja Lapangan (PKL)</div>
    ${expRows || '<div style="color: #64748b; font-size: 13px;">Fresh graduate (Lulusan Baru) / Belum ada pengalaman kerja formal.</div>'}

    <!-- Keahlian & Kompetensi Teknis -->
    <div class="sec-title">Keahlian & Kompetensi Kejuruan</div>
    ${skillsHtml || '<div style="color: #64748b; font-size: 13px;">Belum ada daftar keahlian dicantumkan.</div>'}

    <!-- Lampiran Berkas -->
    ${(pk.dokumen || []).length > 0 ? `
      <div class="sec-title">Dokumen & Berkas Pendukung yang Terlampir</div>
      ${docRows}
    ` : ''}

    <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between;">
      <span>Dokumen ini diterbitkan secara digital oleh Portal BKK SMK PGRI 1 Taman.</span>
      <span>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
    </div>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
