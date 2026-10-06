export function uid(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function rupiah(amount?: number | string | null): string {
  if (amount === null || amount === undefined || amount === '') return '-';
  const num = Number(amount);
  if (isNaN(num)) return '-';
  return 'Rp ' + num.toLocaleString('id-ID');
}

export function fmtDate(d?: string | number | null): string {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(d?: string | number | null): string {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return (
    dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );
}

export function timeAgo(d?: string | number | null): string {
  if (!d) return '-';
  const dt = new Date(d);
  const s = Math.floor((Date.now() - dt.getTime()) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
  if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
  return Math.floor(s / 86400) + ' hari lalu';
}

export function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

export const STATUS_LAMARAN_MAP: Record<string, { label: string; cls: string }> = {
  diajukan: { label: 'Diajukan', cls: 'blue' },
  dilihat: { label: 'Dilihat', cls: 'blue' },
  seleksi_administrasi: { label: 'Seleksi Administrasi', cls: 'amber' },
  lulus_administrasi: { label: 'Lulus Administrasi', cls: 'green' },
  tidak_lulus: { label: 'Tidak Lulus', cls: 'red' },
  dipanggil_interview: { label: 'Dipanggil Interview', cls: 'amber' },
  interview: { label: 'Interview', cls: 'amber' },
  diterima: { label: 'Diterima', cls: 'green' },
  ditolak: { label: 'Ditolak', cls: 'red' },
  dibatalkan: { label: 'Dibatalkan', cls: 'grey' }
};

export const JENIS_PEKERJAAN_MAP: Record<string, string> = {
  full_time: 'Penuh Waktu',
  part_time: 'Paruh Waktu',
  contract: 'Kontrak',
  internship: 'Magang',
  freelance: 'Freelance'
};

export const STATUS_LOWONGAN_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'grey' },
  pending: { label: 'Menunggu Verifikasi', cls: 'amber' },
  published: { label: 'Aktif', cls: 'green' },
  closed: { label: 'Ditutup', cls: 'grey' },
  rejected: { label: 'Ditolak', cls: 'red' }
};

export const STATUS_PERUSAHAAN_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Menunggu Verifikasi', cls: 'amber' },
  verified: { label: 'Terverifikasi', cls: 'green' },
  rejected: { label: 'Ditolak', cls: 'red' },
  blocked: { label: 'Diblokir', cls: 'red' }
};

export const STATUS_VERIFIKASI_LAMARAN_MAP: Record<string, { label: string; cls: string; icon: string }> = {
  menunggu_verifikasi: { label: 'Menunggu Screening', cls: 'amber', icon: '⏳' },
  disetujui: { label: 'Disetujui BKK (Diteruskan)', cls: 'green', icon: '✓' },
  diblokir: { label: 'Diblokir / Ditolak BKK', cls: 'red', icon: '🔒' }
};

export function formatWhatsAppNumber(phone?: string | null): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }
  return clean;
}

export function buildWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = formatWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(text);
  return cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
}

export function exportCSVFile(
  headers: string[],
  rows: (string | number | undefined | null)[][],
  filename: string
): void {
  const escapeCell = (cell: any) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(','))
  ].join('\r\n');

  // Add UTF-8 BOM so Excel opens Indonesian characters & numbers cleanly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



