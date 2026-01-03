/**
 * 测试基础设施冒烟测试
 * 验证 mocks、fixtures 和工具函数正常工作
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createUserFixture,
  createApiKeyFixture,
  createMemoryFixture,
  createSubscriptionFixture,
  createQuotaFixture,
} from './fixtures';
import { createPrismaMock, createRedisMock, createEmbeddingMock } from './mocks';

describe('Test Infrastructure', () => {
  describe('Fixtures', () => {
    it('should create user fixture with defaults', () => {
      const user = createUserFixture();

      expect(user.id).toBeDefined();
      expect(user.email).toContain('@example.com');
      expect(user.emailVerified).toBe(true);
      expect(user.isAdmin).toBe(false);
    });

    it('should create user fixture with overrides', () => {
      const user = createUserFixture({
        email: 'custom@test.com',
        isAdmin: true,
      });

      expect(user.email).toBe('custom@test.com');
      expect(user.isAdmin).toBe(true);
    });

    it('should create API key fixture with raw key', () => {
      const apiKey = createApiKeyFixture();

      expect(apiKey.rawKey).toMatch(/^mk_/);
      expect(apiKey.data.keyPrefix).toBe(apiKey.rawKey.substring(0, 12));
      expect(apiKey.data.keyHash).toBeDefined();
      expect(apiKey.data.isActive).toBe(true);
    });

    it('should create memory fixture', () => {
      const memory = createMemoryFixture({
        content: 'Test content',
        tags: ['important'],
      });

      expect(memory.content).toBe('Test content');
      expect(memory.tags).toEqual(['important']);
      expect(memory.importance).toBe(0.5);
    });

    it('should create subscription with tier', () => {
      const freeSub = createSubscriptionFixture({ tier: 'FREE' });
      const hobbySub = createSubscriptionFixture({ tier: 'HOBBY' });
      const enterpriseSub = createSubscriptionFixture({ tier: 'ENTERPRISE' });

      expect(freeSub.tier).toBe('FREE');
      expect(hobbySub.tier).toBe('HOBBY');
      expect(enterpriseSub.tier).toBe('ENTERPRISE');
    });

    it('should create quota with correct limits per tier', () => {
      const freeQuota = createQuotaFixture({ tier: 'FREE' });
      const hobbyQuota = createQuotaFixture({ tier: 'HOBBY' });
      const enterpriseQuota = createQuotaFixture({ tier: 'ENTERPRISE' });

      expect(freeQuota.monthlyApiLimit).toBe(1000);
      expect(hobbyQuota.monthlyApiLimit).toBe(10000);
      expect(enterpriseQuota.monthlyApiLimit).toBe(999999);
    });
  });

  describe('Prisma Mock', () => {
    it('should create prisma mock with all models', () => {
      const prisma = createPrismaMock();

      expect(prisma.user).toBeDefined();
      expect(prisma.apiKey).toBeDefined();
      expect(prisma.memory).toBeDefined();
      expect(prisma.subscription).toBeDefined();
      expect(prisma.quota).toBeDefined();
    });

    it('should mock prisma model methods', async () => {
      const prisma = createPrismaMock();
      const mockUser = createUserFixture();

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await prisma.user.findUnique({ where: { id: 'test' } });

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'test' } });
    });
  });

  describe('Redis Mock', () => {
    it('should get and set values', async () => {
      const redis = createRedisMock();

      await redis.set('key1', 'value1');
      const result = await redis.get('key1');

      expect(result).toBe('value1');
    });

    it('should handle missing keys', async () => {
      const redis = createRedisMock();

      const result = await redis.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should delete keys', async () => {
      const redis = createRedisMock();

      await redis.set('key1', 'value1');
      const deleted = await redis.del('key1');
      const result = await redis.get('key1');

      expect(deleted).toBe(1);
      expect(result).toBeNull();
    });

    it('should increment values', async () => {
      const redis = createRedisMock();

      const first = await redis.incr('counter');
      const second = await redis.incr('counter');
      const third = await redis.incrBy('counter', 5);

      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(third).toBe(7);
    });
  });

  describe('Embedding Mock', () => {
    it('should generate embedding', async () => {
      const embedding = createEmbeddingMock();

      const result = await embedding.generateEmbedding('test text');

      expect(result.embedding).toHaveLength(1024);
      expect(result.model).toBe('text-embedding-3-small');
      expect(result.dimensions).toBe(1024);
    });

    it('should calculate cosine similarity', () => {
      const embedding = createEmbeddingMock();

      const a = [1, 0, 0];
      const b = [1, 0, 0];
      const c = [0, 1, 0];

      expect(embedding.cosineSimilarity(a, b)).toBeCloseTo(1);
      expect(embedding.cosineSimilarity(a, c)).toBeCloseTo(0);
    });

    it('should throw on dimension mismatch', () => {
      const embedding = createEmbeddingMock();

      expect(() => embedding.cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
        'Vector dimensions must match',
      );
    });
  });

  describe('Environment', () => {
    it('should have test environment variables set', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.BETTER_AUTH_SECRET).toBeDefined();
      expect(process.env.OPENAI_API_KEY).toBeDefined();
    });
  });
});
