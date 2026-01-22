/**
 * Order status workflow
 * Based on blueprint: QUEUED → WASHING → DRYING → IRONING → READY → TAKEN
 */
export enum OrderStatus {
  QUEUED = "QUEUED",
  WASHING = "WASHING",
  DRYING = "DRYING",
  IRONING = "IRONING",
  READY = "READY",
  TAKEN = "TAKEN",
}
