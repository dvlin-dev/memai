# Scalar + OpenAPI Migration Guide

This document summarizes the experience of migrating from Swagger UI to Scalar and optimizing OpenAPI documentation in a NestJS project.

## Overview

The migration involves:
1. Replacing Swagger UI with Scalar (modern API documentation UI)
2. Migrating from class-validator to Zod validation
3. Optimizing OpenAPI documentation with proper decorators
4. Splitting API docs into public and internal sections

## 1. Scalar Integration

### Installation

```bash
pnpm add @scalar/nestjs-api-reference
```

### Configuration

Create an OpenAPI service module:

```typescript
// src/openapi/openapi.service.ts
import { Injectable } from '@nestjs/common';
import { DocumentBuilder } from '@nestjs/swagger';

@Injectable()
export class OpenApiService {
  /**
   * Build public API documentation config
   */
  buildPublicConfig() {
    return new DocumentBuilder()
      .setTitle('Your API')
      .setDescription('Public API documentation')
      .setVersion('1.0')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'apiKey')
      .build();
  }

  /**
   * Build internal API documentation config (dev only)
   */
  buildInternalConfig() {
    return new DocumentBuilder()
      .setTitle('Your API (Internal)')
      .setDescription('Internal API documentation')
      .setVersion('1.0')
      .addCookieAuth('session')
      .build();
  }
}

// src/openapi/openapi.constants.ts
export const SCALAR_CONFIG = {
  OPENAPI_JSON_PATH: '/openapi.json',
  PUBLIC_DOCS_PATH: '/api-reference',
  INTERNAL_DOCS_PATH: '/internal/api-reference',
} as const;

// src/openapi/scalar.middleware.ts
import { apiReference } from '@scalar/nestjs-api-reference';

export function createScalarMiddleware(jsonPath: string) {
  return apiReference({
    spec: { url: jsonPath },
    theme: 'kepler',
    layout: 'modern',
  });
}
```

### Setup in main.ts

```typescript
import { SwaggerModule } from '@nestjs/swagger';
import { OpenApiService, SCALAR_CONFIG, createScalarMiddleware } from './openapi';

async function setupOpenAPI(app: INestApplication) {
  const isDev = process.env.NODE_ENV !== 'production';
  const openApiService = app.get(OpenApiService);

  // Public API docs
  const publicConfig = openApiService.buildPublicConfig();
  const publicDoc = SwaggerModule.createDocument(app, publicConfig, {
    include: [MemoryModule, EntityModule, ...], // Module classes, NOT controllers
  });

  // Serve OpenAPI JSON
  app.use(SCALAR_CONFIG.OPENAPI_JSON_PATH, (_, res) => res.json(publicDoc));

  // Serve Scalar UI
  app.use(SCALAR_CONFIG.PUBLIC_DOCS_PATH, createScalarMiddleware(SCALAR_CONFIG.OPENAPI_JSON_PATH));

  // Internal docs (dev only)
  if (isDev) {
    const internalConfig = openApiService.buildInternalConfig();
    const internalDoc = SwaggerModule.createDocument(app, internalConfig);
    app.use('/internal/openapi.json', (_, res) => res.json(internalDoc));
    app.use(SCALAR_CONFIG.INTERNAL_DOCS_PATH, createScalarMiddleware('/internal/openapi.json'));
  }
}
```

### Key Points

1. **SwaggerModule.createDocument `include` option requires Module classes, not Controller classes**
   ```typescript
   // Wrong - controllers won't work
   include: [MemoryController, EntityController]

   // Correct - use modules
   include: [MemoryModule, EntityModule]
   ```

2. **Clean up OpenAPI JSON** - Remove internal schemas that shouldn't be exposed:
   ```typescript
   function cleanupOpenApiDoc(doc: OpenAPIObject): OpenAPIObject {
     const cleanedSchemas = { ...doc.components?.schemas };
     // Remove internal schemas
     delete cleanedSchemas['InternalDto'];
     return { ...doc, components: { ...doc.components, schemas: cleanedSchemas } };
   }
   ```

## 2. Zod Validation Migration

### Installation

```bash
pnpm add zod nestjs-zod
```

### Setup in app.module.ts

```typescript
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';

@Module({
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
```

### Schema Definition Pattern

```typescript
// dto/memory.schema.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ========== Field Schemas (reusable) ==========
const UserIdSchema = z.string().min(1, 'userId is required');
const ContentSchema = z.string().min(1).max(50000);

// ========== Request Schemas ==========
export const CreateMemorySchema = z.object({
  userId: UserIdSchema,
  content: ContentSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ========== Inferred Types (Single Source of Truth) ==========
export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;

// ========== DTO Classes ==========
export class CreateMemoryDto extends createZodDto(CreateMemorySchema) {}
```

### Key Points

