/**
 * 全局环境配置
 * - useMock: true 时走本地 Mock 数据，false 走真实接口（docker compose 后端）
 * - 开发者工具联调真实后端：详情 → 本地设置 → 勾选「不校验合法域名」
 */
export const appConfig = {
  apiBaseUrl: 'http://localhost:3100/api',
  useMock: false,
  version: '1.0.0',
}
