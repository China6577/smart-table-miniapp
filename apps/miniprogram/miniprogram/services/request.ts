import { appConfig } from '../config/index'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
  timeout?: number
}

/**
 * 统一请求封装：自动拼接基础路径、解包统一响应体 { code, data, message }。
 * Phase 3 后端就绪后直接复用，页面层无需改动。
 */
export function request<T>(options: RequestOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    wx.request({
      url: `${appConfig.apiBaseUrl}${options.url}`,
      method: options.method ?? 'GET',
      data: options.data as WechatMiniprogram.IAnyObject | undefined,
      timeout: options.timeout ?? 10000,
      success(res) {
        const body = res.data as { code: number; data: T; message: string } | undefined
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.code === 0) {
          resolve(body.data)
        } else {
          reject(new Error(body?.message || `请求失败（${res.statusCode}）`))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络异常，请稍后重试'))
      },
    })
  })
}

/** 错误提示统一出口 */
export function showError(message: string) {
  wx.showToast({ title: message, icon: 'none' })
}
