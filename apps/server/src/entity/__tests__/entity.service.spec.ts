/**
 * EntityService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EntityService } from '../entity.service';
import { EntityRepository } from '../entity.repository';
import { createPrismaMock, PrismaMock } from '../../../test/mocks';
import {
  createEntityFixture,
  createRichEntityFixture,
  createOrganizationEntityFixture,
} from '../../../test/fixtures';

describe('EntityService', () => {
  let service: EntityService;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByType: ReturnType<typeof vi.fn>;
    deleteById: ReturnType<typeof vi.fn>;
  };
  let prismaMock: PrismaMock;

  const API_KEY_ID = 'test-api-key-id';

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
      findById: vi.fn(),
      findByType: vi.fn(),
      deleteById: vi.fn(),
    };

    prismaMock = createPrismaMock();

    service = new EntityService(
      repository as unknown as EntityRepository,
      prismaMock as any,
    );
  });

  describe('create', () => {
    it('should create entity with required fields', async () => {
      const dto = {
        userId: 'user-123',
        type: 'PERSON',
        name: 'John Doe',
      };
      const expectedEntity = createEntityFixture({
        userId: dto.userId,
        type: dto.type,
        name: dto.name,
      });
      repository.create.mockResolvedValue(expectedEntity);

      const result = await service.create(API_KEY_ID, dto);

      expect(repository.create).toHaveBeenCalledWith(API_KEY_ID, {
        userId: 'user-123',
        type: 'PERSON',
        name: 'John Doe',
        properties: undefined,
        confidence: 1.0,
      });
      expect(result).toEqual(expectedEntity);
    });

    it('should create entity with properties and confidence', async () => {
      const dto = {
        userId: 'user-123',
        type: 'PERSON',
        name: 'Jane Doe',
        properties: { occupation: 'Engineer' },
        confidence: 0.85,
      };
      const expectedEntity = createRichEntityFixture({
        ...dto,
        properties: dto.properties,
      });
      repository.create.mockResolvedValue(expectedEntity);

      const result = await service.create(API_KEY_ID, dto);

      expect(repository.create).toHaveBeenCalledWith(API_KEY_ID, {
        userId: 'user-123',
        type: 'PERSON',
        name: 'Jane Doe',
        properties: { occupation: 'Engineer' },
        confidence: 0.85,
      });
      expect(result.properties).toEqual({ occupation: 'Engineer' });
    });

    it('should default confidence to 1.0 when not provided', async () => {
      const dto = {
        userId: 'user-123',
        type: 'PERSON',
        name: 'Test',
      };
      repository.create.mockResolvedValue(createEntityFixture());

      await service.create(API_KEY_ID, dto);

      expect(repository.create).toHaveBeenCalledWith(
        API_KEY_ID,
        expect.objectContaining({ confidence: 1.0 }),
      );
    });
  });

  describe('upsert', () => {
    it('should upsert entity', async () => {
      const dto = {
        userId: 'user-123',
        type: 'ORGANIZATION',
        name: 'Test Corp',
        properties: { industry: 'Tech' },
      };
      const expectedEntity = createOrganizationEntityFixture({
        name: dto.name,
        properties: dto.properties,
      });
      repository.upsert.mockResolvedValue(expectedEntity);

      const result = await service.upsert(API_KEY_ID, dto);

      expect(repository.upsert).toHaveBeenCalledWith(API_KEY_ID, {
        userId: 'user-123',
        type: 'ORGANIZATION',
        name: 'Test Corp',
        properties: { industry: 'Tech' },
        confidence: 1.0,
      });
      expect(result).toEqual(expectedEntity);
    });

    it('should default confidence to 1.0 when not provided', async () => {
      const dto = {
        userId: 'user-123',
        type: 'PERSON',
        name: 'Test',
      };
      repository.upsert.mockResolvedValue(createEntityFixture());

      await service.upsert(API_KEY_ID, dto);

      expect(repository.upsert).toHaveBeenCalledWith(
        API_KEY_ID,
        expect.objectContaining({ confidence: 1.0 }),
      );
    });
  });

  describe('createMany', () => {
    it('should create multiple entities using upsert', async () => {
      const dtos = [
        { userId: 'user-1', type: 'PERSON', name: 'Person 1' },
        { userId: 'user-1', type: 'PERSON', name: 'Person 2' },
        { userId: 'user-1', type: 'ORGANIZATION', name: 'Org 1' },
      ];
      const entities = dtos.map((dto) => createEntityFixture(dto));
      repository.upsert
        .mockResolvedValueOnce(entities[0])
        .mockResolvedValueOnce(entities[1])
        .mockResolvedValueOnce(entities[2]);

      const result = await service.createMany(API_KEY_ID, dtos);

      expect(repository.upsert).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Person 1');
      expect(result[2].type).toBe('ORGANIZATION');
    });

    it('should return empty array for empty input', async () => {
      const result = await service.createMany(API_KEY_ID, []);

      expect(repository.upsert).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('list', () => {
    it('should list entities with default options', async () => {
      const entities = [
        createEntityFixture({ name: 'Entity 1' }),
        createEntityFixture({ name: 'Entity 2' }),
      ];
      repository.findMany.mockResolvedValue(entities);

      const result = await service.list(API_KEY_ID, 'user-123');

      expect(repository.findMany).toHaveBeenCalledWith(API_KEY_ID, {
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
      expect(result).toEqual(entities);
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

    it('should filter by type', async () => {
      repository.findMany.mockResolvedValue([]);

      await service.list(API_KEY_ID, 'user-123', { type: 'PERSON' });

      expect(repository.findMany).toHaveBeenCalledWith(API_KEY_ID, {
        where: { userId: 'user-123', type: 'PERSON' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });
  });

  describe('getById', () => {
    it('should return entity when found', async () => {
      const entity = createEntityFixture({ id: 'entity-1' });
      repository.findById.mockResolvedValue(entity);

      const result = await service.getById(API_KEY_ID, 'entity-1');

      expect(repository.findById).toHaveBeenCalledWith(API_KEY_ID, 'entity-1');
      expect(result).toEqual(entity);
    });

    it('should return null when entity not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(API_KEY_ID, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByType', () => {
    it('should return entities of specific type', async () => {
      const entities = [
        createEntityFixture({ type: 'PERSON', name: 'Person 1' }),
        createEntityFixture({ type: 'PERSON', name: 'Person 2' }),
      ];
      repository.findByType.mockResolvedValue(entities);

      const result = await service.getByType(API_KEY_ID, 'user-123', 'PERSON');

      expect(repository.findByType).toHaveBeenCalledWith(API_KEY_ID, 'user-123', 'PERSON');
      expect(result).toEqual(entities);
    });

    it('should return empty array when no entities of type exist', async () => {
      repository.findByType.mockResolvedValue([]);

      const result = await service.getByType(API_KEY_ID, 'user-123', 'UNKNOWN_TYPE');

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete entity by id', async () => {
      repository.deleteById.mockResolvedValue(undefined);

      await service.delete(API_KEY_ID, 'entity-1');

      expect(repository.deleteById).toHaveBeenCalledWith(API_KEY_ID, 'entity-1');
    });
  });

  describe('listByUser', () => {
    const mockEntitiesFromDb = [
      {
        id: 'entity-1',
        apiKeyId: 'key-1',
        userId: 'end-user',
        type: 'PERSON',
        name: 'John Doe',
        properties: { occupation: 'Engineer' },
        confidence: 0.9,
        createdAt: new Date(),
        updatedAt: new Date(),
        apiKey: { name: 'Key 1' },
      },
    ];

    it('should list entities across all API keys for a user', async () => {
      prismaMock.entity.findMany.mockResolvedValue(mockEntitiesFromDb);
      prismaMock.entity.count.mockResolvedValue(1);

      const result = await service.listByUser('owner-user-id');

      expect(prismaMock.entity.findMany).toHaveBeenCalledWith({
        where: { apiKey: { userId: 'owner-user-id' } },
        include: { apiKey: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].apiKeyName).toBe('Key 1');
      expect(result.total).toBe(1);
    });

    it('should filter by type', async () => {
      prismaMock.entity.findMany.mockResolvedValue([]);
      prismaMock.entity.count.mockResolvedValue(0);

      await service.listByUser('owner-id', { type: 'PERSON' });

      expect(prismaMock.entity.findMany).toHaveBeenCalledWith({
        where: {
          apiKey: { userId: 'owner-id' },
          type: 'PERSON',
        },
        include: { apiKey: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should filter by apiKeyId', async () => {
      prismaMock.entity.findMany.mockResolvedValue([]);
      prismaMock.entity.count.mockResolvedValue(0);

      await service.listByUser('owner-id', { apiKeyId: 'specific-key' });

      expect(prismaMock.entity.findMany).toHaveBeenCalledWith({
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
      prismaMock.entity.findMany.mockResolvedValue([]);
      prismaMock.entity.count.mockResolvedValue(0);

      await service.listByUser('owner-id', { limit: 50, offset: 100 });

      expect(prismaMock.entity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 100,
        }),
      );
    });
  });

  describe('deleteByUser', () => {
    it('should delete entity when it belongs to user', async () => {
      const entity = {
        id: 'entity-1',
        apiKey: { userId: 'owner-id' },
      };
      prismaMock.entity.findFirst.mockResolvedValue(entity);
      prismaMock.entity.delete.mockResolvedValue(entity);

      await service.deleteByUser('owner-id', 'entity-1');

      expect(prismaMock.entity.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'entity-1',
          apiKey: { userId: 'owner-id' },
        },
      });
      expect(prismaMock.entity.delete).toHaveBeenCalledWith({
        where: { id: 'entity-1' },
      });
    });

    it('should throw NotFoundException when entity not found', async () => {
      prismaMock.entity.findFirst.mockResolvedValue(null);

      await expect(service.deleteByUser('owner-id', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteByUser('owner-id', 'nonexistent')).rejects.toThrow(
        'Entity not found',
      );

      expect(prismaMock.entity.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when entity belongs to different user', async () => {
      prismaMock.entity.findFirst.mockResolvedValue(null);

      await expect(service.deleteByUser('wrong-owner', 'entity-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTypesByUser', () => {
    it('should return distinct entity types for user', async () => {
      prismaMock.entity.findMany.mockResolvedValue([
        { type: 'ORGANIZATION' },
        { type: 'PERSON' },
        { type: 'PRODUCT' },
      ]);

      const result = await service.getTypesByUser('owner-id');

      expect(prismaMock.entity.findMany).toHaveBeenCalledWith({
        where: { apiKey: { userId: 'owner-id' } },
        select: { type: true },
        distinct: ['type'],
        orderBy: { type: 'asc' },
      });
      expect(result).toEqual(['ORGANIZATION', 'PERSON', 'PRODUCT']);
    });

    it('should return empty array when user has no entities', async () => {
      prismaMock.entity.findMany.mockResolvedValue([]);

      const result = await service.getTypesByUser('owner-id');

      expect(result).toEqual([]);
    });
  });
});
