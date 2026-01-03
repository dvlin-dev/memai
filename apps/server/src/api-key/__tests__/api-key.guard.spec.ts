/**
 * ApiKeyGuard 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from '../api-key.guard';
import { ApiKeyService } from '../api-key.service';
import { USE_API_KEY } from '../api-key.decorators';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let apiKeyService: { validateKey: ReturnType<typeof vi.fn> };
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  // 创建 Mock ExecutionContext
  function createMockContext(headers: Record<string, string | string[] | undefined> = {}): {
    context: ExecutionContext;
    request: { headers: Record<string, unknown>; user?: unknown; apiKey?: unknown };
  } {
    const request = { headers, user: undefined, apiKey: undefined };
    return {
      request,
      context: {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext,
    };
  }

  beforeEach(() => {
    apiKeyService = {
      validateKey: vi.fn(),
    };
    reflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new ApiKeyGuard(apiKeyService as unknown as ApiKeyService, reflector as unknown as Reflector);
  });

  describe('非 API Key 路由', () => {
    it('应跳过验证并返回 true', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const { context } = createMockContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(apiKeyService.validateKey).not.toHaveBeenCalled();
    });

    it('应在未设置 USE_API_KEY 装饰器时跳过', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const { context } = createMockContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('应检查正确的元数据键', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const { context } = createMockContext({});

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(USE_API_KEY, [
        expect.anything(),
        expect.anything(),
      ]);
    });
  });

  describe('API Key 路由 - 缺少 header', () => {
    it('应在无 X-API-Key header 时抛出 ForbiddenException', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const { context } = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Missing X-API-Key header');
    });

    it('应在 X-API-Key 为空字符串时抛出 ForbiddenException', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const { context } = createMockContext({ 'x-api-key': '' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('应在 X-API-Key 为数组时抛出 ForbiddenException', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const { context } = createMockContext({ 'x-api-key': ['key1', 'key2'] });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('应在 X-API-Key 为 undefined 时抛出 ForbiddenException', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const { context } = createMockContext({ 'x-api-key': undefined });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('API Key 路由 - 验证流程', () => {
    it('应调用 ApiKeyService.validateKey', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      apiKeyService.validateKey.mockResolvedValue({
        id: 'key-id',
        userId: 'user-id',
        name: 'Test Key',
        user: { id: 'user-id', email: 'test@test.com', tier: 'FREE' },
      });
      const { context } = createMockContext({ 'x-api-key': 'mk_valid_key' });

      await guard.canActivate(context);

      expect(apiKeyService.validateKey).toHaveBeenCalledWith('mk_valid_key');
    });

    it('应在验证成功时返回 true', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      apiKeyService.validateKey.mockResolvedValue({
        id: 'key-id',
        userId: 'user-id',
        name: 'Test Key',
        user: { id: 'user-id', email: 'test@test.com', tier: 'FREE' },
      });
      const { context } = createMockContext({ 'x-api-key': 'mk_valid_key' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('应将 apiKey 信息附加到 request', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const validationResult = {
        id: 'key-id',
        userId: 'user-id',
        name: 'Test Key',
        user: { id: 'user-id', email: 'test@test.com', tier: 'FREE' },
      };
      apiKeyService.validateKey.mockResolvedValue(validationResult);
      const { context, request } = createMockContext({ 'x-api-key': 'mk_valid_key' });

      await guard.canActivate(context);

      expect(request.apiKey).toEqual(validationResult);
    });

    it('应将 user 信息附加到 request', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const user = {
        id: 'user-id',
        email: 'test@test.com',
        name: 'Test User',
        tier: 'HOBBY',
        isAdmin: false,
      };
      apiKeyService.validateKey.mockResolvedValue({
        id: 'key-id',
        userId: 'user-id',
        name: 'Test Key',
        user,
      });
      const { context, request } = createMockContext({ 'x-api-key': 'mk_valid_key' });

      await guard.canActivate(context);

      expect(request.user).toEqual(user);
    });
  });

  describe('API Key 路由 - 验证失败', () => {
    it('应在 ApiKeyService 抛出异常时传播异常', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      apiKeyService.validateKey.mockRejectedValue(
        new ForbiddenException('Invalid API key'),
      );
      const { context } = createMockContext({ 'x-api-key': 'mk_invalid' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid API key');
    });

    it('应在 API Key 无效时不附加信息到 request', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      apiKeyService.validateKey.mockRejectedValue(
        new ForbiddenException('Invalid API key'),
      );
      const { context, request } = createMockContext({ 'x-api-key': 'mk_invalid' });

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(request.apiKey).toBeUndefined();
      expect(request.user).toBeUndefined();
    });

    it('应在 API Key 已过期时抛出异常', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      apiKeyService.validateKey.mockRejectedValue(
        new ForbiddenException('API key has expired'),
      );
      const { context } = createMockContext({ 'x-api-key': 'mk_expired' });

      await expect(guard.canActivate(context)).rejects.toThrow('API key has expired');
    });

    it('应在 API Key 已停用时抛出异常', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      apiKeyService.validateKey.mockRejectedValue(
        new ForbiddenException('API key is inactive'),
      );
      const { context } = createMockContext({ 'x-api-key': 'mk_inactive' });

      await expect(guard.canActivate(context)).rejects.toThrow('API key is inactive');
    });

    it('应在用户已删除时抛出异常', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      apiKeyService.validateKey.mockRejectedValue(
        new ForbiddenException('User account has been deleted'),
      );
      const { context } = createMockContext({ 'x-api-key': 'mk_deleted_user' });

      await expect(guard.canActivate(context)).rejects.toThrow('User account has been deleted');
    });
  });

  describe('Header 大小写处理', () => {
    it('应正确处理小写 x-api-key', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      apiKeyService.validateKey.mockResolvedValue({
        id: 'key-id',
        userId: 'user-id',
        name: 'Test Key',
        user: { id: 'user-id' },
      });
      const { context } = createMockContext({ 'x-api-key': 'mk_test' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(apiKeyService.validateKey).toHaveBeenCalledWith('mk_test');
    });
  });
});
