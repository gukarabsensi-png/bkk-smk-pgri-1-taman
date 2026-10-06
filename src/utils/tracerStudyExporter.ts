import type { PencariKerja, Perusahaan, Penempatan, Lamaran, SiteSettings } from '../types.js';

export interface TracerStudyItem {
  id: string;
  pencariKerjaId: string;
  namaAlumni: string;
  namaSekolah: string;
  jurusan: string;
  tahunLulus: string;
  noHandphone: string;
  perusahaanList: string[]; // Bisa lebih dari 1 perusahaan
  posisiList: string[];
  statusKerja: string;
  domisili: string;
}

/**
 * Helper untuk mengekstrak dan menentukan nama kota/kabupaten lokasi BKK
 * yang akan dicantumkan pada titimangsa tanggal laporan (misal: "Pemalang", "Sidoarjo", dll).
 */
export function resolveBkkCity(
  settingsOrCity?: SiteSettings | string | null,
  defaultCity = 'Pemalang'
): string {
  if (!settingsOrCity) return defaultCity;

  if (typeof settingsOrCity === 'string') {
    const trimmed = settingsOrCity.trim();
    return trimmed.length > 0 ? trimmed : defaultCity;
  }

  // 1. Jika ada kolom siteCity eksplisit di pengaturan
  if (settingsOrCity.siteCity && settingsOrCity.siteCity.trim().length > 0) {
    return settingsOrCity.siteCity.trim();
  }

  // 2. Ekstrak dari alamat kantor BKK (siteAddress)
  if (settingsOrCity.siteAddress && settingsOrCity.siteAddress.trim().length > 0) {
    const addr = settingsOrCity.siteAddress;

    // Pola regex 'Kabupaten [Nama]', 'Kota [Nama]', 'Kab. [Nama]'
    const matchKabKota = addr.match(/(?:kota|kabupaten|kab\.|kotamadya)\s+([a-zA-Z\s]+?)(?:,|$|\d|\.|\n)/i);
    if (matchKabKota && matchKabKota[1] && matchKabKota[1].trim().length > 0) {
      const found = matchKabKota[1].trim();
      // Bersihkan jika ada embel-embel kecamatan
      return found.replace(/^(kecamatan|kec\.|kelurahan|kel\.)\s+/i, '').trim();
    }

    // Pola pembagian koma (Jl..., Kec..., Kab/Kota..., Prov...)
    const parts = addr.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (/^\d{5}$/.test(p)) continue; // Lewati kode pos
        if (/^(jawa|sumatera|kalimantan|sulawesi|bali|papua|banten|dki|diy)/i.test(p)) continue; // Lewati provinsi
        const cleaned = p.replace(/^(kecamatan|kec\.|kelurahan|kel\.|kota|kabupaten|kab\.)\s+/i, '').trim();
        if (cleaned.length >= 3) {
          return cleaned;
        }
      }
    }
  }

  // 3. Ekstrak dari nama sekolah/BKK jika ada kata kunci daerah
  if (settingsOrCity.siteName) {
    if (/pemalang/i.test(settingsOrCity.siteName)) return 'Pemalang';
    if (/sidoarjo/i.test(settingsOrCity.siteName)) return 'Sidoarjo';
    if (/surabaya/i.test(settingsOrCity.siteName)) return 'Surabaya';
  }

  return defaultCity;
}

/**
 * Menggabungkan profil alumni (Pencari Kerja) dengan data riwayat kerja,
 * riwayat penempatan resmi BKK, dan riwayat lamaran diterima ke dalam satu struktur Tracer Study terintegrasi.
 */
export function buildTracerStudyList(
  pencariKerja: PencariKerja[],
  perusahaan: Perusahaan[],
  penempatan: Penempatan[],
  lamaran: Lamaran[],
  defaultSchoolName: string = 'SMK PGRI 1 Taman'
): TracerStudyItem[] {
  return pencariKerja.map((pk) => {
    // 1. Ambil institusi/nama sekolah dari riwayat pendidikan SMK atau default
    const eduSmk = pk.pendidikan?.find(
      (e) => e.jenjang?.toUpperCase() === 'SMK' || e.institusi?.toLowerCase().includes('smk')
    );
    const namaSekolah = eduSmk?.institusi || defaultSchoolName;
    const jurusan = pk.jurusan || eduSmk?.jurusan || '-';
    const tahunLulus = String(pk.tahunLulus || eduSmk?.tahunLulus || '-');

    // 2. Kumpulkan nama instansi/perusahaan tempat alumni bekerja/magang
    const compSet = new Set<string>();
    const posSet = new Set<string>();

    // Dari riwayat pengalaman kerja/magang di profil alumni (CV)
    (pk.pengalaman || []).forEach((exp) => {
      if (exp.perusahaan && exp.perusahaan.trim()) {
        compSet.add(exp.perusahaan.trim());
      }
      if (exp.jabatan && exp.jabatan.trim()) {
        posSet.add(exp.jabatan.trim());
      }
    });

    // Dari data penempatan resmi BKK
    const myPenempatan = (penempatan || []).filter((pen) => pen.pencariKerjaId === pk.id);
    myPenempatan.forEach((pen) => {
      const prs = perusahaan.find((p) => p.id === pen.perusahaanId);
      if (prs?.namaPerusahaan) {
        compSet.add(prs.namaPerusahaan);
      }
      if (pen.jabatan) {
        posSet.add(pen.jabatan);
      }
    });

    // Dari lamaran yang statusnya 'diterima'
    const acceptedApps = (lamaran || []).filter(
      (app) => app.pencariKerjaId === pk.id && app.status === 'diterima'
    );
    acceptedApps.forEach((app) => {
      // Cari perusahaan dari data lowongan jika perlu
      const pen = penempatan.find((p) => p.lamaranId === app.id);
      if (pen) {
        const prs = perusahaan.find((p) => p.id === pen.perusahaanId);
        if (prs?.namaPerusahaan) compSet.add(prs.namaPerusahaan);
      }
    });

    const perusahaanArr = Array.from(compSet);
    const posisiArr = Array.from(posSet);

    let statusKerja = 'Mencari Kerja';
    if (perusahaanArr.length > 0) {
      statusKerja = 'Bekerja / Magang';
    } else if (pk.status) {
      statusKerja = pk.status;
    }

    return {
      id: pk.id,
      pencariKerjaId: pk.id,
      namaAlumni: pk.namaLengkap || 'Alumni',
      namaSekolah,
      jurusan,
      tahunLulus,
      noHandphone: pk.noHp || '-',
      perusahaanList: perusahaanArr,
      posisiList: posisiArr,
      statusKerja,
      domisili: pk.kabupaten || pk.alamat || '-'
    };
  });
}

