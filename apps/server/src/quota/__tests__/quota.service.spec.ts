/**
 * QuotaService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotaService } from '../quota.service';
import { SubscriptionTier } from '../../subscription/subscription.constants';
import { createPrismaMock, PrismaMock } from '../../../test/mocks';

describe('QuotaService', () => {
  let service: QuotaService;
  let prismaMock: PrismaMock;
  let subscriptionService: {
    getTierByApiKey: ReturnType<typeof vi.fn>;
    getTier: ReturnType<typeof vi.fn>;
  };

  const USER_ID = 'test-user-id';
  const API_KEY_ID = 'test-api-key-id';

  beforeEach(() => {
    prismaMock = createPrismaMock();
    subscriptionService = {
      getTierByApiKey: vi.fn().mockResolvedValue(SubscriptionTier.FREE),
      getTier: vi.fn().mockResolvedValue(SubscriptionTier.FREE),
    };

    service = new QuotaService(prismaMock as any, subscriptionService as any);
  });

  describe('checkMemoryQuota', () => {
    it('should return allowed when under limit', async () => {
      subscriptionService.getTierByApiKey.mockResolvedValue(SubscriptionTier.FREE);
      prismaMock.memory.count.mockResolvedValue(5000); // FREE limit is 10000

      const result = await service.checkMemoryQuota(API_KEY_ID);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return not allowed when at limit', async () => {
      subscriptionService.getTierByApiKey.mockResolvedValue(SubscriptionTier.FREE);
      prismaMock.memory.count.mockResolvedValue(10000); // at limit

      const result = await service.checkMemoryQuota(API_KEY_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Memory limit reached');
    });

    it('should return not allowed when exceeding limit with quantity', async () => {
      subscriptionService.getTierByApiKey.mockResolvedValue(SubscriptionTier.FREE);
      prismaMock.memory.count.mockResolvedValue(9999);

      const result = await service.checkMemoryQuota(API_KEY_ID, 2);

      expect(result.allowed).toBe(false);
    });

    it('should always allow for Enterprise (unlimited)', async () => {
      subscriptionService.getTierByApiKey.mockResolvedValue(SubscriptionTier.ENTERPRISE);
      prismaMock.memory.count.mockResolvedValue(1000000);

      const result = await service.checkMemoryQuota(API_KEY_ID);

      expect(result.allowed).toBe(true);
      // Memory count should not be checked for unlimited tier
    });

    it('should respect HOBBY tier limits', async () => {
      subscriptionService.getTierByApiKey.mockResolvedValue(SubscriptionTier.HOBBY);
      prismaMock.memory.count.mockResolvedValue(49999); // HOBBY limit is 50000

      const result = await service.checkMemoryQuota(API_KEY_ID);

      expect(result.allowed).toBe(true);
    });

    it('should reject when HOBBY limit exceeded', async () => {
      subscriptionService.getTierByApiKey.mockResolvedValue(SubscriptionTier.HOBBY);
      prismaMock.memory.count.mockResolvedValue(50000);

      const result = await service.checkMemoryQuota(API_KEY_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('50000');
    });
  });

  describe('checkApiQuota', () => {
    it('should return not allowed when API key not found', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue(null);

      const result = await service.checkApiQuota(API_KEY_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('API Key not found');
    });

    it('should return allowed when under monthly limit', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({ userId: USER_ID });
      subscriptionService.getTier.mockResolvedValue(SubscriptionTier.FREE);
      prismaMock.quota.findUnique.mockResolvedValue({
        monthlyApiUsed: 500, // under FREE limit of 1000
      });

      const result = await service.checkApiQuota(API_KEY_ID);

      expect(result.allowed).toBe(true);
    });

    it('should return not allowed when monthly limit reached', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({ userId: USER_ID });
      subscriptionService.getTier.mockResolvedValue(SubscriptionTier.FREE);
      prismaMock.quota.findUnique.mockResolvedValue({
        monthlyApiUsed: 1000, // at FREE limit
      });

      const result = await service.checkApiQuota(API_KEY_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Monthly API call limit reached');
    });

    it('should always allow for Enterprise (unlimited)', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({ userId: USER_ID });
      subscriptionService.getTier.mockResolvedValue(SubscriptionTier.ENTERPRISE);

      const result = await service.checkApiQuota(API_KEY_ID);

      expect(result.allowed).toBe(true);
      // Quota should not be checked for unlimited tier
      expect(prismaMock.quota.findUnique).not.toHaveBeenCalled();
    });

    it('should create quota and allow when no quota record exists', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({ userId: USER_ID });
      subscriptionService.getTier.mockResolvedValue(SubscriptionTier.FREE);
      prismaMock.quota.findUnique.mockResolvedValue(null);

      const result = await service.checkApiQuota(API_KEY_ID);

      expect(result.allowed).toBe(true);
    });
  });

  describe('incrementApiUsage', () => {
    it('should upsert quota with incremented usage', async () => {
      prismaMock.quota.upsert.mockResolvedValue({});

      await service.incrementApiUsage(USER_ID);

      expect(prismaMock.quota.upsert).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        create: expect.objectContaining({
          userId: USER_ID,
          monthlyApiLimit: 1000,
          monthlyApiUsed: 1,
          periodEndAt: expect.any(Date),
        }),
        update: {
          monthlyApiUsed: { increment: 1 },
        },
      });
    });
  });

  describe('incrementApiUsageByApiKey', () => {
    it('should increment usage when API key exists', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({ userId: USER_ID });
      prismaMock.quota.upsert.mockResolvedValue({});

      await service.incrementApiUsageByApiKey(API_KEY_ID);

      expect(prismaMock.quota.upsert).toHaveBeenCalled();
    });

    it('should do nothing when API key not found', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue(null);

      await service.incrementApiUsageByApiKey(API_KEY_ID);

      expect(prismaMock.quota.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getQuotaStatus', () => {
    it('should return complete quota status', async () => {
      subscriptionService.getTier.mockResolvedValue(SubscriptionTier.HOBBY);
      prismaMock.apiKey.findMany.mockResolvedValue([{ id: 'key-1' }, { id: 'key-2' }]);
      prismaMock.memory.count.mockResolvedValue(1500);
      prismaMock.quota.findUnique.mockResolvedValue({
        monthlyApiUsed: 2000,
      });

      const result = await service.getQuotaStatus(USER_ID);

      expect(result.tier).toBe(SubscriptionTier.HOBBY);
      expect(result.limits.memories).toBe(50000);
      expect(result.limits.monthlyApiCalls).toBe(5000);
      expect(result.usage.memories).toBe(1500);
      expect(result.usage.apiCalls).toBe(2000);
    });

    it('should return 0 API calls when no quota record exists', async () => {
      subscriptionService.getTier.mockResolvedValue(SubscriptionTier.FREE);
      prismaMock.apiKey.findMany.mockResolvedValue([]);
      prismaMock.memory.count.mockResolvedValue(0);
      prismaMock.quota.findUnique.mockResolvedValue(null);

      const result = await service.getQuotaStatus(USER_ID);

      expect(result.usage.apiCalls).toBe(0);
    });
  });

  describe('ensureQuotaExists', () => {
    it('should create quota when not exists', async () => {
      prismaMock.quota.findUnique.mockResolvedValue(null);
      subscriptionService.getTier.mockResolvedValue(SubscriptionTier.HOBBY);
      prismaMock.quota.create.mockResolvedValue({});

      await service.ensureQuotaExists(USER_ID);

      expect(prismaMock.quota.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          monthlyApiLimit: 5000, // HOBBY limit
          monthlyApiUsed: 0,
          periodEndAt: expect.any(Date),
        }),
      });
    });

    it('should not create quota when already exists', async () => {
      prismaMock.quota.findUnique.mockResolvedValue({
        userId: USER_ID,
        monthlyApiUsed: 100,
      });

      await service.ensureQuotaExists(USER_ID);

      expect(prismaMock.quota.create).not.toHaveBeenCalled();
    });
  });

  describe('resetMonthlyQuota', () => {
    it('should reset quota and update period dates', async () => {
      prismaMock.quota.update.mockResolvedValue({});

      await service.resetMonthlyQuota(USER_ID);

      expect(prismaMock.quota.update).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: {
          monthlyApiUsed: 0,
          periodStartAt: expect.any(Date),
          periodEndAt: expect.any(Date),
        },
      });
    });
  });

  describe('calculatePeriodEnd (via upsert)', () => {
    it('should set periodEndAt to first day of next month', async () => {
      const now = new Date('2024-01-15');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      prismaMock.quota.upsert.mockResolvedValue({});

      await service.incrementApiUsage(USER_ID);

      const call = prismaMock.quota.upsert.mock.calls[0][0];
      const periodEnd = call.create.periodEndAt as Date;

      expect(periodEnd.getFullYear()).toBe(2024);
      expect(periodEnd.getMonth()).toBe(1); // February
      expect(periodEnd.getDate()).toBe(1);

      vi.useRealTimers();
    });

    it('should handle year boundary correctly', async () => {
      const now = new Date('2024-12-15');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      prismaMock.quota.upsert.mockResolvedValue({});

      await service.incrementApiUsage(USER_ID);

      const call = prismaMock.quota.upsert.mock.calls[0][0];
      const periodEnd = call.create.periodEndAt as Date;

      expect(periodEnd.getFullYear()).toBe(2025);
      expect(periodEnd.getMonth()).toBe(0); // January
      expect(periodEnd.getDate()).toBe(1);

      vi.useRealTimers();
    });
  });
});
