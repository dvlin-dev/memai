/**
 * Admin DTOs
 * Zod schemas for admin API validation
 */

import { z } from 'zod';

// =============================================
// Pagination
// =============================================

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// =============================================
// Users
// =============================================

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isAdmin: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export const userQuerySchema = paginationQuerySchema.extend({
  isAdmin: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
});

export type UserQuery = z.infer<typeof userQuerySchema>;

// =============================================
// Subscriptions
// =============================================

export const subscriptionQuerySchema = paginationQuerySchema.extend({
  tier: z.enum(['FREE', 'HOBBY', 'ENTERPRISE']).optional(),
  status: z.enum(['ACTIVE', 'CANCELED', 'PAST_DUE', 'EXPIRED']).optional(),
});

export type SubscriptionQuery = z.infer<typeof subscriptionQuerySchema>;

export const updateSubscriptionSchema = z.object({
  tier: z.enum(['FREE', 'HOBBY', 'ENTERPRISE']).optional(),
  status: z.enum(['ACTIVE', 'CANCELED', 'PAST_DUE', 'EXPIRED']).optional(),
});

export type UpdateSubscriptionDto = z.infer<typeof updateSubscriptionSchema>;

// =============================================
// Orders
// =============================================

export const orderQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  /** 订单类型 - 与 Prisma Schema 保持一致 */
  type: z.enum(['subscription', 'usage_billing']).optional(),
});

export type OrderQuery = z.infer<typeof orderQuerySchema>;
