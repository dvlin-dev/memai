/**
 * EmbeddingService 单元测试
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EmbeddingService } from '../embedding.service';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };

  const MOCK_EMBEDDING = Array(1536).fill(0).map(() => Math.random() - 0.5);
  const API_KEY = 'test-openai-api-key';

  function createMockResponse(embedding: number[] = MOCK_EMBEDDING) {
    return {
      ok: true,
      json: async () => ({
        data: [{ embedding, index: 0 }],
        model: 'text-embedding-3-small',
        usage: { prompt_tokens: 10, total_tokens: 10 },
      }),
    };
  }

  function createMockBatchResponse(embeddings: number[][]) {
    return {
      ok: true,
      json: async () => ({
        data: embeddings.map((embedding, index) => ({ embedding, index })),
        model: 'text-embedding-3-small',
        usage: { prompt_tokens: 30, total_tokens: 30 },
      }),
    };
  }

  beforeEach(() => {
    mockFetch.mockReset();
    configService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        switch (key) {
          case 'EMBEDDING_PROVIDER':
            return 'openai';
          case 'OPENAI_API_KEY':
            return API_KEY;
          case 'EMBEDDING_MODEL':
            return 'text-embedding-3-small';
          default:
            return defaultValue;
        }
      }),
    };

    service = new EmbeddingService(configService as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      mockFetch.mockResolvedValue(createMockResponse());

      const result = await service.generateEmbedding('Hello, world!');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
          },
          body: expect.any(String),
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.input).toBe('Hello, world!');
      expect(body.model).toBe('text-embedding-3-small');

      expect(result.embedding).toEqual(MOCK_EMBEDDING);
      expect(result.model).toBe('text-embedding-3-small');
      expect(result.dimensions).toBe(MOCK_EMBEDDING.length);
    });

    it('should throw error when API key is not configured', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'OPENAI_API_KEY') return '';
        if (key === 'EMBEDDING_PROVIDER') return 'openai';
        return defaultValue;
      });

      const serviceWithoutKey = new EmbeddingService(configService as any);

      await expect(serviceWithoutKey.generateEmbedding('test')).rejects.toThrow(
        'OPENAI_API_KEY not configured',
      );
    });

    it('should throw error for unsupported provider', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'EMBEDDING_PROVIDER') return 'unsupported';
        return defaultValue;
      });

      const serviceWithUnsupportedProvider = new EmbeddingService(configService as any);

      await expect(serviceWithUnsupportedProvider.generateEmbedding('test')).rejects.toThrow(
        'Unsupported embedding provider: unsupported',
      );
    });

    it('should throw error when API request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'API rate limit exceeded',
      });

      await expect(service.generateEmbedding('test')).rejects.toThrow(
        'OpenAI API error: API rate limit exceeded',
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.generateEmbedding('test')).rejects.toThrow('Network error');
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should return empty array for empty input', async () => {
      const result = await service.generateBatchEmbeddings([]);

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use single API call for one text', async () => {
      mockFetch.mockResolvedValue(createMockResponse());

      const result = await service.generateBatchEmbeddings(['single text']);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].embedding).toEqual(MOCK_EMBEDDING);
    });

    it('should use batch API for multiple texts', async () => {
      const embeddings = [MOCK_EMBEDDING, MOCK_EMBEDDING.map(x => x * 0.5)];
      mockFetch.mockResolvedValue(createMockBatchResponse(embeddings));

      const result = await service.generateBatchEmbeddings(['text 1', 'text 2']);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.input).toEqual(['text 1', 'text 2']);

      expect(result).toHaveLength(2);
      expect(result[0].embedding).toEqual(embeddings[0]);
      expect(result[1].embedding).toEqual(embeddings[1]);
    });

    it('should preserve order of results', async () => {
      const embeddings = [
        Array(1536).fill(0.1),
        Array(1536).fill(0.2),
        Array(1536).fill(0.3),
      ];
      mockFetch.mockResolvedValue(createMockBatchResponse(embeddings));

      const result = await service.generateBatchEmbeddings(['a', 'b', 'c']);

      expect(result[0].embedding[0]).toBeCloseTo(0.1);
      expect(result[1].embedding[0]).toBeCloseTo(0.2);
      expect(result[2].embedding[0]).toBeCloseTo(0.3);
    });

    it('should throw error when batch API fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'Batch request failed',
      });

      await expect(
        service.generateBatchEmbeddings(['text 1', 'text 2']),
      ).rejects.toThrow('OpenAI API error: Batch request failed');
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vector = [0.1, 0.2, 0.3, 0.4];

      const result = service.cosineSimilarity(vector, vector);

      expect(result).toBeCloseTo(1.0, 10);
    });

    it('should return -1 for opposite vectors', () => {
      const vector1 = [1, 0, 0];
      const vector2 = [-1, 0, 0];

      const result = service.cosineSimilarity(vector1, vector2);

      expect(result).toBeCloseTo(-1.0, 10);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vector1 = [1, 0, 0];
      const vector2 = [0, 1, 0];

      const result = service.cosineSimilarity(vector1, vector2);

      expect(result).toBeCloseTo(0, 10);
    });

    it('should calculate correct similarity for arbitrary vectors', () => {
      const vector1 = [1, 2, 3];
      const vector2 = [4, 5, 6];

      const result = service.cosineSimilarity(vector1, vector2);

      // Manual calculation: (1*4 + 2*5 + 3*6) / (sqrt(1+4+9) * sqrt(16+25+36))
      // = 32 / (sqrt(14) * sqrt(77))
      // = 32 / 32.833...
      // ≈ 0.9746
      expect(result).toBeCloseTo(0.9746, 3);
    });

    it('should throw error when vector dimensions do not match', () => {
      const vector1 = [1, 2, 3];
      const vector2 = [1, 2];

      expect(() => service.cosineSimilarity(vector1, vector2)).toThrow(
        'Vector dimensions must match',
      );
    });

    it('should handle large vectors efficiently', () => {
      const vector1 = Array(1536).fill(0).map(() => Math.random());
      const vector2 = Array(1536).fill(0).map(() => Math.random());

      const start = performance.now();
      const result = service.cosineSimilarity(vector1, vector2);
      const duration = performance.now() - start;

      expect(result).toBeGreaterThan(-1);
      expect(result).toBeLessThan(1);
      expect(duration).toBeLessThan(10); // Should complete in < 10ms
    });

    it('should handle normalized vectors correctly', () => {
      // Two normalized vectors with angle of 60 degrees
      const vector1 = [1, 0];
      const vector2 = [0.5, Math.sqrt(3) / 2];

      const result = service.cosineSimilarity(vector1, vector2);

      expect(result).toBeCloseTo(0.5, 10); // cos(60°) = 0.5
    });
  });
});
