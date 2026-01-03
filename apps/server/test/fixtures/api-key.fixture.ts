/**
 * API Key 测试数据工厂
 */
import { createId } from '@paralleldrive/cuid2';
import { createHash } from 'crypto';

export interface ApiKeyFixtureData {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyFixture {
  data: ApiKeyFixtureData;
  rawKey: string;
}

/**
 * 生成 API Key
 * 格式: mk_<64位随机hex>
 */
function generateApiKey(): string {
  const randomBytes = createId() + createId() + createId();
  return `mk_${randomBytes.substring(0, 48)}`;
}

export function createApiKeyFixture(
  overrides: Partial<ApiKeyFixtureData> = {},
): ApiKeyFixture {
  const rawKey = generateApiKey();
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const now = new Date();

  return {
    data: {
      id: overrides.id ?? createId(),
      userId: overrides.userId ?? 'test-user-id',
      name: overrides.name ?? 'Test API Key',
      keyPrefix: rawKey.substring(0, 12),
      keyHash: overrides.keyHash ?? keyHash,
      isActive: overrides.isActive ?? true,
      lastUsedAt: overrides.lastUsedAt ?? null,
      expiresAt: overrides.expiresAt ?? null,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
    },
    rawKey,
  };
}

/**
 * 创建已过期的 API Key
 */
export function createExpiredApiKeyFixture(
  overrides: Partial<ApiKeyFixtureData> = {},
): ApiKeyFixture {
  const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 天前
  return createApiKeyFixture({
    ...overrides,
    expiresAt: expiredAt,
  });
}

/**
 * 创建已停用的 API Key
 */
export function createInactiveApiKeyFixture(
  overrides: Partial<ApiKeyFixtureData> = {},
): ApiKeyFixture {
  return createApiKeyFixture({
    ...overrides,
    isActive: false,
  });
}
