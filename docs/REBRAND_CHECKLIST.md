# 品牌升级清单：memai → memai

> 域名变更：memai.dev → memai.dev
> 无需向后兼容，直接替换所有内容

---

## 概览

本文档列出了从 `memai` 升级到 `memai` 需要修改的所有内容。

### 关键变更汇总

| 类型 | 旧值 | 新值 |
|------|------|------|
| 包名前缀 | `@memai/` | `@memai/` |
| 域名 | `memai.dev` | `memai.dev` |
| 品牌名 | `memai` / `Memai` | `memai` / `Memai` |
| API Key 前缀 | `mm_` | `mm_` (可选) |
| Webhook Header | `x-memai-signature` | `x-memai-signature` |
| 环境变量前缀 | `MEMOKIT_` | `MEMAI_` |
| localStorage Key | `memai_api_keys` | `memai_api_keys` |
| GitHub 仓库 | `dvlin-dev/memai` | `dvlin-dev/memai` |
| Twitter | `twitter.com/memai` | `twitter.com/memai` |

---

## 1. 根目录配置文件

| 文件 | 修改内容 |
|------|----------|
| `package.json` | `"name": "memai"` → `"name": "memai"` |
| `package.json` | 所有 `@memai/` 前缀的脚本命令 |
| `tsconfig.base.json` | `@memai/shared-types` 路径别名 |
| `tsconfig.base.json` | `@memai/ui` 路径别名 |
| `AGENTS.md` | 标题 `# Memai` → `# Memai` |
| `README.md` | 整体内容更新（如需） |
| `pnpm-lock.yaml` | 自动生成，修改后重新安装即可 |

---

## 2. Docker 文件

| 文件 | 修改内容 |
|------|----------|
| `Dockerfile` | 注释 `@memai/server` → `@memai/server` |
| `Dockerfile` | `--filter @memai/server` → `--filter @memai/server` |
| `Dockerfile.admin` | 注释和 filter `@memai/admin` |
| `Dockerfile.admin` | `server.memai.dev` → `server.memai.dev` |
| `Dockerfile.console` | 注释和 filter `@memai/console` |
| `Dockerfile.console` | `server.memai.dev` → `server.memai.dev` |
| `Dockerfile.docs` | 注释和 filter `@memai/docs` |
| `Dockerfile.www` | 注释和 filter `@memai/www` |

---

## 3. packages/shared-types

| 文件 | 修改内容 |
|------|----------|
| `package.json` | `"name": "@memai/shared-types"` → `"name": "@memai/shared-types"` |

---

## 4. packages/ui

| 文件 | 修改内容 |
|------|----------|
| `package.json` | `"name": "@memai/ui"` → `"name": "@memai/ui"` |
| `src/index.ts` | 注释中的 `@memai/ui` 引用 |
| `src/components/composed/index.ts` | 注释中的 `@memai/ui` 引用 |

---

## 5. apps/server

| 文件 | 修改内容 |
|------|----------|
| `package.json` | `"name": "@memai/server"` → `"name": "@memai/server"` |
| `package.json` | `"description": "Memai..."` → `"description": "Memai..."` |
| `src/main.ts:111` | Swagger 描述 `Memai - Memory as a Service API` |
| `src/main.ts:11,41` | 注释中的 `*.memai.dev` |
| `src/api-key/api-key.constants.ts:6` | `API_KEY_PREFIX = 'mm_'` → `'mm_'` (可选) |
| `src/api-key/api-key.constants.ts:17` | 注释中的前缀说明 |
| `src/api-key/api-key.service.ts:43` | 注释中的格式说明 |
| `src/common/interceptors/response.interceptor.ts` | 注释中的 `@memai/shared-types` |
| `.env.example:2` | 注释 `# Memai SaaS Platform` |
| `.env.example:6` | 数据库名 `memai` → `memai` |
| `.env.example:19` | `BETTER_AUTH_URL` → `server.memai.dev` |
| `.env.example:22` | `ALLOWED_ORIGINS` 中所有域名 |
| `.env.example:25` | `TRUSTED_ORIGINS` 中所有域名 |
| `.env.example:33` | `SERVER_URL` → `server.memai.dev` |
| `.env.example:38` | `EMAIL_FROM` → `Memai <noreply@memai.dev>` |
| `prisma/schema.prisma:188` | 注释中的前缀示例 |

---

## 6. apps/admin

