/**
 * Outlet Landing Page DTO (OWNER settings)
 *
 * DTO untuk halaman settings OWNER agar dapat mengelola konten landing page per outlet aktif.
 * Jangan mengembalikan field sensitif seperti `ownerId` atau `isPro`.
 */

export type OutletLandingPageRecord = {
  id: string;
  name: string;
  slug: string;
  address: string;
  description: string | null;
  contactPhone: string | null;
  businessHours: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
};

export class OutletLandingPageDTO {
  static toResponse(outlet: OutletLandingPageRecord) {
    return {
      id: outlet.id,
      name: outlet.name,
      slug: outlet.slug,
      address: outlet.address,
      description: outlet.description ?? '',
      contactPhone: outlet.contactPhone ?? '',
      businessHours: outlet.businessHours ?? '',
      seoTitle: outlet.seoTitle ?? '',
      seoDescription: outlet.seoDescription ?? '',
      logoUrl: outlet.logoUrl ?? '',
      coverUrl: outlet.coverUrl ?? '',
    };
  }
}

