/**
 * ExtractService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtractService } from '../extract.service';

describe('ExtractService', () => {
  let service: ExtractService;
  let llmService: {
    extractEntitiesAndRelations: ReturnType<typeof vi.fn>;
  };
  let entityService: {
    upsert: ReturnType<typeof vi.fn>;
  };
  let relationService: {
    create: ReturnType<typeof vi.fn>;
  };

  const API_KEY_ID = 'test-api-key-id';
  const USER_ID = 'test-user-id';

  const mockExtractedEntities = [
    { name: 'John', type: 'person', confidence: 0.9, properties: { age: 30 } },
    { name: 'Acme Corp', type: 'organization', confidence: 0.85 },
  ];

  const mockExtractedRelations = [
    { source: 'John', target: 'Acme Corp', type: 'works_at', confidence: 0.8 },
  ];

  const mockEntity1 = {
    id: 'entity-1',
    apiKeyId: API_KEY_ID,
    userId: USER_ID,
    type: 'person',
    name: 'John',
    properties: { age: 30 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEntity2 = {
    id: 'entity-2',
    apiKeyId: API_KEY_ID,
    userId: USER_ID,
    type: 'organization',
    name: 'Acme Corp',
    properties: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRelation = {
    id: 'relation-1',
    apiKeyId: API_KEY_ID,
    userId: USER_ID,
    sourceId: 'entity-1',
    targetId: 'entity-2',
    type: 'works_at',
    confidence: 0.8,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    llmService = {
      extractEntitiesAndRelations: vi.fn(),
    };
    entityService = {
      upsert: vi.fn(),
    };
    relationService = {
      create: vi.fn(),
    };

    service = new ExtractService(
      llmService as any,
      entityService as any,
      relationService as any,
    );
  });

  describe('extractFromText', () => {
    it('应从文本中提取实体和关系并保存', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: mockExtractedEntities,
        relations: mockExtractedRelations,
      });
      entityService.upsert
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce(mockEntity2);
      relationService.create.mockResolvedValue(mockRelation);

      const result = await service.extractFromText(API_KEY_ID, 'John works at Acme Corp', {
        userId: USER_ID,
      });

      expect(result.entities).toHaveLength(2);
      expect(result.relations).toHaveLength(1);
      expect(result.rawExtraction.entities).toEqual(mockExtractedEntities);
      expect(result.rawExtraction.relations).toEqual(mockExtractedRelations);
    });

    it('应过滤低置信度的实体', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: [
          { name: 'High Conf', type: 'person', confidence: 0.9 },
          { name: 'Low Conf', type: 'person', confidence: 0.3 },
        ],
        relations: [],
      });
      entityService.upsert.mockResolvedValue(mockEntity1);

      const result = await service.extractFromText(API_KEY_ID, 'text', {
        userId: USER_ID,
        minConfidence: 0.5,
      });

      expect(entityService.upsert).toHaveBeenCalledTimes(1);
      expect(result.rawExtraction.entities).toHaveLength(1);
    });

    it('应过滤低置信度的关系', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: mockExtractedEntities,
        relations: [
          { source: 'John', target: 'Acme Corp', type: 'works_at', confidence: 0.8 },
          { source: 'John', target: 'Acme Corp', type: 'owns', confidence: 0.2 },
        ],
      });
      entityService.upsert
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce(mockEntity2);
      relationService.create.mockResolvedValue(mockRelation);

      const result = await service.extractFromText(API_KEY_ID, 'text', {
        userId: USER_ID,
        minConfidence: 0.5,
      });

      expect(relationService.create).toHaveBeenCalledTimes(1);
      expect(result.rawExtraction.relations).toHaveLength(1);
    });

    it('应使用默认置信度阈值 0.5', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: [{ name: 'Test', type: 'person', confidence: 0.4 }],
        relations: [],
      });

      const result = await service.extractFromText(API_KEY_ID, 'text', { userId: USER_ID });

      expect(entityService.upsert).not.toHaveBeenCalled();
      expect(result.rawExtraction.entities).toHaveLength(0);
    });

    it('应在 saveToGraph=false 时不保存到数据库', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: mockExtractedEntities,
        relations: mockExtractedRelations,
      });

      const result = await service.extractFromText(API_KEY_ID, 'text', {
        userId: USER_ID,
        saveToGraph: false,
      });

      expect(entityService.upsert).not.toHaveBeenCalled();
      expect(relationService.create).not.toHaveBeenCalled();
      expect(result.entities).toEqual([]);
      expect(result.relations).toEqual([]);
      expect(result.rawExtraction.entities).toHaveLength(2);
    });

    it('应传递实体类型提示给 LLM', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: [],
        relations: [],
      });

      await service.extractFromText(API_KEY_ID, 'text', {
        userId: USER_ID,
        entityTypes: ['person', 'organization'],
      });

      expect(llmService.extractEntitiesAndRelations).toHaveBeenCalledWith('text', {
        entityTypes: ['person', 'organization'],
        relationTypes: undefined,
      });
    });

    it('应传递关系类型提示给 LLM', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: [],
        relations: [],
      });

      await service.extractFromText(API_KEY_ID, 'text', {
        userId: USER_ID,
        relationTypes: ['works_at', 'knows'],
      });

      expect(llmService.extractEntitiesAndRelations).toHaveBeenCalledWith('text', {
        entityTypes: undefined,
        relationTypes: ['works_at', 'knows'],
      });
    });

    it('应跳过缺少源实体的关系', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: [{ name: 'Acme Corp', type: 'organization', confidence: 0.9 }],
        relations: [{ source: 'Unknown', target: 'Acme Corp', type: 'owns', confidence: 0.9 }],
      });
      entityService.upsert.mockResolvedValue(mockEntity2);

      const result = await service.extractFromText(API_KEY_ID, 'text', { userId: USER_ID });

      expect(relationService.create).not.toHaveBeenCalled();
      expect(result.relations).toEqual([]);
    });

    it('应跳过缺少目标实体的关系', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: [{ name: 'John', type: 'person', confidence: 0.9 }],
        relations: [{ source: 'John', target: 'Unknown', type: 'knows', confidence: 0.9 }],
      });
      entityService.upsert.mockResolvedValue(mockEntity1);

      const result = await service.extractFromText(API_KEY_ID, 'text', { userId: USER_ID });

      expect(relationService.create).not.toHaveBeenCalled();
      expect(result.relations).toEqual([]);
    });

    it('应处理实体名称大小写不敏感匹配', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: [
          { name: 'John', type: 'person', confidence: 0.9 },
          { name: 'ACME CORP', type: 'organization', confidence: 0.9 },
        ],
        relations: [{ source: 'john', target: 'acme corp', type: 'works_at', confidence: 0.9 }],
      });
      entityService.upsert
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce(mockEntity2);
      relationService.create.mockResolvedValue(mockRelation);

      const result = await service.extractFromText(API_KEY_ID, 'text', { userId: USER_ID });

      expect(relationService.create).toHaveBeenCalledTimes(1);
      expect(result.relations).toHaveLength(1);
    });

    it('应处理无置信度的实体（默认为 1）', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: [{ name: 'John', type: 'person' }], // 无 confidence
        relations: [],
      });
      entityService.upsert.mockResolvedValue(mockEntity1);

      const result = await service.extractFromText(API_KEY_ID, 'text', {
        userId: USER_ID,
        minConfidence: 0.5,
      });

      expect(entityService.upsert).toHaveBeenCalledTimes(1);
      expect(result.entities).toHaveLength(1);
    });
  });

  describe('extractFromTexts', () => {
    it('应批量处理多段文本', async () => {
      llmService.extractEntitiesAndRelations
        .mockResolvedValueOnce({
          entities: [{ name: 'John', type: 'person', confidence: 0.9 }],
          relations: [],
        })
        .mockResolvedValueOnce({
          entities: [{ name: 'Jane', type: 'person', confidence: 0.9 }],
          relations: [],
        });
      entityService.upsert
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce({ ...mockEntity1, id: 'entity-3', name: 'Jane' });

      const result = await service.extractFromTexts(API_KEY_ID, ['Text 1', 'Text 2'], {
        userId: USER_ID,
      });

      expect(llmService.extractEntitiesAndRelations).toHaveBeenCalledTimes(2);
      expect(result.entities).toHaveLength(2);
      expect(result.rawExtraction.entities).toHaveLength(2);
    });

    it('应合并所有结果', async () => {
      llmService.extractEntitiesAndRelations
        .mockResolvedValueOnce({
          entities: mockExtractedEntities,
          relations: mockExtractedRelations,
        })
        .mockResolvedValueOnce({
          entities: [{ name: 'Jane', type: 'person', confidence: 0.9 }],
          relations: [{ source: 'Jane', target: 'Acme Corp', type: 'works_at', confidence: 0.9 }],
        });
      entityService.upsert.mockResolvedValue(mockEntity1);
      relationService.create.mockResolvedValue(mockRelation);

      const result = await service.extractFromTexts(API_KEY_ID, ['Text 1', 'Text 2'], {
        userId: USER_ID,
      });

      expect(result.rawExtraction.entities).toHaveLength(3);
      expect(result.rawExtraction.relations).toHaveLength(2);
    });

    it('应返回空结果当输入为空数组', async () => {
      const result = await service.extractFromTexts(API_KEY_ID, [], { userId: USER_ID });

      expect(result.entities).toEqual([]);
      expect(result.relations).toEqual([]);
      expect(llmService.extractEntitiesAndRelations).not.toHaveBeenCalled();
    });
  });

  describe('preview', () => {
    it('应返回预览结果而不保存', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: mockExtractedEntities,
        relations: mockExtractedRelations,
      });

      const result = await service.preview('John works at Acme Corp');

      expect(result.entities).toEqual(mockExtractedEntities);
      expect(result.relations).toEqual(mockExtractedRelations);
      expect(entityService.upsert).not.toHaveBeenCalled();
      expect(relationService.create).not.toHaveBeenCalled();
    });

    it('应传递类型提示', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: [],
        relations: [],
      });

      await service.preview('text', {
        entityTypes: ['person'],
        relationTypes: ['knows'],
      });

      expect(llmService.extractEntitiesAndRelations).toHaveBeenCalledWith('text', {
        entityTypes: ['person'],
        relationTypes: ['knows'],
      });
    });

    it('应使用默认空选项', async () => {
      llmService.extractEntitiesAndRelations.mockResolvedValue({
        entities: [],
        relations: [],
      });

      await service.preview('text');

      expect(llmService.extractEntitiesAndRelations).toHaveBeenCalledWith('text', {});
    });
  });
});
