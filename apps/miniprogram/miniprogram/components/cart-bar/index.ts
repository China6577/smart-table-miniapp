Component({
  options: { addGlobalClass: true },
  properties: {
    /** 购物车总件数 */
    count: { type: Number, value: 0 },
    /** 购物车总金额（元） */
    amount: { type: null, value: 0 },
  },
  data: {
    popping: false,
    prevCount: 0,
    inited: false,
  },
  observers: {
    /** 数量增加时图标弹跳：与飞入动画衔接，给顾客明确的「已加入」反馈 */
    count(nv: number) {
      const prev = this.data.prevCount
      const first = !this.data.inited
      const patch: { prevCount: number; inited: boolean; popping?: boolean } = { prevCount: nv, inited: true }
      // 首次渲染（购物车已有数量的页面恢复）不弹，仅后续增量弹
      if (!first && nv > prev) patch.popping = true
      this.setData(patch)
      if (patch.popping) setTimeout(() => this.setData({ popping: false }), 420)
    },
  },
  methods: {
    onCartTap() {
      if (this.data.count > 0) this.triggerEvent('cart')
    },
    onSubmit() {
      if (this.data.count > 0) this.triggerEvent('submit')
    },
  },
})
