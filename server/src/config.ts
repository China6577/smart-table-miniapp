/**
 * 环境配置：统一读取环境变量并提供缺省值。
 * 生产部署时通过 docker compose 环境变量或 .env 注入。
 */

function toInt(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** JWT 有效期（支持「12h」写法，统一换算为秒） */
function parseHours(value: string | undefined, fallback: number): number {
  const m = /^(\d+)\s*h$/i.exec(value ?? '')
  return m ? Number(m[1]) * 3_600 : fallback * 3_600
}

export const appConfig = {
  /** HTTP 端口 */
  port: toInt(process.env.PORT, 3000),
  /** PostgreSQL 连接串 */
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://smarttable:smarttable@localhost:5432/smart_table',
  /** Redis 连接串（订单号序列）；留空退化为进程内计数 */
  redisUrl: process.env.REDIS_URL ?? '',
  /** JWT 签名密钥 */
  jwtSecret: process.env.JWT_SECRET ?? 'smart-table-dev-secret',
  /** JWT 有效期（秒） */
  jwtExpiresIn: parseHours(process.env.JWT_EXPIRES_IN, 12),
  /** 首次启动播种演示数据 */
  seedDemo: (process.env.SEED_DEMO ?? 'true') !== 'false',
  /** 是否放行 /api/dev/* 调试端点（生产必须关闭） */
  allowDevEndpoints: process.env.ALLOW_DEV_ENDPOINTS === 'true',
  /** 桌码二维码内容模板，{code} 替换为桌号 */
  qrContentTemplate: process.env.QR_CONTENT_TEMPLATE ?? 'https://smart-table.example.com/mp?table={code}',
  /** 对外可访问的基础地址：种子数据图片等静态资源绝对 URL 的前缀 */
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? 'http://localhost:3100').replace(/\/+$/, ''),
  /** 允许跨域的来源（逗号分隔）；留空表示不限制（仅限开发） */
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}

/** 内置演示密钥黑名单：生产环境出现任何一个都拒绝启动 */
const KNOWN_INSECURE_SECRETS = new Set(['smart-table-dev-secret', 'smart-table-demo-secret'])

/**
 * 生产环境启动自检（fail fast）：
 * 配置错误在启动瞬间暴露，而不是在运行中被利用后才发现。
 */
export function validateProductionConfig(): void {
  if (process.env.NODE_ENV !== 'production') return
  const problems: string[] = []
  if (KNOWN_INSECURE_SECRETS.has(appConfig.jwtSecret) || appConfig.jwtSecret.length < 32) {
    problems.push('JWT_SECRET 必须替换为不少于 32 字符的强随机值')
  }
  if (appConfig.allowDevEndpoints) {
    problems.push('ALLOW_DEV_ENDPOINTS 必须为 false（/api/dev/* 严禁生产暴露）')
  }
  if (appConfig.seedDemo) {
    problems.push('SEED_DEMO 必须为 false（生产库不得播种演示数据）')
  }
  if (problems.length > 0) {
    throw new Error(`[smart-table] 生产配置不合法，拒绝启动：\n  - ${problems.join('\n  - ')}`)
  }
}

/** 餐厅信息（单店版内置；SaaS 化时迁入数据库） */
export const RESTAURANT_INFO = {
  name: '老地方家常菜',
  announcement: '食材每日新鲜采购，用心做好每一道菜',
  phone: '0755-88886666',
  address: '深圳市南山区幸福路 88 号',
  businessHours: '10:00 - 21:30',
}
