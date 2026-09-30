/**
 * 应用配置：集中管理环境相关的常量与开关。
 * Phase 3 接入真实后端后，将 apiMode 切换为 'http' 即可，业务代码零改动。
 */
export const appConfig = {
  /** 数据来源：mock = 本地模拟服务（localStorage + BroadcastChannel），http = 真实后端（docker compose） */
  apiMode: 'http' as 'mock' | 'http',
  /** 真实后端地址（开发走 Vite proxy → localhost:3100，生产由网关接管） */
  apiBaseUrl: '/api',
  /** Mock 数据延迟（毫秒），模拟网络往返 */
  mockLatency: 180,
  /** 顾客下单模拟器：单次下单最小间隔（毫秒） */
  simulatorMinInterval: 18_000,
  /** 顾客下单模拟器：单次下单最大间隔（毫秒） */
  simulatorMaxInterval: 45_000,
} as const

export const RESTAURANT = {
  name: '老地方家常菜',
  slogan: '扫码点餐 · 智能桌台管理系统',
} as const
