/**
 * External API Mocks
 * 模拟外部 API 服务（Creem 支付、LLM 等）
 */
import { vi } from 'vitest';
import { createId } from '@paralleldrive/cuid2';

// ========================================
// Creem Payment Mock
// ========================================

export interface CreemCustomer {
  id: string;
  email: string;
  name: string;
}

export interface CreemSubscription {
  id: string;
  customerId: string;
  status: 'active' | 'canceled' | 'past_due' | 'expired';
  productId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface CreemCheckoutSession {
  id: string;
  url: string;
  customerId: string;
  status: 'open' | 'complete' | 'expired';
}

export function createCreemMock() {
  const mock = {
    // 客户管理
    createCustomer: vi.fn(
      async (data: { email: string; name?: string }): Promise<CreemCustomer> => ({
        id: `cus_${createId()}`,
        email: data.email,
        name: data.name ?? '',
      }),
    ),

    getCustomer: vi.fn(async (customerId: string): Promise<CreemCustomer | null> => ({
      id: customerId,
      email: 'test@example.com',
      name: 'Test User',
    })),

    // 订阅管理
    createSubscription: vi.fn(
      async (data: {
        customerId: string;
        productId: string;
      }): Promise<CreemSubscription> => ({
        id: `sub_${createId()}`,
        customerId: data.customerId,
        status: 'active',
        productId: data.productId,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ),

    getSubscription: vi.fn(
      async (subscriptionId: string): Promise<CreemSubscription | null> => ({
        id: subscriptionId,
        customerId: `cus_${createId()}`,
        status: 'active',
        productId: 'prod_hobby',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ),

    cancelSubscription: vi.fn(
      async (subscriptionId: string): Promise<CreemSubscription> => ({
        id: subscriptionId,
        customerId: `cus_${createId()}`,
        status: 'canceled',
        productId: 'prod_hobby',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ),

    // Checkout
    createCheckoutSession: vi.fn(
      async (data: {
        customerId: string;
        productId: string;
        successUrl: string;
        cancelUrl: string;
      }): Promise<CreemCheckoutSession> => ({
        id: `cs_${createId()}`,
        url: `https://checkout.creem.io/cs_${createId()}`,
        customerId: data.customerId,
        status: 'open',
      }),
    ),

    // Webhook 验证
    verifyWebhookSignature: vi.fn(
      (payload: string, signature: string, secret: string): boolean => {
        return true; // 默认通过验证
      },
    ),

    // ========== 测试辅助方法 ==========

    _simulateError: (error: Error) => {
      mock.createCustomer.mockRejectedValue(error);
      mock.getCustomer.mockRejectedValue(error);
      mock.createSubscription.mockRejectedValue(error);
      mock.getSubscription.mockRejectedValue(error);
      mock.cancelSubscription.mockRejectedValue(error);
      mock.createCheckoutSession.mockRejectedValue(error);
    },

    _reset: () => {
      mock.createCustomer.mockClear();
      mock.getCustomer.mockClear();
      mock.createSubscription.mockClear();
      mock.getSubscription.mockClear();
      mock.cancelSubscription.mockClear();
      mock.createCheckoutSession.mockClear();
      mock.verifyWebhookSignature.mockClear();
    },
  };

  return mock;
}

// ========================================
// LLM Service Mock
// ========================================

export interface LlmCompletionResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export function createLlmMock() {
  const mock = {
    complete: vi.fn(
      async (prompt: string, options?: { model?: string }): Promise<LlmCompletionResult> => ({
        content: 'This is a mock LLM response.',
        model: options?.model ?? 'gpt-4o-mini',
        usage: {
          promptTokens: prompt.length / 4,
          completionTokens: 30,
          totalTokens: prompt.length / 4 + 30,
        },
      }),
    ),

    extractEntities: vi.fn(async (text: string) => ({
      entities: [
        { type: 'PERSON', name: 'John Doe', confidence: 0.95 },
        { type: 'ORGANIZATION', name: 'Test Corp', confidence: 0.9 },
      ],
      relations: [{ source: 'John Doe', target: 'Test Corp', type: 'WORKS_AT', confidence: 0.85 }],
    })),

    // ========== 测试辅助方法 ==========

    _setResponse: (response: string) => {
      mock.complete.mockResolvedValue({
        content: response,
        model: 'gpt-4o-mini',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });
    },

    _simulateError: (error: Error) => {
      mock.complete.mockRejectedValue(error);
      mock.extractEntities.mockRejectedValue(error);
    },
  };

  return mock;
}

// ========================================
// Config Service Mock
// ========================================

export function createConfigMock(config: Record<string, unknown> = {}) {
  const defaultConfig: Record<string, unknown> = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    OPENAI_API_KEY: 'test-openai-key',
    CREEM_API_KEY: 'test-creem-key',
    CREEM_WEBHOOK_SECRET: 'test-webhook-secret',
    BETTER_AUTH_SECRET: 'test-auth-secret-must-be-32-chars',
    BETTER_AUTH_URL: 'http://localhost:3000',
    ...config,
  };

  return {
    get: vi.fn((key: string, defaultValue?: unknown) => defaultConfig[key] ?? defaultValue),
    getOrThrow: vi.fn((key: string) => {
      const value = defaultConfig[key];
      if (value === undefined) {
        throw new Error(`Configuration key "${key}" is required`);
      }
      return value;
    }),
  };
}

// ========================================
// Type exports
// ========================================

export type CreemMock = ReturnType<typeof createCreemMock>;
export type LlmMock = ReturnType<typeof createLlmMock>;
export type ConfigMock = ReturnType<typeof createConfigMock>;
