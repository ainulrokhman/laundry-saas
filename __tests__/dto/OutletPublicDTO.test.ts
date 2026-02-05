/**
 * OutletPublicDTO Tests (public outlet page - no overclaim, no internal id)
 */

import { OutletPublicDTO, OutletPublicRecord } from '@/dto/OutletPublicDTO';

describe('OutletPublicDTO', () => {
  const mockOutlet: OutletPublicRecord = {
    id: 'outlet-1',
    name: 'Laundry ABC',
    slug: 'laundry-abc',
    address: 'Jl. Contoh',
    description: 'Desc',
    contactPhone: '6281234567890',
    businessHours: '08-17',
    seoTitle: 'SEO',
    seoDescription: 'Meta',
    logoUrl: 'https://a.com/logo.png',
    coverUrl: 'https://a.com/cover.png',
    ratingValue: null,
    reviewCount: null,
    latitude: null,
    longitude: null,
  };

  describe('toResponse', () => {
    it('should NOT include id (internal only)', () => {
      const result = OutletPublicDTO.toResponse(mockOutlet);
      expect(result).not.toHaveProperty('id');
    });

    it('should include name, slug, address, and optional fields', () => {
      const result = OutletPublicDTO.toResponse(mockOutlet);

      expect(result).toHaveProperty('name', 'Laundry ABC');
      expect(result).toHaveProperty('slug', 'laundry-abc');
      expect(result).toHaveProperty('address', 'Jl. Contoh');
      expect(result).toHaveProperty('description', 'Desc');
      expect(result).toHaveProperty('contactPhone', '6281234567890');
      expect(result).toHaveProperty('logoUrl', 'https://a.com/logo.png');
    });

    it('should use null for optional null fields', () => {
      const withNulls: OutletPublicRecord = {
        ...mockOutlet,
        description: null,
        contactPhone: null,
        businessHours: null,
        seoTitle: null,
        seoDescription: null,
        logoUrl: null,
        coverUrl: null,
        ratingValue: null,
        reviewCount: null,
        latitude: null,
        longitude: null,
      };
      const result = OutletPublicDTO.toResponse(withNulls);
      expect(result.description).toBeNull();
      expect(result.logoUrl).toBeNull();
    });
  });
});
