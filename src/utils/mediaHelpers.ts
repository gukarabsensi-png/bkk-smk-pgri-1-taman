/**
 * Media Helpers: Utilitas untuk memproses foto dan video galeri
 * - Ekstraksi YouTube ID & Vimeo ID
 * - Konversi URL Embed responsif
 * - Kompresi foto lokal otomatis via HTML5 Canvas (Base64 / DataURL)
 */

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Pola standard watch?v=ID
  const matchWatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (matchWatch && matchWatch[1]) {
    return matchWatch[1];
  }

  // Pola shorts/ID
  const matchShorts = trimmed.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i);
  if (matchShorts && matchShorts[1]) {
    return matchShorts[1];
  }

  return null;
}

export function extractVimeoId(url: string): string | null {
  if (!url) return null;
  const match = url.trim().match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+))/i);
  return match && match[3] ? match[3] : null;
}

export function getEmbedVideoUrl(url: string, youtubeId?: string, autoplay = true): string {
  if (!url) return '';
  const yId = youtubeId || extractYouTubeId(url);
  if (yId) {
    return `https://www.youtube-nocookie.com/embed/${yId}?autoplay=${autoplay ? 1 : 0}&rel=0`;
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}?autoplay=${autoplay ? 1 : 0}&badge=0&autopause=0`;
  }

  return url;
}

export function getMediaThumbnail(
  tipe: 'foto' | 'video',
  url: string,
  thumbnailUrl?: string,
  youtubeId?: string
): string {
  if (thumbnailUrl && thumbnailUrl.trim().length > 0) {
    return thumbnailUrl.trim();
  }

  if (tipe === 'foto') {
    return url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80';
  }

  // Video
  const yId = youtubeId || extractYouTubeId(url);
  if (yId) {
    return `https://img.youtube.com/vi/${yId}/hqdefault.jpg`;
  }

  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80';
}

/**
 * Kompresi file gambar di sisi browser menggunakan HTML5 Canvas
 * Mengubah file resolusi besar menjadi Base64 JPEG yang ringan (< 250KB)
 * sehingga aman dan cepat disimpan di Firestore tanpa konfigurasi Storage tambahan.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 900,
  quality = 0.8
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Hitung rasio resize
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: e.target?.result as string, originalSize, compressedSize: originalSize });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export ke JPEG terkompresi
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const compressedSize = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          originalSize,
          compressedSize
        });
      };

      img.onerror = () => {
        reject(new Error('Gagal memuat gambar untuk dikompresi.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Kategori Galeri yang tersedia
 */
export const KATEGORI_GALERI = [
  'Kegiatan BKK',
  'Job Fair & Bursa Kerja',
  'Kunjungan Industri',
  'Rekrutmen Kampus',
  'Pelatihan & Workshop',
  'Profil BKK',
  'Prestasi Alumni',
  'Lainnya'
];
