# 统一响应格式改造方案 v2

## 目标

1. 后端 Controller 只返回业务数据，响应拦截器负责统一封装
2. 前端 API Client 自动解包响应，业务代码直接使用数据
3. 统一分页模式（offset-based）
4. 添加时间戳和请求追踪
5. 清理重复代码和废弃文件

---

## 一、当前问题分析

### 1.1 响应格式不统一

| Controller | 当前格式 | 问题 |
|------------|---------|------|
| API Key, Entity, Memory, Relation, Graph, Extract | `{ success: true, data }` | ✓ 正确 |
| Quota, Usage | 返回原始对象 | ✗ 未包装 |
| Payment | 返回原始对象 | ✗ 未包装 |
| Health | `{ status: 'ok' }` | 特殊格式，保留 |
| Payment Webhook | `{ received: true }` | 特殊格式，保留 |

### 1.2 分页模式不统一

| API 类型 | 分页参数 | 问题 |
|---------|---------|------|
| Console/Public API | `offset` + `limit` | ✓ 标准 |
| Admin API | `page` + `limit` | ✗ 不统一 |

**决策：统一使用 `offset` + `limit`（更灵活，无需计算 page）**

### 1.3 类型定义重复

```
packages/shared-types/src/api.ts      → ApiResponse (未被使用)
apps/console/src/features/*/types.ts  → ApiResponse (重复定义 5 处)
apps/admin/src/lib/types.ts           → ApiResponse (独立定义)
apps/server/src/types/shared.types.ts → PaginatedResponse (结构不同)
```

### 1.4 废弃代码

- `apps/server/src/types/tier.types.ts` - 标记为 deprecated，需删除

### 1.5 缺少时间维度

- 响应无 `timestamp` 字段
- 无请求 ID 追踪

---

## 二、统一响应格式设计

### 2.1 成功响应

```typescript
// 标准响应
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;  // ISO 8601 格式
}

// 分页响应
interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: string;
}
```

### 2.2 错误响应

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;       // 错误码，如 'VALIDATION_ERROR'
    message: string;    // 用户可读消息
    details?: unknown;  // 可选的详细信息
  };
  timestamp: string;
}
```

### 2.3 特殊响应（保留原格式）

| 端点 | 格式 | 原因 |
|------|------|------|
| `/health`, `/health/live`, `/health/ready` | `{ status, timestamp, uptime, services }` | 监控系统兼容 |
| `/webhooks/creem` | `{ received: true }` | 第三方服务期望 |
| `/api/auth/*` | Better Auth 格式 | 库决定 |
| 文件下载 | Binary + Headers | 非 JSON |
| SSE 流 | `data: {...}\n\n` | SSE 规范 |

---

## 三、后端改造

### 3.1 新增文件

#### 3.1.1 响应拦截器

**文件：** `apps/server/src/common/interceptors/response.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export const SKIP_RESPONSE_WRAP = 'skipResponseWrap';

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_WRAP, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // 204 No Content
        if (response.statusCode === 204) {
          return undefined;
        }

        // 已经是标准格式
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        const timestamp = new Date().toISOString();

        // 检查是否是分页响应（包含 items 和 pagination）
        if (data && typeof data === 'object' && 'items' in data && 'pagination' in data) {
          const { items, pagination } = data;
          return {
            success: true,
            data: items,
            meta: {
              total: pagination.total,
              limit: pagination.limit,
              offset: pagination.offset,
              hasMore: pagination.offset + items.length < pagination.total,
            },
            timestamp,
          };
        }

        return {
          success: true,
          data,
          timestamp,
        };
      }),
    );
  }
}
```

#### 3.1.2 异常过滤器

**文件：** `apps/server/src/common/filters/http-exception.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string) || exception.message;
        details = obj.details;
      }

      code = this.getCodeFromStatus(status);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      success: false,
      error: { code, message, ...(details && { details }) },
      timestamp: new Date().toISOString(),
    });
  }

  private getCodeFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
    };
    return map[status] || 'UNKNOWN_ERROR';
  }
}
```

#### 3.1.3 装饰器

**文件：** `apps/server/src/common/decorators/response.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { SKIP_RESPONSE_WRAP } from '../interceptors/response.interceptor';

/**
 * 跳过响应包装
 * 用于 Health、Webhook、SSE、文件下载等特殊场景
 */
export const SkipResponseWrap = () => SetMetadata(SKIP_RESPONSE_WRAP, true);
```

#### 3.1.4 分页工具重构

**文件：** `apps/server/src/common/utils/pagination.utils.ts`（重构）

```typescript
export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export const PAGINATION_DEFAULTS = {
  LIMIT: 20,
  MAX_LIMIT: 100,
  OFFSET: 0,
} as const;

