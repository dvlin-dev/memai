/**
 * Testcontainers 封装
 * 管理 PostgreSQL (pgvector) 和 Redis 容器的生命周期
 */
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import path from 'path';

let pgContainer: StartedPostgreSqlContainer | null = null;
let redisContainer: StartedRedisContainer | null = null;

/**
 * 启动测试容器
 * PostgreSQL 使用 pgvector 镜像以支持向量操作
 */
export async function startContainers(): Promise<void> {
  if (pgContainer && redisContainer) {
    return;
  }

  const [pg, redis] = await Promise.all([
    new PostgreSqlContainer('pgvector/pgvector:pg16')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start(),
    new RedisContainer('redis:7-alpine').start(),
  ]);

  pgContainer = pg;
  redisContainer = redis;

  // 设置环境变量供 Prisma 使用
  process.env.DATABASE_URL = pgContainer.getConnectionUri();
  process.env.REDIS_URL = redisContainer.getConnectionUrl();

  // 运行数据库迁移
  const serverDir = path.resolve(__dirname, '../..');
  execSync('npx prisma migrate deploy', {
    env: { ...process.env },
    cwd: serverDir,
    stdio: 'pipe',
  });
}

/**
 * 停止测试容器
 */
export async function stopContainers(): Promise<void> {
  await Promise.all([pgContainer?.stop(), redisContainer?.stop()]);
  pgContainer = null;
  redisContainer = null;
}

/**
 * 获取 PostgreSQL 连接字符串
 */
export function getDatabaseUrl(): string {
  if (!pgContainer) {
    throw new Error('PostgreSQL container not started');
  }
  return pgContainer.getConnectionUri();
}

/**
 * 获取 Redis 连接字符串
 */
export function getRedisUrl(): string {
  if (!redisContainer) {
    throw new Error('Redis container not started');
  }
  return redisContainer.getConnectionUrl();
}
