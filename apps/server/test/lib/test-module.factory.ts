/**
 * NestJS 测试模块工厂
 * 提供创建测试应用和测试模块的工具函数
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

/**
 * 创建完整的测试应用（用于 E2E 测试）
 * 配置与生产环境一致的中间件和拦截器
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // 配置全局前缀（排除健康检查和 webhook）
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/(.*)', 'webhooks/(.*)'],
  });

  // 启用 URI 版本控制
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 全局响应拦截器
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  return app;
}

/**
 * Provider 覆盖配置
 */
export interface ProviderOverride {
  provide: Type<unknown> | string | symbol;
  useValue: unknown;
}

/**
 * 创建测试模块（用于单元/集成测试）
 * 支持依赖注入覆盖
 */
export async function createTestModule(
  targetModule: Type<unknown>,
  overrides: ProviderOverride[] = [],
): Promise<TestingModule> {
  let builder = Test.createTestingModule({
    imports: [targetModule],
  });

  for (const { provide, useValue } of overrides) {
    builder = builder.overrideProvider(provide).useValue(useValue);
  }

  return builder.compile();
}

/**
 * 创建独立的测试模块（不依赖 AppModule）
 * 用于纯单元测试
 */
export async function createIsolatedTestModule(
  providers: Array<Type<unknown> | { provide: unknown; useValue: unknown }>,
): Promise<TestingModule> {
  return Test.createTestingModule({
    providers,
  }).compile();
}
