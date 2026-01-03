/**
 * Subscription & Quota 测试数据工厂
 */
import { createId } from '@paralleldrive/cuid2';

export type SubscriptionTier = 'FREE' | 'HOBBY' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'EXPIRED';

export interface SubscriptionFixture {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  creemCustomerId: string | null;
  creemSubscriptionId: string | null;
  periodStartAt: Date;
  periodEndAt: Date | null;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function createSubscriptionFixture(
  overrides: Partial<SubscriptionFixture> = {},
): SubscriptionFixture {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    id: overrides.id ?? createId(),
    userId: overrides.userId ?? 'test-user-id',
    tier: overrides.tier ?? 'FREE',
    status: overrides.status ?? 'ACTIVE',
    creemCustomerId: overrides.creemCustomerId ?? null,
    creemSubscriptionId: overrides.creemSubscriptionId ?? null,
    periodStartAt: overrides.periodStartAt ?? now,
    periodEndAt: overrides.periodEndAt ?? periodEnd,
    cancelAtPeriodEnd: overrides.cancelAtPeriodEnd ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

/**
 * 创建 HOBBY 订阅
 */
export function createHobbySubscriptionFixture(
  overrides: Partial<SubscriptionFixture> = {},
): SubscriptionFixture {
  return createSubscriptionFixture({
    ...overrides,
    tier: 'HOBBY',
    creemCustomerId: overrides.creemCustomerId ?? `cus_${createId()}`,
    creemSubscriptionId: overrides.creemSubscriptionId ?? `sub_${createId()}`,
  });
}

/**
 * 创建 ENTERPRISE 订阅
 */
export function createEnterpriseSubscriptionFixture(
  overrides: Partial<SubscriptionFixture> = {},
): SubscriptionFixture {
  return createSubscriptionFixture({
    ...overrides,
    tier: 'ENTERPRISE',
    creemCustomerId: overrides.creemCustomerId ?? `cus_${createId()}`,
    creemSubscriptionId: overrides.creemSubscriptionId ?? `sub_${createId()}`,
  });
}

/**
 * 创建已取消的订阅
 */
export function createCanceledSubscriptionFixture(
  overrides: Partial<SubscriptionFixture> = {},
): SubscriptionFixture {
  return createSubscriptionFixture({
    ...overrides,
    status: 'CANCELED',
    cancelAtPeriodEnd: true,
  });
}

/**
 * Quota 测试数据工厂
 */
export interface QuotaFixture {
  id: string;
  userId: string;
  monthlyApiLimit: number;
  monthlyApiUsed: number;
  periodStartAt: Date;
  periodEndAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 根据订阅层级获取默认配额限制
 */
function getDefaultQuotaLimit(tier: SubscriptionTier): number {
  switch (tier) {
    case 'ENTERPRISE':
      return 999999; // 无限制（实际按用量计费）
    case 'HOBBY':
      return 10000;
    case 'FREE':
    default:
      return 1000;
  }
}

export function createQuotaFixture(
  overrides: Partial<QuotaFixture> & { tier?: SubscriptionTier } = {},
): QuotaFixture {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const tier = overrides.tier ?? 'FREE';

  return {
    id: overrides.id ?? createId(),
    userId: overrides.userId ?? 'test-user-id',
    monthlyApiLimit: overrides.monthlyApiLimit ?? getDefaultQuotaLimit(tier),
    monthlyApiUsed: overrides.monthlyApiUsed ?? 0,
    periodStartAt: overrides.periodStartAt ?? now,
    periodEndAt: overrides.periodEndAt ?? periodEnd,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

/**
 * 创建已用尽配额
 */
export function createExhaustedQuotaFixture(
  overrides: Partial<QuotaFixture> = {},
): QuotaFixture {
  const limit = overrides.monthlyApiLimit ?? 1000;
  return createQuotaFixture({
    ...overrides,
    monthlyApiLimit: limit,
    monthlyApiUsed: limit, // 完全用尽
  });
}

/**
 * 创建接近限额的配额
 */
export function createNearLimitQuotaFixture(
  overrides: Partial<QuotaFixture> = {},
): QuotaFixture {
  const limit = overrides.monthlyApiLimit ?? 1000;
  return createQuotaFixture({
    ...overrides,
    monthlyApiLimit: limit,
    monthlyApiUsed: Math.floor(limit * 0.95), // 已使用 95%
  });
}
