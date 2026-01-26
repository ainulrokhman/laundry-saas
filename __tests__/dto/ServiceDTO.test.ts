/**
 * ServiceDTO Tests
 * 
 * Tests for Service DTO pattern to ensure:
 * - Sensitive data is scrubbed
 * - Public responses filter inactive services
 * - Array transformations work correctly
 */

import { ServiceDTO, ServiceWithRelations } from '@/dto/ServiceDTO';

describe('ServiceDTO', () => {
  const mockService: ServiceWithRelations = {
    id: 'service-123',
    outletId: 'outlet-123',
    name: 'Cuci Kiloan',
    type: 'KILOAN',
    price: 5000,
    unit: 'kg',
    description: 'Cuci per kilogram',
    isActive: true,
    createdAt: new Date('2026-01-24T10:00:00Z'),
    updatedAt: new Date('2026-01-24T10:00:00Z'),
  };

  describe('toResponse', () => {
    it('should transform service to response format with all fields', () => {
      const result = ServiceDTO.toResponse(mockService);

      expect(result).toHaveProperty('id', 'service-123');
      expect(result).toHaveProperty('name', 'Cuci Kiloan');
      expect(result).toHaveProperty('type', 'KILOAN');
      expect(result).toHaveProperty('price', 5000);
      expect(result).toHaveProperty('unit', 'kg');
      expect(result).toHaveProperty('description', 'Cuci per kilogram');
      expect(result).toHaveProperty('isActive', true);
      expect(result.createdAt).toBe('2026-01-24T10:00:00.000Z');
      expect(result.updatedAt).toBe('2026-01-24T10:00:00.000Z');
    });

    it('should include outlet info if available', () => {
      const serviceWithOutlet = {
        ...mockService,
        outlet: {
          id: 'outlet-123',
          name: 'Laundry ABC',
          slug: 'laundry-abc',
        },
      };
      const result = ServiceDTO.toResponse(serviceWithOutlet);

      expect(result).toHaveProperty('outlet');
      expect(result.outlet).toEqual({
        id: 'outlet-123',
        name: 'Laundry ABC',
        slug: 'laundry-abc',
      });
    });

    it('should handle null unit and description', () => {
      const serviceWithoutOptional = {
        ...mockService,
        unit: null,
        description: null,
      };
      const result = ServiceDTO.toResponse(serviceWithoutOptional);

      expect(result.unit).toBeNull();
      expect(result.description).toBeNull();
    });

    it('should handle inactive service', () => {
      const inactiveService = { ...mockService, isActive: false };
      const result = ServiceDTO.toResponse(inactiveService);

      expect(result.isActive).toBe(false);
    });

    it('should not include outletId in response', () => {
      const result = ServiceDTO.toResponse(mockService);

      expect(result).not.toHaveProperty('outletId');
    });
  });

  describe('toPublicResponse', () => {
    it('should return service data for active service', () => {
      const result = ServiceDTO.toPublicResponse(mockService);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id', 'service-123');
      expect(result).toHaveProperty('name', 'Cuci Kiloan');
      expect(result).toHaveProperty('type', 'KILOAN');
      expect(result).toHaveProperty('price', 5000);
      expect(result).toHaveProperty('unit', 'kg');
      expect(result).toHaveProperty('description', 'Cuci per kilogram');
    });

    it('should return null for inactive service', () => {
      const inactiveService = { ...mockService, isActive: false };
      const result = ServiceDTO.toPublicResponse(inactiveService);

      expect(result).toBeNull();
    });

    it('should NOT include sensitive fields in public response', () => {
      const result = ServiceDTO.toPublicResponse(mockService);

      expect(result).not.toHaveProperty('outletId');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('isActive');
      expect(result).not.toHaveProperty('outlet');
    });

    it('should handle null unit and description in public response', () => {
      const serviceWithoutOptional = {
        ...mockService,
        unit: null,
        description: null,
      };
      const result = ServiceDTO.toPublicResponse(serviceWithoutOptional);

      expect(result).not.toBeNull();
      expect(result?.unit).toBeNull();
      expect(result?.description).toBeNull();
    });
  });

  describe('toResponseArray', () => {
    it('should transform array of services', () => {
      const services = [
        mockService,
        { ...mockService, id: 'service-456', name: 'Setrika Satuan' },
      ];
      const result = ServiceDTO.toResponseArray(services);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('service-123');
      expect(result[1].id).toBe('service-456');
      expect(result[1].name).toBe('Setrika Satuan');
    });

    it('should handle empty array', () => {
      const result = ServiceDTO.toResponseArray([]);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should include both active and inactive services', () => {
      const services = [
        mockService,
        { ...mockService, id: 'service-456', isActive: false },
      ];
      const result = ServiceDTO.toResponseArray(services);

      expect(result).toHaveLength(2);
      expect(result[0].isActive).toBe(true);
      expect(result[1].isActive).toBe(false);
    });
  });

  describe('toPublicResponseArray', () => {
    it('should filter out inactive services', () => {
      const services = [
        mockService,
        { ...mockService, id: 'service-456', isActive: false },
        { ...mockService, id: 'service-789', isActive: true },
      ];
      const result = ServiceDTO.toPublicResponseArray(services);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('service-123');
      expect(result[1].id).toBe('service-789');
    });

    it('should return empty array if all services are inactive', () => {
      const services = [
        { ...mockService, id: 'service-1', isActive: false },
        { ...mockService, id: 'service-2', isActive: false },
      ];
      const result = ServiceDTO.toPublicResponseArray(services);

      expect(result).toHaveLength(0);
    });

    it('should return all services if all are active', () => {
      const services = [
        mockService,
        { ...mockService, id: 'service-456', isActive: true },
      ];
      const result = ServiceDTO.toPublicResponseArray(services);

      expect(result).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const result = ServiceDTO.toPublicResponseArray([]);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should not include sensitive fields in public response array', () => {
      const services = [mockService];
      const result = ServiceDTO.toPublicResponseArray(services);

      expect(result[0]).not.toHaveProperty('outletId');
      expect(result[0]).not.toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('updatedAt');
      expect(result[0]).not.toHaveProperty('isActive');
    });
  });

  describe('Data Scrubbing', () => {
    it('should ensure all dates are ISO strings', () => {
      const result = ServiceDTO.toResponse(mockService);

      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
    });

    it('should not expose internal database fields', () => {
      const serviceWithExtraFields = {
        ...mockService,
        _count: { orders: 5 },
        outlet: undefined,
      } as any;
      const result = ServiceDTO.toResponse(serviceWithExtraFields);

      expect(result).not.toHaveProperty('_count');
      expect(result).not.toHaveProperty('outletId');
    });
  });
});
