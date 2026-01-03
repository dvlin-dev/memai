/**
 * BaseRepository 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { createPrismaMock, PrismaMock } from '../../../test/mocks';

// 创建具体的 Repository 实现用于测试
interface TestEntity {
  id: string;
  apiKeyId: string;
  name: string;
}

class TestRepository extends BaseRepository<TestEntity> {
  constructor(prisma: any) {
    super(prisma, 'testModel');
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let prismaMock: PrismaMock;
  let modelMock: any;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    // 添加测试模型
    modelMock = {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    };
    (prismaMock as any).testModel = modelMock;

    repository = new TestRepository(prismaMock);
  });

  describe('withApiKeyFilter', () => {
    it('应将 apiKeyId 添加到查询条件', async () => {
      modelMock.findMany.mockResolvedValue([]);

      await repository.findMany('api-key-1', { where: { name: 'test' } });

      expect(modelMock.findMany).toHaveBeenCalledWith({
        where: { name: 'test', apiKeyId: 'api-key-1' },
      });
    });

    it('应在无现有条件时仅添加 apiKeyId', async () => {
      modelMock.findMany.mockResolvedValue([]);

      await repository.findMany('api-key-1');

      expect(modelMock.findMany).toHaveBeenCalledWith({
        where: { apiKeyId: 'api-key-1' },
      });
    });
  });

  describe('findMany', () => {
    it('应返回过滤后的记录列表', async () => {
      const mockEntities = [
        { id: '1', apiKeyId: 'api-key-1', name: 'Entity 1' },
        { id: '2', apiKeyId: 'api-key-1', name: 'Entity 2' },
      ];
      modelMock.findMany.mockResolvedValue(mockEntities);

      const result = await repository.findMany('api-key-1');

      expect(result).toEqual(mockEntities);
    });

    it('应支持分页参数', async () => {
      modelMock.findMany.mockResolvedValue([]);

      await repository.findMany('api-key-1', {
        take: 10,
        skip: 20,
        orderBy: { name: 'asc' },
      });

      expect(modelMock.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 20,
        orderBy: { name: 'asc' },
        where: { apiKeyId: 'api-key-1' },
      });
    });

    it('应支持 include 参数', async () => {
      modelMock.findMany.mockResolvedValue([]);

      await repository.findMany('api-key-1', {
        include: { relation: true },
      });

      expect(modelMock.findMany).toHaveBeenCalledWith({
        include: { relation: true },
        where: { apiKeyId: 'api-key-1' },
      });
    });
  });

  describe('findOne', () => {
    it('应返回匹配的单条记录', async () => {
      const mockEntity = { id: '1', apiKeyId: 'api-key-1', name: 'Entity 1' };
      modelMock.findFirst.mockResolvedValue(mockEntity);

      const result = await repository.findOne('api-key-1', { name: 'Entity 1' });

      expect(result).toEqual(mockEntity);
      expect(modelMock.findFirst).toHaveBeenCalledWith({
        where: { name: 'Entity 1', apiKeyId: 'api-key-1' },
      });
    });

    it('应在无匹配记录时返回 null', async () => {
      modelMock.findFirst.mockResolvedValue(null);

      const result = await repository.findOne('api-key-1', { name: 'nonexistent' });

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('应根据 ID 查询记录', async () => {
      const mockEntity = { id: '1', apiKeyId: 'api-key-1', name: 'Entity 1' };
      modelMock.findFirst.mockResolvedValue(mockEntity);

      const result = await repository.findById('api-key-1', '1');

      expect(result).toEqual(mockEntity);
      expect(modelMock.findFirst).toHaveBeenCalledWith({
        where: { id: '1', apiKeyId: 'api-key-1' },
      });
    });

    it('不应返回其他 apiKeyId 的记录', async () => {
      modelMock.findFirst.mockResolvedValue(null);

      const result = await repository.findById('api-key-1', '1');

      // 即使 ID 存在，不同的 apiKeyId 也应返回 null
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('应创建记录并自动注入 apiKeyId', async () => {
      const mockEntity = { id: '1', apiKeyId: 'api-key-1', name: 'New Entity' };
      modelMock.create.mockResolvedValue(mockEntity);

      const result = await repository.create('api-key-1', { name: 'New Entity' });

      expect(result).toEqual(mockEntity);
      expect(modelMock.create).toHaveBeenCalledWith({
        data: { name: 'New Entity', apiKeyId: 'api-key-1' },
      });
    });

    it('不应覆盖传入的 apiKeyId', async () => {
      const mockEntity = { id: '1', apiKeyId: 'api-key-1', name: 'Entity' };
      modelMock.create.mockResolvedValue(mockEntity);

      // 传入一个不同的 apiKeyId，应该被参数覆盖
      await repository.create('api-key-1', {
        name: 'Entity',
        apiKeyId: 'different-key', // 这会被覆盖
      });

      expect(modelMock.create).toHaveBeenCalledWith({
        data: { name: 'Entity', apiKeyId: 'api-key-1' },
      });
    });
  });

  describe('createMany', () => {
    it('应批量创建记录并为每条注入 apiKeyId', async () => {
      modelMock.createMany.mockResolvedValue({ count: 2 });

      const result = await repository.createMany('api-key-1', [
        { name: 'Entity 1' },
        { name: 'Entity 2' },
      ]);

      expect(result).toEqual({ count: 2 });
      expect(modelMock.createMany).toHaveBeenCalledWith({
        data: [
          { name: 'Entity 1', apiKeyId: 'api-key-1' },
          { name: 'Entity 2', apiKeyId: 'api-key-1' },
        ],
      });
    });

    it('应处理空数组', async () => {
      modelMock.createMany.mockResolvedValue({ count: 0 });

      const result = await repository.createMany('api-key-1', []);

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('update', () => {
    it('应更新存在的记录', async () => {
      const existingEntity = { id: '1', apiKeyId: 'api-key-1', name: 'Old Name' };
      const updatedEntity = { id: '1', apiKeyId: 'api-key-1', name: 'New Name' };

      modelMock.findFirst.mockResolvedValue(existingEntity);
      modelMock.update.mockResolvedValue(updatedEntity);

      const result = await repository.update('api-key-1', { id: '1' }, { name: 'New Name' });

      expect(result).toEqual(updatedEntity);
      expect(modelMock.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'New Name' },
      });
    });

    it('应在记录不存在时抛出 NotFoundException', async () => {
      modelMock.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('api-key-1', { id: '999' }, { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);

      expect(modelMock.update).not.toHaveBeenCalled();
    });

    it('不应更新其他 apiKeyId 的记录', async () => {
      // findFirst 返回 null 因为 apiKeyId 不匹配
      modelMock.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('api-key-1', { id: '1' }, { name: 'Hacked' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateById', () => {
    it('应根据 ID 更新记录', async () => {
      const existingEntity = { id: '1', apiKeyId: 'api-key-1', name: 'Old' };
      const updatedEntity = { id: '1', apiKeyId: 'api-key-1', name: 'New' };

      modelMock.findFirst.mockResolvedValue(existingEntity);
      modelMock.update.mockResolvedValue(updatedEntity);

      const result = await repository.updateById('api-key-1', '1', { name: 'New' });

      expect(result).toEqual(updatedEntity);
    });
  });

  describe('delete', () => {
    it('应删除匹配的记录', async () => {
      modelMock.deleteMany.mockResolvedValue({ count: 1 });

      await repository.delete('api-key-1', { name: 'To Delete' });

      expect(modelMock.deleteMany).toHaveBeenCalledWith({
        where: { name: 'To Delete', apiKeyId: 'api-key-1' },
      });
    });

    it('应在无匹配记录时静默成功', async () => {
      modelMock.deleteMany.mockResolvedValue({ count: 0 });

      // 不应抛出错误
      await expect(repository.delete('api-key-1', { name: 'nonexistent' })).resolves.not.toThrow();
    });
  });

  describe('deleteById', () => {
    it('应根据 ID 删除记录', async () => {
      modelMock.deleteMany.mockResolvedValue({ count: 1 });

      await repository.deleteById('api-key-1', '1');

      expect(modelMock.deleteMany).toHaveBeenCalledWith({
        where: { id: '1', apiKeyId: 'api-key-1' },
      });
    });
  });

  describe('count', () => {
    it('应返回过滤后的记录数', async () => {
      modelMock.count.mockResolvedValue(5);

      const result = await repository.count('api-key-1', { name: 'Test' });

      expect(result).toBe(5);
      expect(modelMock.count).toHaveBeenCalledWith({
        where: { name: 'Test', apiKeyId: 'api-key-1' },
      });
    });

    it('应在无条件时仅按 apiKeyId 过滤', async () => {
      modelMock.count.mockResolvedValue(10);

      const result = await repository.count('api-key-1');

      expect(result).toBe(10);
      expect(modelMock.count).toHaveBeenCalledWith({
        where: { apiKeyId: 'api-key-1' },
      });
    });
  });

  describe('exists', () => {
    it('应在记录存在时返回 true', async () => {
      modelMock.count.mockResolvedValue(1);

      const result = await repository.exists('api-key-1', { name: 'Test' });

      expect(result).toBe(true);
    });

    it('应在记录不存在时返回 false', async () => {
      modelMock.count.mockResolvedValue(0);

      const result = await repository.exists('api-key-1', { name: 'nonexistent' });

      expect(result).toBe(false);
    });
  });

  describe('getPrisma', () => {
    it('应返回 Prisma 实例', () => {
      const result = repository.getPrisma();

      expect(result).toBe(prismaMock);
    });
  });

  describe('数据隔离安全性', () => {
    it('不应允许跨 apiKeyId 访问数据', async () => {
      // 设置：api-key-1 拥有的记录
      const entity = { id: '1', apiKeyId: 'api-key-1', name: 'Secret' };

      // 使用 api-key-2 尝试访问
      modelMock.findFirst.mockImplementation((args: any) => {
        // 只有 apiKeyId 匹配时才返回数据
        if (args.where.apiKeyId === 'api-key-1' && args.where.id === '1') {
          return Promise.resolve(entity);
        }
        return Promise.resolve(null);
      });

      // api-key-1 可以访问
      const result1 = await repository.findById('api-key-1', '1');
      expect(result1).toEqual(entity);

      // api-key-2 不能访问
      const result2 = await repository.findById('api-key-2', '1');
      expect(result2).toBeNull();
    });
  });
});
