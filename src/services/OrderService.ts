/**
 * Order Service (POS)
 *
 * Business logic untuk pembuatan & pengelolaan order laundry (bookkeeping pembayaran).
 */

import { BaseService } from './BaseService';
import { SessionUser } from '@/lib/session';
import { OrderStatus, PaymentStatus, Prisma } from '@/generated/prisma';
import { generateTrackingCode, normalizePhoneNumber } from '@/lib/utils';
import { OrderRepository } from '@/repositories/OrderRepository';
import { OrderStatusHistoryRepository } from '@/repositories/OrderStatusHistoryRepository';
import { ServiceRepository } from '@/repositories/ServiceRepository';

export type CreateOrderItemInput = {
  serviceId: string;
  quantity: number;
  unitPrice?: number; // optional override
};

export type CreateOrderInput = {
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items: CreateOrderItemInput[];
  paid: boolean;
  paidAt?: string; // ISO (opsional; jika kosong dan paid=true akan di-set now)
  paymentNote?: string;
  dpAmount?: number;
  dpNote?: string;
};

export type UpdateOrderPaymentInput = {
  paid: boolean;
  paidAt?: string; // ISO
  paymentNote?: string;
};

export type UpdateOrderDpInput = {
  dpAmount: number;
  dpPaidAt?: string; // ISO
  dpNote?: string;
};

function isIntegerLike(n: number): boolean {
  return Number.isInteger(n);
}

function roundIdr(value: number): number {
  // Hindari floating error dan tetap gunakan rupiah tanpa desimal
  return Math.round(value);
}

export class OrderService extends BaseService {
  constructor(
    private orderRepository: OrderRepository = new OrderRepository(),
    private serviceRepository: ServiceRepository = new ServiceRepository(),
    private orderStatusHistoryRepository: OrderStatusHistoryRepository = new OrderStatusHistoryRepository()
  ) {
    super();
  }

  async createOrder(user: SessionUser | null, input: CreateOrderInput) {
    this.requireRole(user, ['OWNER', 'STAFF']);
    const outletId = this.getOutletId(user);

    if (!input.items || input.items.length === 0) {
      throw new Error('Minimal satu layanan harus dipilih');
    }

    const customerName = input.customerName?.trim() || undefined;
    const customerPhoneRaw = input.customerPhone?.trim() || undefined;
    const notes = input.notes?.trim() || undefined;
    const paymentNote = input.paymentNote?.trim() || undefined;

    const customerPhone = customerPhoneRaw ? normalizePhoneNumber(customerPhoneRaw) : undefined;

    // Validasi + build items dengan snapshot data dari Service
    const items: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    let totalAmount = 0;

    for (const rawItem of input.items) {
      const qty = Number(rawItem.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error('Qty layanan tidak valid');
      }

      const service = await this.serviceRepository.findById(outletId, rawItem.serviceId);
      if (!service) {
        throw new Error('Layanan tidak ditemukan');
      }
      if (!service.isActive) {
        throw new Error('Layanan tidak aktif');
      }

      if (service.type !== 'KILOAN' && !isIntegerLike(qty)) {
        throw new Error('Qty untuk layanan satuan/paket harus bilangan bulat');
      }

      const unitPrice = rawItem.unitPrice !== undefined ? Number(rawItem.unitPrice) : Number(service.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error('Harga layanan tidak valid');
      }

      const subtotal = roundIdr(qty * unitPrice);
      totalAmount += subtotal;

      items.push({
        service: { connect: { id: service.id } },
        serviceName: service.name,
        serviceType: service.type,
        serviceUnit: service.unit ?? null,
        quantity: qty,
        unitPrice: roundIdr(unitPrice),
        subtotal,
      });
    }

    // Handle DP payment
    const dpAmount = input.dpAmount ? roundIdr(Number(input.dpAmount)) : 0;
    const dpNote = input.dpNote?.trim() || null;
    const dpPaidAt = dpAmount > 0 ? new Date() : null;

    // Determine payment status based on DP and total
    let paymentStatus: PaymentStatus;
    let paidAt: Date | null = null;

    if (input.paid) {
      // Marked as fully paid
      paymentStatus = PaymentStatus.SETTLEMENT;
      paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
    } else if (dpAmount > 0 && dpAmount >= roundIdr(totalAmount)) {
      // DP covers full amount
      paymentStatus = PaymentStatus.SETTLEMENT;
      paidAt = new Date();
    } else if (dpAmount > 0) {
      // Partial DP
      paymentStatus = PaymentStatus.PENDING;
    } else {
      // No payment
      paymentStatus = PaymentStatus.UNPAID;
    }

    // Create order + items. trackingCode harus unik.
    for (let attempt = 0; attempt < 10; attempt++) {
      const trackingCode = generateTrackingCode(8);
      const exists = await this.orderRepository.findByTrackingCode(outletId, trackingCode);
      if (exists) continue;

      try {
        return await this.orderRepository.createWithItems(
          outletId,
          {
            trackingCode,
            status: 'QUEUED',
            paymentStatus,
            paymentMethod: null,
            paidAt,
            paymentNote,
            totalAmount: roundIdr(totalAmount),
            dpAmount,
            dpPaidAt,
            dpNote,
            customerName,
            customerPhone,
            notes,
            completedAt: null,
          } as any,
          items
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('trackingcode')) {
          continue;
        }
        throw e;
      }
    }

    throw new Error('Gagal membuat tracking code unik. Silakan coba lagi.');
  }

