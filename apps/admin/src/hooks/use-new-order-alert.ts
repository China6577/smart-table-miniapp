/**
 * 新订单提醒：监听实时订单池，出现新订单时播放提示音 + Toast 通知。
 * 用于后台顶栏与 KDS 大屏（Phase 4 换成 WebSocket order.new 事件后逻辑不变）。
 */
import { useEffect, useRef } from 'react'
import { useDataStore } from '@/store/data-store'
import { useUiStore } from '@/store/ui-store'
import { playDing } from '@/utils/sound'

export function useNewOrderAlert() {
  const orders = useDataStore((s) => s.orders)
  const soundEnabled = useUiStore((s) => s.soundEnabled)
  const toast = useUiStore((s) => s.toast)
  const knownRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (knownRef.current === null) {
      knownRef.current = new Set(orders.map((o) => o.orderNo))
      return
    }
    const known = knownRef.current
    const fresh = orders.filter((o) => !known.has(o.orderNo))
    if (fresh.length === 0) return
    for (const order of fresh) known.add(order.orderNo)
    if (soundEnabled) playDing()
    const first = fresh[0]
    toast(`新订单 #${first.orderNo.slice(-4)} · ${first.tableCode} 桌 · ¥${first.totalAmount}`, 'info')
    if (fresh.length > 1) {
      toast(`另有 ${fresh.length - 1} 笔新订单待接单`, 'info')
    }
  }, [orders, soundEnabled, toast])
}