/**
 * Mencetak atau mengekspor laporan resmi Tracer Study dalam format cetak dokumen browser yang siap disimpan ke PDF.
 */
export function printTracerStudyReport(
  items: TracerStudyItem[],
  schoolName: string = 'SMK PGRI 1 Taman',
  cityNameOrSettings?: string | SiteSettings | null
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Harap izinkan popup browser untuk mencetak laporan Tracer Study.');
    return;
  }

  // Tentukan nama kota/kabupaten resmi berdasarkan profil/pengaturan BKK
  const resolvedCity = resolveBkkCity(cityNameOrSettings, 'Pemalang');

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const tableRows = items.map((item, index) => {
    const compText =
      item.perusahaanList.length > 0
        ? item.perusahaanList
            .map((c, i) => `<div style="margin-bottom: 2px;">• <b>${c}</b></div>`)
            .join('')
        : '<span style="color: #94a3b8; font-style: italic;">Belum ada instansi/perusahaan</span>';

    return `
      <tr>
        <td style="text-align: center; vertical-align: top; padding: 8px 6px;">${index + 1}</td>
        <td style="vertical-align: top; padding: 8px 10px;">
          <b>${item.namaAlumni}</b>
          <div style="font-size: 11px; color: #64748b;">${item.domisili}</div>
        </td>
        <td style="vertical-align: top; padding: 8px 10px;">${item.namaSekolah}</td>
        <td style="vertical-align: top; padding: 8px 10px;">${item.jurusan}</td>
        <td style="text-align: center; vertical-align: top; padding: 8px 6px;"><b>${item.tahunLulus}</b></td>
        <td style="vertical-align: top; padding: 8px 10px; font-family: monospace;">${item.noHandphone}</td>
        <td style="vertical-align: top; padding: 8px 10px;">
          ${compText}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Tracer Study Alumni - ${schoolName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm 12mm 15mm 12mm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #0f172a;
      line-height: 1.4;
      margin: 0;
      padding: 20px;
      background: #fff;
    }
    .no-print-bar {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 10px 16px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .btn {
      background: #0284c7;
      color: #fff;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-secondary {
      background: #64748b;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header h2 {
      margin: 0;
      font-size: 18px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header h1 {
      margin: 4px 0;
      font-size: 22px;
      color: #0369a1;
      font-weight: 800;
    }
    .header p {
      margin: 2px 0 0;
      font-size: 12px;
      color: #475569;
    }
    .meta-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 12px;
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #94a3b8;
    }
    th {
      background: #e0f2fe;
      color: #0369a1;
      font-weight: bold;
      padding: 8px;
      text-align: left;
      font-size: 11.5px;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .sign-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .sign-box {
      text-align: center;
      width: 250px;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <b>Mode Pratinjau Cetak / PDF</b> — Total <b>${items.length} Data Alumni Terdata</b>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
      <button class="btn btn-secondary" onclick="window.close()">✕ Tutup</button>
    </div>
  </div>

  <div class="header">
    <h2>Laporan Resmi Penelusuran Lulusan (Tracer Study)</h2>
    <h1>BURSA KERJA KHUSUS (BKK) ${schoolName.toUpperCase()}</h1>
    <p>Penelusuran Keterserapan Kerja & Instansi Dunia Usaha / Dunia Industri (DUDI) Alumni</p>
  </div>

  <div class="meta-info">
    <span><b>Lokasi & Tanggal Cetak:</b> ${resolvedCity}, ${currentDate}</span>
    <span><b>Total Alumni:</b> ${items.length} Orang Terdata</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">No.</th>
        <th style="width: 170px;">Nama Alumni</th>
        <th style="width: 160px;">Nama Sekolah</th>
        <th style="width: 140px;">Jurusan</th>
        <th style="width: 75px; text-align: center;">Tahun Lulus</th>
        <th style="width: 120px;">Nomer Handphone</th>
        <th>Nama Instansi / Perusahaan Tempat Bekerja</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="7" style="text-align: center; padding: 20px;">Tidak ada data alumni.</td></tr>'}
    </tbody>
  </table>

  <div class="sign-section">
    <div class="sign-box">
      <div>${resolvedCity}, ${currentDate}</div>
      <div style="margin-top: 4px; font-weight: bold;">Koordinator BKK / Penelusuran Tamatan</div>
      <div style="height: 60px;"></div>
      <div style="font-weight: bold; text-decoration: underline;">Tim BKK ${schoolName}</div>
      <div style="font-size: 11px; color: #64748b;">NIP. - / Pembina BKK</div>
    </div>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