| 文件 | 修改内容 |
|------|----------|
| `package.json` | `"name": "@memai/admin"` → `"name": "@memai/admin"` |
| `package.json` | 依赖 `@memai/shared-types` → `@memai/shared-types` |
| `package.json` | 依赖 `@memai/ui` → `@memai/ui` |
| `index.html:7` | `<title>Memai Admin</title>` → `<title>Memai Admin</title>` |
| `src/index.css` | `@import "@memai/ui/styles"` |
| `src/lib/api-client.ts` | `@memai/shared-types` 导入 |
| `src/components/layout/main-layout.tsx` | `@memai/ui/lib` 导入 |
| `src/pages/*.tsx` | 所有 `@memai/ui` 相关导入（约 6 个文件） |

---

## 7. apps/console

| 文件 | 修改内容 |
|------|----------|
| `package.json` | `"name": "@memai/console"` |
| `package.json` | 依赖 `@memai/shared-types`、`@memai/ui` |
| `index.html:7` | `<title>Memai Console</title>` |
| `.env.development:4` | 注释中的 `api.memai.dev` |
| `src/lib/api-client.ts` | `@memai/shared-types` 导入 |
| `src/lib/api-paths.ts:2` | 注释 `Memai API 路径常量` |
| `src/pages/DashboardPage.tsx:2` | 注释 `Memai Dashboard 页面` |
| `src/pages/DashboardPage.tsx:61` | `Welcome to Memai Semantic Memory API` |
| `src/pages/DashboardPage.tsx:228` | `Get started with Memai API` |
| `src/pages/DashboardPage.tsx:256` | `server.memai.dev` API 示例 |
| `src/pages/DashboardPage.tsx:257` | `mm_your_api_key` 示例 |
| `src/pages/DashboardPage.tsx:274` | `docs.memai.dev` 链接 |
| `src/pages/*.tsx` | 所有 `@memai/ui` 相关导入（约 10 个文件） |
| `src/components/**/*.tsx` | 所有 `@memai/ui` 相关导入 |
| `src/components/layout/main-layout.tsx:35` | 品牌名 `Memai` |
| `src/features/**/*.tsx` | 所有 `@memai/ui` 相关导入 |
| `src/features/api-keys/storage.ts:6` | `memai_api_keys` localStorage key |

---

## 8. apps/docs

### 配置和路由文件

| 文件 | 修改内容 |
|------|----------|
| `package.json` | `"name": "@memai/docs"` |
| `package.json` | 依赖 `@memai/ui` |
| `vite.config.ts:19` | `docs.memai.dev` |
| `src/styles/app.css:14` | 注释 `/* Memai OKLCH color system */` |
| `src/lib/i18n/en.ts:16` | `siteTitle: 'Memai - Memory as a Service for AI'` |
| `src/lib/layout.shared.tsx:10` | `title: 'Memai'` |
| `src/lib/layout.shared.tsx:15` | `console.memai.dev` |
| `src/lib/layout.shared.tsx:24` | `status.memai.dev` |
| `src/lib/layout.shared.tsx:29` | `github.com/memai` |
| `src/routes/__root.tsx:26` | `title: 'Memai Documentation'` |
| `src/routes/__root.tsx:36,53,62` | 多处 `Memai` 品牌名 |
| `src/routes/__root.tsx:49,91,96,101` | `docs.memai.dev` |
| `src/routes/index.tsx:6` | `title: 'Memai - Memory as a Service for AI'` |
| `src/routes/index.tsx:23` | 品牌名 `Memai` |
| `src/routes/index.tsx:43` | `console.memai.dev` |
| `src/routes/index.tsx:88-89` | `api.memai.dev` 和 `mm_your_api_key` |
| `src/routes/index.tsx:131` | 版权 `© Memai` |
| `src/routes/$lang/index.tsx:9` | 标题 `Memai - ...` |
| `src/routes/$lang/index.tsx:77` | 品牌名 `Memai` |
| `src/routes/$lang/index.tsx:102` | `console.memai.dev` |
| `src/routes/$lang/index.tsx:144-145` | `api.memai.dev` 和 `mm_your_api_key` |
| `src/routes/$lang/index.tsx:179` | 版权 `© Memai` |
| `src/routes/docs/$.tsx:17,23` | 页面标题 `Memai Docs` |
| `src/routes/$lang/docs/$.tsx:17,23` | 页面标题 `Memai Docs` |

### 文档内容文件 (content/docs/)

