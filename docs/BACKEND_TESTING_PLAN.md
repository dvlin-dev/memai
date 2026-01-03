# Memokit 后端测试技术方案

## 1. 现状分析

### 1.1 测试基础设施

| 组件 | 版本 | 状态 |
|------|------|------|
| Vitest | 4.0.15 | ✅ 已配置 |
| @nestjs/testing | 11.0.1 | ✅ 已安装 |
| supertest | 7.1.4 | ✅ 已安装 |
| @testcontainers/postgresql | 11.11.0 | ✅ 已安装 |
| @testcontainers/redis | 11.11.0 | ✅ 已安装 |
| @vitest/coverage-v8 | 2.1.9 | ✅ 已安装 |

### 1.2 实际测试代码

| 项目 | 状态 |
|------|------|
| 测试文件 | ❌ 0 个 |
| test/ 目录 | ❌ 不存在 |
| setup 文件 | ❌ 不存在 |

### 1.3 后端模块清单

| 分类 | 模块 | 优先级 |
|------|------|--------|
| **核心业务** | Memory, Entity, Relation, Graph, Extract | P0 |
| **AI 集成** | Embedding, LLM | P1 |
| **认证授权** | Auth, ApiKey | P0 |
| **订阅支付** | Subscription, Quota, Payment, Usage | P1 |
| **基础设施** | Prisma, Redis, Queue, Email | P2 |
| **管理功能** | Admin, Webhook, Health | P2 |
| **通用组件** | ResponseInterceptor, HttpExceptionFilter, Guards | P0 |

---

## 2. 测试架构

### 2.1 测试分层

```
┌─────────────────────────────────────────────────────┐
│                   E2E Tests (10%)                   │
│         完整 HTTP 流程，真实 DB + Redis             │
├─────────────────────────────────────────────────────┤
│              Integration Tests (25%)                │
│      Service + Repository，Testcontainers          │
├─────────────────────────────────────────────────────┤
│                Unit Tests (65%)                     │
│           单个类/函数，全部 Mock                    │
└─────────────────────────────────────────────────────┘
```

### 2.2 测试类型定义

| 类型 | 文件命名 | 职责 | 依赖 |
|------|----------|------|------|
| 单元测试 | `*.spec.ts` | 单个 Service/Guard/Interceptor | 全 Mock |
| 集成测试 | `*.integration.spec.ts` | 模块内多组件协作 | Testcontainers |
| E2E 测试 | `*.e2e.spec.ts` | 完整 API 请求响应 | Testcontainers |

### 2.3 覆盖率目标

| 模块分类 | Statements | Branches |
|----------|------------|----------|
| 核心业务 (Memory, Entity, Relation) | 80% | 75% |
| 认证授权 (Auth, ApiKey, Guards) | 85% | 80% |
| 订阅支付 (Quota, Payment) | 75% | 70% |
| 通用组件 (Interceptors, Filters) | 90% | 85% |
| 基础设施 | 60% | 55% |
| **全局最低** | **65%** | **60%** |

---

## 3. 目录结构

```
apps/server/
├── vitest.config.ts
├── test/
│   ├── setup.ts                      # 全局测试配置
│   ├── setup.integration.ts          # 集成测试专用配置
│   │
│   ├── lib/                          # 测试工具库
│   │   ├── containers.ts             # Testcontainers 封装
│   │   ├── test-module.factory.ts    # NestJS 模块工厂
│   │   ├── db.helper.ts              # 数据库操作辅助
│   │   └── request.helper.ts         # HTTP 请求辅助
│   │
│   ├── fixtures/                     # 测试数据工厂
│   │   ├── user.fixture.ts
│   │   ├── api-key.fixture.ts
│   │   ├── memory.fixture.ts
│   │   ├── entity.fixture.ts
│   │   └── subscription.fixture.ts
│   │
│   └── mocks/                        # Mock 对象
│       ├── prisma.mock.ts
│       ├── redis.mock.ts
│       ├── embedding.mock.ts
│       └── external-api.mock.ts
│
└── src/
    ├── memory/__tests__/
    │   ├── memory.service.spec.ts
    │   ├── memory.repository.spec.ts
    │   └── memory.e2e.spec.ts
    │
    ├── entity/__tests__/
    │   ├── entity.service.spec.ts
    │   └── entity.e2e.spec.ts
    │
    ├── api-key/__tests__/
    │   ├── api-key.service.spec.ts
    │   ├── api-key.guard.spec.ts
    │   └── api-key.e2e.spec.ts
    │
    ├── auth/__tests__/
    │   ├── auth.guard.spec.ts
    │   └── auth.e2e.spec.ts
    │
    ├── quota/__tests__/
    │   ├── quota.service.spec.ts
    │   ├── quota.guard.spec.ts
    │   └── quota.integration.spec.ts
    │
    ├── payment/__tests__/
    │   ├── payment.service.spec.ts
    │   └── payment-webhook.spec.ts
    │
    ├── embedding/__tests__/
    │   └── embedding.service.spec.ts
    │
    ├── common/__tests__/
    │   ├── response.interceptor.spec.ts
    │   ├── http-exception.filter.spec.ts
    │   └── base.repository.spec.ts
    │
    └── subscription/__tests__/
        └── subscription.service.spec.ts
```

