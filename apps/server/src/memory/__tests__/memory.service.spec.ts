/**
 * MemoryService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { MemoryService } from '../memory.service';
import { MemoryRepository } from '../memory.repository';
import { createPrismaMock, createEmbeddingMock, PrismaMock } from '../../../test/mocks';
import {
  createMemoryFixture,
  createMemoryDto,
  createSearchMemoryDto,
  createSessionMemoryFixture,
  createRichMemoryFixture,
} from '../../../test/fixtures';

describe('MemoryService', () => {
  let service: MemoryService;
  let repository: {
    createWithEmbedding: ReturnType<typeof vi.fn>;
    searchSimilar: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    deleteById: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let prismaMock: PrismaMock;
  let embeddingService: ReturnType<typeof createEmbeddingMock>;
  let quotaService: {
    checkMemoryQuota: ReturnType<typeof vi.fn>;
  };
  let usageService: {
    recordUsageByApiKey: ReturnType<typeof vi.fn>;
  };
  let subscriptionService: {
    isEnterpriseByApiKey: ReturnType<typeof vi.fn>;
  };

  const API_KEY_ID = 'test-api-key-id';

  beforeEach(() => {
    repository = {
      createWithEmbedding: vi.fn(),
      searchSimilar: vi.fn(),
      findMany: vi.fn(),
      findById: vi.fn(),
      deleteById: vi.fn(),
      delete: vi.fn(),
    };

    prismaMock = createPrismaMock();
    embeddingService = createEmbeddingMock();

    quotaService = {
      checkMemoryQuota: vi.fn().mockResolvedValue({ allowed: true }),
    };

    usageService = {
      recordUsageByApiKey: vi.fn().mockResolvedValue(undefined),
    };

    subscriptionService = {
      isEnterpriseByApiKey: vi.fn().mockResolvedValue(false),
    };

    service = new MemoryService(
      repository as unknown as MemoryRepository,
      prismaMock as any,
      embeddingService as any,
      quotaService as any,
      usageService as any,
      subscriptionService as any,
    );
  });

  describe('create', () => {
    it('should create memory when quota is available', async () => {
      const dto = createMemoryDto({ content: 'Test content' });
      const expectedMemory = createMemoryFixture({ content: dto.content });
      repository.createWithEmbedding.mockResolvedValue(expectedMemory);

      const result = await service.create(API_KEY_ID, dto);

      expect(quotaService.checkMemoryQuota).toHaveBeenCalledWith(API_KEY_ID);
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith('Test content');
      expect(repository.createWithEmbedding).toHaveBeenCalledWith(
        API_KEY_ID,
        expect.objectContaining({
          userId: dto.userId,
          content: dto.content,
        }),
        expect.any(Array),
      );
      expect(result).toEqual(expectedMemory);
    });

    it('should throw ForbiddenException when quota exceeded', async () => {
      quotaService.checkMemoryQuota.mockResolvedValue({
        allowed: false,
        reason: 'Memory limit reached',
      });

      const dto = createMemoryDto();

      await expect(service.create(API_KEY_ID, dto)).rejects.toThrow(ForbiddenException);
      await expect(service.create(API_KEY_ID, dto)).rejects.toThrow('Memory limit reached');
      expect(repository.createWithEmbedding).not.toHaveBeenCalled();
    });

    it('should record usage for Enterprise users', async () => {
      subscriptionService.isEnterpriseByApiKey.mockResolvedValue(true);
      repository.createWithEmbedding.mockResolvedValue(createMemoryFixture());

      const dto = createMemoryDto();
      await service.create(API_KEY_ID, dto);

      expect(usageService.recordUsageByApiKey).toHaveBeenCalledWith(API_KEY_ID, 'MEMORY');
    });

    it('should not record usage for non-Enterprise users', async () => {
      subscriptionService.isEnterpriseByApiKey.mockResolvedValue(false);
      repository.createWithEmbedding.mockResolvedValue(createMemoryFixture());

      const dto = createMemoryDto();
      await service.create(API_KEY_ID, dto);

      expect(usageService.recordUsageByApiKey).not.toHaveBeenCalled();
    });

    it('should pass agentId and sessionId when provided', async () => {
      const dto = createMemoryDto({
        agentId: 'agent-123',
        sessionId: 'session-456',
      });
      repository.createWithEmbedding.mockResolvedValue(
        createSessionMemoryFixture({ agentId: 'agent-123', sessionId: 'session-456' }),
      );

      await service.create(API_KEY_ID, dto);

      expect(repository.createWithEmbedding).toHaveBeenCalledWith(
        API_KEY_ID,
        expect.objectContaining({
          agentId: 'agent-123',
          sessionId: 'session-456',
        }),
        expect.any(Array),
      );
    });

    it('should pass metadata, source, importance, and tags when provided', async () => {
      const dto = createMemoryDto({
        metadata: { key: 'value' },
        source: 'api',
        importance: 0.9,
        tags: ['important'],
      });
      repository.createWithEmbedding.mockResolvedValue(createRichMemoryFixture());

      await service.create(API_KEY_ID, dto);

      expect(repository.createWithEmbedding).toHaveBeenCalledWith(
        API_KEY_ID,
        expect.objectContaining({
          metadata: { key: 'value' },
          source: 'api',
          importance: 0.9,
          tags: ['important'],
        }),
        expect.any(Array),
      );
    });

    it('should default tags to empty array when not provided', async () => {
      const dto = createMemoryDto();
      delete (dto as any).tags;
      repository.createWithEmbedding.mockResolvedValue(createMemoryFixture());

      await service.create(API_KEY_ID, dto);

      expect(repository.createWithEmbedding).toHaveBeenCalledWith(
        API_KEY_ID,
        expect.objectContaining({
          tags: [],
        }),
        expect.any(Array),
      );
    });
  });

  describe('search', () => {
    it('should generate embedding and search with default options', async () => {
      const dto = createSearchMemoryDto({ query: 'find similar' });
      const expectedMemories = [
        { ...createMemoryFixture(), similarity: 0.95 },
        { ...createMemoryFixture(), similarity: 0.85 },
      ];
      repository.searchSimilar.mockResolvedValue(expectedMemories);

      const result = await service.search(API_KEY_ID, dto);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith('find similar');
      expect(repository.searchSimilar).toHaveBeenCalledWith(
        API_KEY_ID,
        dto.userId,
        expect.any(Array),
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(expectedMemories);
    });

    it('should pass limit and threshold to repository', async () => {
      const dto = createSearchMemoryDto({
        query: 'test',
        limit: 5,
        threshold: 0.8,
      });
      repository.searchSimilar.mockResolvedValue([]);

      await service.search(API_KEY_ID, dto);

      expect(repository.searchSimilar).toHaveBeenCalledWith(
        API_KEY_ID,
        dto.userId,
        expect.any(Array),
        5,
        0.8,
        undefined,
        undefined,
      );
    });

    it('should pass agentId and sessionId filters', async () => {
      const dto = createSearchMemoryDto({
        agentId: 'agent-1',
        sessionId: 'session-1',
      });
      repository.searchSimilar.mockResolvedValue([]);

      await service.search(API_KEY_ID, dto);

      expect(repository.searchSimilar).toHaveBeenCalledWith(
        API_KEY_ID,
        dto.userId,
        expect.any(Array),
        undefined,
        undefined,
        'agent-1',
        'session-1',
      );
    });

    it('should return empty array when no results match', async () => {
      repository.searchSimilar.mockResolvedValue([]);

      const result = await service.search(
        API_KEY_ID,
        createSearchMemoryDto({ threshold: 0.99 }),
      );

      expect(result).toEqual([]);
    });
  });

  describe('list', () => {
    it('should list memories with default options', async () => {
      const memories = [createMemoryFixture(), createMemoryFixture()];
      repository.findMany.mockResolvedValue(memories);

      const result = await service.list(API_KEY_ID, 'user-123');

      expect(repository.findMany).toHaveBeenCalledWith(API_KEY_ID, {
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
      expect(result).toEqual(memories);
    });

    it('should apply limit and offset', async () => {
      repository.findMany.mockResolvedValue([]);

      await service.list(API_KEY_ID, 'user-123', { limit: 10, offset: 20 });

      expect(repository.findMany).toHaveBeenCalledWith(API_KEY_ID, {
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });

    it('should filter by agentId', async () => {
      repository.findMany.mockResolvedValue([]);

      await service.list(API_KEY_ID, 'user-123', { agentId: 'agent-1' });

      expect(repository.findMany).toHaveBeenCalledWith(API_KEY_ID, {
        where: { userId: 'user-123', agentId: 'agent-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should filter by sessionId', async () => {
      repository.findMany.mockResolvedValue([]);

      await service.list(API_KEY_ID, 'user-123', { sessionId: 'session-1' });

      expect(repository.findMany).toHaveBeenCalledWith(API_KEY_ID, {
        where: { userId: 'user-123', sessionId: 'session-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should filter by both agentId and sessionId', async () => {
      repository.findMany.mockResolvedValue([]);

      await service.list(API_KEY_ID, 'user-123', {
        agentId: 'agent-1',
        sessionId: 'session-1',
      });

      expect(repository.findMany).toHaveBeenCalledWith(API_KEY_ID, {
        where: {
          userId: 'user-123',
          agentId: 'agent-1',
          sessionId: 'session-1',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });
  });

  describe('getById', () => {
    it('should return memory when found', async () => {
      const memory = createMemoryFixture({ id: 'mem-1' });
      repository.findById.mockResolvedValue(memory);

      const result = await service.getById(API_KEY_ID, 'mem-1');

      expect(repository.findById).toHaveBeenCalledWith(API_KEY_ID, 'mem-1');
      expect(result).toEqual(memory);
    });

    it('should return null when memory not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(API_KEY_ID, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete memory by id', async () => {
      repository.deleteById.mockResolvedValue(undefined);

      await service.delete(API_KEY_ID, 'mem-1');

      expect(repository.deleteById).toHaveBeenCalledWith(API_KEY_ID, 'mem-1');
    });
  });

  describe('deleteByUser', () => {
    it('should delete all memories for a user', async () => {
      repository.delete.mockResolvedValue(undefined);

      await service.deleteByUser(API_KEY_ID, 'user-123');

      expect(repository.delete).toHaveBeenCalledWith(API_KEY_ID, { userId: 'user-123' });
    });
  });

  describe('listByUser', () => {
    it('should list memories across all API keys for a user', async () => {
      const memoriesFromDb = [
        {
          id: 'mem-1',
          apiKeyId: 'key-1',
          userId: 'end-user',
          agentId: null,
          sessionId: null,
          content: 'Memory 1',
          metadata: null,
          source: null,
          importance: 0.5,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          apiKey: { name: 'Key 1' },
        },
      ];
      prismaMock.memory.findMany.mockResolvedValue(memoriesFromDb);
      prismaMock.memory.count.mockResolvedValue(1);

      const result = await service.listByUser('owner-user-id');

      expect(prismaMock.memory.findMany).toHaveBeenCalledWith({
        where: { apiKey: { userId: 'owner-user-id' } },
        include: { apiKey: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].apiKeyName).toBe('Key 1');
      expect(result.total).toBe(1);
    });

    it('should filter by specific apiKeyId', async () => {
      prismaMock.memory.findMany.mockResolvedValue([]);
      prismaMock.memory.count.mockResolvedValue(0);

      await service.listByUser('owner-id', { apiKeyId: 'specific-key' });

      expect(prismaMock.memory.findMany).toHaveBeenCalledWith({
        where: {
          apiKey: { userId: 'owner-id' },
          apiKeyId: 'specific-key',
        },
        include: { apiKey: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should apply limit and offset', async () => {
      prismaMock.memory.findMany.mockResolvedValue([]);
      prismaMock.memory.count.mockResolvedValue(0);

      await service.listByUser('owner-id', { limit: 50, offset: 100 });

      expect(prismaMock.memory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 100,
        }),
      );
    });
  });

  describe('exportByUser', () => {
    const mockMemories = [
      {
        id: 'mem-1',
        userId: 'user-1',
        agentId: 'agent-1',
        sessionId: null,
        content: 'Test content',
        metadata: { key: 'value' },
        source: 'api',
        importance: 0.8,
        tags: ['tag1', 'tag2'],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        apiKey: { name: 'Test Key' },
      },
    ];

    describe('JSON format', () => {
      it('should export memories as JSON', async () => {
        prismaMock.memory.findMany.mockResolvedValue(mockMemories);

        const result = await service.exportByUser('owner-id', { format: 'json' });

        expect(result.contentType).toBe('application/json');
        expect(result.filename).toMatch(/^memories-export-\d{4}-\d{2}-\d{2}\.json$/);

        const parsed = JSON.parse(result.data);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].id).toBe('mem-1');
        expect(parsed[0].apiKeyName).toBe('Test Key');
      });

      it('should filter by apiKeyId in JSON export', async () => {
        prismaMock.memory.findMany.mockResolvedValue([]);

        await service.exportByUser('owner-id', { apiKeyId: 'key-1', format: 'json' });

        expect(prismaMock.memory.findMany).toHaveBeenCalledWith({
          where: {
            apiKey: { userId: 'owner-id' },
            apiKeyId: 'key-1',
          },
          include: { apiKey: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        });
      });
    });

    describe('CSV format', () => {
      it('should export memories as CSV', async () => {
        prismaMock.memory.findMany.mockResolvedValue(mockMemories);

        const result = await service.exportByUser('owner-id', { format: 'csv' });

        expect(result.contentType).toBe('text/csv');
        expect(result.filename).toMatch(/^memories-export-\d{4}-\d{2}-\d{2}\.csv$/);

        const lines = result.data.split('\n');
        expect(lines[0]).toBe(
          'id,userId,agentId,sessionId,content,source,importance,tags,apiKeyName,createdAt',
        );
        expect(lines[1]).toContain('mem-1');
        expect(lines[1]).toContain('tag1;tag2');
      });

      it('should escape special characters in CSV', async () => {
        const memoriesWithSpecialChars = [
          {
            ...mockMemories[0],
            content: 'Content with, comma and "quotes" and\nnewline',
          },
        ];
        prismaMock.memory.findMany.mockResolvedValue(memoriesWithSpecialChars);

        const result = await service.exportByUser('owner-id', { format: 'csv' });

        // Content should be wrapped in quotes with escaped internal quotes
        expect(result.data).toContain(
          '"Content with, comma and ""quotes"" and\nnewline"',
        );
      });

      it('should handle null values in CSV', async () => {
        const memoriesWithNulls = [
          {
            ...mockMemories[0],
            agentId: null,
            sessionId: null,
            source: null,
            importance: null,
          },
        ];
        prismaMock.memory.findMany.mockResolvedValue(memoriesWithNulls);

        const result = await service.exportByUser('owner-id', { format: 'csv' });

        const lines = result.data.split('\n');
        // Check that null values are exported as empty strings
        const fields = lines[1].split(',');
        expect(fields[2]).toBe(''); // agentId
        expect(fields[3]).toBe(''); // sessionId
      });

      it('should handle empty tags array in CSV', async () => {
        const memoriesWithEmptyTags = [
          {
            ...mockMemories[0],
            tags: [],
          },
        ];
        prismaMock.memory.findMany.mockResolvedValue(memoriesWithEmptyTags);

        const result = await service.exportByUser('owner-id', { format: 'csv' });

        const lines = result.data.split('\n');
        // Tags field should be empty
        expect(lines[1]).toContain(',,Test Key,'); // empty tags followed by apiKeyName
      });
    });
  });
});
