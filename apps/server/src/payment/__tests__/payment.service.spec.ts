/**
 * PaymentService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmac } from 'crypto';
import { PaymentService } from '../payment.service';
import { createPrismaMock, PrismaMock } from '../../../test/mocks';
import { SubscriptionTier, SubscriptionStatus } from '../../../generated/prisma/client';

describe('PaymentService', () => {
  let service: PaymentService;
  let prismaMock: PrismaMock;
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };

  const USER_ID = 'test-user-id';
  const WEBHOOK_SECRET = 'test-webhook-secret';

  beforeEach(() => {
    prismaMock = createPrismaMock();
    configService = {
      get: vi.fn(),
    };

    service = new PaymentService(prismaMock as any, configService as any);
  });

  describe('handleSubscriptionActivated', () => {
    it('should update subscription and quota in transaction', async () => {
      const txMock = {
        subscription: {
          upsert: vi.fn().mockResolvedValue({}),
        },
        quota: {
          upsert: vi.fn().mockResolvedValue({}),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await service.handleSubscriptionActivated({
        userId: USER_ID,
        creemCustomerId: 'cus_123',
        creemSubscriptionId: 'sub_123',
        tier: SubscriptionTier.HOBBY,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });

      expect(txMock.subscription.upsert).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        create: expect.objectContaining({
          userId: USER_ID,
          tier: SubscriptionTier.HOBBY,
          status: SubscriptionStatus.ACTIVE,
          creemCustomerId: 'cus_123',
          creemSubscriptionId: 'sub_123',
        }),
        update: expect.objectContaining({
          tier: SubscriptionTier.HOBBY,
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: false,
        }),
      });

      expect(txMock.quota.upsert).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        create: expect.objectContaining({
          userId: USER_ID,
          monthlyApiLimit: 5000, // HOBBY quota
          monthlyApiUsed: 0,
        }),
        update: expect.objectContaining({
          monthlyApiLimit: 5000,
          monthlyApiUsed: 0, // reset
        }),
      });
    });
  });

  describe('handleSubscriptionCanceled', () => {
    it('should update subscription status to CANCELED', async () => {
      prismaMock.subscription.update.mockResolvedValue({});

      await service.handleSubscriptionCanceled(USER_ID);

      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: true,
        },
      });
    });
  });

  describe('handleSubscriptionExpired', () => {
    it('should downgrade to FREE tier and reset quota', async () => {
      const txMock = {
        subscription: {
          update: vi.fn().mockResolvedValue({}),
        },
        quota: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      await service.handleSubscriptionExpired(USER_ID);

      expect(txMock.subscription.update).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.EXPIRED,
        },
      });

      expect(txMock.quota.update).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: expect.objectContaining({
          monthlyApiLimit: 100, // FREE quota
          monthlyApiUsed: 0,
          periodStartAt: expect.any(Date),
          periodEndAt: expect.any(Date),
        }),
      });
    });
  });

  describe('handleQuotaPurchase', () => {
    it('should increment quota and create payment order', async () => {
      const txMock = {
        quota: {
          upsert: vi.fn().mockResolvedValue({}),
        },
        paymentOrder: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      await service.handleQuotaPurchase({
        userId: USER_ID,
        amount: 10000,
        creemOrderId: 'order_123',
        price: 99,
      });

      expect(txMock.quota.upsert).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        create: expect.objectContaining({
          userId: USER_ID,
          monthlyApiLimit: 100, // FREE base
        }),
        update: {
          monthlyApiLimit: { increment: 10000 },
        },
      });

      expect(txMock.paymentOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          creemOrderId: 'order_123',
          type: 'quota_purchase',
          amount: 99,
          status: 'completed',
          metadata: { quotaAmount: 10000 },
        }),
      });
    });
  });

  describe('initializeUserQuota', () => {
    it('should create subscription and quota for new user', async () => {
      const txMock = {
        subscription: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        },
        quota: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      await service.initializeUserQuota(USER_ID);

      expect(txMock.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
        }),
      });

      expect(txMock.quota.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          monthlyApiLimit: 100, // FREE quota
          monthlyApiUsed: 0,
        }),
      });
    });

    it('should skip initialization when user already has subscription', async () => {
      const txMock = {
        subscription: {
          findUnique: vi.fn().mockResolvedValue({ userId: USER_ID }),
          create: vi.fn(),
        },
        quota: {
          create: vi.fn(),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      await service.initializeUserQuota(USER_ID);

      expect(txMock.subscription.create).not.toHaveBeenCalled();
      expect(txMock.quota.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
      const signature = createHmac('sha256', WEBHOOK_SECRET)
        .update(payload, 'utf8')
        .digest('hex');

      configService.get.mockReturnValue(WEBHOOK_SECRET);

      const result = service.verifyWebhookSignature(payload, signature);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = JSON.stringify({ event: 'test' });
      const invalidSignature = 'invalid_signature_hex';

      configService.get.mockReturnValue(WEBHOOK_SECRET);

      const result = service.verifyWebhookSignature(payload, invalidSignature);

      expect(result).toBe(false);
    });

    it('should return false when secret is not configured', () => {
      configService.get.mockReturnValue(undefined);

      const result = service.verifyWebhookSignature('payload', 'signature');

      expect(result).toBe(false);
    });

    it('should return false when signature is empty', () => {
      configService.get.mockReturnValue(WEBHOOK_SECRET);

      const result = service.verifyWebhookSignature('payload', '');

      expect(result).toBe(false);
    });

    it('should return false when signature length does not match', () => {
      const payload = JSON.stringify({ event: 'test' });
      const shortSignature = 'abc123'; // too short

      configService.get.mockReturnValue(WEBHOOK_SECRET);

      const result = service.verifyWebhookSignature(payload, shortSignature);

      expect(result).toBe(false);
    });

    it('should prevent timing attacks with timingSafeEqual', () => {
      const payload = JSON.stringify({ event: 'test' });
      const correctSignature = createHmac('sha256', WEBHOOK_SECRET)
        .update(payload, 'utf8')
        .digest('hex');
      // Change one character in signature
      const wrongSignature = correctSignature.slice(0, -1) + 'f';

      configService.get.mockReturnValue(WEBHOOK_SECRET);

      const result = service.verifyWebhookSignature(payload, wrongSignature);

      expect(result).toBe(false);
    });

    it('should handle malformed hex signature gracefully', () => {
      const payload = JSON.stringify({ event: 'test' });
      const malformedSignature = 'not-a-valid-hex-string-at-all!@#$%';

      configService.get.mockReturnValue(WEBHOOK_SECRET);

      const result = service.verifyWebhookSignature(payload, malformedSignature);

      expect(result).toBe(false);
    });
  });
});