| 文件 | 修改内容 |
|------|----------|
| `index.mdx` | 品牌名、API URL、`What is Memai?` 标题 |
| `index.zh.mdx` | 品牌名、API URL、`什么是 Memai？` 标题 |
| `getting-started/index.mdx` | `console.memai.dev`、`api.memai.dev`、`support@memai.dev`、品牌名 |
| `getting-started/index.zh.mdx` | 同上中文版 |
| `getting-started/quickstart.mdx` | `console.memai.dev`、所有 API URL、`mm_` 前缀说明 |
| `getting-started/quickstart.zh.mdx` | 同上中文版 |
| `getting-started/authentication.mdx` | `Memai Console`、`Memai API`、`mm_` 前缀、`MEMOKIT_API_KEY` 环境变量 |
| `getting-started/authentication.zh.mdx` | 同上中文版 |
| `api-reference/index.mdx` | `api.memai.dev` 基础 URL、`mm_your_api_key` |
| `api-reference/index.zh.mdx` | 同上中文版 |
| `api-reference/memories.mdx` | 所有 API URL 和 `mm_your_api_key` |
| `api-reference/memories.zh.mdx` | 同上中文版 |
| `api-reference/entities.mdx` | 所有 API URL 和 `mm_your_api_key` |
| `api-reference/entities.zh.mdx` | 同上中文版 |
| `api-reference/relations.mdx` | 所有 API URL 和 `mm_your_api_key` |
| `api-reference/relations.zh.mdx` | 同上中文版 |
| `api-reference/webhooks.mdx` | Webhook 路径 `/webhooks/memai`、`x-memai-signature`、`X-Memai-Signature` |
| `api-reference/webhooks.zh.mdx` | 同上中文版 |
| `guides/index.mdx` | `support@memai.dev`、品牌名 |
| `guides/index.zh.mdx` | 同上中文版 |
| `guides/rate-limits.mdx` | API URL、`Memai Console`、`sales@memai.dev` |
| `guides/rate-limits.zh.mdx` | 同上中文版 |
| `guides/best-practices.mdx` | `memaiClient` 变量名、`api.memai.dev`、`mm_exposed_key` |
| `guides/best-practices.zh.mdx` | 同上中文版 |

---

## 9. apps/www

| 文件 | 修改内容 |
|------|----------|
| `package.json` | `"name": "@memai/www"` |
| `package.json` | 依赖 `@memai/ui` |
| `vite.config.ts:18` | `memai.dev` |
| `.env.example:2` | `server.memai.dev` |
| `src/lib/env.ts:12` | `server.memai.dev` 默认值 |
| `src/styles/globals.css` | `@import "@memai/ui/styles"` |
| `src/routes/__root.tsx:32` | 页面标题 `memai - Semantic Memory API` |
| `src/routes/__root.tsx:38,44,45,55,63` | 多处品牌名和 `memai.dev` |
| `src/components/layout/Header.tsx:6` | `docs.memai.dev` |
| `src/components/layout/Header.tsx:19` | 品牌名 `memai` |
| `src/components/layout/Header.tsx:49` | `github.com/dvlin-dev/memai` |
| `src/components/layout/Header.tsx:56` | `console.memai.dev` |
| `src/components/layout/Footer.tsx:5,8,16-18` | 多处 `memai.dev` 子域名 |
| `src/components/layout/Footer.tsx:31` | 品牌名 `memai` |
| `src/components/layout/Footer.tsx:99` | 版权 `© memai` |
| `src/components/layout/Footer.tsx:103` | `twitter.com/memai` |
| `src/components/layout/Footer.tsx:111` | `github.com/dvlin-dev/memai` |
| `src/components/layout/Container.tsx` | `@memai/ui/lib` 导入 |
| `src/components/playground/*.tsx` | `@memai/ui` 导入 |
| `src/components/landing/HeroSection.tsx:34,40,50` | `console.memai.dev`、`docs.memai.dev`、GitHub 链接 |
| `src/components/landing/PricingSection.tsx:21,38` | `console.memai.dev` 注册链接 |
| `src/components/landing/CTASection.tsx:17,23` | `console.memai.dev`、`docs.memai.dev` |
| `src/components/landing/CodeExampleSection.tsx:10,20` | `server.memai.dev` API 示例 |
| `src/components/landing/CodeExampleSection.tsx:23,25` | `@memai/sdk`、`Memai` 类名 |
| `src/components/landing/CodeExampleSection.tsx:78` | GitHub issue 链接 |

---

## 10. 项目文档 (docs/)

