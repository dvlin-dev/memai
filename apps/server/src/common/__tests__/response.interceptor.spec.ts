/**
 * ResponseInterceptor 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, firstValueFrom } from 'rxjs';
import { ResponseInterceptor, SKIP_RESPONSE_WRAP } from '../interceptors/response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;
  let reflector: Reflector;

  // 创建 Mock ExecutionContext
  function createMockContext(statusCode: number = 200): ExecutionContext {
    return {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
        getRequest: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  // 创建 Mock CallHandler
  function createMockHandler<T>(data: T): CallHandler {
    return {
      handle: () => of(data),
    };
  }

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    interceptor = new ResponseInterceptor(reflector);
  });

  describe('标准响应包装', () => {
    it('应将普通对象包装为 { success: true, data }', async () => {
      const context = createMockContext(200);
      const handler = createMockHandler({ id: 1, name: 'test' });

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'test' });
      expect(result.timestamp).toBeDefined();
    });

    it('应正确处理数组数据', async () => {
      const context = createMockContext(200);
      const handler = createMockHandler([{ id: 1 }, { id: 2 }]);

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('应正确处理 null 数据', async () => {
      const context = createMockContext(200);
      const handler = createMockHandler(null);

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('应正确处理字符串数据', async () => {
      const context = createMockContext(200);
      const handler = createMockHandler('simple string');

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result.success).toBe(true);
      expect(result.data).toBe('simple string');
    });

    it('应正确处理数字数据', async () => {
      const context = createMockContext(200);
      const handler = createMockHandler(42);

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });

    it('应正确处理布尔数据', async () => {
      const context = createMockContext(200);
      const handler = createMockHandler(true);

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });
  });

  describe('分页响应包装', () => {
    it('应将分页数据包装为 { success, data, meta }', async () => {
      const context = createMockContext(200);
      const handler = createMockHandler({
        items: [{ id: 1 }, { id: 2 }],
        pagination: { total: 100, limit: 10, offset: 0 },
      });

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.meta).toEqual({
        total: 100,
        limit: 10,
        offset: 0,
        hasMore: true,
      });
    });

    it('应正确计算 hasMore (中间页)', async () => {
      const context = createMockContext(200);
      const handler = createMockHandler({
        items: [{ id: 1 }, { id: 2 }],
        pagination: { total: 100, limit: 10, offset: 50 },
      });

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result.meta.hasMore).toBe(true); // 50 + 2 < 100
    });

    it('应正确计算 hasMore (最后一页)', async () => {
      const context = createMockContext(200);
      const handler = createMockHandler({
        items: [{ id: 1 }, { id: 2 }],
        pagination: { total: 10, limit: 10, offset: 8 },
      });

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result.meta.hasMore).toBe(false); // 8 + 2 >= 10
    });

    it('应正确处理空分页结果', async () => {
      const context = createMockContext(200);
      const handler = createMockHandler({
        items: [],
        pagination: { total: 0, limit: 10, offset: 0 },
      });

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.hasMore).toBe(false);
    });
  });

  describe('204 No Content', () => {
    it('应对 204 状态码返回 undefined', async () => {
      const context = createMockContext(204);
      const handler = createMockHandler({ id: 1 });

      const result = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result).toBeUndefined();
    });
  });

  describe('已包装响应', () => {
    it('不应重复包装已有 success 字段的响应', async () => {
      const context = createMockContext(200);
      const alreadyWrapped = { success: true, data: { id: 1 } };
      const handler = createMockHandler(alreadyWrapped);

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual(alreadyWrapped);
      // 确保没有嵌套的 success
      expect(result.data.success).toBeUndefined();
    });

    it('不应重复包装错误响应', async () => {
      const context = createMockContext(400);
      const errorResponse = {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Invalid input' },
      };
      const handler = createMockHandler(errorResponse);

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual(errorResponse);
    });
  });

  describe('跳过包装', () => {
    it('应跳过标记了 SKIP_RESPONSE_WRAP 的路由', async () => {
      (reflector.getAllAndOverride as any).mockReturnValue(true);
      const context = createMockContext(200);
      const rawData = { raw: 'data' };
      const handler = createMockHandler(rawData);

      const result = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual(rawData);
    });

    it('应在跳过时检查正确的元数据键', async () => {
      const context = createMockContext(200);
      const handler = createMockHandler({});

      await firstValueFrom(interceptor.intercept(context, handler));

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_RESPONSE_WRAP, [
        expect.anything(), // handler
        expect.anything(), // class
      ]);
    });
  });

  describe('timestamp', () => {
    it('应包含有效的 ISO 时间戳', async () => {
      const context = createMockContext(200);
      const handler = createMockHandler({ id: 1 });

      const result: any = await firstValueFrom(interceptor.intercept(context, handler));

      expect(result.timestamp).toBeDefined();
      // 验证是有效的 ISO 时间戳
      const date = new Date(result.timestamp);
      expect(date.toISOString()).toBe(result.timestamp);
    });
  });
});
