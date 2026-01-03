# Memai 文档系统改造计划

> 参考项目：LinkSnap Docs (`/Users/bowling/code/me/linksnap.dev/apps/docs`)
> 当前项目：Memai Docs (`/Users/bowling/conductor/workspaces/memai/pattaya/apps/docs`)

---

## 一、项目对比分析

### 1.1 技术栈对比

| 特性 | 参考项目 (LinkSnap) | 当前项目 (Memai) | 差异 |
|------|---------------------|-------------------|------|
| 全栈框架 | TanStack Start ^1.144.0 | TanStack Start ^1.145.3 | ✅ 相近 |
| 文档引擎 | fumadocs-ui/core ^15.2.10 | fumadocs-ui/core ^16.4.2 | ✅ Memai 更新 |
| 内容管理 | Content Collections | fumadocs-mdx | ⚠️ 方案不同 |
| React | ^19.0.0 | ^19.2.0 | ✅ 相近 |
| Tailwind | v4.0.0 | v4.1.17 | ✅ 相近 |
| 部署 | Cloudflare (TanStack Start) | Cloudflare Workers | ✅ 相同 |

### 1.2 功能对比

| 功能 | 参考项目 | 当前项目 | 状态 |
|------|---------|---------|------|
| **国际化 (i18n)** | ✅ 完整双语 (en/zh) | ❌ 仅英文 | 🔴 缺失 |
| **自定义首页** | ✅ Hero + 功能卡片 | ❌ 重定向到 /docs | 🔴 缺失 |
| **语言切换器** | ✅ 有 | ❌ 无 | 🔴 缺失 |
| **SEO hreflang** | ✅ 完整 | ❌ 无 | 🔴 缺失 |
| **导航栏链接** | ✅ Console/API/Status/GitHub | ⚠️ 仅 Documentation | 🟡 不完整 |
| **MDX 组件集** | ✅ TypeTable/Accordion/File Tree/Tabs/Steps | ⚠️ 默认组件 | 🟡 可增强 |
| **主题系统** | ✅ Boxy Sharp 风格 | ✅ 类似风格 | ✅ 相近 |
| **搜索功能** | ✅ 内置 | ✅ 内置 | ✅ 相同 |
| **暗黑模式** | ✅ 有 | ✅ 有 | ✅ 相同 |
| **Sitemap** | ✅ 自动生成 | ⚠️ 未配置 | 🟡 需添加 |

### 1.3 目录结构对比

**参考项目 (LinkSnap):**
```
src/routes/
├── __root.tsx              # 完整 SEO + i18n Provider
├── index.tsx               # 英文首页 (Hero)
├── $lang/
│   ├── index.tsx           # 多语言首页
│   └── docs/
│       └── $.tsx           # 多语言文档
└── docs/
    └── $.tsx               # 英文文档

content/docs/
├── index.mdx / index.zh.mdx      # 双语文件配对
├── meta.json / meta.zh.json      # 双语导航
└── guides/
    ├── *.mdx / *.zh.mdx
    └── meta.json / meta.zh.json
```

**当前项目 (Memai):**
```
src/routes/
├── __root.tsx              # 基础布局
├── index.tsx               # 简单重定向到 /docs
└── docs/
    └── $.tsx               # 单语言文档

content/docs/
├── index.mdx               # 仅英文
├── meta.json               # 仅英文导航
└── 各子目录/
    └── *.mdx               # 仅英文
```

---

## 二、改造优先级分析

### 🔴 高优先级 (P0) - 核心体验缺失

1. **国际化支持 (i18n)**
   - 当前：仅英文
   - 目标：支持 en/zh 双语
   - 影响：中文用户体验、SEO

2. **自定义首页**
   - 当前：重定向到 /docs
   - 目标：Hero + 功能介绍 + CTA
   - 影响：品牌展示、用户引导

3. **完整 SEO 配置**
   - 当前：基础配置
   - 目标：hreflang、Open Graph、Twitter Card
   - 影响：搜索引擎收录、社交分享

### 🟡 中优先级 (P1) - 增强体验

4. **导航栏完善**
   - 当前：仅 Documentation 链接
   - 目标：Console、API、Status、GitHub 等外部链接

5. **MDX 组件增强**
   - 当前：默认组件
   - 目标：TypeTable、Accordion、File Tree、Tabs、Steps

6. **Sitemap 配置**
   - 当前：未配置
   - 目标：自动生成 sitemap.xml

### 🟢 低优先级 (P2) - 锦上添花

7. **代码示例优化**
   - 多语言代码示例 (curl/JavaScript/Python)

8. **API Playground**
   - 交互式 API 测试

---

