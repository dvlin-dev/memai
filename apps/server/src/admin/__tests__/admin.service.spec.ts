/**
 * AdminService 单元测试
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from '../admin.service';
import { createPrismaMock, PrismaMock } from '../../../test/mocks';

describe('AdminService', () => {
  let service: AdminService;
  let prismaMock: PrismaMock;

  const USER_ID = 'test-user-id';

  const mockUser = {
    id: USER_ID,
    email: 'test@example.com',
    name: 'Test User',
    isAdmin: false,
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    subscription: { tier: 'HOBBY', status: 'ACTIVE' },
    quota: { monthlyApiLimit: 5000, monthlyApiUsed: 100, periodEndAt: new Date() },
    _count: { usageRecords: 50, apiKeys: 2, webhooks: 1 },
  };

  const mockSubscription = {
    id: 'sub-1',
    userId: USER_ID,
    tier: 'HOBBY',
    status: 'ACTIVE',
    creemCustomerId: 'cus_123',
    creemSubscriptionId: 'sub_123',
    periodStartAt: new Date(),
    periodEndAt: new Date(),
    cancelAtPeriodEnd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: USER_ID, email: 'test@example.com', name: 'Test User' },
  };

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new AdminService(prismaMock as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getDashboardStats', () => {
    it('应返回仪表盘统计数据', async () => {
      prismaMock.user.count.mockResolvedValue(100);
      prismaMock.subscription.count.mockResolvedValue(50);
      prismaMock.usageRecord.count.mockResolvedValue(1000);
      prismaMock.paymentOrder.aggregate.mockResolvedValue({ _sum: { amount: 9900 } });

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        totalUsers: 100,
        activeSubscriptions: 50,
        usageRecordsToday: 1000,
        revenueMTD: 9900,
      });
    });

    it('应在无收入时返回 0', async () => {
      prismaMock.user.count.mockResolvedValue(0);
      prismaMock.subscription.count.mockResolvedValue(0);
      prismaMock.usageRecord.count.mockResolvedValue(0);
      prismaMock.paymentOrder.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.getDashboardStats();

      expect(result.revenueMTD).toBe(0);
    });
  });

  describe('getChartData', () => {
    it('应返回图表数据', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15'));

      prismaMock.usageRecord.groupBy.mockResolvedValue([]);
      prismaMock.paymentOrder.groupBy.mockResolvedValue([]);

      const result = await service.getChartData();

      expect(result.usage).toHaveLength(7);
      expect(result.revenue).toHaveLength(7);
    });

    it('应正确聚合用量数据', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15'));

      prismaMock.usageRecord.groupBy.mockResolvedValue([
        { createdAt: new Date('2024-03-14T10:00:00Z'), _count: { id: 100 } },
        { createdAt: new Date('2024-03-14T15:00:00Z'), _count: { id: 50 } },
      ]);
      prismaMock.paymentOrder.groupBy.mockResolvedValue([]);

      const result = await service.getChartData();

      const march14 = result.usage.find((u) => u.date === '2024-03-14');
      expect(march14?.value).toBe(150);
    });
  });

  describe('getUsers', () => {
    it('应返回用户列表', async () => {
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
      prismaMock.user.count.mockResolvedValue(1);

      const result = await service.getUsers({ limit: 10, offset: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('应支持搜索', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      await service.getUsers({ limit: 10, offset: 0, search: 'test' });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { email: { contains: 'test', mode: 'insensitive' } },
              { name: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('应支持管理员过滤', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      await service.getUsers({ limit: 10, offset: 0, isAdmin: true });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isAdmin: true }),
        }),
      );
    });
  });

  describe('getUser', () => {
    it('应返回用户详情', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUser(USER_ID);

      expect(result.id).toBe(USER_ID);
      expect(result.tier).toBe('HOBBY');
    });

    it('应在用户不存在时抛出 NotFoundException', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getUser('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('应更新用户', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        isAdmin: true,
      });

      const result = await service.updateUser(USER_ID, { isAdmin: true });

      expect(result.isAdmin).toBe(true);
    });

    it('应在用户不存在时抛出 NotFoundException', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUser('non-existent', { isAdmin: true })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteUser', () => {
    it('应软删除用户', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      const txMock = {
        user: { update: vi.fn().mockResolvedValue({}) },
        session: { deleteMany: vi.fn().mockResolvedValue({}) },
      };
      prismaMock.$transaction.mockImplementation(async (callback) => callback(txMock));

      await service.deleteUser(USER_ID);

      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { deletedAt: expect.any(Date) },
      });
      expect(txMock.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
    });

    it('应在用户不存在时抛出 NotFoundException', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSubscriptions', () => {
    it('应返回订阅列表', async () => {
      prismaMock.subscription.findMany.mockResolvedValue([mockSubscription]);
      prismaMock.subscription.count.mockResolvedValue(1);

      const result = await service.getSubscriptions({ limit: 10, offset: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].tier).toBe('HOBBY');
    });

    it('应支持层级过滤', async () => {
      prismaMock.subscription.findMany.mockResolvedValue([]);
      prismaMock.subscription.count.mockResolvedValue(0);

      await service.getSubscriptions({ limit: 10, offset: 0, tier: 'ENTERPRISE' });

      expect(prismaMock.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tier: 'ENTERPRISE' }),
        }),
      );
    });

    it('应支持状态过滤', async () => {
      prismaMock.subscription.findMany.mockResolvedValue([]);
      prismaMock.subscription.count.mockResolvedValue(0);

      await service.getSubscriptions({ limit: 10, offset: 0, status: 'CANCELED' });

      expect(prismaMock.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'CANCELED' }),
        }),
      );
    });
  });

  describe('getSubscription', () => {
    it('应返回订阅详情', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.getSubscription('sub-1');

      expect(result.id).toBe('sub-1');
      expect(result.userEmail).toBe('test@example.com');
    });

    it('应在订阅不存在时抛出 NotFoundException', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      await expect(service.getSubscription('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSubscription', () => {
    it('应更新订阅', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      prismaMock.subscription.update.mockResolvedValue({
        ...mockSubscription,
        tier: 'ENTERPRISE',
      });

      const result = await service.updateSubscription('sub-1', { tier: 'ENTERPRISE' });

      expect(result.tier).toBe('ENTERPRISE');
    });

    it('应在订阅不存在时抛出 NotFoundException', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSubscription('non-existent', { tier: 'ENTERPRISE' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrders', () => {
    const mockOrder = {
      id: 'order-1',
      userId: USER_ID,
      creemOrderId: 'creem_123',
      type: 'subscription',
      amount: 990,
      currency: 'USD',
      status: 'completed',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('应返回订单列表', async () => {
      prismaMock.paymentOrder.findMany.mockResolvedValue([mockOrder]);
      prismaMock.paymentOrder.count.mockResolvedValue(1);
      prismaMock.user.findMany.mockResolvedValue([
        { id: USER_ID, email: 'test@example.com', name: 'Test User' },
      ]);

      const result = await service.getOrders({ limit: 10, offset: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].userEmail).toBe('test@example.com');
    });

    it('应支持状态过滤', async () => {
      prismaMock.paymentOrder.findMany.mockResolvedValue([]);
      prismaMock.paymentOrder.count.mockResolvedValue(0);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.getOrders({ limit: 10, offset: 0, status: 'pending' });

      expect(prismaMock.paymentOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        }),
      );
    });

    it('应支持类型过滤', async () => {
      prismaMock.paymentOrder.findMany.mockResolvedValue([]);
      prismaMock.paymentOrder.count.mockResolvedValue(0);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.getOrders({ limit: 10, offset: 0, type: 'quota_purchase' });

      expect(prismaMock.paymentOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'quota_purchase' }),
        }),
      );
    });
  });

  describe('getOrder', () => {
    const mockOrder = {
      id: 'order-1',
      userId: USER_ID,
      creemOrderId: 'creem_123',
      type: 'subscription',
      amount: 990,
      currency: 'USD',
      status: 'completed',
      metadata: { plan: 'hobby' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('应返回订单详情', async () => {
      prismaMock.paymentOrder.findUnique.mockResolvedValue(mockOrder);
      prismaMock.user.findUnique.mockResolvedValue({
        id: USER_ID,
        email: 'test@example.com',
        name: 'Test User',
      });

      const result = await service.getOrder('order-1');

      expect(result.id).toBe('order-1');
      expect(result.metadata).toEqual({ plan: 'hobby' });
    });

    it('应在订单不存在时抛出 NotFoundException', async () => {
      prismaMock.paymentOrder.findUnique.mockResolvedValue(null);

      await expect(service.getOrder('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
