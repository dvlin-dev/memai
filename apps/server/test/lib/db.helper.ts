/**
 * 数据库测试辅助函数
 * 提供清理数据库和播种测试数据的工具
 */
import type { PrismaClient } from '../../generated/prisma/client';

/**
 * 表清理顺序（按外键依赖倒序）
 */
const TABLES_TO_CLEAN = [
  'WebhookDelivery',
  'Webhook',
  'UsageRecord',
  'Relation',
  'Entity',
  'Memory',
  'PaymentOrder',
  'Quota',
  'Subscription',
  'ApiKey',
  'Session',
  'Account',
  'Verification',
  'AccountDeletionRecord',
  'User',
] as const;

/**
 * 清空所有测试数据
 * 按外键依赖顺序删除，避免约束冲突
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  for (const table of TABLES_TO_CLEAN) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

/**
 * 测试用户数据
 */
export interface TestUserData {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  subscription: {
    id: string;
    userId: string;
    tier: 'FREE' | 'HOBBY' | 'ENTERPRISE';
    status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'EXPIRED';
  };
  quota: {
    id: string;
    userId: string;
    monthlyApiLimit: number;
    monthlyApiUsed: number;
  };
}

/**
 * 创建测试用户（包含订阅和配额）
 */
export async function seedTestUser(
  prisma: PrismaClient,
  overrides: {
    userId?: string;
    email?: string;
    tier?: 'FREE' | 'HOBBY' | 'ENTERPRISE';
    isAdmin?: boolean;
  } = {},
): Promise<TestUserData> {
  const userId = overrides.userId ?? 'test-user-id';
  const tier = overrides.tier ?? 'FREE';
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      id: userId,
      email: overrides.email ?? 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      isAdmin: overrides.isAdmin ?? false,
    },
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      tier,
      status: 'ACTIVE',
      periodStartAt: now,
      periodEndAt: periodEnd,
    },
  });

  const quota = await prisma.quota.create({
    data: {
      userId: user.id,
      monthlyApiLimit: tier === 'ENTERPRISE' ? 999999 : tier === 'HOBBY' ? 10000 : 1000,
      monthlyApiUsed: 0,
      periodStartAt: now,
      periodEndAt: periodEnd,
    },
  });

  return {
    user: user as TestUserData['user'],
    subscription: subscription as unknown as TestUserData['subscription'],
    quota: quota as unknown as TestUserData['quota'],
  };
}

/**
 * 创建测试管理员
 */
export async function seedAdminUser(prisma: PrismaClient): Promise<TestUserData> {
  return seedTestUser(prisma, {
    userId: 'admin-user-id',
    email: 'admin@example.com',
    tier: 'ENTERPRISE',
    isAdmin: true,
  });
}