## 三、详细改造计划

### Phase 1: 国际化基础设施 (P0)

#### 1.1 创建 i18n 配置

**新建文件: `src/lib/i18n.ts`**
```typescript
import { defineI18n } from 'fumadocs-ui/i18n'

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'zh'],
  hideLocale: 'default-locale', // 英文路径隐藏 /en 前缀
})
```

#### 1.2 修改文档源配置

**修改: `src/lib/source.ts`**
```typescript
import { docs } from 'fumadocs-mdx:collections'
import { loader } from 'fumadocs-core/source'
import { i18n } from './i18n'

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  i18n, // 添加国际化配置
})
```

#### 1.3 添加多语言路由

**新建: `src/routes/$lang/index.tsx`** - 多语言首页
**新建: `src/routes/$lang/docs/$.tsx`** - 多语言文档页

#### 1.4 创建双语文档文件

为每个现有 `.mdx` 文件创建 `.zh.mdx` 对应版本：
- `index.mdx` → 添加 `index.zh.mdx`
- `getting-started/quickstart.mdx` → 添加 `getting-started/quickstart.zh.mdx`
- 等等...

同时为每个 `meta.json` 创建 `meta.zh.json`。

---

### Phase 2: 首页重构 (P0)

#### 2.1 设计首页结构

**新建/重构: `src/routes/index.tsx`**

```typescript
功能组件:
├── Header (导航栏)
│   ├── Logo
│   ├── Navigation Links (Docs, API, Status)
│   ├── Language Switcher
│   └── Theme Toggle
├── Hero Section
│   ├── 标题: "Memory as a Service"
│   ├── 副标题: "为 AI 应用构建持久记忆层"
│   └── CTA Buttons: [Get Started, View API]
├── Features Section
│   ├── 语义搜索
│   ├── 知识图谱
│   ├── 多租户
│   └── 实时 Webhooks
├── Code Example Section
│   └── curl 示例 + 响应
└── Footer
```

#### 2.2 首页组件文件

```
src/
├── components/
│   └── home/
│       ├── hero.tsx
│       ├── features.tsx
│       ├── code-example.tsx
│       └── footer.tsx
```

---

### Phase 3: SEO 优化 (P0)

#### 3.1 完善根布局 SEO

**修改: `src/routes/__root.tsx`**

添加内容：
- Open Graph 标签
- Twitter Card 标签
- hreflang 标签 (多语言)
- Canonical URL
- 站点验证标签

```typescript
// 元标签配置示例
<Meta>
  <title>Memai - Memory as a Service for AI</title>
  <meta name="description" content="..." />
  <meta property="og:title" content="Memai Docs" />
  <meta property="og:description" content="..." />
  <meta property="og:image" content="/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="alternate" hrefLang="en" href="https://docs.memai.dev/docs" />
  <link rel="alternate" hrefLang="zh" href="https://docs.memai.dev/zh/docs" />
</Meta>
```

#### 3.2 Sitemap 配置

**修改: `vite.config.ts`**

```typescript
tanstackStart({
  prerender: { enabled: true, crawlLinks: true },
  sitemap: {
    enabled: true,
    host: 'https://docs.memai.dev'
  },
})
```

---

### Phase 4: 导航栏增强 (P1)

#### 4.1 修改布局配置

**修改: `src/lib/layout.shared.tsx`**

```typescript
export function baseOptions(locale?: string): BaseLayoutProps {
  return {
    i18n,
    nav: {
      title: 'Memai',
      // 添加 Logo 组件
    },
    links: [
      { text: 'Documentation', url: '/docs', active: 'nested-url' },
      {
        text: 'Console',
        url: 'https://console.memai.dev',
        external: true
      },
      {
        text: 'API Reference',
        url: '/docs/api-reference'
      },
      {
        text: 'Status',
        url: 'https://status.memai.dev',
        external: true
      },
      {
        icon: <GithubIcon />,
        text: 'GitHub',
        url: 'https://github.com/memai',
        external: true
      },
    ],
  }
}
```

---

### Phase 5: MDX 组件增强 (P1)

#### 5.1 创建/更新 MDX 组件配置

**新建: `src/mdx-components.tsx`**

```typescript
import defaultMdxComponents from 'fumadocs-ui/mdx'
import {
  Accordion,
  Accordions,
} from 'fumadocs-ui/components/accordion'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import { File, Files, Folder } from 'fumadocs-ui/components/files'
import { TypeTable } from 'fumadocs-ui/components/type-table'

export function useMDXComponents() {
  return {
    ...defaultMdxComponents,
    Accordion,
    Accordions,
    Tab,
    Tabs,
    Step,
    Steps,
    File,
    Files,
    Folder,
    TypeTable,
  }
}
```

