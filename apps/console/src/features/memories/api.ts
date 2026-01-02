/**
 * Memories API
 */
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'
import type { Memory, ApiResponse, ListMemoriesParams, ExportFormat } from './types'

/** 获取 Memory 列表 */
export async function getMemories(
  params: ListMemoriesParams = {}
): Promise<{ memories: Memory[]; total: number }> {
  const searchParams = new URLSearchParams()

  if (params.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))

  const query = searchParams.toString()
  const url = query ? `${CONSOLE_API.MEMORIES}?${query}` : CONSOLE_API.MEMORIES

  const response = await apiClient.get<ApiResponse<Memory[]>>(url)

  return {
    memories: response.data,
    total: response.meta?.total ?? response.data.length,
  }
}

/** 导出 Memories */
export async function exportMemories(
  params: { apiKeyId?: string; format: ExportFormat } = { format: 'json' }
): Promise<Blob> {
  const searchParams = new URLSearchParams()

  if (params.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId)
  searchParams.set('format', params.format)

  const query = searchParams.toString()
  const url = `${CONSOLE_API.MEMORIES}/export?${query}`

  return apiClient.postBlob(url.replace('/export?', '/export?'), undefined)
}

/** 下载导出的 Memories */
export async function downloadMemories(
  params: { apiKeyId?: string; format: ExportFormat } = { format: 'json' }
): Promise<void> {
  const searchParams = new URLSearchParams()

  if (params.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId)
  searchParams.set('format', params.format)

  const query = searchParams.toString()
  const url = `${CONSOLE_API.MEMORIES}/export?${query}`

  // 直接打开下载链接
  const token = localStorage.getItem('auth-token')
  const fullUrl = `${window.location.origin}${url}`

  const response = await fetch(fullUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Export failed')
  }

  const blob = await response.blob()
  const filename =
    response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ||
    `memories-export.${params.format}`

  // 创建下载链接
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(downloadUrl)
}
