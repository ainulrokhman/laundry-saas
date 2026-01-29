/**
 * Unit Tests for SubscriptionPaymentService
 *
 * Tests business logic for subscription payment verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionPaymentService } from '@/services/admin/SubscriptionPaymentService';
import { TransactionRepository } from '@/repositories/TransactionRepository';
import { PaymentStatus, TransType } from '@/generated/prisma';
import { securityLogService, SecurityEventType } from '@/services/security/SecurityLogService';

// Mock dependencies
vi.mock('@/repositories/TransactionRepository');
vi.mock('@/services/security/SecurityLogService');

describe('SubscriptionPaymentService', () => {
    let service: SubscriptionPaymentService;
    let mockTransactionRepo: any;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Create mock repository
        mockTransactionRepo = {
            findSubscriptionPayments: vi.fn(),
            findSubscriptionPaymentById: vi.fn(),
            updatePaymentStatus: vi.fn(),
            getSubscriptionPaymentStats: vi.fn(),
        };

        // Inject mock repository
        service = new SubscriptionPaymentService();
        (service as any).transactionRepo = mockTransactionRepo;
    });

    describe('getPayments', () => {
        it('should return paginated payments with default pagination', async () => {
            const mockData = [
                {
                    id: 'payment-1',
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    createdAt: new Date(),
                },
            ];

            mockTransactionRepo.findSubscriptionPayments.mockResolvedValue({
                data: mockData,
                total: 1,
            });

            const result = await service.getPayments();

            expect(result.data).toEqual(mockData);
            expect(result.pagination).toEqual({
                page: 1,
                limit: 50,
                total: 1,
                totalPages: 1,
            });
            expect(mockTransactionRepo.findSubscriptionPayments).toHaveBeenCalledWith({
                status: undefined,
                page: 1,
                limit: 50,
                search: undefined,
            });
        });

        it('should filter payments by status', async () => {
            mockTransactionRepo.findSubscriptionPayments.mockResolvedValue({
                data: [],
                total: 0,
            });

            await service.getPayments({ status: PaymentStatus.PENDING });

            expect(mockTransactionRepo.findSubscriptionPayments).toHaveBeenCalledWith({
                status: PaymentStatus.PENDING,
                page: 1,
                limit: 50,
                search: undefined,
            });
        });

        it('should handle custom pagination', async () => {
            mockTransactionRepo.findSubscriptionPayments.mockResolvedValue({
                data: [],
                total: 150,
            });

            const result = await service.getPayments({ page: 2, limit: 20 });

            expect(result.pagination).toEqual({
                page: 2,
                limit: 20,
                total: 150,
                totalPages: 8, // Math.ceil(150 / 20)
            });
        });
    });

    describe('getPaymentById', () => {
        it('should return payment details', async () => {
            const mockPayment = {
                id: 'payment-1',
                type: TransType.SUBSCRIPTION,
                amount: 100000,
                status: PaymentStatus.PENDING,
                createdAt: new Date(),
            };

            mockTransactionRepo.findSubscriptionPaymentById.mockResolvedValue(mockPayment);

            const result = await service.getPaymentById('payment-1');

            expect(result).toEqual(mockPayment);
            expect(mockTransactionRepo.findSubscriptionPaymentById).toHaveBeenCalledWith('payment-1');
        });

        it('should throw error if payment not found', async () => {
            mockTransactionRepo.findSubscriptionPaymentById.mockResolvedValue(null);

            await expect(service.getPaymentById('invalid-id')).rejects.toThrow('Payment not found');
        });

        it('should throw error if payment is not subscription type', async () => {
            const mockPayment = {
                id: 'payment-1',
                type: TransType.LAUNDRY_ORDER,
                amount: 100000,
                status: PaymentStatus.PENDING,
            };

            mockTransactionRepo.findSubscriptionPaymentById.mockResolvedValue(mockPayment);

            await expect(service.getPaymentById('payment-1')).rejects.toThrow(
                'Transaction is not a subscription payment'
            );
        });
    });

    describe('approvePayment', () => {
        it('should approve pending payment and log action', async () => {
            const mockPayment = {
                id: 'payment-1',
                type: TransType.SUBSCRIPTION,
                amount: 100000,
                status: PaymentStatus.PENDING,
                outletId: 'outlet-1',
                createdAt: new Date(),
            };

            const mockUpdated = {
                ...mockPayment,
                status: PaymentStatus.SETTLEMENT,
                settledAt: new Date(),
            };

            mockTransactionRepo.findSubscriptionPaymentById.mockResolvedValue(mockPayment);
            mockTransactionRepo.updatePaymentStatus.mockResolvedValue(mockUpdated);
            vi.spyOn(securityLogService, 'logEvent').mockResolvedValue(undefined as any);

            const result = await service.approvePayment('payment-1', 'admin-user-1');

            expect(result.status).toBe(PaymentStatus.SETTLEMENT);
            expect(mockTransactionRepo.updatePaymentStatus).toHaveBeenCalledWith(
                'payment-1',
                PaymentStatus.SETTLEMENT,
                expect.any(Date)
            );
            expect(securityLogService.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: SecurityEventType.ADMIN_USER_UPDATE,
                    userId: 'admin-user-1',
                    success: true,
                    metadata: expect.objectContaining({
                        action: 'APPROVE_SUBSCRIPTION_PAYMENT',
                        resourceId: 'payment-1',
                    }),
                })
            );
        });

        it('should throw error if payment is not pending', async () => {
            const mockPayment = {
                id: 'payment-1',
                type: TransType.SUBSCRIPTION,
                amount: 100000,
                status: PaymentStatus.SETTLEMENT,
                createdAt: new Date(),
            };

            mockTransactionRepo.findSubscriptionPaymentById.mockResolvedValue(mockPayment);

            await expect(service.approvePayment('payment-1', 'admin-user-1')).rejects.toThrow(
                'Cannot approve payment with status: SETTLEMENT'
            );
        });
    });

    describe('rejectPayment', () => {
        it('should reject pending payment and log action with reason', async () => {
            const mockPayment = {
                id: 'payment-1',
                type: TransType.SUBSCRIPTION,
                amount: 100000,
                status: PaymentStatus.PENDING,
                outletId: 'outlet-1',
                createdAt: new Date(),
            };

            const mockUpdated = {
                ...mockPayment,
                status: PaymentStatus.FAILURE,
            };

            mockTransactionRepo.findSubscriptionPaymentById.mockResolvedValue(mockPayment);
            mockTransactionRepo.updatePaymentStatus.mockResolvedValue(mockUpdated);
            vi.spyOn(securityLogService, 'logEvent').mockResolvedValue(undefined as any);

            const result = await service.rejectPayment('payment-1', 'admin-user-1', 'Bukti tidak jelas');

            expect(result.status).toBe(PaymentStatus.FAILURE);
            expect(mockTransactionRepo.updatePaymentStatus).toHaveBeenCalledWith(
                'payment-1',
                PaymentStatus.FAILURE
            );
            expect(securityLogService.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: SecurityEventType.ADMIN_USER_UPDATE,
                    userId: 'admin-user-1',
                    success: true,
                    metadata: expect.objectContaining({
                        action: 'REJECT_SUBSCRIPTION_PAYMENT',
                        resourceId: 'payment-1',
                        reason: 'Bukti tidak jelas',
                    }),
                })
            );
        });

        it('should use default reason if not provided', async () => {
            const mockPayment = {
                id: 'payment-1',
                type: TransType.SUBSCRIPTION,
                amount: 100000,
                status: PaymentStatus.PENDING,
                outletId: 'outlet-1',
                createdAt: new Date(),
            };

            mockTransactionRepo.findSubscriptionPaymentById.mockResolvedValue(mockPayment);
            mockTransactionRepo.updatePaymentStatus.mockResolvedValue({
                ...mockPayment,
                status: PaymentStatus.FAILURE,
            });
            vi.spyOn(securityLogService, 'logEvent').mockResolvedValue(undefined as any);

            await service.rejectPayment('payment-1', 'admin-user-1');

            expect(securityLogService.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        reason: 'No reason provided',
                    }),
                })
            );
        });

        it('should throw error if payment is not pending', async () => {
            const mockPayment = {
                id: 'payment-1',
                type: TransType.SUBSCRIPTION,
                amount: 100000,
                status: PaymentStatus.FAILURE,
                createdAt: new Date(),
            };

            mockTransactionRepo.findSubscriptionPaymentById.mockResolvedValue(mockPayment);

            await expect(service.rejectPayment('payment-1', 'admin-user-1')).rejects.toThrow(
                'Cannot reject payment with status: FAILURE'
            );
        });
    });

    describe('getStats', () => {
        it('should return payment statistics', async () => {
            const mockStats = {
                pending: 5,
                approved: 10,
                rejected: 2,
                total: 17,
            };

            mockTransactionRepo.getSubscriptionPaymentStats.mockResolvedValue(mockStats);

            const result = await service.getStats();

            expect(result).toEqual(mockStats);
            expect(mockTransactionRepo.getSubscriptionPaymentStats).toHaveBeenCalled();
        });
    });
});