#### 5.2 在文档中使用新组件

示例：API 参数表格
```mdx
<TypeTable
  type={{
    content: { description: 'Memory content', type: 'string', required: true },
    metadata: { description: 'Additional metadata', type: 'object' },
    tags: { description: 'Tags for categorization', type: 'string[]' },
  }}
/>
```

示例：多语言代码示例
```mdx
<Tabs items={['cURL', 'JavaScript', 'Python']}>
  <Tab value="cURL">
    ```bash
    curl -X POST ...
    ```
  </Tab>
  <Tab value="JavaScript">
    ```javascript
    fetch(...)
    ```
  </Tab>
  <Tab value="Python">
    ```python
    requests.post(...)
    ```
  </Tab>
</Tabs>
```

---

### Phase 6: 中文文档翻译 (P1)

#### 6.1 翻译优先级

1. **首页内容** - Hero、Features 描述
2. **Getting Started** - 快速开始指南
3. **API Reference** - API 文档概述
4. **Guides** - 最佳实践、速率限制

#### 6.2 UI 翻译字典

**在 `__root.tsx` 中添加:**

```typescript
const translations = {
  en: {
    search: 'Search',
    searchNoResult: 'No results found',
    toc: 'On this page',
    lastUpdate: 'Last updated',
    chooseTheme: 'Choose theme',
    nextPage: 'Next',
    previousPage: 'Previous',
    chooseLanguage: 'Change language',
  },
  zh: {
    search: '搜索文档...',
    searchNoResult: '未找到结果',
    toc: '本页目录',
    lastUpdate: '最后更新',
    chooseTheme: '选择主题',
    nextPage: '下一页',
    previousPage: '上一页',
    chooseLanguage: '切换语言',
  },
}
```

---

## 四、文件变更清单

### 新建文件

| 文件路径 | 说明 |
|---------|------|
| `src/lib/i18n.ts` | 国际化配置 |
| `src/routes/$lang/index.tsx` | 多语言首页 |
| `src/routes/$lang/docs/$.tsx` | 多语言文档页 |
| `src/mdx-components.tsx` | MDX 组件配置 |
| `src/components/home/hero.tsx` | 首页 Hero 组件 |
| `src/components/home/features.tsx` | 首页功能组件 |
| `content/docs/**/*.zh.mdx` | 所有中文文档 |
| `content/docs/**/meta.zh.json` | 所有中文导航配置 |

### 修改文件

| 文件路径 | 说明 |
|---------|------|
| `src/routes/__root.tsx` | 添加 SEO、i18n Provider |
| `src/routes/index.tsx` | 重构为自定义首页 |
| `src/routes/docs/$.tsx` | 添加 MDX 组件、优化 |
| `src/lib/source.ts` | 添加 i18n 配置 |
| `src/lib/layout.shared.tsx` | 添加导航链接 |
| `vite.config.ts` | 添加 sitemap 配置 |

---

## 五、实施时间线建议

| Phase | 内容 | 预计工作量 |
|-------|------|-----------|
| Phase 1 | 国际化基础设施 | 中 |
| Phase 2 | 首页重构 | 中 |
| Phase 3 | SEO 优化 | 小 |
| Phase 4 | 导航栏增强 | 小 |
| Phase 5 | MDX 组件增强 | 小 |
| Phase 6 | 中文文档翻译 | 大 |

---

## 六、风险与注意事项

1. **Content Collections vs fumadocs-mdx**
   - 参考项目使用 Content Collections
   - 当前项目使用 fumadocs-mdx
   - 建议：保持 fumadocs-mdx，它是官方推荐方案且更新

2. **路由兼容性**
   - 添加多语言路由后需确保原有 `/docs/*` 路径仍然工作
   - 使用 `hideLocale: 'default-locale'` 保持英文路径不变

3. **部署验证**
   - 每个 Phase 完成后需验证 Cloudflare Workers 部署
   - 确保 SSG 预渲染正常工作

4. **翻译质量**
   - 中文翻译需要人工审核
   - 技术术语保持一致性

---

## 七、验收标准

- [ ] 访问 `/` 显示自定义首页
- [ ] 访问 `/docs` 显示英文文档
- [ ] 访问 `/zh/docs` 显示中文文档
- [ ] 语言切换器正常工作
- [ ] 导航栏显示所有链接
- [ ] SEO 元标签完整
- [ ] Sitemap 自动生成
- [ ] MDX 组件 (Tabs/Steps/TypeTable) 正常渲染
- [ ] Cloudflare Workers 部署成功
- [ ] 所有页面预渲染正常
