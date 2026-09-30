Component({
  options: { addGlobalClass: true },
  properties: {
    value: { type: Number, value: 1 },
    min: { type: Number, value: 1 },
    max: { type: Number, value: 99 },
  },
  methods: {
    /** 数量减：处于最小值时触发 empty 事件（由父级决定是否移除条目） */
    onMinus() {
      if (this.data.value <= this.data.min) {
        this.triggerEvent('empty')
        return
      }
      this.triggerEvent('minus')
    },
    onPlus() {
      if (this.data.value >= this.data.max) return
      this.triggerEvent('plus')
    },
  },
})
