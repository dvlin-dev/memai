/**
 * User 测试数据工厂
 */
import { createId } from '@paralleldrive/cuid2';

export interface UserFixture {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  image: string | null;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function createUserFixture(overrides: Partial<UserFixture> = {}): UserFixture {
  const now = new Date();

  return {
    id: overrides.id ?? createId(),
    email: overrides.email ?? `test-${createId()}@example.com`,
    name: overrides.name ?? 'Test User',
    emailVerified: overrides.emailVerified ?? true,
    image: overrides.image ?? null,
    isAdmin: overrides.isAdmin ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    deletedAt: overrides.deletedAt ?? null,
  };
}

/**
 * 创建已删除用户
 */
export function createDeletedUserFixture(overrides: Partial<UserFixture> = {}): UserFixture {
  return createUserFixture({
    ...overrides,
    deletedAt: overrides.deletedAt ?? new Date(),
  });
}

/**
 * 创建管理员用户
 */
export function createAdminUserFixture(overrides: Partial<UserFixture> = {}): UserFixture {
  return createUserFixture({
    ...overrides,
    isAdmin: true,
    email: overrides.email ?? 'admin@example.com',
    name: overrides.name ?? 'Admin User',
  });
}
