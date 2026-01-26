/**
 * Outlet Public DTO
 *
 * DTO untuk halaman publik outlet (`/outlet/[slug]`).
 * Wajib menerapkan prinsip "No overclaim" dengan hanya mengembalikan data yang benar-benar ada.
 * Jangan pernah mengekspos internal IDs / flags sensitif seperti `ownerId` atau `isPro`.
 */

export type OutletPublicRecord = {
  id: string; // internal only (jangan diekspos ke publik)
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

export class OutletPublicDTO {
  static toResponse(outlet: OutletPublicRecord) {
    return {
      name: outlet.name,
      slug: outlet.slug,
      address: outlet.address,
      description: outlet.description ?? null,
      contactPhone: outlet.contactPhone ?? null,
      businessHours: outlet.businessHours ?? null,
      logoUrl: outlet.logoUrl ?? null,
      coverUrl: outlet.coverUrl ?? null,
    };
  }
}

