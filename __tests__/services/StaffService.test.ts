/**
 * StaffService unit tests (mocked UserRepository and PackageFeatureService)
 */

import { vi } from 'vitest';
import { StaffService, StaffServiceError } from '@/services/StaffService';
import { Role } from '@/generated/prisma';

const mockFindAll = vi.fn();
const mockFindById = vi.fn();
const mockFindByPhone = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

const mockCanAddStaff = vi.fn();

vi.mock('@/repositories/UserRepository', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findAll: mockFindAll,
    findById: mockFindById,
    findByPhone: mockFindByPhone,
    create: mockCreate,
    update: mockUpdate,
  })),
}));

vi.mock('@/services/PackageFeatureService', () => ({
  PackageFeatureService: vi.fn().mockImplementation(() => ({
    canAddStaff: mockCanAddStaff,
  })),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn((pin: string) => Promise.resolve(`$2a$10$hashed.${pin}`)),
  },
}));

describe('StaffService', () => {
  const service = new StaffService();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanAddStaff.mockResolvedValue(true);
    mockFindByPhone.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'user-1',
      phone: '6281234567890',
      name: 'Staff A',
      role: Role.STAFF,
      outletId: 'outlet-1',
      isActive: true,
    });
    mockFindById.mockResolvedValue({
      id: 'user-1',
      phone: '6281234567890',
      name: 'Staff A',
      role: Role.STAFF,
      outletId: 'outlet-1',
      isActive: true,
      outlet: { id: 'outlet-1', name: 'Outlet', slug: 'outlet' },
    });
    mockFindAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 });
  });

  describe('listStaffByOutletId', () => {
    it('should return staff list for outlet', async () => {
      const staff = [
        { id: 'u1', name: 'Staff 1', role: Role.STAFF, outletId: 'outlet-1', outlet: null },
      ];
      mockFindAll.mockResolvedValueOnce({ data: staff, total: 1, page: 1, limit: 200 });

      const result = await service.listStaffByOutletId('outlet-1');
      expect(result).toHaveLength(1);
      expect(mockFindAll).toHaveBeenCalledWith(
        { role: Role.STAFF, outletId: 'outlet-1' },
        { page: 1, limit: 200 }
      );
    });
  });

  describe('getStaffById', () => {
    it('should return staff when found and belongs to outlet', async () => {
      const result = await service.getStaffById('outlet-1', 'user-1');
      expect(result).toBeTruthy();
      expect(result.outletId).toBe('outlet-1');
      expect(result.role).toBe(Role.STAFF);
    });

    it('should throw NOT_FOUND when user not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.getStaffById('outlet-1', 'user-1')).rejects.toThrow(StaffServiceError);
      await expect(service.getStaffById('outlet-1', 'user-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw NOT_FOUND when user belongs to different outlet', async () => {
      mockFindById.mockResolvedValueOnce({
        id: 'user-1',
        role: Role.STAFF,
        outletId: 'outlet-2',
      });

      await expect(service.getStaffById('outlet-1', 'user-1')).rejects.toThrow(StaffServiceError);
    });
  });

  describe('createStaff', () => {
    it('should throw VALIDATION when name too short', async () => {
      await expect(
        service.createStaff({
          outletId: 'outlet-1',
          phone: '6281234567890',
          name: 'A',
          pin: '1234',
        })
      ).rejects.toMatchObject({ code: 'VALIDATION', message: expect.stringContaining('Nama minimal') });
    });

    it('should throw VALIDATION when PIN not 4-6 digits', async () => {
      await expect(
        service.createStaff({
          outletId: 'outlet-1',
          phone: '6281234567890',
          name: 'Staff A',
          pin: '12',
        })
      ).rejects.toMatchObject({ code: 'VALIDATION', message: expect.stringContaining('PIN') });
    });

    it('should throw DUPLICATE_PHONE when phone already registered', async () => {
      mockFindByPhone.mockResolvedValueOnce({ id: 'existing', phone: '6281234567890' });

      await expect(
        service.createStaff({
          outletId: 'outlet-1',
          phone: '6281234567890',
          name: 'Staff A',
          pin: '1234',
        })
      ).rejects.toMatchObject({ code: 'DUPLICATE_PHONE' });
    });

    it('should throw LIMIT_REACHED when package cannot add staff', async () => {
      mockCanAddStaff.mockResolvedValueOnce(false);

      await expect(
        service.createStaff({
          outletId: 'outlet-1',
          phone: '6281234567890',
          name: 'Staff A',
          pin: '1234',
        })
      ).rejects.toMatchObject({ code: 'LIMIT_REACHED' });
    });

    it('should create staff when input valid', async () => {
      const result = await service.createStaff({
        outletId: 'outlet-1',
        phone: '081234567890',
        name: 'Staff A',
        pin: '1234',
      });

      expect(result).toBeTruthy();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '6281234567890',
          name: 'Staff A',
          role: Role.STAFF,
          outletId: 'outlet-1',
        })
      );
    });
  });

  describe('updateStaff', () => {
    it('should throw SELF_DEACTIVATE_NOT_ALLOWED when staff deactivates self', async () => {
      await expect(
        service.updateStaff({
          outletId: 'outlet-1',
          staffId: 'user-1',
          actorUserId: 'user-1',
          isActive: false,
        })
      ).rejects.toMatchObject({ code: 'SELF_DEACTIVATE_NOT_ALLOWED' });
    });

    it('should throw NOT_FOUND when staff not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(
        service.updateStaff({
          outletId: 'outlet-1',
          staffId: 'user-1',
          actorUserId: 'other',
          name: 'Updated',
        })
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should update staff when valid', async () => {
      mockUpdate.mockResolvedValueOnce({
        id: 'user-1',
        name: 'Updated Name',
        phone: '6281234567890',
        role: Role.STAFF,
        outletId: 'outlet-1',
      });

      const result = await service.updateStaff({
        outletId: 'outlet-1',
        staffId: 'user-1',
        actorUserId: 'other',
        name: 'Updated Name',
      });

      expect(result).toBeTruthy();
      expect(mockUpdate).toHaveBeenCalledWith('user-1', expect.objectContaining({ name: 'Updated Name' }));
    });
  });
});
