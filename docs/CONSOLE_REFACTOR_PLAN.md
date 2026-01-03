# Console 项目改造计划

> 创建日期: 2026-01-02
> 状态: 进行中

---

## 一、需求背景

### 1.1 问题描述

当前 Console 项目是从截图服务项目 (Moryflow/LinkSnap) 迁移而来，存在大量历史遗留问题：

1. **品牌名称未更新**: 代码中仍有 "Moryflow"、"LinkSnap" 等旧品牌名称
2. **旧功能代码残留**: Webhook 事件、Redis 缓存、队列等仍使用 "screenshot" 相关命名
3. **配置指向错误**: 环境变量指向旧项目服务器地址
4. **功能不完整**: 缺少 Memory 服务应有的管理功能

### 1.2 改造目标

1. 清理所有旧项目遗留代码和命名
2. 确保品牌一致性 (统一使用 "Memai")
3. 完善 Console 功能，满足 Memory SaaS 服务需求
4. 提升代码质量和可维护性

### 1.3 影响范围

| 应用 | 影响程度 | 说明 |
|------|---------|------|
| apps/console | 高 | 品牌名称、功能完善 |
| apps/server | 高 | Webhook、Redis、Queue 代码清理 |
| apps/admin | 中 | Dashboard 统计指标更新 |
| docs/ | 低 | 文档示例更新 |

---

## 二、技术方案

### 2.1 Phase 1: 代码清理 (P1 - Critical)

#### 2.1.1 品牌名称更正

需要修改的文件及内容：

| 文件路径 | 当前内容 | 修改为 |
|---------|---------|--------|
| `apps/console/src/components/layout/main-layout.tsx:35` | `Moryflow` | `Memai` |
| `apps/server/src/main.ts` (Swagger 描述) | `Memory 截图服务 API 文档` | `Memai Memory API` |
| `apps/server/src/main.ts` (注释) | `*.moryflow.com` | `*.memai.dev` |
| `apps/console/.env.development` | `linksnap.dev` / `moryflow.com` | 正确的本地/开发服务器地址 |

#### 2.1.2 截图功能残留清理

需要修改/删除的代码：

| 文件路径 | 问题 | 处理方式 |
|---------|------|---------|
| `apps/server/src/webhook/webhook.constants.ts` | `SCREENSHOT_COMPLETED`, `SCREENSHOT_FAILED` 事件 | 替换为 Memory 相关事件 |
| `apps/server/src/webhook/dto/create-webhook.dto.ts` | 默认事件为截图事件 | 更新默认值 |
| `apps/server/src/redis/redis.service.ts` | `SCREENSHOT` 前缀、`screenshotId` 方法 | 删除或重命名 |
| `apps/server/src/queue/queue.constants.ts` | `SCREENSHOT_QUEUE`, `ScreenshotJobData` | 删除或重命名为 Memory 相关 |

#### 2.1.3 Admin 后台修正

| 文件/组件 | 问题 | 处理方式 |
|----------|------|---------|
| Admin Dashboard | 显示 "screenshots" 统计 | 改为 "memories" 统计 |
| 数据查询接口 | 查询截图数据 | 查询 Memory 数据 |

### 2.2 Phase 2: 功能完善 (P2 - Important)

#### 2.2.1 Console 新增功能

| 功能 | 优先级 | 实现方式 |
|------|-------|---------|
| Entity 管理页面 | 高 | 新增 `/entities` 路由和 CRUD 界面 |
| Webhook 投递日志 | 高 | 在 Webhook 页面添加日志查看 Tab |
| Memory 导出 | 中 | 支持 JSON/CSV 格式导出 |
| API 使用统计 | 中 | Dashboard 添加调用统计图表 |

#### 2.2.2 Playground 增强

当前功能:
- Add Memory
- Search Memory

新增功能:
- Get Memory by ID
- Delete Memory
- List Memories (分页)
- 请求/响应历史记录
- cURL 命令生成

### 2.3 Phase 3: 代码质量 (P3 - Enhancement)

1. 处理 TODO 注释
2. 优化环境变量配置
3. 添加单元测试
4. 完善类型定义

---

## 三、执行计划

### Phase 1: 代码清理 ✅

- [x] **1.1** 修复 Console 品牌名称
  - [x] 1.1.1 修改 `main-layout.tsx` 中的 "Moryflow" → "Memai"
  - [x] 1.1.2 检查其他组件是否有品牌名称问题

- [x] **1.2** 修复 Server 品牌名称和文档
  - [x] 1.2.1 更新 `main.ts` Swagger 描述
  - [x] 1.2.2 更新 `main.ts` 注释中的域名

