/**
 * Test Data Factories
 * 
 * Factory functions for creating test data.
 * Use these to generate consistent test data across tests.
 */

import { Role, OrderStatus, PaymentStatus, PaymentMethod, TransType } from '../../src/generated/prisma';
import { randomString, randomPhone, randomUUID } from './test-helpers';

/**
 * Factory for creating User test data
 */
export function createUserData(overrides?: {
  phone?: string;
  name?: string;
  role?: Role;
  outletId?: string;
  pin?: string;
}) {
  return {
    phone: overrides?.phone || randomPhone(),
    name: overrides?.name || `Test User ${randomString(5)}`,
    pin: overrides?.pin || '$2a$10$dummy.hash.for.testing',
    role: overrides?.role || Role.OWNER,
    outletId: overrides?.outletId || null,
    isActive: true,
    isPinSet: true,
    pinChangedAt: new Date(),
  };
}

/**
 * Factory for creating Outlet test data
 */
export function createOutletData(overrides?: {
  name?: string;
  slug?: string;
  address?: string;
  isPro?: boolean;
}) {
  const slug = overrides?.slug || `test-outlet-${randomString(8)}`;
  return {
    name: overrides?.name || `Test Outlet ${randomString(5)}`,
    slug,
    address: overrides?.address || `Test Address ${randomString(10)}`,
    isPro: overrides?.isPro ?? false,
  };
}

/**
 * Factory for creating Order test data
 */
export function createOrderData(overrides?: {
  outletId?: string;
  trackingCode?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  totalAmount?: number;
  customerName?: string;
  customerPhone?: string;
}) {
  return {
    trackingCode: overrides?.trackingCode || randomString(8).toUpperCase(),
    status: overrides?.status || OrderStatus.QUEUED,
    paymentStatus: overrides?.paymentStatus || PaymentStatus.UNPAID,
    paymentMethod: overrides?.paymentMethod || null,
    totalAmount: overrides?.totalAmount || 50000,
    outletId: overrides?.outletId || randomUUID(),
    customerName: overrides?.customerName || `Customer ${randomString(5)}`,
    customerPhone: overrides?.customerPhone || randomPhone(),
  };
}

/**
 * Factory for creating Service test data
 */
export function createServiceData(overrides?: {
  outletId?: string;
  name?: string;
  type?: string;
  price?: number;
  unit?: string;
}) {
  return {
    outletId: overrides?.outletId || randomUUID(),
    name: overrides?.name || `Service ${randomString(5)}`,
    type: overrides?.type || 'KILOAN',
    price: overrides?.price || 10000,
    unit: overrides?.unit || 'kg',
    description: `Test service description ${randomString(10)}`,
    isActive: true,
  };
}

/**
 * Factory for creating BankAccount test data
 */
export function createBankAccountData(overrides?: {
  outletId?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
}) {
  return {
    outletId: overrides?.outletId || randomUUID(),
    bankName: overrides?.bankName || 'BCA',
    accountName: overrides?.accountName || `Account ${randomString(5)}`,
    accountNumber: overrides?.accountNumber || randomString(10),
    isActive: true,
  };
}

/**
 * Factory for creating Customer test data
 */
export function createCustomerData(overrides?: {
  outletId?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  return {
    outletId: overrides?.outletId || randomUUID(),
    name: overrides?.name || `Customer ${randomString(5)}`,
    phone: overrides?.phone ?? randomPhone(),
    email: overrides?.email ?? null,
    address: overrides?.address ?? null,
  };
}

/**
 * Factory for creating Transaction test data (minimal for LAUNDRY_ORDER or SUBSCRIPTION)
 */
export function createTransactionData(overrides?: {
  outletId?: string | null;
  orderId?: string | null;
  type?: TransType;
  amount?: number;
  status?: PaymentStatus;
}) {
  return {
    outletId: overrides?.outletId ?? null,
    orderId: overrides?.orderId ?? null,
    type: overrides?.type ?? TransType.LAUNDRY_ORDER,
    amount: overrides?.amount ?? 50000,
    status: overrides?.status ?? PaymentStatus.PENDING,
    paymentMethod: null as any,
  };
}

/**
 * Factory for creating OTP code test data
 */
export function createOtpCodeData(overrides?: {
  phone?: string;
  code?: string;
  expiresAt?: Date;
}) {
  const expiresAt = overrides?.expiresAt || new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  return {
    phone: overrides?.phone || randomPhone(),
    code: overrides?.code || randomString(6),
    type: 'REGISTER' as const,
    expiresAt,
    isUsed: false,
  };
}
