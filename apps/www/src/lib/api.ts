export interface SearchResult {
  id: string
  content: string
  score: number
  createdAt: string
  tags?: string[]
}

export interface SearchResponse {
  results: SearchResult[]
  searchTime: number
  totalFound: number
}

interface BackendResponse {
  success: boolean
  results?: SearchResult[]
  searchTimeMs?: number
  totalFound?: number
  error?: {
    code: string
    message: string
  }
}

class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** API 基础地址（生产环境使用环境变量，开发环境使用代理） */
const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * 搜索记忆
 */
export async function searchMemories(
  query: string,
  captcha: string
): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE}/api/demo/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, captcha }),
  })

  const data: BackendResponse = await response.json()

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.message || 'Failed to search memories',
      data.error?.code
    )
  }

  return {
    results: data.results || [],
    searchTime: data.searchTimeMs || 0,
    totalFound: data.totalFound || 0,
  }
}
