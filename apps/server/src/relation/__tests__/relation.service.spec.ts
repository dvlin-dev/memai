/**
 * RelationService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RelationService } from '../relation.service';

describe('RelationService', () => {
  let service: RelationService;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    findByType: ReturnType<typeof vi.fn>;
    listWithEntities: ReturnType<typeof vi.fn>;
    findByEntity: ReturnType<typeof vi.fn>;
    findBetween: ReturnType<typeof vi.fn>;
    deleteById: ReturnType<typeof vi.fn>;
  };

  const API_KEY_ID = 'test-api-key-id';
  const USER_ID = 'test-user-id';

  const mockRelation = {
    id: 'relation-1',
    apiKeyId: API_KEY_ID,
    userId: USER_ID,
    sourceId: 'entity-1',
    targetId: 'entity-2',
    type: 'KNOWS',
    properties: null,
    confidence: 1.0,
    validFrom: null,
    validTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRelationWithEntities = {
    ...mockRelation,
    source: { id: 'entity-1', name: 'John', type: 'PERSON' },
    target: { id: 'entity-2', name: 'Jane', type: 'PERSON' },
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findByType: vi.fn(),
      listWithEntities: vi.fn(),
      findByEntity: vi.fn(),
      findBetween: vi.fn(),
      deleteById: vi.fn(),
    };

    service = new RelationService(repository as any);
  });

  describe('create', () => {
    it('应成功创建关系', async () => {
      repository.create.mockResolvedValue(mockRelation);

      const result = await service.create(API_KEY_ID, {
        userId: USER_ID,
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'KNOWS',
      });

      expect(repository.create).toHaveBeenCalledWith(API_KEY_ID, {
        userId: USER_ID,
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'KNOWS',
        properties: undefined,
        confidence: 1.0,
        validFrom: null,
        validTo: null,
      });
      expect(result).toEqual(mockRelation);
    });

    it('应使用自定义置信度创建关系', async () => {
      repository.create.mockResolvedValue({ ...mockRelation, confidence: 0.8 });

      await service.create(API_KEY_ID, {
        userId: USER_ID,
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'KNOWS',
        confidence: 0.8,
      });

      expect(repository.create).toHaveBeenCalledWith(
        API_KEY_ID,
        expect.objectContaining({ confidence: 0.8 }),
      );
    });

    it('应使用有效期创建关系', async () => {
      const validFrom = '2024-01-01T00:00:00.000Z';
      const validTo = '2025-01-01T00:00:00.000Z';
      repository.create.mockResolvedValue(mockRelation);

      await service.create(API_KEY_ID, {
        userId: USER_ID,
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'WORKS_AT',
        validFrom,
        validTo,
      });

      expect(repository.create).toHaveBeenCalledWith(
        API_KEY_ID,
        expect.objectContaining({
          validFrom: new Date(validFrom),
          validTo: new Date(validTo),
        }),
      );
    });

    it('应使用属性创建关系', async () => {
      const properties = { role: 'colleague', since: 2020 };
      repository.create.mockResolvedValue({ ...mockRelation, properties });

      await service.create(API_KEY_ID, {
        userId: USER_ID,
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'KNOWS',
        properties,
      });

      expect(repository.create).toHaveBeenCalledWith(
        API_KEY_ID,
        expect.objectContaining({ properties }),
      );
    });
  });

  describe('createMany', () => {
    it('应批量创建关系', async () => {
      const relation1 = { ...mockRelation, id: 'relation-1' };
      const relation2 = { ...mockRelation, id: 'relation-2', type: 'WORKS_WITH' };
      repository.create.mockResolvedValueOnce(relation1).mockResolvedValueOnce(relation2);

      const dtos = [
        { userId: USER_ID, sourceId: 'entity-1', targetId: 'entity-2', type: 'KNOWS' },
        { userId: USER_ID, sourceId: 'entity-1', targetId: 'entity-3', type: 'WORKS_WITH' },
      ];

      const result = await service.createMany(API_KEY_ID, dtos);

      expect(repository.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('relation-1');
      expect(result[1].id).toBe('relation-2');
    });

    it('应返回空数组当输入为空', async () => {
      const result = await service.createMany(API_KEY_ID, []);

      expect(result).toEqual([]);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('应按类型列出关系', async () => {
      repository.findByType.mockResolvedValue([mockRelationWithEntities]);

      const result = await service.list(API_KEY_ID, USER_ID, { type: 'KNOWS' });

      expect(repository.findByType).toHaveBeenCalledWith(API_KEY_ID, USER_ID, 'KNOWS');
      expect(result).toHaveLength(1);
    });

    it('应列出所有关系（不带类型过滤）', async () => {
      repository.listWithEntities.mockResolvedValue([mockRelationWithEntities]);

      const result = await service.list(API_KEY_ID, USER_ID, {});

      expect(repository.listWithEntities).toHaveBeenCalledWith(API_KEY_ID, USER_ID, {
        limit: undefined,
        offset: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('应支持分页参数', async () => {
      repository.listWithEntities.mockResolvedValue([]);

      await service.list(API_KEY_ID, USER_ID, { limit: 10, offset: 20 });

      expect(repository.listWithEntities).toHaveBeenCalledWith(API_KEY_ID, USER_ID, {
        limit: 10,
        offset: 20,
      });
    });

    it('应返回空数组当无关系时', async () => {
      repository.listWithEntities.mockResolvedValue([]);

      const result = await service.list(API_KEY_ID, USER_ID, {});

      expect(result).toEqual([]);
    });
  });

  describe('getByEntity', () => {
    it('应获取实体的所有关系', async () => {
      const relations = [
        mockRelationWithEntities,
        { ...mockRelationWithEntities, id: 'relation-2', type: 'WORKS_WITH' },
      ];
      repository.findByEntity.mockResolvedValue(relations);

      const result = await service.getByEntity(API_KEY_ID, 'entity-1');

      expect(repository.findByEntity).toHaveBeenCalledWith(API_KEY_ID, 'entity-1');
      expect(result).toHaveLength(2);
    });

    it('应返回空数组当实体无关系时', async () => {
      repository.findByEntity.mockResolvedValue([]);

      const result = await service.getByEntity(API_KEY_ID, 'entity-no-relations');

      expect(result).toEqual([]);
    });
  });

  describe('getBetween', () => {
    it('应获取两个实体之间的关系', async () => {
      repository.findBetween.mockResolvedValue([mockRelation]);

      const result = await service.getBetween(API_KEY_ID, 'entity-1', 'entity-2');

      expect(repository.findBetween).toHaveBeenCalledWith(API_KEY_ID, 'entity-1', 'entity-2');
      expect(result).toHaveLength(1);
    });

    it('应返回多个关系当存在多种类型时', async () => {
      const relations = [
        mockRelation,
        { ...mockRelation, id: 'relation-2', type: 'WORKS_WITH' },
      ];
      repository.findBetween.mockResolvedValue(relations);

      const result = await service.getBetween(API_KEY_ID, 'entity-1', 'entity-2');

      expect(result).toHaveLength(2);
    });

    it('应返回空数组当两实体间无关系时', async () => {
      repository.findBetween.mockResolvedValue([]);

      const result = await service.getBetween(API_KEY_ID, 'entity-1', 'entity-3');

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('应成功删除关系', async () => {
      repository.deleteById.mockResolvedValue(undefined);

      await service.delete(API_KEY_ID, 'relation-1');

      expect(repository.deleteById).toHaveBeenCalledWith(API_KEY_ID, 'relation-1');
    });

    it('应在关系不存在时静默处理', async () => {
      repository.deleteById.mockResolvedValue(undefined);

      await expect(service.delete(API_KEY_ID, 'non-existent')).resolves.not.toThrow();
    });
  });
});
