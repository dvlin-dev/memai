/**
 * AuthGuard 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '../auth.guard';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: { getSession: ReturnType<typeof vi.fn> };
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  // 创建 Mock ExecutionContext
  function createMockContext(
    headers: Record<string, string | string[] | undefined> = {},
  ): {
    context: ExecutionContext;
    request: {
      headers: Record<string, unknown>;
      user?: unknown;
      session?: unknown;
    };
  } {
    const request = { headers, user: undefined, session: undefined };
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
    authService = {
      getSession: vi.fn(),
    };
    reflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new AuthGuard(
      authService as unknown as AuthService,
      reflector as unknown as Reflector,
    );
  });

  describe('公开路由 (@Public 装饰器)', () => {
    it('应在 isPublic=true 时跳过验证并返回 true', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const { context } = createMockContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authService.getSession).not.toHaveBeenCalled();
    });

    it('应检查正确的元数据键', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const { context } = createMockContext({});

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        expect.anything(),
        expect.anything(),
      ]);
    });

    it('应在 handler 和 class 上都检查元数据', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const handler = () => {};
      const classRef = class {};
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
        }),
        getHandler: () => handler,
        getClass: () => classRef,
      } as unknown as ExecutionContext;

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        handler,
        classRef,
      ]);
    });
  });

  describe('需认证路由 - 无有效 Session', () => {
    it('应在无 Session 时抛出 UnauthorizedException', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.getSession.mockResolvedValue(null);
      const { context } = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session');
    });

    it('应在 isPublic=undefined 时也进行验证', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      authService.getSession.mockResolvedValue(null);
      const { context } = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('应在 isPublic=false 时进行验证', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.getSession.mockResolvedValue(null);
      const { context } = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('需认证路由 - 有效 Session', () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test User',
      tier: 'FREE',
      isAdmin: false,
    };

    const mockSession = {
      id: 'session-id',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    it('应在验证成功时返回 true', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.getSession.mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });
      const { context } = createMockContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('应将 user 信息附加到 request', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.getSession.mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });
      const { context, request } = createMockContext({});

      await guard.canActivate(context);

      expect(request.user).toEqual(mockUser);
    });

    it('应将 session 信息附加到 request', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.getSession.mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });
      const { context, request } = createMockContext({});

      await guard.canActivate(context);

      expect(request.session).toEqual(mockSession);
    });

    it('应正确传递请求对象给 AuthService', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.getSession.mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });
      const { context, request } = createMockContext({
        cookie: 'session=abc123',
        authorization: 'Bearer token123',
      });

      await guard.canActivate(context);

      expect(authService.getSession).toHaveBeenCalledWith(request);
    });
  });

  describe('不同用户类型', () => {
    const mockSession = {
      id: 'session-id',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    it('应正确处理管理员用户', async () => {
      const adminUser = {
        id: 'admin-id',
        email: 'admin@example.com',
        name: 'Admin User',
        tier: 'ENTERPRISE',
        isAdmin: true,
      };
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.getSession.mockResolvedValue({
        session: mockSession,
        user: adminUser,
      });
      const { context, request } = createMockContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual(adminUser);
      expect((request.user as typeof adminUser).isAdmin).toBe(true);
    });

    it('应正确处理 HOBBY 层级用户', async () => {
      const hobbyUser = {
        id: 'hobby-id',
        email: 'hobby@example.com',
        name: 'Hobby User',
        tier: 'HOBBY',
        isAdmin: false,
      };
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.getSession.mockResolvedValue({
        session: mockSession,
        user: hobbyUser,
      });
      const { context, request } = createMockContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect((request.user as typeof hobbyUser).tier).toBe('HOBBY');
    });

    it('应正确处理 ENTERPRISE 层级用户', async () => {
      const enterpriseUser = {
        id: 'enterprise-id',
        email: 'enterprise@example.com',
        name: 'Enterprise User',
        tier: 'ENTERPRISE',
        isAdmin: false,
      };
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.getSession.mockResolvedValue({
        session: mockSession,
        user: enterpriseUser,
      });
      const { context, request } = createMockContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect((request.user as typeof enterpriseUser).tier).toBe('ENTERPRISE');
    });
  });

  describe('错误处理', () => {
    it('应在 AuthService 抛出异常时传播异常', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.getSession.mockRejectedValue(new Error('Database connection failed'));
      const { context } = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow('Database connection failed');
    });

    it('应在 Session 过期时返回 null (由 AuthService 处理)', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      // AuthService 对于过期 session 返回 null
      authService.getSession.mockResolvedValue(null);
      const { context } = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('应在用户被软删除时返回 null (由 AuthService 处理)', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      // AuthService 对于已删除用户返回 null
      authService.getSession.mockResolvedValue(null);
      const { context } = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('无 Session 时不修改 request', () => {
    it('应在验证失败时不附加 user 到 request', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.getSession.mockResolvedValue(null);
      const { context, request } = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(request.user).toBeUndefined();
    });

    it('应在验证失败时不附加 session 到 request', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.getSession.mockResolvedValue(null);
      const { context, request } = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(request.session).toBeUndefined();
    });
  });
});
