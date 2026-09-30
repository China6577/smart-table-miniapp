/**
 * 桌号解析：兼容两种扫码进入方式
 * 1. 小程序码 scene 参数：scene=table%3DA08（微信加密下发，需 decodeURIComponent）
 * 2. 普通二维码/调试链接 query：?table=A08
 */
export function resolveTableCode(query: Record<string, string | undefined>): string | null {
  if (query.table) {
    return query.table.toUpperCase()
  }
  if (query.scene) {
    const scene = decodeURIComponent(query.scene)
    const match = scene.match(/(?:^|[?&])table=([A-Za-z0-9]+)/)
    if (match) {
      return match[1].toUpperCase()
    }
  }
  return null
}
