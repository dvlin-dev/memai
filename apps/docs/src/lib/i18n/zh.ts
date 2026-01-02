import type { TranslationKeys } from './en'

/** Chinese translations */
export const zh: Record<TranslationKeys, string> = {
  // Fumadocs UI (required fields)
  search: '搜索文档...',
  searchNoResult: '未找到结果',
  toc: '本页目录',
  tocNoHeadings: '无标题',
  lastUpdate: '最后更新',
  chooseTheme: '选择主题',
  nextPage: '下一页',
  previousPage: '上一页',
  chooseLanguage: '切换语言',
  editOnGithub: '在 GitHub 上编辑',

  // Site meta
  siteTitle: 'Memokit - AI 应用的记忆即服务',
  siteDescription: '为您的 AI 应用构建持久记忆层。通过简单的 REST API 存储、搜索和管理记忆。',

  // Navigation
  navDocs: '文档',
  navConsole: '控制台',
  navApiReference: 'API 参考',
  navStatus: '状态',

  // Home page - Hero
  heroTitle1: '记忆即服务',
  heroTitle2: '为 AI 应用构建',
  heroDescription: '为您的 AI 应用构建持久记忆层。通过简单的 REST API 存储、搜索和管理记忆。',
  getStarted: '快速开始',
  viewApi: '查看 API',

  // Home page - Sidebar
  sidebarBanner: 'AI 记忆 API',

  // Home page - Features
  featureSemanticTitle: '语义搜索',
  featureSemanticDesc: '使用向量嵌入技术，通过自然语言查询找到相关记忆。',
  featureKnowledgeTitle: '知识图谱',
  featureKnowledgeDesc: '自动提取实体和关系，构建互联的知识库。',
  featureMultiTenantTitle: '多租户支持',
  featureMultiTenantDesc: '通过内置的作用域和访问控制，按用户、会话或代理隔离记忆。',
  featureWebhooksTitle: '实时 Webhooks',
  featureWebhooksDesc: '当记忆被创建、更新或删除时立即获得通知。',

  // Footer
  footerCopyright: '保留所有权利。',
}