---

## 4. 测试基础设施实现

### 4.1 全局配置 (test/setup.ts)

```typescript
import { vi, beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.BETTER_AUTH_SECRET = 'test-secret-must-be-at-least-32-chars';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.OPENAI_API_KEY = 'test-key';
});

afterAll(() => {
  vi.restoreAllMocks();
});
```

### 4.2 Testcontainers (test/lib/containers.ts)

```typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';

let pgContainer: StartedPostgreSqlContainer | null = null;
let redisContainer: StartedRedisContainer | null = null;

export async function startContainers() {
  if (pgContainer && redisContainer) return;

  [pgContainer, redisContainer] = await Promise.all([
    new PostgreSqlContainer('pgvector/pgvector:pg16')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start(),
    new RedisContainer('redis:7-alpine').start(),
  ]);

  process.env.DATABASE_URL = pgContainer.getConnectionUri();
  process.env.REDIS_URL = redisContainer.getConnectionUrl();

  execSync('npx prisma migrate deploy', {
    env: { ...process.env },
    cwd: process.cwd(),
    stdio: 'pipe',
  });
}

export async function stopContainers() {
  await Promise.all([pgContainer?.stop(), redisContainer?.stop()]);
  pgContainer = null;
  redisContainer = null;
}
```

### 4.3 测试模块工厂 (test/lib/test-module.factory.ts)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { Reflector } from '@nestjs/core';

export async function createTestApp(): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = module.createNestApplication();

  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/(.*)', 'webhooks/(.*)'],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  return app;
}

export async function createTestModule(
  targetModule: any,
  overrides: Array<{ provide: any; useValue: any }> = [],
): Promise<TestingModule> {
  let builder = Test.createTestingModule({ imports: [targetModule] });

  for (const { provide, useValue } of overrides) {
    builder = builder.overrideProvider(provide).useValue(useValue);
  }

  return builder.compile();
}
```

### 4.4 数据库辅助 (test/lib/db.helper.ts)

```typescript
import { PrismaClient } from '../../generated/prisma/client';

const TABLES = [
  'WebhookDelivery', 'Webhook', 'UsageRecord', 'Relation', 'Entity', 'Memory',
  'PaymentOrder', 'Quota', 'Subscription', 'ApiKey', 'Session', 'Account',
  'Verification', 'AccountDeletionRecord', 'User',
];

