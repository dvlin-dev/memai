/**
 * Embedding Service Mock
 * 模拟 OpenAI Embedding 服务
 */
import { vi } from 'vitest';

/**
 * 生成随机向量（测试用）
 */
function generateRandomVector(dimensions: number = 1024): number[] {
  return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
}

/**
 * 生成固定向量（可重复测试用）
 */
function generateDeterministicVector(seed: string, dimensions: number = 1024): number[] {
  // 使用简单的伪随机数生成器
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  return Array.from({ length: dimensions }, (_, i) => {
    const x = Math.sin(hash + i) * 10000;
    return x - Math.floor(x);
  });
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

/**
 * 创建 Embedding Service mock
 */
export function createEmbeddingMock() {
  // 默认 mock 向量
  const defaultVector = generateRandomVector(1024);

  const mock = {
    /**
     * 生成单个文本的 embedding
     */
    generateEmbedding: vi.fn(async (text: string): Promise<EmbeddingResult> => {
      return {
        embedding: defaultVector,
        model: 'text-embedding-3-small',
        dimensions: 1024,
      };
    }),

    /**
     * 批量生成 embeddings
     */
    generateBatchEmbeddings: vi.fn(async (texts: string[]): Promise<EmbeddingResult[]> => {
      return texts.map(() => ({
        embedding: defaultVector,
        model: 'text-embedding-3-small',
        dimensions: 1024,
      }));
    }),

    /**
     * 计算余弦相似度
     */
    cosineSimilarity: vi.fn((a: number[], b: number[]): number => {
      if (a.length !== b.length) {
        throw new Error('Vector dimensions must match');
      }

      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }

      const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
      if (magnitude === 0) return 0;

      return dotProduct / magnitude;
    }),

    // ========== 测试辅助方法 ==========

    /**
     * 设置返回的 embedding 向量
     */
    _setEmbedding: (embedding: number[]) => {
      mock.generateEmbedding.mockResolvedValue({
        embedding,
        model: 'text-embedding-3-small',
        dimensions: embedding.length,
      });
    },

    /**
     * 设置返回确定性向量（基于输入文本）
     */
    _useDeterministicVectors: () => {
      mock.generateEmbedding.mockImplementation(async (text: string) => ({
        embedding: generateDeterministicVector(text),
        model: 'text-embedding-3-small',
        dimensions: 1024,
      }));

      mock.generateBatchEmbeddings.mockImplementation(async (texts: string[]) =>
        texts.map((text) => ({
          embedding: generateDeterministicVector(text),
          model: 'text-embedding-3-small',
          dimensions: 1024,
        })),
      );
    },

    /**
     * 模拟 API 错误
     */
    _simulateError: (error: Error) => {
      mock.generateEmbedding.mockRejectedValue(error);
      mock.generateBatchEmbeddings.mockRejectedValue(error);
    },
  };

  return mock;
}

/**
 * Embedding Mock 类型
 */
export type EmbeddingMock = ReturnType<typeof createEmbeddingMock>;
