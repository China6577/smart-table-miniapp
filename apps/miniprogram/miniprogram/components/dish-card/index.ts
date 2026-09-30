import type { Dish } from '../../types/model'

Component({
  options: { addGlobalClass: true },
  properties: {
    dish: { type: Object, value: {} },
    /** 该菜品在购物车中的总数量（角标展示） */
    count: { type: Number, value: 0 },
  },
  data: {
    hasSpec: false,
  },
  observers: {
    dish(dish: Dish) {
      this.setData({ hasSpec: Boolean(dish && dish.specs && dish.specs.length) })
    },
  },
  methods: {
    onDetail() {
      const dish = this.data.dish as Dish
      if (!dish || !dish.id) return
      this.triggerEvent('detail', { dish })
    },
    /** 无规格直接加购；有规格由父级弹出规格选择层；坐标供页面做飞入购物车动画 */
    onAdd(e: WechatMiniprogram.TouchEvent) {
      const dish = this.data.dish as Dish
      if (!dish || dish.status === 'soldout') return
      this.triggerEvent('add', { dish, ...touchPos(e) })
    },

    /** 列表步进器加减（无规格菜品）：父级调 cartStore.changeDishCount */
    onMinus() {
      this.triggerEvent('change', { dish: this.data.dish, delta: -1 })
    },

    onPlus(e: WechatMiniprogram.TouchEvent) {
      this.triggerEvent('change', { dish: this.data.dish, delta: 1, ...touchPos(e) })
    },
  },
})

/** 取 tap 的视口坐标（无触摸信息时返回空对象，动画降级为不飞） */
function touchPos(e: WechatMiniprogram.TouchEvent): { x?: number; y?: number } {
  const t = e.changedTouches && e.changedTouches[0]
  return t ? { x: t.clientX, y: t.clientY } : {}
}
