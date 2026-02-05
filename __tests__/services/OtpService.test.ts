/**
 * OtpService unit tests (mocked prisma and WhatsApp)
 */

import { vi } from 'vitest';
import { OtpService } from '@/services/auth/OtpService';
import { OtpType } from '@/generated/prisma';

const mockUpdateMany = vi.fn();
const mockCreate = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    otpCode: {
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
  },
}));

const mockSendOtp = vi.fn();
vi.mock('@/services/whatsapp/WhatsAppServiceFactory', () => ({
  getWhatsAppService: () => ({
    sendOtp: mockSendOtp,
  }),
}));

describe('OtpService', () => {
  const service = new OtpService();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendOtp.mockResolvedValue(true);
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockCreate.mockResolvedValue({
      id: 'otp-1',
      phone: '6281234567890',
      code: '123456',
      type: OtpType.REGISTER,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      isUsed: false,
    });
    mockFindFirst.mockResolvedValue({
      id: 'otp-1',
      phone: '6281234567890',
      code: '123456',
      type: OtpType.REGISTER,
      isUsed: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    mockUpdate.mockResolvedValue({});
  });

  describe('generateOtp', () => {
    it('should normalize phone and create OTP record', async () => {
      const code = await service.generateOtp('081234567890', OtpType.REGISTER);

      expect(code).toMatch(/^\d{6}$/);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '6281234567890',
            type: OtpType.REGISTER,
            isUsed: false,
          }),
        })
      );
      expect(mockSendOtp).toHaveBeenCalledWith('+6281234567890', code);
    });

    it('should throw when WhatsApp send fails', async () => {
      mockSendOtp.mockResolvedValueOnce(false);

      await expect(service.generateOtp('6281234567890', OtpType.REGISTER)).rejects.toThrow(
        'Failed to send OTP via WhatsApp'
      );
    });
  });

  describe('verifyOtp', () => {
    it('should return true when valid OTP found and mark as used', async () => {
      const result = await service.verifyOtp('6281234567890', '123456', OtpType.REGISTER);

      expect(result).toBe(true);
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            phone: '6281234567890',
            code: '123456',
            type: OtpType.REGISTER,
            isUsed: false,
            expiresAt: expect.any(Object),
          },
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'otp-1' },
          data: { isUsed: true },
        })
      );
    });

    it('should return false when no OTP found', async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      const result = await service.verifyOtp('6281234567890', '000000', OtpType.REGISTER);

      expect(result).toBe(false);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return remaining and resetAt', () => {
      const info = service.getRateLimitInfo('6281234567890');
      expect(info).toHaveProperty('remaining');
      expect(info).toHaveProperty('resetAt');
      expect(info.remaining).toBeGreaterThanOrEqual(0);
      expect(info.remaining).toBeLessThanOrEqual(3);
    });
  });

  describe('cleanupExpiredOtps', () => {
    it('should delete expired OTPs and return count', async () => {
      mockDeleteMany.mockResolvedValueOnce({ count: 5 });

      const count = await service.cleanupExpiredOtps();
      expect(count).toBe(5);
      expect(mockDeleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { expiresAt: { lt: expect.any(Date) } },
        })
      );
    });
  });
});
