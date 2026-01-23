/**
 * TypeScript Type Definitions
 * 
 * Centralized type definitions for the application.
 */

import { Role, OrderStatus, PaymentStatus, PaymentMethod, TransType } from '../generated/prisma';

/**
 * Extended session type with outletId
 */
export interface SessionUser {
  userId: string;
  outletId: string | null;
  role: Role;
  phone: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Order filter parameters
 */
export interface OrderFilters extends PaginationParams {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Transaction filter parameters
 */
export interface TransactionFilters extends PaginationParams {
  type?: TransType;
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
  startDate?: string;
  endDate?: string;
}
