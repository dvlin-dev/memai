/**
 * Memory 测试数据工厂
 */

export interface MemoryFixture {
  id: string;
  apiKeyId: string;
  userId: string;
  agentId: string | null;
  sessionId: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  source: string | null;
  importance: number | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export function createMemoryFixture(overrides: Partial<MemoryFixture> = {}): MemoryFixture {
  const now = new Date();

  return {
    id: overrides.id ?? crypto.randomUUID(),
    apiKeyId: overrides.apiKeyId ?? 'test-api-key-id',
    userId: overrides.userId ?? 'end-user-123',
    agentId: overrides.agentId ?? null,
    sessionId: overrides.sessionId ?? null,
    content: overrides.content ?? 'This is a test memory content for testing purposes.',
    metadata: overrides.metadata ?? null,
    source: overrides.source ?? null,
    importance: overrides.importance ?? 0.5,
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

/**
 * 创建带 Agent 和 Session 的 Memory
 */
export function createSessionMemoryFixture(
  overrides: Partial<MemoryFixture> = {},
): MemoryFixture {
  return createMemoryFixture({
    ...overrides,
    agentId: overrides.agentId ?? 'agent-123',
    sessionId: overrides.sessionId ?? 'session-456',
  });
}

/**
 * 创建带元数据和标签的 Memory
 */
export function createRichMemoryFixture(
  overrides: Partial<MemoryFixture> = {},
): MemoryFixture {
  return createMemoryFixture({
    ...overrides,
    metadata: overrides.metadata ?? {
      context: 'conversation',
      topic: 'testing',
    },
    source: overrides.source ?? 'chat',
    importance: overrides.importance ?? 0.8,
    tags: overrides.tags ?? ['important', 'testing'],
  });
}

/**
 * 创建 Memory DTO（用于 API 调用）
 */
export interface CreateMemoryDto {
  userId: string;
  content: string;
  agentId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  source?: string;
  importance?: number;
  tags?: string[];
}

export function createMemoryDto(overrides: Partial<CreateMemoryDto> = {}): CreateMemoryDto {
  return {
    userId: overrides.userId ?? 'end-user-123',
    content: overrides.content ?? 'Test memory content',
    agentId: overrides.agentId,
    sessionId: overrides.sessionId,
    metadata: overrides.metadata,
    source: overrides.source,
    importance: overrides.importance,
    tags: overrides.tags,
  };
}

/**
 * 创建搜索 Memory DTO
 */
export interface SearchMemoryDto {
  userId: string;
  query: string;
  limit?: number;
  threshold?: number;
  agentId?: string;
  sessionId?: string;
}

export function createSearchMemoryDto(
  overrides: Partial<SearchMemoryDto> = {},
): SearchMemoryDto {
  return {
    userId: overrides.userId ?? 'end-user-123',
    query: overrides.query ?? 'test query',
    limit: overrides.limit,
    threshold: overrides.threshold,
    agentId: overrides.agentId,
    sessionId: overrides.sessionId,
  };
}
