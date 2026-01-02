/**
 * Stats API
 */
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'
import type { StatsOverview, DailyUsage, MonthlyUsage } from './types'

interface ApiResponse<T> {
  success: boolean
  data: T
}

export async function getStatsOverview(): Promise<StatsOverview> {
  const response = await apiClient.get<ApiResponse<StatsOverview>>(
    `${CONSOLE_API.STATS}/overview`
  )
  return response.data
}

export async function getDailyUsage(days: number = 30): Promise<DailyUsage[]> {
  const response = await apiClient.get<ApiResponse<DailyUsage[]>>(
    `${CONSOLE_API.STATS}/daily?days=${days}`
  )
  return response.data
}

export async function getUsageHistory(limit: number = 12): Promise<MonthlyUsage[]> {
  const response = await apiClient.get<ApiResponse<MonthlyUsage[]>>(
    `${CONSOLE_API.STATS}/history?limit=${limit}`
  )
  return response.data
}
