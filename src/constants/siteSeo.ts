/**
 * Konfigurasi SEO untuk situs (rating, base URL).
 * Ganti nilai aggregateRating dengan data nyata ketika tersedia (kebijakan Google).
 */

const BASE_URL =
  typeof process !== 'undefined' && process.env?.NEXTAUTH_URL
    ? process.env.NEXTAUTH_URL.replace(/\/$/, '')
    : 'https://kasirlondri.vercel.app';

/** Rating untuk brand/aplikasi (homepage). Set null jika belum ada data asli. */
export const SITE_AGGREGATE_RATING: {
  ratingValue: string;
  bestRating: string;
  ratingCount: string;
} | null = {
  ratingValue: '4.8',
  bestRating: '5',
  ratingCount: '150',
};

export function getSiteBaseUrl(): string {
  return BASE_URL;
}
