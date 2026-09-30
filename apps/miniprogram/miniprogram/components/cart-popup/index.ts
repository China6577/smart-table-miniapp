import type { CartItem } from '../../types/model'

/**
 * 购物车弹层：展示已选菜品，支持数量增减、删除、清空。
 */
Component({
  options: { addGlobalClass: true },
  properties: {
    visible: { type: Boolean, value: false },
    items: { type: Array, value: [] as CartItem[] },
  },
  methods: {
    onClose() {
      this.triggerEvent('close')
    },

    onMinus(e: WechatMiniprogram.TouchEvent) {
      const { key } = e.currentTarget.dataset as { key: string }
      this.triggerEvent('minus', { key })
    },

    onPlus(e: WechatMiniprogram.TouchEvent) {
      const { key } = e.currentTarget.dataset as { key: string }
      this.triggerEvent('plus', { key })
    },

    /** 数量减到最小时移除条目 */
    onRemove(e: WechatMiniprogram.TouchEvent) {
      const { key } = e.currentTarget.dataset as { key: string }
      this.triggerEvent('remove', { key })
    },

    onClear() {
      this.triggerEvent('clear')
    },

    noop() {},
  },
})
