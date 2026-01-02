/**
 * Dashboard 类型定义
 */
export type { ApiResponse } from '@/lib/types';

/** 仪表盘统计数据 */
export interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  /** 今日 API 用量记录数 */
  usageRecordsToday: number;
  /** 本月收入（单位：分） */
  revenueMTD: number;
}

/** 图表数据点 */
export interface ChartDataPoint {
  date: string;
  value: number;
}

/** 图表数据 */
export interface ChartData {
  /** API 用量趋势 */
  usage: ChartDataPoint[];
  /** 收入趋势 */
  revenue: ChartDataPoint[];
}