| 文件 | 修改内容 |
|------|----------|
| `AGENTS.md:1,7` | 标题 `# Memai`、描述 |
| `CONSOLE_REFACTOR_PLAN.md:22,47,48,49` | 品牌一致性、域名迁移记录 |
| `FUMADOCS_IMPLEMENTATION_PLAN.md:17,64,67,70,84` | `@memai/ui`、`@memai/docs` |
| `docs-refactor-plan.md:1,4,12,15,58,223,225,229,230,243,261,268,277,283` | 多处 `Memai` 和 `memai.dev` |
| `UNIFIED_RESPONSE_MIGRATION.md:480` | `@memai/shared-types` 导入示例 |
| `TEST_SPEC.md:317,481,496` | `mm_test` 前缀示例 |
| `features/oembed-api-design.md:409,433` | `mm_your_api_key` 示例 |
| `REFACTOR_PLAN.md:117,613,1153` | 前缀、GitHub 链接 |

---

## 11. 根目录 AGENTS.md

| 行号 | 修改内容 |
|------|----------|
| 1 | `# Memai` → `# Memai` |
| 337 | `API Key Prefix | mm_ | mm_abc123...` |

---

## 12. GitHub 仓库相关

| 项目 | 修改内容 |
|------|----------|
| 仓库名称 | `dvlin-dev/memai` → `dvlin-dev/memai` |
| 代码中所有 GitHub 链接 | 5+ 处引用 |

---

## 13. 社交媒体链接

| 平台 | 旧值 | 新值 |
|------|------|------|
| Twitter | `twitter.com/memai` | `twitter.com/memai` |
| GitHub | `github.com/memai` | `github.com/memai` (组织) |
| GitHub 仓库 | `github.com/dvlin-dev/memai` | `github.com/dvlin-dev/memai` |

---

## 14. 生成文件（自动重新生成，无需手动修改）

- `apps/docs/.content-collections/cache/**`
- `apps/docs/.content-collections/generated/**`
- `pnpm-lock.yaml`
- `apps/server/generated/**`

---

## 修改统计

| 类别 | 文件数量 | 主要修改类型 |
|------|----------|-------------|
| 根目录配置 | ~7 | package.json、tsconfig、Docker、AGENTS.md |
| packages/ | ~4 | package.json、注释 |
| apps/server | ~8 | 环境变量、包名、常量、Swagger |
| apps/admin | ~10 | 导入路径、包名、HTML title |
| apps/console | ~25 | 导入路径、API URL、品牌名、localStorage |
| apps/docs | ~35 | 导入路径、内容 URL、品牌名、i18n |
| apps/www | ~20 | 导入路径、品牌名、URL、社交链接 |
| docs/ | ~10 | 历史文档更新 |

**预估总计：约 120+ 处修改**

---

## 执行步骤

### 第一阶段：核心包重命名

```bash
# 1. 修改 packages/ 下的 package.json
# 2. 修改 tsconfig.base.json 路径别名
# 3. 修改根目录 package.json
```

### 第二阶段：应用层修改

```bash
# 1. 修改各 apps/ 下的 package.json
# 2. 批量替换：
sed -i '' 's/@memai\//@memai\//g' **/*.ts **/*.tsx **/*.json **/*.css
# 3. 执行 pnpm install 更新依赖锁
```

### 第三阶段：URL 和品牌名更新

```bash
# 批量替换域名
sed -i '' 's/memai\.dev/memai.dev/g' **/*

# 批量替换品牌名（区分大小写）
sed -i '' 's/Memai/Memai/g' **/*
sed -i '' 's/memai/memai/g' **/*

# 更新 Header
sed -i '' 's/x-memai-signature/x-memai-signature/g' **/*
sed -i '' 's/X-Memai-Signature/X-Memai-Signature/g' **/*
```

### 第四阶段：API Key 前缀（可选）

```bash
# 如果决定更改 API Key 前缀
sed -i '' "s/mm_/mm_/g" **/*
sed -i '' 's/API_KEY_PREFIX = .mm_./API_KEY_PREFIX = "mm_"/g' **/*
```

### 第五阶段：环境变量

```bash
# 更新环境变量名
sed -i '' 's/MEMOKIT_/MEMAI_/g' **/*
```

### 第六阶段：验证

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
```

---

## 决策点

在执行前需要确认以下决策：

1. **API Key 前缀**: 是否从 `mm_` 改为 `mm_`？
   - 改：需要更新服务端常量和所有文档
   - 不改：保持 `mm_` 前缀

2. **GitHub 仓库名**: 是否重命名仓库？
   - 改：需要更新所有代码中的链接
   - 不改：保持 `dvlin-dev/memai`

3. **数据库名**: 生产环境数据库名是否更改？
   - 仅更新 `.env.example` 即可，实际数据库名由环境变量控制