/**
 * 解析分页参数
 */
export function parsePaginationParams(
  limit?: string | number,
  offset?: string | number,
  maxLimit = PAGINATION_DEFAULTS.MAX_LIMIT,
): PaginationParams {
  const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  const parsedOffset = typeof offset === 'string' ? parseInt(offset, 10) : offset;

  return {
    limit: Math.min(
      Math.max(1, parsedLimit || PAGINATION_DEFAULTS.LIMIT),
      maxLimit,
    ),
    offset: Math.max(0, parsedOffset || PAGINATION_DEFAULTS.OFFSET),
  };
}

/**
 * 创建分页响应
 * 拦截器会自动转换此格式
 */
export function createPaginatedResult<T>(
  items: T[],
  total: number,
  params: PaginationParams,
): PaginationResult<T> {
  return {
    items,
    pagination: {
      total,
      limit: params.limit,
      offset: params.offset,
    },
  };
}
```

### 3.2 修改 main.ts

```typescript
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // ... 其他配置 ...

  // 全局响应拦截器
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // ... 其他配置 ...
}
```

### 3.3 Controller 改造清单

#### 需要移除手动包装的 Controller（17 个）

| 文件 | 改造内容 |
|------|---------|
| `api-key/api-key.controller.ts` | 移除 `{ success: true, data: ... }` |
| `memory/memory.controller.ts` | 移除包装 + 使用 `createPaginatedResult` |
| `memory/console-memory.controller.ts` | 移除包装 + 使用 `createPaginatedResult` |
| `entity/entity.controller.ts` | 移除包装 + 使用 `createPaginatedResult` |
| `entity/console-entity.controller.ts` | 移除包装 + 使用 `createPaginatedResult` |
| `relation/relation.controller.ts` | 移除包装 + 使用 `createPaginatedResult` |
| `graph/graph.controller.ts` | 移除包装 |
| `extract/extract.controller.ts` | 移除包装 |
| `quota/quota.controller.ts` | 无需改动（已返回原始数据） |
| `usage/usage.controller.ts` | 无需改动（已返回原始数据） |
| `usage/console-stats.controller.ts` | 移除包装 |
| `webhook/webhook.controller.ts` | 移除包装 + 使用 `createPaginatedResult` |
| `user/user.controller.ts` | 移除包装 |
| `payment/payment.controller.ts` | 无需改动（已返回原始数据） |
| `admin/admin-dashboard.controller.ts` | 移除包装 |
| `admin/admin-users.controller.ts` | 移除包装 + 改为 offset 分页 |
| `admin/admin-subscriptions.controller.ts` | 移除包装 + 改为 offset 分页 |
| `admin/admin-orders.controller.ts` | 移除包装 + 改为 offset 分页 |

#### 需要添加 @SkipResponseWrap 的 Controller（4 个）

| 文件 | 方法 | 原因 |
|------|------|------|
| `auth/auth.controller.ts` | 整个类 | Better Auth 代理 |
| `health/health.controller.ts` | 整个类 | 监控系统兼容 |
| `payment/payment-webhook.controller.ts` | 整个类 | 第三方回调 |
| `memory/console-memory.controller.ts` | `export` 方法 | 文件下载 |

### 3.4 Admin 分页改造

**修改：** `apps/server/src/admin/dto.ts`

```typescript
// 改为 offset 分页
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
});
```

**修改：** `apps/server/src/admin/admin.service.ts`

所有分页方法改为使用 `offset` + `limit`，返回 `PaginationResult<T>` 格式。

### 3.5 删除废弃文件

- 删除 `apps/server/src/types/tier.types.ts`
- 更新 `apps/server/src/types/index.ts` 移除 tier.types 导出

---

## 四、前端改造

### 4.1 统一类型定义

**修改：** `packages/shared-types/src/api.ts`

```typescript
// ============ 统一 API 响应格式 ============

/** 分页元数据 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** 成功响应 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

/** 分页成功响应 */
export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
  timestamp: string;
}

/** 错误响应 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/** 通用响应（联合类型） */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ... 其他类型保留 ...
```

### 4.2 API Client 改造

**修改：** `apps/console/src/lib/api-client.ts`

```typescript
import type {
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiErrorResponse,
  PaginationMeta
} from '@memai/shared-types';

