/**
 * ApiKeyService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiKeyService } from '../api-key.service';
import { createPrismaMock, createRedisMock, PrismaMock, RedisMock } from '../../../test/mocks';
import { createUserFixture, createDeletedUserFixture } from '../../../test/fixtures';
import { CACHE_PREFIX, API_KEY_PREFIX } from '../api-key.constants';
import { createHash } from 'crypto';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let prismaMock: PrismaMock;
  let redisMock: RedisMock;

  // 辅助函数：生成有效的 API Key
  function generateValidApiKey(): string {
    const hex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    return `${API_KEY_PREFIX}${hex}`;
  }

  // 辅助函数：哈希 API Key
  function hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  beforeEach(() => {
    prismaMock = createPrismaMock();
    redisMock = createRedisMock();

    // 默认 mock apiKey.update 返回 Promise（用于 updateLastUsedAsync）
    prismaMock.apiKey.update.mockResolvedValue({});

    service = new ApiKeyService(prismaMock as any, redisMock as any);
  });

  describe('create', () => {
    it('应创建新的 API Key 并返回完整密钥', async () => {
      const mockApiKey = {
        id: 'key-id',
        name: 'Test Key',
        keyPrefix: 'mk_abcd1234',
        keyHash: 'hash',
        userId: 'user-id',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.apiKey.create.mockResolvedValue(mockApiKey);

      const result = await service.create('user-id', { name: 'Test Key' });

      expect(result.key).toMatch(/^mk_[a-f0-9]{64}$/);
      expect(result.id).toBe('key-id');
      expect(result.name).toBe('Test Key');
      expect(result.keyPrefix).toBe('mk_abcd1234');
    });

    it('应在创建时设置过期时间', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      prismaMock.apiKey.create.mockResolvedValue({
        id: 'key-id',
        name: 'Test Key',
        keyPrefix: 'mk_abcd1234',
        expiresAt,
      });

      await service.create('user-id', { name: 'Test Key', expiresAt });

      expect(prismaMock.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt,
        }),
      });
    });

    it('应正确存储 keyHash（SHA256）', async () => {
      prismaMock.apiKey.create.mockImplementation(async (args: any) => ({
        id: 'key-id',
        name: args.data.name,
        keyPrefix: args.data.keyPrefix,
        keyHash: args.data.keyHash,
      }));

      const result = await service.create('user-id', { name: 'Test Key' });

      // 验证返回的 key 哈希后等于存储的 keyHash
      const createCall = prismaMock.apiKey.create.mock.calls[0][0];
      const storedHash = createCall.data.keyHash;
      const expectedHash = hashKey(result.key);
      expect(storedHash).toBe(expectedHash);
    });
  });

  describe('findAllByUser', () => {
    it('应返回用户的所有 API Key', async () => {
      const mockKeys = [
        { id: 'key-1', name: 'Key 1', keyPrefix: 'mk_aaaa', isActive: true },
        { id: 'key-2', name: 'Key 2', keyPrefix: 'mk_bbbb', isActive: false },
      ];
      prismaMock.apiKey.findMany.mockResolvedValue(mockKeys);

      const result = await service.findAllByUser('user-id');

      expect(result).toEqual(mockKeys);
      expect(prismaMock.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('应在无 API Key 时返回空数组', async () => {
      prismaMock.apiKey.findMany.mockResolvedValue([]);

      const result = await service.findAllByUser('user-id');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('应返回指定的 API Key', async () => {
      const mockKey = {
        id: 'key-id',
        name: 'Test Key',
        keyPrefix: 'mk_aaaa',
        isActive: true,
      };
      prismaMock.apiKey.findFirst.mockResolvedValue(mockKey);

      const result = await service.findOne('user-id', 'key-id');

      expect(result).toEqual(mockKey);
    });

    it('应在 API Key 不存在时抛出 NotFoundException', async () => {
      prismaMock.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-id', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('应在用户不匹配时抛出 NotFoundException', async () => {
      // findFirst 会因为 userId 不匹配而返回 null
      prismaMock.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.findOne('wrong-user', 'key-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应更新 API Key 名称', async () => {
      prismaMock.apiKey.findFirst.mockResolvedValue({
        id: 'key-id',
        keyHash: 'hash123',
      });
      prismaMock.apiKey.update.mockResolvedValue({
        id: 'key-id',
        name: 'New Name',
        isActive: true,
      });

      const result = await service.update('user-id', 'key-id', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('应在停用时清除缓存', async () => {
      const keyHash = 'hash123';
      prismaMock.apiKey.findFirst.mockResolvedValue({
        id: 'key-id',
        keyHash,
      });
      prismaMock.apiKey.update.mockResolvedValue({
        id: 'key-id',
        name: 'Test',
        isActive: false,
      });

      await service.update('user-id', 'key-id', { isActive: false });

      expect(redisMock.del).toHaveBeenCalledWith(`${CACHE_PREFIX}${keyHash}`);
    });

    it('应在 API Key 不存在时抛出 NotFoundException', async () => {
      prismaMock.apiKey.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user-id', 'nonexistent', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('应删除 API Key 并清除缓存', async () => {
      const keyHash = 'hash123';
      prismaMock.apiKey.findFirst.mockResolvedValue({
        id: 'key-id',
        keyHash,
      });
      prismaMock.apiKey.delete.mockResolvedValue({});

      await service.delete('user-id', 'key-id');

      expect(prismaMock.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'key-id' },
      });
      expect(redisMock.del).toHaveBeenCalledWith(`${CACHE_PREFIX}${keyHash}`);
    });

    it('应在 API Key 不存在时抛出 NotFoundException', async () => {
      prismaMock.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.delete('user-id', 'nonexistent')).rejects.toThrow(NotFoundException);

      expect(prismaMock.apiKey.delete).not.toHaveBeenCalled();
    });
  });

  describe('validateKey', () => {
    describe('格式验证', () => {
      it('应在 key 为空时抛出 ForbiddenException', async () => {
        await expect(service.validateKey('')).rejects.toThrow(ForbiddenException);
        await expect(service.validateKey('')).rejects.toThrow('Invalid API key format');
      });

      it('应在 key 不以 mk_ 开头时抛出 ForbiddenException', async () => {
        await expect(service.validateKey('sk_invalid')).rejects.toThrow(ForbiddenException);
        await expect(service.validateKey('invalid_key')).rejects.toThrow(ForbiddenException);
      });

      it('应接受 mk_ 前缀的 key', async () => {
        const validKey = generateValidApiKey();
        prismaMock.apiKey.findUnique.mockResolvedValue(null);

        // 应该进入数据库查询，而不是在格式验证时失败
        await expect(service.validateKey(validKey)).rejects.toThrow('Invalid API key');
      });
    });

    describe('缓存命中', () => {
      it('应在缓存命中时直接返回', async () => {
        const validKey = generateValidApiKey();
        const keyHash = hashKey(validKey);
        const cachedResult = {
          id: 'key-id',
          userId: 'user-id',
          name: 'Cached Key',
          user: {
            id: 'user-id',
            email: 'test@test.com',
            name: 'Test User',
            tier: 'FREE',
            isAdmin: false,
          },
        };
        redisMock._set(`${CACHE_PREFIX}${keyHash}`, JSON.stringify(cachedResult));

        const result = await service.validateKey(validKey);

        expect(result).toEqual(cachedResult);
        expect(prismaMock.apiKey.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('数据库查询', () => {
      it('应在 key 不存在时抛出 ForbiddenException', async () => {
        const validKey = generateValidApiKey();
        prismaMock.apiKey.findUnique.mockResolvedValue(null);

        await expect(service.validateKey(validKey)).rejects.toThrow(ForbiddenException);
        await expect(service.validateKey(validKey)).rejects.toThrow('Invalid API key');
      });

      it('应在 key 已停用时抛出 ForbiddenException', async () => {
        const validKey = generateValidApiKey();
        prismaMock.apiKey.findUnique.mockResolvedValue({
          id: 'key-id',
          isActive: false,
          user: createUserFixture(),
        });

        await expect(service.validateKey(validKey)).rejects.toThrow(ForbiddenException);
        await expect(service.validateKey(validKey)).rejects.toThrow('API key is inactive');
      });

      it('应在 key 已过期时抛出 ForbiddenException', async () => {
        const validKey = generateValidApiKey();
        const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
        prismaMock.apiKey.findUnique.mockResolvedValue({
          id: 'key-id',
          isActive: true,
          expiresAt: expiredAt,
          user: createUserFixture(),
        });

        await expect(service.validateKey(validKey)).rejects.toThrow(ForbiddenException);
        await expect(service.validateKey(validKey)).rejects.toThrow('API key has expired');
      });

      it('应在用户已删除时抛出 ForbiddenException', async () => {
        const validKey = generateValidApiKey();
        prismaMock.apiKey.findUnique.mockResolvedValue({
          id: 'key-id',
          isActive: true,
          expiresAt: null,
          user: createDeletedUserFixture(),
        });

        await expect(service.validateKey(validKey)).rejects.toThrow(ForbiddenException);
        await expect(service.validateKey(validKey)).rejects.toThrow(
          'User account has been deleted',
        );
      });

      it('应在验证成功时返回用户信息', async () => {
        const validKey = generateValidApiKey();
        const mockUser = createUserFixture({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        });
        prismaMock.apiKey.findUnique.mockResolvedValue({
          id: 'key-id',
          userId: mockUser.id,
          name: 'Test Key',
          isActive: true,
          expiresAt: null,
          user: {
            ...mockUser,
            subscription: { tier: 'HOBBY' },
          },
        });

        const result = await service.validateKey(validKey);

        expect(result.id).toBe('key-id');
        expect(result.userId).toBe('user-123');
        expect(result.user.email).toBe('test@example.com');
        expect(result.user.tier).toBe('HOBBY');
      });

      it('应在无订阅时默认返回 FREE tier', async () => {
        const validKey = generateValidApiKey();
        const mockUser = createUserFixture();
        prismaMock.apiKey.findUnique.mockResolvedValue({
          id: 'key-id',
          userId: mockUser.id,
          name: 'Test Key',
          isActive: true,
          expiresAt: null,
          user: {
            ...mockUser,
            subscription: null,
          },
        });

        const result = await service.validateKey(validKey);

        expect(result.user.tier).toBe('FREE');
      });

      it('应在验证成功后缓存结果', async () => {
        const validKey = generateValidApiKey();
        const keyHash = hashKey(validKey);
        const mockUser = createUserFixture();
        prismaMock.apiKey.findUnique.mockResolvedValue({
          id: 'key-id',
          userId: mockUser.id,
          name: 'Test Key',
          isActive: true,
          expiresAt: null,
          user: {
            ...mockUser,
            subscription: { tier: 'FREE' },
          },
        });

        await service.validateKey(validKey);

        expect(redisMock.set).toHaveBeenCalledWith(
          `${CACHE_PREFIX}${keyHash}`,
          expect.any(String),
          60, // CACHE_TTL_SECONDS
        );
      });
    });

    describe('lastUsedAt 更新', () => {
      it('应在验证成功后异步更新 lastUsedAt', async () => {
        const validKey = generateValidApiKey();
        const mockUser = createUserFixture();
        prismaMock.apiKey.findUnique.mockResolvedValue({
          id: 'key-id',
          userId: mockUser.id,
          name: 'Test Key',
          isActive: true,
          expiresAt: null,
          user: {
            ...mockUser,
            subscription: null,
          },
        });
        prismaMock.apiKey.update.mockResolvedValue({});

        await service.validateKey(validKey);

        // 等待异步更新
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(prismaMock.apiKey.update).toHaveBeenCalledWith({
          where: { id: 'key-id' },
          data: { lastUsedAt: expect.any(Date) },
        });
      });
    });
  });

  describe('缓存错误处理', () => {
    it('应在缓存读取失败时继续查询数据库', async () => {
      const validKey = generateValidApiKey();
      const mockUser = createUserFixture();

      // 模拟缓存读取失败
      redisMock.get.mockRejectedValue(new Error('Redis connection error'));

      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'key-id',
        userId: mockUser.id,
        name: 'Test Key',
        isActive: true,
        expiresAt: null,
        user: {
          ...mockUser,
          subscription: null,
        },
      });

      const result = await service.validateKey(validKey);

      expect(result.id).toBe('key-id');
      expect(prismaMock.apiKey.findUnique).toHaveBeenCalled();
    });

    it('应在缓存写入失败时不影响验证结果', async () => {
      const validKey = generateValidApiKey();
      const mockUser = createUserFixture();

      redisMock.set.mockRejectedValue(new Error('Redis connection error'));

      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'key-id',
        userId: mockUser.id,
        name: 'Test Key',
        isActive: true,
        expiresAt: null,
        user: {
          ...mockUser,
          subscription: null,
        },
      });

      const result = await service.validateKey(validKey);

      expect(result.id).toBe('key-id');
    });
  });
});
