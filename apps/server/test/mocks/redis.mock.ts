/**
 * Redis Mock
 * 提供内存中的 Redis 模拟实现
 */
import { vi } from 'vitest';

interface StoredValue {
  value: string;
  expiresAt?: number;
}

/**
 * 创建 Redis mock（内存实现）
 */
export function createRedisMock() {
  const store = new Map<string, StoredValue>();

  const mock = {
    /**
     * 获取值
     */
    get: vi.fn(async (key: string): Promise<string | null> => {
      const item = store.get(key);
      if (!item) return null;

      // 检查是否过期
      if (item.expiresAt && Date.now() > item.expiresAt) {
        store.delete(key);
        return null;
      }

      return item.value;
    }),

    /**
     * 设置值
     */
    set: vi.fn(
      async (
        key: string,
        value: string,
        options?: { ex?: number; px?: number; exat?: number; pxat?: number },
      ): Promise<'OK'> => {
        let expiresAt: number | undefined;

        if (options?.ex) {
          expiresAt = Date.now() + options.ex * 1000;
        } else if (options?.px) {
          expiresAt = Date.now() + options.px;
        } else if (options?.exat) {
          expiresAt = options.exat * 1000;
        } else if (options?.pxat) {
          expiresAt = options.pxat;
        }

        store.set(key, { value, expiresAt });
        return 'OK';
      },
    ),

    /**
     * 删除键
     */
    del: vi.fn(async (...keys: string[]): Promise<number> => {
      let deleted = 0;
      for (const key of keys) {
        if (store.delete(key)) {
          deleted++;
        }
      }
      return deleted;
    }),

    /**
     * 检查键是否存在
     */
    exists: vi.fn(async (...keys: string[]): Promise<number> => {
      let count = 0;
      for (const key of keys) {
        if (store.has(key)) {
          count++;
        }
      }
      return count;
    }),

    /**
     * 设置过期时间
     */
    expire: vi.fn(async (key: string, seconds: number): Promise<number> => {
      const item = store.get(key);
      if (!item) return 0;

      item.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }),

    /**
     * 获取剩余过期时间
     */
    ttl: vi.fn(async (key: string): Promise<number> => {
      const item = store.get(key);
      if (!item) return -2; // 键不存在
      if (!item.expiresAt) return -1; // 无过期时间

      const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    }),

    /**
     * 仅在键不存在时设置
     */
    setNX: vi.fn(async (key: string, value: string): Promise<boolean> => {
      if (store.has(key)) return false;
      store.set(key, { value });
      return true;
    }),

    /**
     * 自增
     */
    incr: vi.fn(async (key: string): Promise<number> => {
      const item = store.get(key);
      const current = item ? parseInt(item.value, 10) : 0;
      const next = current + 1;
      store.set(key, { value: next.toString(), expiresAt: item?.expiresAt });
      return next;
    }),

    /**
     * 自增指定值
     */
    incrBy: vi.fn(async (key: string, increment: number): Promise<number> => {
      const item = store.get(key);
      const current = item ? parseInt(item.value, 10) : 0;
      const next = current + increment;
      store.set(key, { value: next.toString(), expiresAt: item?.expiresAt });
      return next;
    }),

    // ========== 测试辅助方法 ==========

    /**
     * 清空所有数据（测试用）
     */
    _clear: () => {
      store.clear();
    },

    /**
     * 获取存储大小（测试用）
     */
    _size: () => store.size,

    /**
     * 直接设置值（测试用，跳过 mock 记录）
     */
    _set: (key: string, value: string, expiresAt?: number) => {
      store.set(key, { value, expiresAt });
    },
  };

  return mock;
}

/**
 * Redis Mock 类型
 */
export type RedisMock = ReturnType<typeof createRedisMock>;