export { ApiError } from './errors';  // 移到单独文件

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * 发送请求并自动解包响应
   */
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * 处理响应 - 自动解包 data 字段
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // 处理 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // 处理非 JSON 响应
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(response.status, 'NETWORK_ERROR', 'Request failed');
      }
      return {} as T;
    }

    const json = await response.json();

    // 处理错误响应
    if (!response.ok || json.success === false) {
      // 401/403 自动登出
      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().logout();
      }

      const error = json.error || {};
      throw new ApiError(
        response.status,
        error.code || 'UNKNOWN_ERROR',
        error.message || `Request failed (${response.status})`,
      );
    }

    // 成功响应 - 返回 data 字段
    return json.data;
  }

  /**
   * GET 请求
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  /**
   * GET 分页请求 - 返回 data + meta
   */
  async getPaginated<T>(endpoint: string): Promise<PaginatedResult<T>> {
    const token = getAuthToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, { headers });

    if (!response.ok) {
      await this.handleResponse<never>(response);
      throw new Error('Unreachable');
    }

    const json = await response.json() as ApiPaginatedResponse<T>;

    if (!json.success) {
      throw new ApiError(response.status, 'UNKNOWN_ERROR', 'Invalid response');
    }

    return {
      data: json.data,
      meta: json.meta,
    };
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * POST 请求返回 Blob（用于文件下载）
   */
  async postBlob(endpoint: string, data?: unknown): Promise<Blob> {
    const token = getAuthToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().logout();
      }
      throw new ApiError(response.status, 'DOWNLOAD_ERROR', 'Download failed');
    }

    return response.blob();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
```

### 4.3 Feature API 改造示例

**改造前：** `apps/console/src/features/api-keys/api.ts`
```typescript
export async function getApiKeys(): Promise<ApiKey[]> {
  const response = await apiClient.get<ApiResponse<ApiKey[]>>(API_PATH)
  return response.data  // 手动 .data
}
```

**改造后：**
```typescript
export async function getApiKeys(): Promise<ApiKey[]> {
  return apiClient.get<ApiKey[]>(API_PATH)  // 自动解包
}
```

**分页改造前：** `apps/console/src/features/memories/api.ts`
```typescript
export async function getMemories(params): Promise<{ memories: Memory[]; total: number }> {
  const response = await apiClient.get<ApiResponse<Memory[]>>(url)
  return {
    memories: response.data,
    total: response.meta?.total ?? response.data.length,
  }
}
```

**分页改造后：**
```typescript
import type { PaginatedResult } from '@/lib/api-client'

