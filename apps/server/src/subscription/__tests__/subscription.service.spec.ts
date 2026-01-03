/**
 * SubscriptionService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionService } from '../subscription.service';
import { SubscriptionTier, DEFAULT_TIER } from '../subscription.constants';
import { createPrismaMock, PrismaMock } from '../../../test/mocks';
import { createSubscriptionFixture } from '../../../test/fixtures';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prismaMock: PrismaMock;

  const USER_ID = 'test-user-id';
  const API_KEY_ID = 'test-api-key-id';

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new SubscriptionService(prismaMock as any);
  });

  describe('getSubscription', () => {
    it('should return subscription when found', async () => {
      const subscription = createSubscriptionFixture({ userId: USER_ID });
      prismaMock.subscription.findUnique.mockResolvedValue(subscription);

      const result = await service.getSubscription(USER_ID);

      expect(prismaMock.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
      expect(result).toEqual(subscription);
    });

    it('should return null when subscription not found', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      const result = await service.getSubscription(USER_ID);

      expect(result).toBeNull();
    });
  });

  describe('getTier', () => {
    it('should return subscription tier when exists', async () => {
      const subscription = createSubscriptionFixture({
        userId: USER_ID,
        tier: SubscriptionTier.HOBBY,
      });
      prismaMock.subscription.findUnique.mockResolvedValue(subscription);

      const result = await service.getTier(USER_ID);

      expect(result).toBe(SubscriptionTier.HOBBY);
    });

    it('should return FREE tier when subscription not found', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      const result = await service.getTier(USER_ID);

      expect(result).toBe(DEFAULT_TIER);
      expect(result).toBe(SubscriptionTier.FREE);
    });

    it('should return FREE tier when tier is null', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue({
        userId: USER_ID,
        tier: null,
      });

      const result = await service.getTier(USER_ID);

      expect(result).toBe(SubscriptionTier.FREE);
    });
  });

  describe('getTierByApiKey', () => {
    it('should return tier via API key lookup', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({ userId: USER_ID });
      const subscription = createSubscriptionFixture({
        userId: USER_ID,
        tier: SubscriptionTier.ENTERPRISE,
      });
      prismaMock.subscription.findUnique.mockResolvedValue(subscription);

      const result = await service.getTierByApiKey(API_KEY_ID);

      expect(prismaMock.apiKey.findUnique).toHaveBeenCalledWith({
        where: { id: API_KEY_ID },
        select: { userId: true },
      });
      expect(result).toBe(SubscriptionTier.ENTERPRISE);
    });

    it('should return FREE tier when API key not found', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue(null);

      const result = await service.getTierByApiKey(API_KEY_ID);

      expect(result).toBe(DEFAULT_TIER);
    });
  });

  describe('isEnterprise', () => {
    it('should return true when tier is ENTERPRISE', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(
        createSubscriptionFixture({ tier: SubscriptionTier.ENTERPRISE }),
      );

      const result = await service.isEnterprise(USER_ID);

      expect(result).toBe(true);
    });

    it('should return false when tier is HOBBY', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(
        createSubscriptionFixture({ tier: SubscriptionTier.HOBBY }),
      );

      const result = await service.isEnterprise(USER_ID);

      expect(result).toBe(false);
    });

    it('should return false when tier is FREE', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(
        createSubscriptionFixture({ tier: SubscriptionTier.FREE }),
      );

      const result = await service.isEnterprise(USER_ID);

      expect(result).toBe(false);
    });

    it('should return false when no subscription', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      const result = await service.isEnterprise(USER_ID);

      expect(result).toBe(false);
    });
  });

  describe('isEnterpriseByApiKey', () => {
    it('should return true when API key owner is ENTERPRISE', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({ userId: USER_ID });
      prismaMock.subscription.findUnique.mockResolvedValue(
        createSubscriptionFixture({ tier: SubscriptionTier.ENTERPRISE }),
      );

      const result = await service.isEnterpriseByApiKey(API_KEY_ID);

      expect(result).toBe(true);
    });

    it('should return false when API key not found', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue(null);

      const result = await service.isEnterpriseByApiKey(API_KEY_ID);

      expect(result).toBe(false);
    });
  });

  describe('ensureExists', () => {
    it('should return existing subscription when found', async () => {
      const subscription = createSubscriptionFixture({ userId: USER_ID });
      prismaMock.subscription.findUnique.mockResolvedValue(subscription);

      const result = await service.ensureExists(USER_ID);

      expect(prismaMock.subscription.create).not.toHaveBeenCalled();
      expect(result).toEqual(subscription);
    });

    it('should create subscription when not found', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);
      const newSubscription = createSubscriptionFixture({
        userId: USER_ID,
        tier: DEFAULT_TIER,
      });
      prismaMock.subscription.create.mockResolvedValue(newSubscription);

      const result = await service.ensureExists(USER_ID);

      expect(prismaMock.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          tier: DEFAULT_TIER,
        },
      });
      expect(result).toEqual(newSubscription);
    });
  });

  describe('updateTier', () => {
    it('should upsert subscription with new tier', async () => {
      const updatedSubscription = createSubscriptionFixture({
        userId: USER_ID,
        tier: SubscriptionTier.HOBBY,
      });
      prismaMock.subscription.upsert.mockResolvedValue(updatedSubscription);

      const result = await service.updateTier(USER_ID, SubscriptionTier.HOBBY);

      expect(prismaMock.subscription.upsert).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        create: {
          userId: USER_ID,
          tier: SubscriptionTier.HOBBY,
        },
        update: {
          tier: SubscriptionTier.HOBBY,
        },
      });
      expect(result.tier).toBe(SubscriptionTier.HOBBY);
    });

    it('should create subscription if not exists when updating tier', async () => {
      const newSubscription = createSubscriptionFixture({
        userId: USER_ID,
        tier: SubscriptionTier.ENTERPRISE,
      });
      prismaMock.subscription.upsert.mockResolvedValue(newSubscription);

      const result = await service.updateTier(USER_ID, SubscriptionTier.ENTERPRISE);

      expect(result.tier).toBe(SubscriptionTier.ENTERPRISE);
    });
  });
});
