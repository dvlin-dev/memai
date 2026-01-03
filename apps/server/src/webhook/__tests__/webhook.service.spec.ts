/**
 * WebhookService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WebhookService } from '../webhook.service';
import { createPrismaMock, PrismaMock } from '../../../test/mocks';

// Mock MAX_WEBHOOKS_PER_USER
vi.mock('../webhook.constants', () => ({
  MAX_WEBHOOKS_PER_USER: 5,
}));

describe('WebhookService', () => {
  let service: WebhookService;
  let prismaMock: PrismaMock;

  const USER_ID = 'test-user-id';
  const WEBHOOK_ID = 'webhook-1';

  const mockWebhook = {
    id: WEBHOOK_ID,
    userId: USER_ID,
    name: 'Test Webhook',
    url: 'https://example.com/webhook',
    secret: 'whsec_abc123def456abc123def456abc123def456abc123def456',
    events: ['memory.created', 'memory.deleted'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new WebhookService(prismaMock as any);
  });

  describe('create', () => {
    it('应成功创建 Webhook', async () => {
      prismaMock.webhook.count.mockResolvedValue(0);
      prismaMock.webhook.create.mockResolvedValue(mockWebhook);

      const result = await service.create(USER_ID, {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['memory.created'],
      });

      expect(result.id).toBe(WEBHOOK_ID);
      expect(result.secretPreview).toMatch(/^whsec_.+\.\.\.$/);
      expect(prismaMock.webhook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['memory.created'],
          secret: expect.stringMatching(/^whsec_/),
        }),
      });
    });

    it('应在达到限制时抛出异常', async () => {
      prismaMock.webhook.count.mockResolvedValue(5);

      await expect(
        service.create(USER_ID, {
          name: 'Test',
          url: 'https://example.com',
          events: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllByUser', () => {
    it('应返回用户的所有 Webhooks', async () => {
      prismaMock.webhook.findMany.mockResolvedValue([mockWebhook]);

      const result = await service.findAllByUser(USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(WEBHOOK_ID);
      expect(prismaMock.webhook.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('应返回空数组当无 Webhooks 时', async () => {
      prismaMock.webhook.findMany.mockResolvedValue([]);

      const result = await service.findAllByUser(USER_ID);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('应返回指定 Webhook', async () => {
      prismaMock.webhook.findFirst.mockResolvedValue(mockWebhook);

      const result = await service.findOne(WEBHOOK_ID, USER_ID);

      expect(result.id).toBe(WEBHOOK_ID);
      expect(prismaMock.webhook.findFirst).toHaveBeenCalledWith({
        where: { id: WEBHOOK_ID, userId: USER_ID },
      });
    });

    it('应在 Webhook 不存在时抛出 NotFoundException', async () => {
      prismaMock.webhook.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent', USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应成功更新 Webhook', async () => {
      prismaMock.webhook.findFirst.mockResolvedValue(mockWebhook);
      prismaMock.webhook.update.mockResolvedValue({
        ...mockWebhook,
        name: 'Updated Name',
      });

      const result = await service.update(WEBHOOK_ID, USER_ID, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(prismaMock.webhook.update).toHaveBeenCalledWith({
        where: { id: WEBHOOK_ID },
        data: expect.objectContaining({ name: 'Updated Name' }),
      });
    });

    it('应在 Webhook 不存在时抛出 NotFoundException', async () => {
      prismaMock.webhook.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', USER_ID, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('应支持更新多个字段', async () => {
      prismaMock.webhook.findFirst.mockResolvedValue(mockWebhook);
      prismaMock.webhook.update.mockResolvedValue(mockWebhook);

      await service.update(WEBHOOK_ID, USER_ID, {
        name: 'New Name',
        url: 'https://new.example.com',
        events: ['entity.created'],
        isActive: false,
      });

      expect(prismaMock.webhook.update).toHaveBeenCalledWith({
        where: { id: WEBHOOK_ID },
        data: {
          name: 'New Name',
          url: 'https://new.example.com',
          events: ['entity.created'],
          isActive: false,
        },
      });
    });
  });

  describe('remove', () => {
    it('应成功删除 Webhook', async () => {
      prismaMock.webhook.findFirst.mockResolvedValue(mockWebhook);
      prismaMock.webhook.delete.mockResolvedValue(mockWebhook);

      await service.remove(WEBHOOK_ID, USER_ID);

      expect(prismaMock.webhook.delete).toHaveBeenCalledWith({
        where: { id: WEBHOOK_ID },
      });
    });

    it('应在 Webhook 不存在时抛出 NotFoundException', async () => {
      prismaMock.webhook.findFirst.mockResolvedValue(null);

      await expect(service.remove('non-existent', USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('regenerateSecret', () => {
    it('应重新生成 Secret', async () => {
      prismaMock.webhook.findFirst.mockResolvedValue(mockWebhook);
      prismaMock.webhook.update.mockResolvedValue({
        ...mockWebhook,
        secret: 'whsec_new_secret_here',
      });

      const result = await service.regenerateSecret(WEBHOOK_ID, USER_ID);

      expect(result.secretPreview).toMatch(/^whsec_.+\.\.\.$/);
      expect(prismaMock.webhook.update).toHaveBeenCalledWith({
        where: { id: WEBHOOK_ID },
        data: { secret: expect.stringMatching(/^whsec_/) },
      });
    });

    it('应在 Webhook 不存在时抛出 NotFoundException', async () => {
      prismaMock.webhook.findFirst.mockResolvedValue(null);

      await expect(service.regenerateSecret('non-existent', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDeliveries', () => {
    it('应返回 Webhook 投递日志', async () => {
      prismaMock.webhook.findFirst.mockResolvedValue(mockWebhook);
      prismaMock.webhookDelivery.findMany.mockResolvedValue([
        {
          id: 'delivery-1',
          webhookId: WEBHOOK_ID,
          event: 'memory.created',
          statusCode: 200,
          success: true,
          error: null,
          attempts: 1,
          latencyMs: 150,
          createdAt: new Date(),
          deliveredAt: new Date(),
        },
      ]);
      prismaMock.webhookDelivery.count.mockResolvedValue(1);

      const result = await service.getDeliveries(WEBHOOK_ID, USER_ID);

      expect(result.deliveries).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('应在 Webhook 不存在时抛出 NotFoundException', async () => {
      prismaMock.webhook.findFirst.mockResolvedValue(null);

      await expect(service.getDeliveries('non-existent', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应支持分页', async () => {
      prismaMock.webhook.findFirst.mockResolvedValue(mockWebhook);
      prismaMock.webhookDelivery.findMany.mockResolvedValue([]);
      prismaMock.webhookDelivery.count.mockResolvedValue(0);

      await service.getDeliveries(WEBHOOK_ID, USER_ID, { limit: 10, offset: 5 });

      expect(prismaMock.webhookDelivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        }),
      );
    });
  });

  describe('getAllDeliveries', () => {
    it('应返回用户所有 Webhook 的投递日志', async () => {
      prismaMock.webhook.findMany.mockResolvedValue([mockWebhook]);
      prismaMock.webhookDelivery.findMany.mockResolvedValue([]);
      prismaMock.webhookDelivery.count.mockResolvedValue(0);

      const result = await service.getAllDeliveries(USER_ID);

      expect(result.deliveries).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('应在无 Webhooks 时返回空结果', async () => {
      prismaMock.webhook.findMany.mockResolvedValue([]);

      const result = await service.getAllDeliveries(USER_ID);

      expect(result).toEqual({ deliveries: [], total: 0 });
    });

    it('应支持按 Webhook ID 过滤', async () => {
      prismaMock.webhook.findMany.mockResolvedValue([mockWebhook]);
      prismaMock.webhookDelivery.findMany.mockResolvedValue([]);
      prismaMock.webhookDelivery.count.mockResolvedValue(0);

      await service.getAllDeliveries(USER_ID, { webhookId: WEBHOOK_ID });

      expect(prismaMock.webhook.findMany).toHaveBeenCalledWith({
        where: { id: WEBHOOK_ID, userId: USER_ID },
        select: { id: true, name: true },
      });
    });
  });
});
