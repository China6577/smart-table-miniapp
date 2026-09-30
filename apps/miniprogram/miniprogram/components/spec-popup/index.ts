import type { Dish, SpecGroup, SpecOption } from '../../types/model'

interface SpecGroupVM extends SpecGroup {
  options: Array<SpecOption & { active: boolean }>
}

/**
 * 规格选择弹层：份量/辣度/温度等规格组 + 数量，确认后回传
 * { dish, optionIds, specText, unitPrice, count }。
 */
Component({
  options: { addGlobalClass: true },
  properties: {
    dish: { type: Object, value: {} },
    visible: { type: Boolean, value: false },
  },
  data: {
    groups: [] as SpecGroupVM[],
    count: 1,
    unitPrice: 0,
    specText: '',
  },
  observers: {
    'visible, dish': function refresh(visible: boolean) {
      if (visible && this.data.dish) {
        this.init()
      }
    },
  },
  methods: {
    init() {
      const dish = this.data.dish as Dish
      const groups: SpecGroupVM[] = (dish.specs ?? []).map((group) => ({
        ...group,
        options: group.options.map((option) => ({ ...option, active: false })),
      }))
      // 默认选中每组第一个选项，降低操作成本
      groups.forEach((group) => {
        if (group.options.length) group.options[0].active = true
      })
      this.setData({ groups, count: 1 })
      this.refreshSummary()
    },

    onOption(e: WechatMiniprogram.TouchEvent) {
      const { gi, oi } = e.currentTarget.dataset as { gi: number; oi: number }
      const groups = this.data.groups.map((group, index) => {
        if (index !== Number(gi)) return group
        return {
          ...group,
          options: group.options.map((option, optionIndex) => ({
            ...option,
            active: optionIndex === Number(oi),
          })),
        }
      })
      this.setData({ groups })
      this.refreshSummary()
    },

    refreshSummary() {
      const dish = this.data.dish as Dish
      if (!dish) return
      let delta = 0
      const labels: string[] = []
      for (const group of this.data.groups) {
        for (const option of group.options) {
          if (option.active) {
            delta += option.priceDelta
            labels.push(option.label)
          }
        }
      }
      this.setData({
        unitPrice: dish.price + delta,
        specText: labels.join(' / '),
      })
    },

    onMinus() {
      if (this.data.count <= 1) return
      this.setData({ count: this.data.count - 1 })
    },

    onPlus() {
      if (this.data.count >= 99) return
      this.setData({ count: this.data.count + 1 })
    },

    onClose() {
      this.triggerEvent('close')
    },

    onConfirm() {
      const dish = this.data.dish as Dish
      if (!dish) return
      const optionIds = this.data.groups.flatMap((group) =>
        group.options.filter((option) => option.active).map((option) => option.id),
      )
      this.triggerEvent('confirm', {
        dish,
        optionIds,
        specText: this.data.specText,
        unitPrice: this.data.unitPrice,
        count: this.data.count,
      })
    },

    /** 阻断弹层滚动穿透 */
    noop() {},
  },
})