export async function cleanDatabase(prisma: PrismaClient) {
  for (const table of TABLES) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

export async function seedTestUser(prisma: PrismaClient) {
  const user = await prisma.user.create({
    data: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
    },
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      tier: 'FREE',
      status: 'ACTIVE',
      periodStartAt: new Date(),
      periodEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return { user, subscription };
}
```

### 4.5 Fixtures (test/fixtures/*.ts)

```typescript
// test/fixtures/api-key.fixture.ts
import { createId } from '@paralleldrive/cuid2';
import { createHash } from 'crypto';

interface ApiKeyFixture {
  data: {
    id: string;
    userId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  rawKey: string;
}

export function createApiKeyFixture(overrides: Partial<ApiKeyFixture['data']> = {}): ApiKeyFixture {
  const rawKey = `mk_test_${createId()}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  return {
    data: {
      id: overrides.id ?? createId(),
      userId: overrides.userId ?? 'test-user-id',
      name: overrides.name ?? 'Test API Key',
      keyPrefix: rawKey.substring(0, 12),
      keyHash,
      isActive: overrides.isActive ?? true,
      expiresAt: overrides.expiresAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    rawKey,
  };
}

// test/fixtures/memory.fixture.ts
export function createMemoryFixture(overrides: Partial<MemoryData> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    apiKeyId: overrides.apiKeyId ?? 'test-api-key-id',
    userId: overrides.userId ?? 'end-user-123',
    agentId: overrides.agentId ?? null,
    sessionId: overrides.sessionId ?? null,
    content: overrides.content ?? 'Test memory content',
    metadata: overrides.metadata ?? null,
    source: overrides.source ?? null,
    importance: overrides.importance ?? 0.5,
    tags: overrides.tags ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

### 4.6 Mocks (test/mocks/*.ts)

```typescript
// test/mocks/prisma.mock.ts
import { vi } from 'vitest';

export function createPrismaMock() {
  const createModelMock = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  });

  return {
    user: createModelMock(),
    apiKey: createModelMock(),
    memory: createModelMock(),
    entity: createModelMock(),
    relation: createModelMock(),
    subscription: createModelMock(),
    quota: createModelMock(),
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    $executeRaw: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $transaction: vi.fn((fn) => fn()),
  };
}

// test/mocks/redis.mock.ts
export function createRedisMock() {
  const store = new Map<string, string>();

  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: vi.fn((key: string, value: string, ttl?: number) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
    _clear: () => store.clear(),
  };
}

// test/mocks/embedding.mock.ts
export function createEmbeddingMock() {
  const mockEmbedding = new Array(1024).fill(0).map(() => Math.random());

  return {
    generateEmbedding: vi.fn().mockResolvedValue({
      embedding: mockEmbedding,
      model: 'text-embedding-3-small',
      dimensions: 1024,
    }),
    generateBatchEmbeddings: vi.fn().mockResolvedValue([
      { embedding: mockEmbedding, model: 'text-embedding-3-small', dimensions: 1024 },
    ]),
    cosineSimilarity: vi.fn().mockReturnValue(0.95),
  };
}
```

---

## 5. 模块测试计划

### 5.1 Memory 模块

#### 单元测试 (memory.service.spec.ts)

| 测试用例 | 预期行为 | 边界条件 |
|----------|----------|----------|
| `create()` 配额充足 | 调用 embedding，创建记录 | - |
| `create()` 配额不足 | 抛出 ForbiddenException | 配额为 0 |
| `search()` 正常查询 | 返回相似度排序结果 | - |
| `search()` 无匹配结果 | 返回空数组 | threshold 过高 |
| `list()` 带过滤条件 | 正确过滤 agentId/sessionId | 空过滤条件 |
| `delete()` 存在记录 | 删除成功 | - |
| `delete()` 不存在记录 | 静默成功 | - |
| `exportByUser()` CSV 格式 | 正确转义逗号、引号、换行 | 特殊字符 |

```typescript
// src/memory/__tests__/memory.service.spec.ts
describe('MemoryService', () => {
  let service: MemoryService;
  let repository: MockType<MemoryRepository>;
  let embeddingService: MockType<EmbeddingService>;
  let quotaService: MockType<QuotaService>;

  beforeEach(() => {
    repository = createMock<MemoryRepository>();
    embeddingService = createEmbeddingMock();
    quotaService = {
      checkMemoryQuota: vi.fn().mockResolvedValue({ allowed: true }),
    };

    service = new MemoryService(
      repository as any,
      createPrismaMock() as any,
      embeddingService as any,
      quotaService as any,
      { recordUsageByApiKey: vi.fn() } as any,
      { isEnterpriseByApiKey: vi.fn().mockResolvedValue(false) } as any,
    );
  });

  describe('create', () => {
    it('should create memory when quota is available', async () => {
      // Arrange
      const dto = { userId: 'user-1', content: 'test content' };
      repository.createWithEmbedding.mockResolvedValue(createMemoryFixture());

      // Act
      const result = await service.create('api-key-id', dto);

      // Assert
      expect(quotaService.checkMemoryQuota).toHaveBeenCalledWith('api-key-id');
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith('test content');
      expect(result.content).toBeDefined();
    });

    it('should throw ForbiddenException when quota exceeded', async () => {
      // Arrange
      quotaService.checkMemoryQuota.mockResolvedValue({
        allowed: false,
        reason: 'Memory limit reached',
      });

      // Act & Assert
      await expect(
        service.create('api-key-id', { userId: 'user-1', content: 'test' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
```

### 5.2 API Key 模块

#### 单元测试 (api-key.service.spec.ts)

| 测试用例 | 预期行为 | 边界条件 |
|----------|----------|----------|
| `create()` | 生成 key，返回明文（仅一次） | - |
| `validateKey()` 有效 key | 返回用户信息，更新缓存 | - |
| `validateKey()` 无效前缀 | 抛出 ForbiddenException | 不以 mk_ 开头 |
| `validateKey()` key 不存在 | 抛出 ForbiddenException | - |
| `validateKey()` key 已过期 | 抛出 ForbiddenException | expiresAt < now |
| `validateKey()` key 已停用 | 抛出 ForbiddenException | isActive = false |
| `validateKey()` 用户已删除 | 抛出 ForbiddenException | user.deletedAt != null |
| `validateKey()` 缓存命中 | 直接返回缓存 | - |
| `delete()` | 删除记录，清除缓存 | - |

#### Guard 测试 (api-key.guard.spec.ts)

| 测试用例 | 预期行为 |
|----------|----------|
| 非 API Key 路由 | 跳过验证 |
| 有效 X-API-Key header | 验证并附加到 request |
| 无 X-API-Key header | 抛出 ForbiddenException |
| 非字符串 header | 抛出 ForbiddenException |

```typescript
// src/api-key/__tests__/api-key.guard.spec.ts
describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let apiKeyService: MockType<ApiKeyService>;
  let reflector: MockType<Reflector>;

  beforeEach(() => {
    apiKeyService = { validateKey: vi.fn() };
    reflector = { getAllAndOverride: vi.fn() };
    guard = new ApiKeyGuard(apiKeyService as any, reflector as any);
  });

  it('should skip validation for non-API-key routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockExecutionContext({ headers: {} });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(apiKeyService.validateKey).not.toHaveBeenCalled();
  });

  it('should pass when valid API key provided', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    apiKeyService.validateKey.mockResolvedValue({
      id: 'key-id',
      userId: 'user-id',
      name: 'Test Key',
      user: { id: 'user-id', email: 'test@test.com', tier: 'FREE' },
    });
    const context = createMockExecutionContext({
      headers: { 'x-api-key': 'mk_valid_key' },
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw when API key header is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockExecutionContext({ headers: {} });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
```

### 5.3 Quota 模块

#### 单元测试 (quota.service.spec.ts)

| 测试用例 | 预期行为 | 边界条件 |
|----------|----------|----------|
| `checkMemoryQuota()` Enterprise | 返回 allowed: true | 无限制 |
| `checkMemoryQuota()` 未超限 | 返回 allowed: true | - |
| `checkMemoryQuota()` 已超限 | 返回 allowed: false | count = limit |
| `checkApiQuota()` 无配额记录 | 创建记录，返回 allowed | - |
| `incrementApiUsage()` | 增加计数 | - |
| `getQuotaStatus()` | 返回完整状态 | - |
| `calculatePeriodEnd()` | 返回下个月1号 | 月末边界 |

### 5.4 Common 模块

#### ResponseInterceptor 测试

| 测试用例 | 预期行为 | 边界条件 |
|----------|----------|----------|
| 普通数据 | 包装为 `{ success: true, data }` | - |
| 分页数据 | 包装为 `{ success: true, data, meta }` | hasMore 计算 |
| 已包装数据 | 不重复包装 | - |
| 204 状态码 | 返回 undefined | - |
| null 数据 | 包装 null | - |
| 跳过标记路由 | 不包装 | - |

#### HttpExceptionFilter 测试

| 测试用例 | 预期行为 | 边界条件 |
|----------|----------|----------|
| HttpException | 格式化错误码和消息 | - |
| ValidationError (数组) | 提取第一个错误消息 | 多个验证错误 |
| 未知 Error | 返回 500 INTERNAL_ERROR | - |
| 非 Error 异常 | 返回 500 INTERNAL_ERROR | 字符串异常 |

```typescript
// src/common/__tests__/response.interceptor.spec.ts
describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;
  let reflector: MockType<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    interceptor = new ResponseInterceptor(reflector as any);
  });

  it('should wrap response with success format', (done) => {
    const context = createMockExecutionContext({ statusCode: 200 });
    const next = { handle: () => of({ id: 1, name: 'test' }) };

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: { id: 1, name: 'test' },
        timestamp: expect.any(String),
      });
      done();
    });
  });

  it('should handle paginated response', (done) => {
    const context = createMockExecutionContext({ statusCode: 200 });
    const next = {
      handle: () => of({
        items: [{ id: 1 }],
        pagination: { total: 100, limit: 10, offset: 0 },
      }),
    };

    interceptor.intercept(context, next).subscribe((result: any) => {
      expect(result.meta).toEqual({
        total: 100,
        limit: 10,
        offset: 0,
        hasMore: true,
      });
      done();
    });
  });

  it('should not double-wrap already wrapped response', (done) => {
    const context = createMockExecutionContext({ statusCode: 200 });
    const alreadyWrapped = { success: true, data: { id: 1 } };
    const next = { handle: () => of(alreadyWrapped) };

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result).toEqual(alreadyWrapped);
      done();
    });
  });
});
```

### 5.5 Payment 模块

#### 单元测试 (payment.service.spec.ts)

| 测试用例 | 预期行为 | 边界条件 |
|----------|----------|----------|
| `handleSubscriptionActivated()` | 更新订阅和配额 | - |
| `handleSubscriptionCanceled()` | 标记 cancelAtPeriodEnd | - |
| `handleSubscriptionExpired()` | 降级到 FREE，重置配额 | - |
| `verifyWebhookSignature()` 有效 | 返回 true | - |
| `verifyWebhookSignature()` 无效 | 返回 false | - |
| `verifyWebhookSignature()` 无 secret | 返回 false | 配置缺失 |
| `verifyWebhookSignature()` 长度不匹配 | 返回 false | 防时序攻击 |

```typescript
// src/payment/__tests__/payment.service.spec.ts
describe('PaymentService', () => {
  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature', () => {
      const secret = 'webhook-secret';
      const payload = JSON.stringify({ event: 'test' });
      const signature = createHmac('sha256', secret).update(payload).digest('hex');

      configService.get.mockReturnValue(secret);

      expect(service.verifyWebhookSignature(payload, signature)).toBe(true);
    });

    it('should return false for invalid signature', () => {
      configService.get.mockReturnValue('secret');

      expect(service.verifyWebhookSignature('payload', 'invalid-sig')).toBe(false);
    });

    it('should return false when secret is not configured', () => {
      configService.get.mockReturnValue(undefined);

      expect(service.verifyWebhookSignature('payload', 'sig')).toBe(false);
    });
  });
});
```

### 5.6 Embedding 模块

| 测试用例 | 预期行为 | 边界条件 |
|----------|----------|----------|
| `generateEmbedding()` 成功 | 返回向量和元数据 | - |
| `generateEmbedding()` API 失败 | 抛出错误 | HTTP 错误 |
| `generateEmbedding()` 无 API Key | 抛出配置错误 | - |
| `generateBatchEmbeddings()` 空数组 | 返回空数组 | - |
| `generateBatchEmbeddings()` 单个 | 调用单个方法 | 优化路径 |
| `cosineSimilarity()` 正常 | 返回相似度 | - |
| `cosineSimilarity()` 维度不匹配 | 抛出错误 | - |

---

## 6. E2E 测试计划

### 6.1 Memory API

```typescript
// src/memory/__tests__/memory.e2e.spec.ts
describe('Memory API (E2E)', () => {
  let app: INestApplication;
  let apiKey: string;

  beforeAll(async () => {
    await startContainers();
    app = await createTestApp();

    const prisma = app.get(PrismaService);
    const { user } = await seedTestUser(prisma);
    const keyFixture = createApiKeyFixture({ userId: user.id });
    await prisma.apiKey.create({ data: keyFixture.data });
    apiKey = keyFixture.rawKey;
  });

  afterAll(async () => {
    await app.close();
    await stopContainers();
  });

  describe('POST /api/v1/memories', () => {
    it('should create memory with valid API key', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/memories')
        .set('X-API-Key', apiKey)
        .send({ userId: 'end-user-1', content: 'Test memory content' })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: { id: expect.any(String), content: 'Test memory content' },
      });
    });

    it('should return 403 without API key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/memories')
        .send({ userId: 'user', content: 'test' })
        .expect(403);
    });

    it('should return 400 for empty content', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/memories')
        .set('X-API-Key', apiKey)
        .send({ userId: 'user', content: '' })
        .expect(400);
    });
  });
});
```

### 6.2 错误边界测试

| 场景 | 预期响应 | 响应格式 |
|------|----------|----------|
| 无效 JSON body | 400 | `{ success: false, error: { code: 'BAD_REQUEST' } }` |
| 缺少必填字段 | 400 | `{ success: false, error: { code: 'VALIDATION_ERROR', details: [...] } }` |
| 无效 API Key | 403 | `{ success: false, error: { code: 'FORBIDDEN' } }` |
| 配额超限 | 403 | `{ success: false, error: { code: 'FORBIDDEN', message: '..limit..' } }` |
| 资源不存在 | 404 | `{ success: false, error: { code: 'NOT_FOUND' } }` |
| 服务器错误 | 500 | `{ success: false, error: { code: 'INTERNAL_ERROR' } }` |

---

## 7. 更新 vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    exclude: ['**/node_modules/**'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/**/*.module.ts',
        'src/**/*.constants.ts',
        'src/**/*.types.ts',
        'src/**/index.ts',
        'src/**/dto/**',
        'src/main.ts',
      ],
      thresholds: {
        'src/memory/**': { statements: 80, branches: 75 },
        'src/entity/**': { statements: 80, branches: 75 },
        'src/api-key/**': { statements: 85, branches: 80 },
        'src/auth/**': { statements: 85, branches: 80 },
        'src/quota/**': { statements: 75, branches: 70 },
        'src/common/**': { statements: 90, branches: 85 },
        global: { statements: 65, branches: 60 },
      },
    },
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
```

