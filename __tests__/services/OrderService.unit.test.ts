/**
 * Unit tests for OrderService (no DB).
 */

import { describe, expect, it, vi } from 'vitest';
import { Role, PaymentStatus } from '@/generated/prisma';
import { OrderService } from '@/services/OrderService';

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<any>('@/lib/utils');
  return {
    ...actual,
    generateTrackingCode: () => 'ABCD1234',
    normalizePhoneNumber: (v: string) => v.replace(/\D/g, ''),
  };
});

describe('OrderService (unit)', () => {
  const makeUser = (role: Role) => ({
    userId: 'u1',
    outletId: 'outlet-1',
    role,
    phone: '6281234567890',
  });

  it('createOrder: paid=true -> paymentStatus SETTLEMENT + paidAt terisi', async () => {
    const serviceRepo: any = {
      findById: vi.fn(async (_outletId: string, _id: string) => ({
        id: 'svc-1',
        outletId: 'outlet-1',
        name: 'Cuci Kiloan',
        type: 'KILOAN',
        price: 12000,
        unit: 'kg',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    const orderRepo: any = {
      findByTrackingCode: vi.fn(async () => null),
      createWithItems: vi.fn(async (_outletId: string, data: any, items: any[]) => ({
        id: 'order-1',
        ...data,
        items,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      })),
    };

    const svc = new OrderService(orderRepo, serviceRepo);
    const created = await svc.createOrder(makeUser(Role.STAFF) as any, {
      paid: true,
      items: [{ serviceId: 'svc-1', quantity: 1.5 }],
      paymentNote: 'dibayar tunai',
    });

    expect(orderRepo.createWithItems).toHaveBeenCalled();
    const passedData = orderRepo.createWithItems.mock.calls[0][1];
    expect(passedData.paymentStatus).toBe(PaymentStatus.SETTLEMENT);
    expect(passedData.paidAt).toBeInstanceOf(Date);
    expect(passedData.paymentMethod).toBeNull();
    expect(passedData.totalAmount).toBe(18000);
    expect(created.trackingCode).toBe('ABCD1234');
  });

  it('createOrder: paid=false -> paymentStatus UNPAID + paidAt null', async () => {
    const serviceRepo: any = {
      findById: vi.fn(async () => ({
        id: 'svc-1',
        outletId: 'outlet-1',
        name: 'Paket Express',
        type: 'PAKET',
        price: 50000,
        unit: 'paket',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    const orderRepo: any = {
      findByTrackingCode: vi.fn(async () => null),
      createWithItems: vi.fn(async (_outletId: string, data: any) => ({
        id: 'order-1',
        ...data,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      })),
    };

    const svc = new OrderService(orderRepo, serviceRepo);
    await svc.createOrder(makeUser(Role.OWNER) as any, {
      paid: false,
      items: [{ serviceId: 'svc-1', quantity: 1 }],
    });

    const passedData = orderRepo.createWithItems.mock.calls[0][1];
    expect(passedData.paymentStatus).toBe(PaymentStatus.UNPAID);
    expect(passedData.paidAt).toBeNull();
  });

  it('createOrder: SATUAN/PAKET tidak boleh qty desimal', async () => {
    const serviceRepo: any = {
      findById: vi.fn(async () => ({
        id: 'svc-1',
        outletId: 'outlet-1',
        name: 'Setrika Satuan',
        type: 'SATUAN',
        price: 5000,
        unit: 'pcs',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    const orderRepo: any = {
      findByTrackingCode: vi.fn(async () => null),
      createWithItems: vi.fn(),
    };

    const svc = new OrderService(orderRepo, serviceRepo);
    await expect(
      svc.createOrder(makeUser(Role.STAFF) as any, {
        paid: false,
        items: [{ serviceId: 'svc-1', quantity: 1.5 }],
      })
    ).rejects.toThrow('Qty untuk layanan satuan/paket harus bilangan bulat');
  });
});

