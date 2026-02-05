/**
 * OutletLandingPageDTO Tests (OWNER settings - no overclaim)
 */

import { OutletLandingPageDTO, OutletLandingPageRecord } from '@/dto/OutletLandingPageDTO';

describe('OutletLandingPageDTO', () => {
  const mockOutlet: OutletLandingPageRecord = {
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
  };

  describe('toResponse', () => {
    it('should return all landing page fields with empty string for null', () => {
      const withNulls = {
        ...mockOutlet,
        description: null,
        contactPhone: null,
        businessHours: null,
        seoTitle: null,
        seoDescription: null,
        logoUrl: null,
        coverUrl: null,
      };
      const result = OutletLandingPageDTO.toResponse(withNulls);

      expect(result).toHaveProperty('id', 'outlet-1');
      expect(result).toHaveProperty('name', 'Laundry ABC');
      expect(result).toHaveProperty('slug', 'laundry-abc');
      expect(result.description).toBe('');
      expect(result.contactPhone).toBe('');
      expect(result.logoUrl).toBe('');
    });
  });
});
