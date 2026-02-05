/**
 * InvoiceDTO Tests (invoice/struk internal - outlet info, DP, items)
 */

import { InvoiceDTO } from '@/dto/InvoiceDTO';
import type { OrderInvoicePayload } from '@/dto/InvoiceDTO';

describe('InvoiceDTO', () => {
  const mockOrder: OrderInvoicePayload = {
    id: 'order-1',
    trackingCode: 'ABC123',
    status: 'WASHING',
    paymentStatus: 'UNPAID',
    paymentMethod: 'CASH',
    totalAmount: 50000,
    paidAt: null,
    paymentNote: null,
    customerName: 'Budi',
    customerPhone: '6281234567890',
    notes: null,
    outletId: 'outlet-1',
    createdAt: new Date('2026-01-24T10:00:00Z'),
    updatedAt: new Date('2026-01-24T10:00:00Z'),
    completedAt: null,
    outlet: {
      id: 'outlet-1',
      name: 'Laundry ABC',
      slug: 'laundry-abc',
      address: 'Jl. Contoh',
      contactPhone: '6281234567890',
    },
    items: [
      {
        id: 'item-1',
        orderId: 'order-1',
        serviceId: 'svc-1',
        serviceName: 'Cuci Kiloan',
        serviceType: 'KILOAN',
        serviceUnit: 'kg',
        quantity: 2,
        unitPrice: 10000,
        subtotal: 20000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    statusHistory: [
      {
        id: 'h1',
        orderId: 'order-1',
        fromStatus: 'QUEUED',
        toStatus: 'WASHING',
        createdAt: new Date(),
        changedById: 'u1',
        changedByUser: { id: 'u1', name: 'Staff A', phone: '628xxx' },
      },
    ],
  } as unknown as OrderInvoicePayload;

  describe('toResponse', () => {
    it('should include outlet and items', () => {
      const result = InvoiceDTO.toResponse(mockOrder);

      expect(result).toHaveProperty('id', 'order-1');
      expect(result).toHaveProperty('trackingCode', 'ABC123');
      expect(result).toHaveProperty('totalAmount', 50000);
      expect(result).toHaveProperty('customerPhone', '6281234567890');
      expect(result.outlet).toEqual({
        id: 'outlet-1',
        name: 'Laundry ABC',
        slug: 'laundry-abc',
        address: 'Jl. Contoh',
        contactPhone: '6281234567890',
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].serviceName).toBe('Cuci Kiloan');
    });

    it('should compute remainingAmount and staffName', () => {
      const result = InvoiceDTO.toResponse(mockOrder);
      expect(result.remainingAmount).toBe(50000);
      expect(result.staffName).toBe('Staff A');
    });
  });
});
