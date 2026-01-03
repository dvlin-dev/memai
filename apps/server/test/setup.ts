/**
 * Vitest 全局测试配置
 * 设置测试环境变量和全局钩子
 */
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

beforeAll(() => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.BETTER_AUTH_SECRET = 'test-secret-must-be-at-least-32-characters-long';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.CREEM_WEBHOOK_SECRET = 'test-webhook-secret';
});

afterEach(() => {
  // 每个测试后清理 mock 调用记录
  vi.clearAllMocks();
});

afterAll(() => {
  // 所有测试完成后恢复所有 mock
  vi.restoreAllMocks();
});