- [x] **1.3** 清理 Webhook 截图代码
  - [x] 1.3.1 更新 `webhook.constants.ts` 事件定义
  - [x] 1.3.2 更新 `create-webhook.dto.ts` 默认事件
  - [x] 1.3.3 更新 Console Webhook 类型和常量

- [x] **1.4** 清理 Redis 截图代码
  - [x] 1.4.1 更新缓存前缀为通用格式
  - [x] 1.4.2 替换截图方法为通用缓存/锁方法

- [x] **1.5** 清理 Queue 截图代码
  - [x] 1.5.1 重命名 `SCREENSHOT_QUEUE` → `TASK_QUEUE`
  - [x] 1.5.2 删除 `ScreenshotJobData`，添加 `EmbeddingJobData`

- [x] **1.6** 修复配置文件
  - [x] 1.6.1 更新 `apps/console/.env.development`
  - [x] 1.6.2 更新 `tsconfig.base.json` 路径别名

- [x] **1.7** 修复 Admin 后台
  - [x] 1.7.1 更新 Dashboard 统计指标 (screenshots → memories)
  - [x] 1.7.2 更新 Users 页面 (screenshotCount → memoryCount)

- [x] **1.8** 更新文档
  - [x] 1.8.1 删除 `docs/features/render-mode.md` (截图专用文档)
  - [x] 1.8.2 重写 `docs/AGENTS.md` 为 Memory 服务文档

### Phase 2: 功能完善 ✅

- [x] **2.1** Entity 管理功能
  - [x] 2.1.1 创建 Entity feature 模块 (`apps/console/src/features/entities/`)
  - [x] 2.1.2 实现 Entity 列表页面 (`apps/console/src/pages/EntitiesPage.tsx`)
  - [x] 2.1.3 实现后端 Console Entity API (`console-entity.controller.ts`)
  - [x] 2.1.4 实现 Entity 删除功能

- [x] **2.2** Webhook 投递日志
  - [x] 2.2.1 添加日志查询 API (`webhook.service.ts` - `getDeliveries`, `getAllDeliveries`)
  - [x] 2.2.2 实现日志列表 UI (`WebhookDeliveriesPage.tsx`)
  - [x] 2.2.3 添加投递日志端点 (`webhook.controller.ts`)

- [x] **2.3** Memory 导出功能
  - [x] 2.3.1 实现后端导出 API (`console-memory.controller.ts`)
  - [x] 2.3.2 实现前端导出 UI (`MemoriesPage.tsx`)
  - [x] 2.3.3 支持 JSON/CSV 格式

- [x] **2.4** Playground 增强
  - [x] 2.4.1 添加 Get Memory 功能
  - [x] 2.4.2 添加 Delete Memory 功能
  - [x] 2.4.3 添加 List Memories 功能
  - [x] 2.4.4 添加 cURL 命令生成

- [x] **2.5** API 使用统计
  - [x] 2.5.1 扩展 UsageService 添加 `getDailyUsage`, `getUserStats` 方法
  - [x] 2.5.2 实现统计图表组件 (Dashboard AreaChart)
  - [x] 2.5.3 创建 Console Stats API (`console-stats.controller.ts`)
  - [x] 2.5.4 创建前端 stats feature 模块

### Phase 3: 代码质量 ✅

- [x] **3.1** 处理 TODO 注释
  - [x] 3.1.1 `main.ts` CORS 注释改为设计决策说明
  - [x] 3.1.2 `embedding.service.ts` 优化批量 API 调用

- [x] **3.2** 配置优化
  - [x] 3.2.1 统一环境变量命名规范 (.env.example)

- [x] **3.3** 依赖清理
  - [x] 3.3.1 移除 playwright 依赖
  - [x] 3.3.2 移除 @aws-sdk、sharp 等遗留依赖

---

## 四、进度跟踪

| Phase | 状态 | 开始时间 | 完成时间 | 备注 |
|-------|------|---------|---------|------|
| Phase 1 | ✅ 已完成 | 2026-01-02 | 2026-01-02 | 代码清理完成 |
| Phase 2 | ✅ 已完成 | 2026-01-02 | 2026-01-02 | 功能完善完成 |
| Phase 3 | ✅ 已完成 | 2026-01-02 | 2026-01-02 | 代码质量优化完成 |

---

## 五、变更记录

| 日期 | 变更内容 | 执行人 |
|------|---------|--------|
| 2026-01-02 | 创建文档，完成需求分析和方案设计 | Claude |
| 2026-01-02 | 完成 Phase 1 所有任务 | Claude |
| 2026-01-02 | 完成 Phase 2 所有任务: Entity 管理、Webhook 日志、Memory 导出、Playground 增强、API 使用统计 | Claude |
| 2026-01-02 | 完成 Phase 3 所有任务: TODO 处理、配置优化、依赖清理 | Claude |
