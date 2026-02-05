import type { MetadataRoute } from 'next';

function getBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL ?? 'https://kasirlondri.vercel.app';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/admin/', '/api/'],
      },
    ],
    sitemap: `${getBaseUrl()}/sitemap.xml`,
  };
}