---

## 8. CI 配置

```yaml
# .github/workflows/test.yml
name: Backend Tests

on:
  push:
    branches: [main]
    paths: ['apps/server/**', 'packages/**']
  pull_request:
    branches: [main]
    paths: ['apps/server/**', 'packages/**']

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter server prisma generate
      - run: pnpm --filter server test:unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: { POSTGRES_USER: test, POSTGRES_PASSWORD: test, POSTGRES_DB: test }
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: --health-cmd "redis-cli ping" --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter server prisma generate
      - run: pnpm --filter server prisma migrate deploy
        env: { DATABASE_URL: 'postgresql://test:test@localhost:5432/test' }
      - run: pnpm --filter server test:e2e
        env:
          DATABASE_URL: 'postgresql://test:test@localhost:5432/test'
          REDIS_URL: 'redis://localhost:6379'
          RUN_INTEGRATION_TESTS: '1'
```

---

## 9. 实施路线

| Phase | 内容 | 预估 |
|-------|------|------|
| 1 | 基础设施 (setup, containers, fixtures, mocks) | 2 天 |
| 2 | 通用组件测试 (ResponseInterceptor, HttpExceptionFilter, BaseRepository) | 1 天 |
| 3 | 认证模块测试 (ApiKeyService, ApiKeyGuard, AuthGuard) | 2 天 |
| 4 | 核心业务测试 (MemoryService, EntityService, + E2E) | 3 天 |
| 5 | 订阅支付测试 (QuotaService, SubscriptionService, PaymentService) | 2 天 |
| 6 | AI 模块测试 (EmbeddingService, LlmService) | 1 天 |
| 7 | CI 集成 | 1 天 |
| **总计** | | **12 天** |

