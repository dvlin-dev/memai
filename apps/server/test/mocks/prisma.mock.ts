/**
 * Prisma Client Mock
 * 提供模拟的 Prisma Client 用于单元测试
 */
import { vi } from 'vitest';

/**
 * 创建模型的标准 CRUD 方法 mock
 */
function createModelMock() {
  return {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findFirstOrThrow: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
}

/**
 * 创建完整的 Prisma Client mock
 */
export function createPrismaMock() {
  return {
    // 核心模型
    user: createModelMock(),
    session: createModelMock(),
    account: createModelMock(),
    verification: createModelMock(),

    // 订阅系统
    subscription: createModelMock(),
    quota: createModelMock(),
    usageRecord: createModelMock(),
    paymentOrder: createModelMock(),

    // API Key
    apiKey: createModelMock(),

    // 核心业务
    memory: createModelMock(),
    entity: createModelMock(),
    relation: createModelMock(),

    // Webhook
    webhook: createModelMock(),
    webhookDelivery: createModelMock(),

    // 其他
    accountDeletionRecord: createModelMock(),

    // 原始查询方法
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    $executeRaw: vi.fn(),
    $executeRawUnsafe: vi.fn(),

    // 事务
    $transaction: vi.fn((fn: (prisma: unknown) => Promise<unknown>) => {
      // 默认直接执行传入的函数
      return fn(createPrismaMock());
    }),

    // 连接管理
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
}

/**
 * Prisma Mock 类型
 */
export type PrismaMock = ReturnType<typeof createPrismaMock>;
export type ModelMock = ReturnType<typeof createModelMock>;
