// src/config/constants.ts

export const VALID_ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "refunded",
  "cancelled"
] as const;

export type OrderStatus = typeof VALID_ORDER_STATUSES[number];