  async setPaymentStatus(user: SessionUser | null, orderId: string, input: UpdateOrderPaymentInput) {
    this.requireRole(user, ['OWNER', 'STAFF']);
    const outletId = this.getOutletId(user);

    const paidAt = input.paid
      ? (input.paidAt ? new Date(input.paidAt) : new Date())
      : null;

    const existing = await this.orderRepository.findById(outletId, orderId);
    if (!existing) {
      throw new Error('Order tidak ditemukan');
    }
    const existingDpAmount = roundIdr(Number((existing as any).dpAmount ?? 0));

    const paymentStatus = input.paid
      ? PaymentStatus.SETTLEMENT
      : existingDpAmount > 0
        ? PaymentStatus.PENDING
        : PaymentStatus.UNPAID;
    const paymentNote = input.paymentNote?.trim() || null;

    return await this.orderRepository.update(outletId, orderId, {
      paymentStatus,
      paidAt,
      paymentNote,
      // Tetap bookkeeping: jangan set paymentMethod untuk order laundry
      paymentMethod: null,
    } as any);
  }

  async setDownPayment(user: SessionUser | null, orderId: string, input: UpdateOrderDpInput) {
    this.requireRole(user, ['OWNER', 'STAFF']);
    const outletId = this.getOutletId(user);

    const order = await this.orderRepository.findById(outletId, orderId);
    if (!order) {
      throw new Error('Order tidak ditemukan');
    }

    const totalAmount = roundIdr(Number(order.totalAmount));
    const dpAmount = roundIdr(Number(input.dpAmount));
    if (!Number.isFinite(dpAmount) || dpAmount < 0) {
      throw new Error('Nominal DP tidak valid');
    }
    if (dpAmount > totalAmount) {
      throw new Error('DP tidak boleh melebihi total');
    }

    const dpNote = input.dpNote?.trim() ? input.dpNote.trim() : null;

    const existingDpPaidAt = ((order as any).dpPaidAt as Date | null | undefined) ?? null;
    const dpPaidAt =
      dpAmount > 0
        ? input.dpPaidAt
          ? new Date(input.dpPaidAt)
          : existingDpPaidAt ?? new Date()
        : null;

    // Aturan paymentStatus:
    // - Jika sudah lunas: tetap SETTLEMENT
    // - Jika dpAmount == 0: UNPAID
    // - Jika dpAmount > 0 dan belum lunas: PENDING
    // - Jika dpAmount == total (membayar penuh via DP): otomatis SETTLEMENT
    let nextPaymentStatus = order.paymentStatus as PaymentStatus;
    let nextPaidAt: Date | null = ((order as any).paidAt as Date | null | undefined) ?? null;

    if (dpAmount > 0 && dpAmount >= totalAmount && totalAmount > 0) {
      nextPaymentStatus = PaymentStatus.SETTLEMENT;
      nextPaidAt = nextPaidAt ?? new Date();
    } else if (order.paymentStatus === PaymentStatus.SETTLEMENT) {
      nextPaymentStatus = PaymentStatus.SETTLEMENT;
    } else if (dpAmount > 0) {
      nextPaymentStatus = PaymentStatus.PENDING;
    } else {
      nextPaymentStatus = PaymentStatus.UNPAID;
      nextPaidAt = null;
    }

    return await this.orderRepository.update(outletId, orderId, {
      dpAmount,
      dpPaidAt,
      dpNote,
      paymentStatus: nextPaymentStatus,
      paidAt: nextPaidAt,
      // Tetap bookkeeping: jangan set paymentMethod untuk order laundry
      paymentMethod: null,
    } as any);
  }

  async setOrderStatus(user: SessionUser | null, orderId: string, nextStatus: OrderStatus) {
    this.requireRole(user, ['OWNER', 'STAFF']);
    const outletId = this.getOutletId(user);

    const order = await this.orderRepository.findById(outletId, orderId);
    if (!order) {
      throw new Error('Order tidak ditemukan');
    }

    const fromStatus = order.status as OrderStatus;
    if (fromStatus === nextStatus) {
      return order;
    }

    const completedAt = nextStatus === OrderStatus.TAKEN ? new Date() : null;

    const updated = await this.orderRepository.update(outletId, orderId, {
      status: nextStatus,
      completedAt,
    } as any);

    await this.orderStatusHistoryRepository.create(outletId, {
      orderId,
      fromStatus,
      toStatus: nextStatus,
      changedByUserId: user?.userId ?? null,
    });

    return updated;
  }

  async listOrders(
    user: SessionUser | null,
    query: {
      q?: string;
      status?: any;
      paymentStatus?: any;
      page?: number;
      limit?: number;
    } = {}
  ) {
    this.requireRole(user, ['OWNER', 'STAFF']);
    const outletId = this.getOutletId(user);
    return await this.orderRepository.findPagedByOutletId(outletId, {
      q: query.q,
      status: query.status,
      paymentStatus: query.paymentStatus,
      page: query.page,
      limit: query.limit,
      orderBy: { createdAt: 'desc' },
    } as any);
  }
}

