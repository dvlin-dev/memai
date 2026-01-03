/**
 * UsageService 单元测试
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UsageService, UsageType } from '../usage.service';
import { createPrismaMock, PrismaMock } from '../../../test/mocks';

describe('UsageService', () => {
  let service: UsageService;
  let prismaMock: PrismaMock;

  const USER_ID = 'test-user-id';
  const API_KEY_ID = 'test-api-key-id';

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new UsageService(prismaMock as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('recordUsage', () => {
    it('应记录用量', async () => {
      prismaMock.usageRecord.create.mockResolvedValue({});

      await service.recordUsage(USER_ID, UsageType.MEMORY, 1);

      expect(prismaMock.usageRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          type: UsageType.MEMORY,
          quantity: 1,
          billingPeriod: expect.stringMatching(/^\d{4}-\d{2}$/),
        }),
      });
    });

    it('应使用默认数量 1', async () => {
      prismaMock.usageRecord.create.mockResolvedValue({});

      await service.recordUsage(USER_ID, UsageType.API_CALL);

      expect(prismaMock.usageRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quantity: 1,
        }),
      });
    });

    it('应记录自定义数量', async () => {
      prismaMock.usageRecord.create.mockResolvedValue({});

      await service.recordUsage(USER_ID, UsageType.MEMORY, 5);

      expect(prismaMock.usageRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quantity: 5,
        }),
      });
    });

    it('应使用正确的账期格式', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15'));
      prismaMock.usageRecord.create.mockResolvedValue({});

      await service.recordUsage(USER_ID, UsageType.MEMORY);

      expect(prismaMock.usageRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          billingPeriod: '2024-03',
        }),
      });
    });
  });

  describe('recordUsageByApiKey', () => {
    it('应通过 API Key 记录用量', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({ userId: USER_ID });
      prismaMock.usageRecord.create.mockResolvedValue({});

      await service.recordUsageByApiKey(API_KEY_ID, UsageType.API_CALL);

      expect(prismaMock.apiKey.findUnique).toHaveBeenCalledWith({
        where: { id: API_KEY_ID },
        select: { userId: true },
      });
      expect(prismaMock.usageRecord.create).toHaveBeenCalled();
    });

    it('应在 API Key 不存在时跳过记录', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue(null);

      await service.recordUsageByApiKey(API_KEY_ID, UsageType.API_CALL);

      expect(prismaMock.usageRecord.create).not.toHaveBeenCalled();
    });
  });

  describe('getMonthlyUsage', () => {
    it('应返回当月用量汇总', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15'));

      prismaMock.usageRecord.groupBy.mockResolvedValue([
        { type: 'MEMORY', _sum: { quantity: 100 } },
        { type: 'API_CALL', _sum: { quantity: 500 } },
      ]);

      const result = await service.getMonthlyUsage(USER_ID);

      expect(result).toEqual({
        memories: 100,
        apiCalls: 500,
      });
      expect(prismaMock.usageRecord.groupBy).toHaveBeenCalledWith({
        by: ['type'],
        where: { userId: USER_ID, billingPeriod: '2024-03' },
        _sum: { quantity: true },
      });
    });

    it('应支持指定账期', async () => {
      prismaMock.usageRecord.groupBy.mockResolvedValue([]);

      await service.getMonthlyUsage(USER_ID, '2024-01');

      expect(prismaMock.usageRecord.groupBy).toHaveBeenCalledWith({
        by: ['type'],
        where: { userId: USER_ID, billingPeriod: '2024-01' },
        _sum: { quantity: true },
      });
    });

    it('应返回 0 当无记录时', async () => {
      prismaMock.usageRecord.groupBy.mockResolvedValue([]);

      const result = await service.getMonthlyUsage(USER_ID);

      expect(result).toEqual({
        memories: 0,
        apiCalls: 0,
      });
    });

    it('应处理只有部分类型的情况', async () => {
      prismaMock.usageRecord.groupBy.mockResolvedValue([
        { type: 'MEMORY', _sum: { quantity: 50 } },
      ]);

      const result = await service.getMonthlyUsage(USER_ID);

      expect(result).toEqual({
        memories: 50,
        apiCalls: 0,
      });
    });
  });

  describe('getUsageHistory', () => {
    it('应返回用量历史', async () => {
      prismaMock.usageRecord.groupBy
        .mockResolvedValueOnce([
          { billingPeriod: '2024-03' },
          { billingPeriod: '2024-02' },
        ])
        .mockResolvedValueOnce([{ type: 'MEMORY', _sum: { quantity: 100 } }])
        .mockResolvedValueOnce([{ type: 'API_CALL', _sum: { quantity: 200 } }]);

      const result = await service.getUsageHistory(USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].billingPeriod).toBe('2024-03');
    });

    it('应支持限制数量', async () => {
      prismaMock.usageRecord.groupBy.mockResolvedValue([]);

      await service.getUsageHistory(USER_ID, 6);

      expect(prismaMock.usageRecord.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ take: 6 }),
      );
    });

    it('应使用默认限制 12', async () => {
      prismaMock.usageRecord.groupBy.mockResolvedValue([]);

      await service.getUsageHistory(USER_ID);

      expect(prismaMock.usageRecord.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ take: 12 }),
      );
    });

    it('应返回空数组当无历史时', async () => {
      prismaMock.usageRecord.groupBy.mockResolvedValue([]);

      const result = await service.getUsageHistory(USER_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getDailyUsage', () => {
    it('应返回每日用量统计', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));

      prismaMock.usageRecord.findMany.mockResolvedValue([
        { type: 'MEMORY', quantity: 10, createdAt: new Date('2024-03-14') },
        { type: 'API_CALL', quantity: 20, createdAt: new Date('2024-03-14') },
        { type: 'MEMORY', quantity: 5, createdAt: new Date('2024-03-15') },
      ]);

      const result = await service.getDailyUsage(USER_ID, 3);

      expect(result).toHaveLength(3);
      expect(result.some((d) => d.memories === 10)).toBe(true);
    });

    it('应使用默认 30 天', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15'));
      prismaMock.usageRecord.findMany.mockResolvedValue([]);

      const result = await service.getDailyUsage(USER_ID);

      expect(result).toHaveLength(30);
    });

    it('应填充无数据的日期', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15'));
      prismaMock.usageRecord.findMany.mockResolvedValue([]);

      const result = await service.getDailyUsage(USER_ID, 7);

      expect(result).toHaveLength(7);
      expect(result.every((d) => d.memories === 0 && d.apiCalls === 0)).toBe(true);
    });
  });

  describe('getUserStats', () => {
    it('应返回用户统计概览', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15'));

      prismaMock.usageRecord.groupBy
        .mockResolvedValueOnce([
          { type: 'MEMORY', _sum: { quantity: 1000 } },
          { type: 'API_CALL', _sum: { quantity: 5000 } },
        ])
        .mockResolvedValueOnce([
          { type: 'MEMORY', _sum: { quantity: 100 } },
          { type: 'API_CALL', _sum: { quantity: 500 } },
        ]);

      const result = await service.getUserStats(USER_ID);

      expect(result).toEqual({
        totalMemories: 1000,
        totalApiCalls: 5000,
        thisMonthMemories: 100,
        thisMonthApiCalls: 500,
      });
    });

    it('应返回 0 当无数据时', async () => {
      prismaMock.usageRecord.groupBy.mockResolvedValue([]);

      const result = await service.getUserStats(USER_ID);

      expect(result).toEqual({
        totalMemories: 0,
        totalApiCalls: 0,
        thisMonthMemories: 0,
        thisMonthApiCalls: 0,
      });
    });
  });
});