export async function getMemories(params): Promise<PaginatedResult<Memory>> {
  return apiClient.getPaginated<Memory>(url)
}
```

### 4.4 删除重复类型定义

从以下文件移除 `ApiResponse<T>` 定义（改用 shared-types）：

- `apps/console/src/features/api-keys/types.ts`
- `apps/console/src/features/entities/types.ts`
- `apps/console/src/features/memories/types.ts`
- `apps/console/src/features/webhooks/types.ts`
- `apps/console/src/features/stats/api.ts`（内联定义）
- `apps/admin/src/lib/types.ts`

---

## 五、涉及文件完整清单

### 5.1 后端文件

| 操作 | 文件路径 |
|------|---------|
| 新增 | `src/common/interceptors/response.interceptor.ts` |
| 新增 | `src/common/filters/http-exception.filter.ts` |
| 新增 | `src/common/decorators/response.decorator.ts` |
| 修改 | `src/common/interceptors/index.ts` |
| 修改 | `src/common/decorators/index.ts` |
| 修改 | `src/common/utils/pagination.utils.ts` |
| 修改 | `src/main.ts` |
| 修改 | `src/api-key/api-key.controller.ts` |
| 修改 | `src/memory/memory.controller.ts` |
| 修改 | `src/memory/console-memory.controller.ts` |
| 修改 | `src/entity/entity.controller.ts` |
| 修改 | `src/entity/console-entity.controller.ts` |
| 修改 | `src/relation/relation.controller.ts` |
| 修改 | `src/graph/graph.controller.ts` |
| 修改 | `src/extract/extract.controller.ts` |
| 修改 | `src/usage/console-stats.controller.ts` |
| 修改 | `src/webhook/webhook.controller.ts` |
| 修改 | `src/user/user.controller.ts` |
| 修改 | `src/admin/dto.ts` |
| 修改 | `src/admin/admin.service.ts` |
| 修改 | `src/admin/admin-dashboard.controller.ts` |
| 修改 | `src/admin/admin-users.controller.ts` |
| 修改 | `src/admin/admin-subscriptions.controller.ts` |
| 修改 | `src/admin/admin-orders.controller.ts` |
| 修改 | `src/auth/auth.controller.ts`（添加 @SkipResponseWrap） |
| 修改 | `src/health/health.controller.ts`（添加 @SkipResponseWrap） |
| 修改 | `src/payment/payment-webhook.controller.ts`（添加 @SkipResponseWrap） |
| 删除 | `src/types/tier.types.ts` |
| 修改 | `src/types/index.ts` |

### 5.2 前端文件

**Shared Types：**

| 操作 | 文件路径 |
|------|---------|
| 修改 | `packages/shared-types/src/api.ts` |

**Console App：**

| 操作 | 文件路径 |
|------|---------|
| 修改 | `apps/console/src/lib/api-client.ts` |
| 修改 | `apps/console/src/features/api-keys/types.ts`（移除 ApiResponse） |
| 修改 | `apps/console/src/features/api-keys/api.ts` |
| 修改 | `apps/console/src/features/entities/types.ts`（移除 ApiResponse） |
| 修改 | `apps/console/src/features/entities/api.ts` |
| 修改 | `apps/console/src/features/memories/types.ts`（移除 ApiResponse） |
| 修改 | `apps/console/src/features/memories/api.ts` |
| 修改 | `apps/console/src/features/webhooks/types.ts`（移除 ApiResponse） |
| 修改 | `apps/console/src/features/webhooks/api.ts` |
| 修改 | `apps/console/src/features/stats/api.ts` |
| 修改 | `apps/console/src/features/settings/api.ts` |

**Admin App：**

| 操作 | 文件路径 |
|------|---------|
| 修改 | `apps/admin/src/lib/api-client.ts` |
| 修改 | `apps/admin/src/lib/types.ts`（移除重复定义） |
| 修改 | `apps/admin/src/features/dashboard/api.ts` |
| 修改 | `apps/admin/src/features/users/api.ts` |
| 修改 | `apps/admin/src/features/orders/api.ts` |
| 修改 | `apps/admin/src/features/subscriptions/api.ts` |

---

## 六、改造顺序

### Phase 1: 后端基础设施 ✅
1. ✅ 创建 `response.interceptor.ts`
2. ✅ 创建 `http-exception.filter.ts`
3. ✅ 创建 `response.decorator.ts`
4. ✅ 重构 `pagination.utils.ts`
5. ✅ 更新导出文件
6. ✅ 修改 `main.ts` 注册全局拦截器和过滤器
7. ✅ 删除 `tier.types.ts`（额外修复：更新了 5 个引用该文件的模块）

### Phase 2: 后端 Controller ✅
1. ✅ 添加 `@SkipResponseWrap` 到特殊 Controller（auth, health, webhook, console-memory export）
2. ✅ 改造 Admin 分页（dto.ts, admin.service.ts, 各 controller）
3. ✅ 改造其他 Controller（移除手动包装）

### Phase 3: 前端
1. 更新 `shared-types` 包
2. 改造 Console `api-client.ts`
3. 改造 Console 各 feature API
4. 改造 Admin `api-client.ts`
5. 改造 Admin 各 feature API
6. 移除重复类型定义

### Phase 4: 验证
1. 运行后端测试
2. 运行前端构建
3. 手动测试关键流程

---

## 七、边界情况处理

### 7.1 204 No Content

DELETE 操作返回 204 状态码，拦截器返回 `undefined`，前端 `delete` 方法返回 `void`。

### 7.2 文件下载

使用 `@SkipResponseWrap()` 跳过包装，直接返回 Blob + Headers。

### 7.3 SSE 流

使用 `@SkipResponseWrap()` 跳过包装，使用 `http.utils.ts` 中的 SSE 工具函数。

### 7.4 第三方 Webhook

使用 `@SkipResponseWrap()` 跳过包装，返回第三方期望的格式。

### 7.5 已包装响应

拦截器检测 `success` 字段，避免重复包装（兼容渐进式迁移）。

---

## 八、时间戳说明

所有响应都包含 `timestamp` 字段：
- 格式：ISO 8601（如 `2024-01-15T08:30:00.000Z`）
- 用途：
  - 调试和日志追踪
  - 客户端缓存判断
  - 监控和分析

---

## 九、文件统计

| 类型 | 新增 | 修改 | 删除 |
|------|------|------|------|
| 后端 | 3 | 26 | 1 |
| 前端 | 0 | 16 | 0 |
| 共享 | 0 | 1 | 0 |
| **总计** | **3** | **43** | **1** |
