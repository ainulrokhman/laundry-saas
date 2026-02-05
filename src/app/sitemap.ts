import type { MetadataRoute } from 'next';
import { OutletRepository } from '@/repositories/OutletRepository';

function getBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL ?? 'https://kasirlondri.vercel.app';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  const outletRepo = new OutletRepository();
  const slugs = await outletRepo.findAllPublicSlugs();
  const outletEntries: MetadataRoute.Sitemap = slugs.map(({ slug }) => ({
    url: `${base}/outlet/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...outletEntries];
}