---

---

## 10. 实施记录

### 已完成

| Phase | 内容 | 测试数量 | 状态 |
|-------|------|---------|------|
| 1 | 基础设施 (setup.ts, containers.ts, fixtures, mocks) | - | ✅ 完成 |
| 2 | 通用组件测试 (ResponseInterceptor, HttpExceptionFilter, BaseRepository) | 58 | ✅ 完成 |
| 3 | 认证模块测试 (ApiKeyService, ApiKeyGuard, AuthGuard) | 62 | ✅ 完成 |
| 4 | 核心业务测试 (MemoryService, EntityService, RelationService, GraphService, ExtractService) | 135 | ✅ 完成 |
| 5 | 订阅支付测试 (QuotaService, SubscriptionService, PaymentService, UsageService) | 70 | ✅ 完成 |
| 6 | AI 模块测试 (EmbeddingService, LlmService) | 48 | ✅ 完成 |
| 7 | 管理功能测试 (AdminService, UserService, WebhookService, EmailService) | 54 | ✅ 完成 |
| 8 | CI 集成 (.github/workflows/test.yml) | - | ✅ 完成 |

### 测试文件清单

```
apps/server/
├── test/
│   ├── setup.ts
│   ├── infrastructure.spec.ts (16 tests)
│   ├── lib/
│   │   ├── containers.ts
│   │   ├── test-module.factory.ts
│   │   └── db.helper.ts
│   ├── fixtures/
│   │   ├── index.ts
│   │   ├── user.fixture.ts
│   │   ├── api-key.fixture.ts
│   │   ├── memory.fixture.ts
│   │   ├── entity.fixture.ts
│   │   └── subscription.fixture.ts
│   └── mocks/
│       ├── index.ts
│       ├── prisma.mock.ts
│       ├── redis.mock.ts
│       ├── embedding.mock.ts
│       └── external-api.mock.ts
└── src/
    ├── common/__tests__/
    │   ├── response.interceptor.spec.ts (16 tests)
    │   ├── http-exception.filter.spec.ts (16 tests)
    │   └── base.repository.spec.ts (26 tests)
    ├── api-key/__tests__/
    │   ├── api-key.service.spec.ts (27 tests)
    │   └── api-key.guard.spec.ts (17 tests)
    ├── auth/__tests__/
    │   └── auth.guard.spec.ts (18 tests)
    ├── memory/__tests__/
    │   └── memory.service.spec.ts (29 tests)
    ├── entity/__tests__/
    │   └── entity.service.spec.ts (24 tests)
    ├── relation/__tests__/
    │   └── relation.service.spec.ts (17 tests)
    ├── graph/__tests__/
    │   └── graph.service.spec.ts (22 tests)
    ├── extract/__tests__/
    │   └── extract.service.spec.ts (17 tests)
    ├── quota/__tests__/
    │   └── quota.service.spec.ts (21 tests)
    ├── subscription/__tests__/
    │   └── subscription.service.spec.ts (17 tests)
    ├── payment/__tests__/
    │   └── payment.service.spec.ts (13 tests)
    ├── usage/__tests__/
    │   └── usage.service.spec.ts (19 tests)
    ├── embedding/__tests__/
    │   └── embedding.service.spec.ts (17 tests)
    ├── llm/__tests__/
    │   └── llm.service.spec.ts (31 tests)
    ├── admin/__tests__/
    │   └── admin.service.spec.ts (25 tests)
    ├── user/__tests__/
    │   └── user.service.spec.ts (13 tests)
    ├── webhook/__tests__/
    │   └── webhook.service.spec.ts (19 tests)
    └── email/__tests__/
        └── email.service.spec.ts (7 tests)
```

### 测试统计

- **总测试文件**: 22 个
- **总测试用例**: 427 个
- **执行时间**: ~2.0s

### 待办事项

- [ ] Memory E2E 测试
- [ ] Entity E2E 测试
- [ ] API Key E2E 测试
- [ ] 配置覆盖率阈值

---

*版本: 3.0 | 更新: 2026-01*
