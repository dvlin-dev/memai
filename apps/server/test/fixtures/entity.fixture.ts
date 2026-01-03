/**
 * Entity 测试数据工厂
 */

export interface EntityFixture {
  id: string;
  apiKeyId: string;
  userId: string;
  type: string;
  name: string;
  properties: Record<string, unknown> | null;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createEntityFixture(overrides: Partial<EntityFixture> = {}): EntityFixture {
  const now = new Date();

  return {
    id: overrides.id ?? crypto.randomUUID(),
    apiKeyId: overrides.apiKeyId ?? 'test-api-key-id',
    userId: overrides.userId ?? 'end-user-123',
    type: overrides.type ?? 'PERSON',
    name: overrides.name ?? 'John Doe',
    properties: overrides.properties ?? null,
    confidence: overrides.confidence ?? 1.0,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

/**
 * 创建带属性的 Entity
 */
export function createRichEntityFixture(
  overrides: Partial<EntityFixture> = {},
): EntityFixture {
  return createEntityFixture({
    ...overrides,
    properties: overrides.properties ?? {
      occupation: 'Software Engineer',
      company: 'Test Corp',
    },
    confidence: overrides.confidence ?? 0.95,
  });
}

/**
 * 创建组织 Entity
 */
export function createOrganizationEntityFixture(
  overrides: Partial<EntityFixture> = {},
): EntityFixture {
  return createEntityFixture({
    ...overrides,
    type: 'ORGANIZATION',
    name: overrides.name ?? 'Test Corporation',
    properties: overrides.properties ?? {
      industry: 'Technology',
      size: 'Enterprise',
    },
  });
}

/**
 * Relation 测试数据工厂
 */
export interface RelationFixture {
  id: string;
  apiKeyId: string;
  userId: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, unknown> | null;
  confidence: number | null;
  validFrom: Date | null;
  validTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createRelationFixture(
  overrides: Partial<RelationFixture> = {},
): RelationFixture {
  const now = new Date();

  return {
    id: overrides.id ?? crypto.randomUUID(),
    apiKeyId: overrides.apiKeyId ?? 'test-api-key-id',
    userId: overrides.userId ?? 'end-user-123',
    sourceId: overrides.sourceId ?? crypto.randomUUID(),
    targetId: overrides.targetId ?? crypto.randomUUID(),
    type: overrides.type ?? 'WORKS_AT',
    properties: overrides.properties ?? null,
    confidence: overrides.confidence ?? 1.0,
    validFrom: overrides.validFrom ?? null,
    validTo: overrides.validTo ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

/**
 * 创建带时间范围的 Relation
 */
export function createTimedRelationFixture(
  overrides: Partial<RelationFixture> = {},
): RelationFixture {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  return createRelationFixture({
    ...overrides,
    validFrom: overrides.validFrom ?? oneYearAgo,
    validTo: overrides.validTo ?? null, // 仍然有效
  });
}
