/**
 * Application constants
 * Centralized constants used across the application
 */

// API Routes
export const API_ROUTES = {
  AUTH: "/api/auth",
  OUTLETS: "/api/outlets",
  ORDERS: "/api/orders",
  USERS: "/api/users",
  SERVICES: "/api/services",
  TRANSACTIONS: "/api/transactions",
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// File Upload
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Order
export const ORDER_TRACKING_CODE_LENGTH = 8;
