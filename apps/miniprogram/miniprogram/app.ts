import { cartStore } from './store/cart-store'
import { resolveTableCode } from './utils/scene'

/**
 * 应用入口：扫码进入时解析桌号（支持小程序码 scene 与普通链接 query 两种方式）。
 * 顾客全程免注册免登录，桌号即就餐位标识。
 */
App({
  onLaunch(options) {
    const table = resolveTableCode(options.query ?? {})
    if (table) {
      cartStore.setTable(table)
    }
  },
})
