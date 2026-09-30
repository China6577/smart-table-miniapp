/**
 * 统一请求封装：
 * - mock 模式（当前）：路由到本地 Mock 服务（localStorage + BroadcastChannel 实时层）
 * - http 模式（Phase 3）：fetch 请求 NestJS 后端，自动附带 JWT
 * 业务代码只依赖本文件的 request()，切换模式零改动。
 */
import { appConfig } from '@/config'
import { mockHandle, isHttpError } from '@/mock/server'

/** 业务异常：携带后端错误码 */
export class ApiError extends Error {
  readonly code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

const AUTH_KEY = 'smart-table-auth'

/** 从 zustand persist 的存储中读取 token（避免与 auth-store 循环依赖） */
export function getStoredToken(): string | undefined {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { state?: { token?: string } }
    return parsed.state?.token || undefined
  } catch {
    return undefined
  }
}

/** 非 GET 请求成功后的变更回调：供 data-store 按路径触发镜像即时刷新 */
type MutationListener = (path: string) => void
const mutationListeners = new Set<MutationListener>()

export function onApiMutation(listener: MutationListener): () => void {
  mutationListeners.add(listener)
  return () => mutationListeners.delete(listener)
}

/** 查询参数：任意可枚举对象（具体字段由各业务域接口自行声明） */
export type QueryParams = object

export interface RequestOptions {
  data?: unknown
  params?: QueryParams
}

function buildQuery(params?: QueryParams): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function request<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, options: RequestOptions = {}): Promise<T> {
  const fullPath = `${path}${buildQuery(options.params)}`
  if (appConfig.apiMode === 'mock') {
    try {
      return await mockHandle<T>(method, fullPath, options.data, getStoredToken())
    } catch (e) {
      if (isHttpError(e)) throw new ApiError(e.code, e.message)
      throw e
    }
  }
  const data = await http<T>(method, fullPath, options)
  // 写操作成功后广播变更，data-store 据此即时拉取（mock 模式由 BroadcastChannel 覆盖）
  if (method !== 'GET') for (const listener of mutationListeners) listener(path)
  return data
}

async function http<T>(method: string, fullPath: string, options: RequestOptions): Promise<T> {
  const token = getStoredToken()
  const resp = await fetch(`${appConfig.apiBaseUrl}${fullPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.data !== undefined ? JSON.stringify(options.data) : undefined,
  })
  if (!resp.ok) throw new ApiError(resp.status, `请求失败（${resp.status}）`)
  const payload = (await resp.json()) as { code: number; message: string; data: T }
  if (payload.code !== 0) throw new ApiError(payload.code, payload.message)
  return payload.data
}