1. **Single Source of Truth**: Types derive from Zod schemas via `z.infer<>`, never duplicate
2. **Field Schemas**: Extract common fields for reuse across schemas
3. **DTO Classes**: Use `createZodDto()` for NestJS integration

## 3. OpenAPI Decorator Best Practices

### Controller-Level Decorators

```typescript
@ApiTags('Memory')           // Group in docs
@ApiSecurity('apiKey')       // For API key auth
// OR
@ApiCookieAuth()             // For session auth
@Controller({ path: 'memories', version: '1' })
export class MemoryController {}
```

### Method-Level Decorators

```typescript
@Post()
@ApiOperation({ summary: 'Create a memory' })
@ApiOkResponse({ description: 'Memory created successfully' })
async create(@Body() dto: CreateMemoryDto) {}

@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: 'Delete a memory' })
@ApiNoContentResponse({ description: 'Memory deleted' })
@ApiParam({ name: 'id', description: 'Memory ID' })
async delete(@Param('id') id: string) {}
```

### Query Parameters

When not using a DTO class for query params, add `@ApiQuery`:

```typescript
@Get()
@ApiOperation({ summary: 'List memories' })
@ApiOkResponse({ description: 'List of memories' })
@ApiQuery({ name: 'limit', required: false, description: 'Limit (default: 20)' })
@ApiQuery({ name: 'offset', required: false, description: 'Offset (default: 0)' })
async findAll(
  @Query('limit') limit?: string,
  @Query('offset') offset?: string,
) {}
```

### Complete Decorator Reference

| Scenario | Decorators |
|----------|------------|
| Create (POST) | `@ApiOperation`, `@ApiOkResponse` |
| Read single (GET :id) | `@ApiOperation`, `@ApiOkResponse`, `@ApiParam` |
| Read list (GET) | `@ApiOperation`, `@ApiOkResponse`, `@ApiQuery` (for each param) |
| Update (PATCH/PUT) | `@ApiOperation`, `@ApiOkResponse`, `@ApiParam` |
| Delete (DELETE) | `@ApiOperation`, `@ApiNoContentResponse`, `@ApiParam` |

## 4. Code Review Checklist

### Must Have

- [ ] All controllers have `@ApiTags`
- [ ] All methods have `@ApiOperation`
- [ ] All methods have `@ApiOkResponse` or `@ApiNoContentResponse`
- [ ] All path params have `@ApiParam`
- [ ] All query params (without DTO) have `@ApiQuery`
- [ ] DTOs export from `dto/index.ts`

### Best Practices

- [ ] Required params before optional params in function signatures
- [ ] No `res?: Response` with `res!` - use `res: Response` instead
- [ ] Delete unused code completely (no deprecated comments)
- [ ] Run `typecheck` after changes

### Common Issues

1. **Parameters showing empty in docs**
   - Cause: Missing DTO exports or wrong `include` in SwaggerModule
   - Fix: Add `export * from './dto'` and use Module classes

2. **Required param after optional param**
   - Cause: TypeScript error
   - Fix: Reorder params (required first, optional last)

3. **Non-null assertion on optional param**
   ```typescript
   // Bad
   async export(@Res() res?: Response) { res!.send(); }

   // Good
   async export(@Res() res: Response) { res.send(); }
   ```

## 5. File Structure

```
src/
├── openapi/
│   ├── index.ts              # Exports
│   ├── openapi.module.ts     # Module
│   ├── openapi.service.ts    # Document builders
│   ├── openapi.constants.ts  # Path constants
│   └── scalar.middleware.ts  # Scalar middleware
├── memory/
│   ├── dto/
│   │   ├── index.ts          # Export all DTOs
│   │   └── memory.schema.ts  # Zod schemas + DTOs
│   ├── memory.module.ts
│   ├── memory.controller.ts  # Public API
│   ├── console-memory.controller.ts  # Console API
│   └── memory.service.ts
```

## 6. Migration Steps

1. **Install dependencies**
   ```bash
   pnpm add @scalar/nestjs-api-reference zod nestjs-zod
   ```

2. **Create OpenAPI module** with service, constants, middleware

3. **Add ZodValidationPipe** to app.module.ts

4. **Migrate DTOs** from class-validator to Zod schemas

5. **Add response decorators** to all controllers

6. **Setup Scalar** in main.ts with split docs

7. **Run typecheck** and fix errors

8. **Test API docs** at `/api-reference`

## 7. Troubleshooting

### Empty paths in openapi.json

```typescript
// Wrong - using controllers
SwaggerModule.createDocument(app, config, {
  include: [MemoryController]
});

// Correct - using modules
SwaggerModule.createDocument(app, config, {
  include: [MemoryModule]
});
```

### Schema not showing in docs

Ensure DTO is exported from module's dto/index.ts:
```typescript
// dto/index.ts
export * from './memory.schema';
```

### Zod validation not working

Ensure ZodValidationPipe is registered globally:
```typescript
@Module({
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
```

---

*Version: 1.0 | Created: 2026-01*
