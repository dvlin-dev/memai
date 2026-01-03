/**
 * GraphService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphService } from '../graph.service';

describe('GraphService', () => {
  let service: GraphService;
  let entityRepository: {
    findMany: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };
  let relationRepository: {
    getPrisma: ReturnType<typeof vi.fn>;
    findByEntity: ReturnType<typeof vi.fn>;
  };

  const API_KEY_ID = 'test-api-key-id';
  const USER_ID = 'test-user-id';

  const mockEntity1 = {
    id: 'entity-1',
    apiKeyId: API_KEY_ID,
    userId: USER_ID,
    type: 'PERSON',
    name: 'John',
    properties: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEntity2 = {
    id: 'entity-2',
    apiKeyId: API_KEY_ID,
    userId: USER_ID,
    type: 'PERSON',
    name: 'Jane',
    properties: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEntity3 = {
    id: 'entity-3',
    apiKeyId: API_KEY_ID,
    userId: USER_ID,
    type: 'ORGANIZATION',
    name: 'Acme Corp',
    properties: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRelation1 = {
    id: 'relation-1',
    apiKeyId: API_KEY_ID,
    userId: USER_ID,
    sourceId: 'entity-1',
    targetId: 'entity-2',
    type: 'KNOWS',
    properties: null,
    confidence: 0.9,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRelation2 = {
    id: 'relation-2',
    apiKeyId: API_KEY_ID,
    userId: USER_ID,
    sourceId: 'entity-1',
    targetId: 'entity-3',
    type: 'WORKS_AT',
    properties: null,
    confidence: 1.0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    entityRepository = {
      findMany: vi.fn(),
      findById: vi.fn(),
    };

    const prismaMock = {
      relation: {
        findMany: vi.fn(),
      },
    };

    relationRepository = {
      getPrisma: vi.fn().mockReturnValue(prismaMock),
      findByEntity: vi.fn(),
    };

    service = new GraphService(entityRepository as any, relationRepository as any);
  });

  describe('getFullGraph', () => {
    it('应返回完整的知识图谱', async () => {
      entityRepository.findMany.mockResolvedValue([mockEntity1, mockEntity2]);
      relationRepository.getPrisma().relation.findMany.mockResolvedValue([mockRelation1]);

      const result = await service.getFullGraph(API_KEY_ID, USER_ID);

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0]).toEqual({
        id: 'entity-1',
        type: 'PERSON',
        name: 'John',
        properties: null,
      });
    });

    it('应使用默认限制 1000', async () => {
      entityRepository.findMany.mockResolvedValue([]);
      relationRepository.getPrisma().relation.findMany.mockResolvedValue([]);

      await service.getFullGraph(API_KEY_ID, USER_ID);

      expect(entityRepository.findMany).toHaveBeenCalledWith(API_KEY_ID, {
        where: { userId: USER_ID },
        take: 1000,
      });
    });

    it('应支持自定义限制', async () => {
      entityRepository.findMany.mockResolvedValue([]);
      relationRepository.getPrisma().relation.findMany.mockResolvedValue([]);

      await service.getFullGraph(API_KEY_ID, USER_ID, { limit: 50 });

      expect(entityRepository.findMany).toHaveBeenCalledWith(API_KEY_ID, {
        where: { userId: USER_ID },
        take: 50,
      });
    });

    it('应返回空图谱当无数据时', async () => {
      entityRepository.findMany.mockResolvedValue([]);
      relationRepository.getPrisma().relation.findMany.mockResolvedValue([]);

      const result = await service.getFullGraph(API_KEY_ID, USER_ID);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });
  });

  describe('traverse', () => {
    it('应从指定实体开始遍历', async () => {
      entityRepository.findById
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce(mockEntity2);
      relationRepository.findByEntity.mockResolvedValueOnce([mockRelation1]);
      relationRepository.findByEntity.mockResolvedValueOnce([]);

      const result = await service.traverse(API_KEY_ID, 'entity-1', { maxDepth: 1 });

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
    });

    it('应遵守最大深度限制', async () => {
      entityRepository.findById.mockResolvedValue(mockEntity1);
      relationRepository.findByEntity.mockResolvedValue([mockRelation1]);

      const result = await service.traverse(API_KEY_ID, 'entity-1', { maxDepth: 0 });

      // 深度为0时只返回起始节点，不遍历关系
      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(0);
    });

    it('应使用默认最大深度 2', async () => {
      entityRepository.findById.mockResolvedValue(mockEntity1);
      relationRepository.findByEntity.mockResolvedValue([]);

      await service.traverse(API_KEY_ID, 'entity-1');

      expect(entityRepository.findById).toHaveBeenCalled();
    });

    it('应按关系类型过滤', async () => {
      entityRepository.findById.mockResolvedValue(mockEntity1);
      relationRepository.findByEntity.mockResolvedValue([mockRelation1, mockRelation2]);

      const result = await service.traverse(API_KEY_ID, 'entity-1', {
        maxDepth: 1,
        relationTypes: ['WORKS_AT'],
      });

      // 只应包含 WORKS_AT 类型的边
      expect(result.edges.every((e) => e.type === 'WORKS_AT')).toBe(true);
    });

    it('应按实体类型过滤', async () => {
      entityRepository.findById
        .mockImplementation(async (_, id) => {
          if (id === 'entity-1') return mockEntity1;
          if (id === 'entity-3') return mockEntity3;
          return null;
        });
      relationRepository.findByEntity.mockResolvedValue([mockRelation2]);

      const result = await service.traverse(API_KEY_ID, 'entity-1', {
        maxDepth: 1,
        entityTypes: ['PERSON'],
      });

      // 只应包含 PERSON 类型的节点
      expect(result.nodes.every((n) => n.type === 'PERSON')).toBe(true);
    });

    it('应遵守节点数量限制', async () => {
      entityRepository.findById.mockResolvedValue(mockEntity1);
      relationRepository.findByEntity.mockResolvedValue([]);

      const result = await service.traverse(API_KEY_ID, 'entity-1', { limit: 1 });

      expect(result.nodes.length).toBeLessThanOrEqual(1);
    });

    it('应返回空结果当起始实体不存在时', async () => {
      entityRepository.findById.mockResolvedValue(null);

      const result = await service.traverse(API_KEY_ID, 'non-existent');

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('应去除重复边', async () => {
      entityRepository.findById
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce(mockEntity2);
      // 返回相同的边两次
      relationRepository.findByEntity
        .mockResolvedValueOnce([mockRelation1])
        .mockResolvedValueOnce([mockRelation1]);

      const result = await service.traverse(API_KEY_ID, 'entity-1', { maxDepth: 2 });

      const edgeIds = result.edges.map((e) => e.id);
      const uniqueEdgeIds = [...new Set(edgeIds)];
      expect(edgeIds.length).toBe(uniqueEdgeIds.length);
    });
  });

  describe('findPath', () => {
    it('应找到两个实体之间的最短路径', async () => {
      entityRepository.findById
        .mockImplementation(async (_, id) => {
          if (id === 'entity-1') return mockEntity1;
          if (id === 'entity-2') return mockEntity2;
          return null;
        });
      relationRepository.findByEntity.mockResolvedValue([mockRelation1]);

      const result = await service.findPath(API_KEY_ID, 'entity-1', 'entity-2');

      expect(result).not.toBeNull();
      expect(result!.nodes).toHaveLength(2);
      expect(result!.edges).toHaveLength(1);
    });

    it('应返回 null 当路径不存在时', async () => {
      entityRepository.findById.mockResolvedValue(mockEntity1);
      relationRepository.findByEntity.mockResolvedValue([]);

      const result = await service.findPath(API_KEY_ID, 'entity-1', 'entity-99');

      expect(result).toBeNull();
    });

    it('应遵守最大深度限制', async () => {
      entityRepository.findById.mockResolvedValue(mockEntity1);
      relationRepository.findByEntity.mockResolvedValue([mockRelation1]);

      // 设置很小的深度限制
      const result = await service.findPath(API_KEY_ID, 'entity-1', 'entity-99', 1);

      expect(result).toBeNull();
    });

    it('应找到直接连接的实体路径', async () => {
      entityRepository.findById
        .mockImplementation(async (_, id) => {
          if (id === 'entity-1') return mockEntity1;
          if (id === 'entity-2') return mockEntity2;
          return null;
        });
      relationRepository.findByEntity.mockResolvedValue([mockRelation1]);

      const result = await service.findPath(API_KEY_ID, 'entity-1', 'entity-2');

      expect(result).not.toBeNull();
      expect(result!.nodes[0].id).toBe('entity-1');
      expect(result!.nodes[1].id).toBe('entity-2');
    });
  });

  describe('getNeighbors', () => {
    it('应获取实体的所有邻居', async () => {
      entityRepository.findById.mockResolvedValue(mockEntity2);
      relationRepository.findByEntity.mockResolvedValue([mockRelation1]);

      const result = await service.getNeighbors(API_KEY_ID, 'entity-1');

      expect(result).toHaveLength(1);
      expect(result[0].entity.id).toBe('entity-2');
      expect(result[0].relation.type).toBe('KNOWS');
    });

    it('应按方向过滤 - 出边', async () => {
      entityRepository.findById.mockResolvedValue(mockEntity2);
      relationRepository.findByEntity.mockResolvedValue([mockRelation1]);

      const result = await service.getNeighbors(API_KEY_ID, 'entity-1', { direction: 'out' });

      expect(result).toHaveLength(1);
    });

    it('应按方向过滤 - 入边', async () => {
      entityRepository.findById.mockResolvedValue(mockEntity1);
      relationRepository.findByEntity.mockResolvedValue([mockRelation1]);

      const result = await service.getNeighbors(API_KEY_ID, 'entity-2', { direction: 'in' });

      expect(result).toHaveLength(1);
    });

    it('应按关系类型过滤', async () => {
      entityRepository.findById.mockResolvedValue(mockEntity2);
      relationRepository.findByEntity.mockResolvedValue([mockRelation1, mockRelation2]);

      const result = await service.getNeighbors(API_KEY_ID, 'entity-1', {
        relationTypes: ['KNOWS'],
      });

      expect(result.every((n) => n.relation.type === 'KNOWS')).toBe(true);
    });

    it('应返回空数组当实体无邻居时', async () => {
      relationRepository.findByEntity.mockResolvedValue([]);

      const result = await service.getNeighbors(API_KEY_ID, 'isolated-entity');

      expect(result).toEqual([]);
    });

    it('应跳过不存在的邻居实体', async () => {
      entityRepository.findById.mockResolvedValue(null);
      relationRepository.findByEntity.mockResolvedValue([mockRelation1]);

      const result = await service.getNeighbors(API_KEY_ID, 'entity-1');

      expect(result).toEqual([]);
    });
  });
});
