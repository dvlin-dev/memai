# Memokit

> This document is the core guide for AI Agents. Following the [agents.md specification](https://agents.md/).

## Project Overview

**Memory API Platform** - A standalone Memory API service similar to [mem0.ai](https://mem0.ai). Give your AI applications long-term memory with semantic search and knowledge graphs.

## Core Sync Protocol (Mandatory)

1. **Atomic Update Rule**: After any code change is complete, you MUST update the relevant AGENTS.md files
2. **Recursive Trigger**: File change → Update file header → Update directory AGENTS.md → (if global impact) Update root AGENTS.md
3. **Fractal Autonomy**: Any subdirectory's AGENTS.md should allow AI to independently understand that module's context
4. **No Legacy Baggage**: No backward compatibility, delete/refactor unused code directly, no deprecated comments

## Project Structure

| Directory | Description | Specification |
| --- | --- | --- |
| `apps/server/` | Backend API + Memory Engine (NestJS) | → `apps/server/AGENTS.md` |
| `apps/console/` | User Console (React + Vite) | → `apps/console/AGENTS.md` |
| `apps/admin/` | Admin Dashboard (React + Vite) | → `apps/admin/AGENTS.md` |
| `apps/www/` | Marketing Website (React + TanStack Start) | → `apps/www/AGENTS.md` |
| `apps/docs/` | Documentation Site (Fumadocs + TanStack Start) | → `apps/docs/AGENTS.md` |
| `packages/ui/` | Shared UI Components (shadcn/ui) | → `packages/ui/AGENTS.md` |
| `packages/shared-types/` | Shared TypeScript Types | → `packages/shared-types/AGENTS.md` |

### Tech Stack Quick Reference

| Layer | Technology |
| --- | --- |
| Backend | NestJS 11 + Prisma 7 + PostgreSQL 16 + pgvector |
| Cache/Queue | Redis 7 + BullMQ |
| Auth | Better Auth |
| Frontend | React 19 + Vite + Tailwind CSS 4 + shadcn/ui |
| Documentation | Fumadocs + TanStack Start |
| Payments | Creem.io |
| Embeddings | OpenAI / Aliyun |
| Package Manager | pnpm workspace |

## Core Module Overview

### Server Module Structure

```
apps/server/src/
├── auth/           # Authentication (Better Auth)
├── user/           # User management
├── api-key/        # API Key management
├── quota/          # Quota management
├── memory/         # Memory service (core)
├── entity/         # Entity extraction
├── relation/       # Entity relations
├── graph/          # Knowledge graph
├── extract/        # LLM extraction
├── embedding/      # Vector embeddings
├── storage/        # Object storage
├── redis/          # Redis cache
├── queue/          # BullMQ queue
├── prisma/         # Database
├── email/          # Email service
├── payment/        # Payment processing (Creem)
├── common/         # Guards, decorators, filters
├── types/          # Shared type definitions
└── health/         # Health checks
```

### Core Business Flows

1. **Memory Request Flow**: Auth → Rate limit → Quota check → Deduction → Embedding → Storage → Response
2. **Quota Deduction Rules**: Monthly subscription quota first → Pay-as-you-go quota fallback → Auto-refund on failure
3. **Search Strategy**: Vector similarity search with pgvector, optional entity/relation filtering

## Documentation

- **Technical Specification**: → [`docs/TECH_SPEC.md`](./docs/TECH_SPEC.md)
- **Test Specification**: → [`docs/TEST_SPEC.md`](./docs/TEST_SPEC.md)

## Collaboration Guidelines

- **All English**: Code, comments, commit messages, documentation, and UI must be in English
- **Search First**: Don't guess implementations, search and verify against existing code
- **Don't Define Business Semantics**: Confirm product/data meanings with stakeholders first
- **Reuse Priority**: Prioritize reusing existing interfaces, types, and utilities

## Workflow

1. **Plan**: Before changes, provide minimal scope plan with motivation and risks
2. **Execute**: Focus on single issue, no blind changes
3. **Verify**: Run `pnpm typecheck` locally, pass before committing
4. **Sync**: Update relevant AGENTS.md (mandatory)

## Git Commit Guidelines

### Atomic Commits (Mandatory)

Each commit should represent **one logical change**. Do NOT bundle multiple unrelated features or fixes into a single commit.

**核心原则：完成一个功能就提交一次，不要堆积多个改动再提交。**

```bash
# ✅ Correct: One feature per commit
git commit -m "feat(console): 添加 Entity 管理功能"
git commit -m "feat(console): 添加 Webhook 投递日志功能"
git commit -m "feat(console): 添加 Memory 导出功能"
git commit -m "feat(console): 增强 Memory Playground"
git commit -m "feat(console): 添加 API 使用统计功能"
git commit -m "feat(console): 更新路由和导航"
git commit -m "docs: 更新计划文档"

# ❌ Wrong: Multiple features in one commit
git commit -m "feat(console): 添加 Entity、Webhook、Memory、Stats 等所有功能"
```

### Commit Granularity Guide

| 场景 | 拆分策略 |
| --- | --- |
| 新增功能模块 | 后端 API + 前端页面 = 1 个 commit |
| 多个独立功能 | 每个功能 1 个 commit |
| 重构 + 功能 | 拆分为 refactor commit + feat commit |
| 配置 + 代码 | 可合并为 1 个 commit（如果相关） |
| 文档更新 | 单独 1 个 commit |

### When to Commit

1. **完成一个功能点时** - 不要等到所有功能都做完
2. **重构完成时** - 与新功能分开提交
3. **修复一个 bug 时** - 每个 bug 单独提交
4. **更新配置/依赖时** - 单独提交便于回滚

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring (no feature/fix)
- `test`: Adding/updating tests
- `chore`: Build, config, dependencies

**Scope**: Module or app name (e.g., `server`, `console`, `docs`, `ui`)

### Benefits of Atomic Commits

1. **Easy to review**: Each commit has clear purpose
2. **Easy to revert**: Can undo specific changes without affecting others
3. **Clean git history**: Tells a clear story of project evolution
4. **Bisect friendly**: Easier to find bugs with `git bisect`
5. **Better collaboration**: Team members can cherry-pick specific changes

## File Header Comment Specification

Key files should have header comments with format based on file type:

| File Type | Format |
| --- | --- |
| Service/Logic | `[INPUT]` / `[OUTPUT]` / `[POS]` |
| React Component | `[PROPS]` / `[EMITS]` / `[POS]` |
| Utility Functions | `[PROVIDES]` / `[DEPENDS]` / `[POS]` |
| Type Definitions | `[DEFINES]` / `[USED_BY]` / `[POS]` |

Example:

```typescript
/**
 * [INPUT]: MemoryCreateRequest - Memory creation parameters
 * [OUTPUT]: MemoryResponse - Created memory or error
 * [POS]: Core memory service, called by memory.controller.ts
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and the directory AGENTS.md
 */
```

## Directory Conventions

Component or module directory structure:

- `index.ts` - Entry/exports
- `*.controller.ts` - Route controllers (backend)
- `*.service.ts` - Business logic
- `*.module.ts` - NestJS module definition
- `*.types.ts` - Module type definitions (must be separate file)
- `*.constants.ts` - Module constants (must be separate file)
- `dto/` - Data transfer objects (using Zod)
- `components/` - Sub-components (frontend)

## Types & DTO Specification

### DTO Validation (Zod Required)

All request DTOs must use Zod schema for runtime validation:

```typescript
// ✅ Correct: Use Zod schema
// dto/create-memory.dto.ts
import { z } from 'zod';

export const createMemorySchema = z.object({
  content: z.string().min(1).max(10000),
  userId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateMemoryDto = z.infer<typeof createMemorySchema>;

// controller.ts usage
@Post()
async create(@Body() body: unknown) {
  const parsed = createMemorySchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.issues[0]?.message);
  }
  // Use parsed.data
}
```

```typescript
// ❌ Wrong: Class-based DTO has no runtime validation
export class CreateMemoryDto {
  content!: string;
  userId?: string;
}
```

### Type File Organization (No Inline)

Type definitions must be in separate `*.types.ts` files, inline definitions prohibited:

```typescript
// ✅ Correct: Types centralized in .types.ts
// memory/memory.types.ts
export interface MemoryContext {
  userId: string;
  apiKeyId: string | null;
  tier: SubscriptionTier;
}

// memory/memory.service.ts
import type { MemoryContext } from './memory.types';
```

```typescript
// ❌ Wrong: Inline type definition in business code
// memory/memory.service.ts
interface MemoryContext {  // Don't define here
  userId: string;
  // ...
}
```

## Code Principles

### Core Principles

1. **Single Responsibility (SRP)**: Each function/component does one thing
2. **Open-Closed (OCP)**: Open for extension, closed for modification
3. **Law of Demeter (LoD)**: Only interact with direct dependencies, avoid deep calls
4. **Dependency Inversion (DIP)**: Depend on abstractions, not implementations
5. **Composition over Inheritance**: Use Hooks and composition patterns for logic reuse
6. **Research First**: Search online for uncertain matters, use latest library versions

### Code Practices

1. **Pure Functions First**: Implement logic as pure functions for easy testing
2. **Early Return**: Use early returns to reduce nesting, improve readability
3. **Separation of Concerns**: Constants, utils, logic, UI each have their place
4. **DRY Principle**: Extract and reuse duplicate logic
5. **Avoid Premature Optimization**: Ensure correctness and readability first

### API Request Convention (Frontend)

**Before making any API request, always check if the project has an existing API client.**

For `apps/console` and `apps/admin`:

```typescript
// ✅ Correct: Use the centralized apiClient
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'

const response = await apiClient.get<ApiResponse<Data>>(CONSOLE_API.ENDPOINT)

// ✅ Correct: For custom auth (e.g., API key), use API_BASE_URL
import { API_BASE_URL } from '@/lib/api-client'

const response = await fetch(`${API_BASE_URL}/api/v1/endpoint`, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
})
```

```typescript
// ❌ Wrong: Direct fetch with relative path (ignores VITE_API_URL in production)
const response = await fetch('/api/v1/endpoint', { ... })

// ❌ Wrong: Using window.location.origin (fails when API is on different domain)
const response = await fetch(`${window.location.origin}/api/v1/endpoint`, { ... })
```

**Key points:**
- `apiClient` handles auth token injection and error handling automatically
- `API_BASE_URL` respects `VITE_API_URL` environment variable for production deployments
- Relative paths like `/api/...` only work in development (via Vite proxy)

### Comment Guidelines

1. **Core Logic Must Have Comments**: Complex algorithms, business rules, edge cases need explanation
2. **Naming Assists Understanding**: Clear naming + necessary comments work together
3. **English Comments**: Use concise English comments, add JSDoc for external APIs

### Prohibited

1. **No Legacy Compatibility**: Delete/refactor unused code directly
2. **No Deprecated Comments**: Prohibited: `// deprecated`, `// removed`, `_unused`, etc.
3. **No Guessing**: Search and confirm first, then modify

## Naming Conventions

| Type | Convention | Example |
| --- | --- | --- |
| Components/Types | PascalCase | `MemoryService` |
| Functions/Variables | camelCase | `handleMemory` |
| Constants | UPPER_SNAKE_CASE | `MAX_CONCURRENT` |
| Component Folders | PascalCase | `ApiKeyCard/` |
| Utility Files | camelCase | `vectorUtils.ts` |
| API Key Prefix | `mk_` | `mk_abc123...` |

## Language Specification

| Context | Language | Notes |
| --- | --- | --- |
| Documentation/Comments | English | Consistency for international team |
| Code Identifiers | English | Programming convention |
| Commit Messages | English | Git standard |
| API Error Codes | English | `QUOTA_EXCEEDED` |
| User Interface (UI) | English | International users |

## UI/UX Style Specification

### Design Style

**Boxy and Sharp** - All UI elements use sharp corners, no rounded corners. Overall tone is soft black/white/gray with orange as accent color.

### Corner Radius (Mandatory)

**Globally no rounded corners**, all components must use `rounded-none`:

```tsx
// ✅ Correct
<Card className="rounded-none">
<Button className="rounded-none">
<Input className="rounded-none">
<Badge className="rounded-none">

// ❌ Wrong - Any rounded corners are not allowed
<Card className="rounded-lg">
<Button className="rounded-md">
<Badge className="rounded-full">
```

> Note: shadcn/ui components have default rounded corners, explicitly add `rounded-none` to override.

### Theme Variables

```css
/* Sidebar */
--sidebar-foreground: oklch(0.35 0 0);      /* Unselected text: dark gray */
--sidebar-primary: oklch(0.65 0.18 45);     /* Selected text: orange */

/* Accent */
--primary: oklch(0.25 0 0);                 /* Primary: dark gray/black */
```

### Tailwind CSS v4 Notes

Project uses **Tailwind CSS v4**, note these differences:

1. **Data Attribute Variants**:
   - Radix UI components use `data-[state=active]:` not `data-active:`
   ```tsx
   // ✅ Tailwind v4 + Radix UI
   className="data-[state=active]:bg-background"

   // ❌ Won't work
   className="data-active:bg-background"
   ```

2. **Color Opacity**: oklch color opacity modifiers may not work, use inline styles or full color values

3. **CSS Variable Config**: Define in `@theme inline` block in `globals.css`

## Business Rules

### Subscription Tiers & Quotas

| Plan | Price | Memories | API Calls/month |
| --- | --- | --- | --- |
| FREE | $0 | 10,000 | 1,000 |
| HOBBY | $19/mo | 50,000 | 5,000 |
| ENTERPRISE | Pay-as-you-go | Unlimited | Unlimited |

### Quota Deduction Logic

```
Priority: Monthly subscription quota → Pay-as-you-go quota
Timing: Pre-deduct on request, refund on failure
Cache hit: No deduction, still create record
```

### Security Points

- **SSRF Protection**: URLs must be validated by `url-validator.ts`
- **Private IP Blocking**: Prohibit localhost, internal IPs, cloud metadata
- **API Key Storage**: Store only SHA256 hash, plaintext shown only once at creation

## Test Infrastructure

### Server Development Guidelines (Mandatory)

服务端代码开发时必须遵循以下测试规范：

1. **新功能必须写单元测试**
   - 新增 Service/Guard/Interceptor 时，必须在对应的 `__tests__/` 目录创建 `*.spec.ts` 测试文件
   - 测试覆盖核心业务逻辑、边界条件、错误处理

2. **修改功能必须更新测试**
   - 修改现有功能时，必须同步更新对应的单元测试
   - 如果修改改变了行为，测试用例也需要相应调整

3. **提交前必须运行测试**
   - 每次代码修改完成后，必须运行 `pnpm --filter server test` 验证功能正确性
   - 所有测试必须通过才能提交代码

```bash
# 开发流程示例
# 1. 新增功能
vim src/example/example.service.ts
vim src/example/__tests__/example.service.spec.ts  # 同时创建测试

# 2. 运行测试验证
pnpm --filter server test

# 3. 测试通过后提交
git add . && git commit -m "feat(server): add example feature"
```

### Test Commands

```bash
pnpm --filter server test        # Run all tests (excluding integration/E2E)
pnpm --filter server test:unit   # Run unit tests
pnpm --filter server test:cov    # With coverage report
pnpm --filter server test:ci     # CI full test (including integration/E2E + coverage)
```

### Test Directory Structure

```
apps/server/
├── vitest.config.ts              # Vitest configuration
├── test/
│   ├── setup.ts                  # Global setup
│   ├── helpers/                  # Test helper functions
│   │   ├── containers.ts         # Testcontainers wrapper
│   │   ├── test-app.factory.ts   # NestJS TestingModule factory
│   │   └── mock.factory.ts       # Mock factory
│   └── fixtures/                 # Test data and pages
│       └── seed.ts               # Shared test data
└── src/**/__tests__/             # Module tests
```

---

*Version: 1.3 | Updated: 2026-01*
