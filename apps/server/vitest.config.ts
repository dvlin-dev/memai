/**
 * Vitest 配置文件
 * 支持单元测试、集成测试、E2E 测试
 */
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    exclude: ['**/node_modules/**'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/**/*.module.ts',
        'src/**/*.constants.ts',
        'src/**/*.types.ts',
        'src/**/index.ts',
        'src/**/dto/**',
        'src/main.ts',
        'generated/**',
      ],
      thresholds: {
        // 核心业务模块 ≥80%
        'src/memory/**': { statements: 80, branches: 75 },
        'src/entity/**': { statements: 80, branches: 75 },
        // 认证授权模块 ≥85%
        'src/api-key/**': { statements: 85, branches: 80 },
        'src/auth/**': { statements: 85, branches: 80 },
        // 订阅支付模块 ≥75%
        'src/quota/**': { statements: 75, branches: 70 },
        // 通用组件 ≥90%
        'src/common/**': { statements: 90, branches: 85 },
        // 全局最低
        global: { statements: 65, branches: 60 },
      },
    },
    // 测试隔离：使用 forks 进程池
    pool: 'forks',
    // Vitest 4.x: isolate 控制是否隔离测试
    isolate: false,
  },
});
