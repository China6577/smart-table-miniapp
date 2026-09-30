/** 订单详情弹窗：菜品明细 + 状态时间线 + 流转操作 */
import { useState } from 'react'
import type { Order } from '@/types/model'
import { orderApi } from '@/api'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/feedback'
import { STATUS_META, STATUS_BADGE_CLASS } from '@/utils/status'
import { formatAmount, formatDateTime } from '@/utils/format'

export interface OrderDetailModalProps {
  order: Order | null
  onClose: () => void
  onAction: (fn: () => Promise<unknown>) => void
  /** 请求取消订单（打开取消原因弹窗） */
  onCancelRequest: (orderNo: string) => void
}

const TIMELINE: Array<{ key: keyof Order; label: string }> = [
  { key: 'createdAt', label: '提交订单' },
  { key: 'acceptedAt', label: '商家接单' },
  { key: 'cookingAt', label: '开始制作' },
  { key: 'readyAt', label: '制作完成' },
  { key: 'completedAt', label: '订单完成' },
]

export function OrderDetailModal({ order, onClose, onAction, onCancelRequest }: OrderDetailModalProps) {
  const [acting, setActing] = useState(false)
  if (!order) return null

  const meta = STATUS_META[order.status]

  async function run(fn: () => Promise<unknown>) {
    setActing(true)
    try {
      await onAction(fn)
    } finally {
      setActing(false)
    }
  }

  return (
    <Modal
      open
      title={`订单 ${order.orderNo}`}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          {order.status === 'PENDING' && (
            <>
              <Button variant="danger" onClick={() => onCancelRequest(order.orderNo)} disabled={acting}>
                取消订单
              </Button>
              <Button onClick={() => run(() => orderApi.accept(order.orderNo))} loading={acting}>
                接单
              </Button>
            </>
          )}
          {order.status === 'ACCEPTED' && (
            <Button onClick={() => run(() => orderApi.start(order.orderNo))} loading={acting}>
              开始制作
            </Button>
          )}
          {order.status === 'COOKING' && (
            <Button onClick={() => run(() => orderApi.finish(order.orderNo))} loading={acting}>
              制作完成
            </Button>
          )}
          {order.status === 'READY' && (
            <Button onClick={() => run(() => orderApi.serve(order.orderNo))} loading={acting}>
              确认上桌完成
            </Button>
          )}
          {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {/* 基本信息 */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="green" className="px-3 py-1 text-sm">
            {order.tableCode} 桌
          </Badge>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ring-1 ring-inset ${STATUS_BADGE_CLASS[meta.tone]}`}>
            {meta.text}
          </span>
          <span className="text-sm text-slate-400">{formatDateTime(order.createdAt)}</span>
          <span className="ml-auto text-lg font-semibold text-orange-600">{formatAmount(order.totalAmount)}</span>
        </div>

        {order.remark && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">顾客备注：{order.remark}</div>
        )}
        {order.status === 'CANCELLED' && order.cancelReason && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">取消原因：{order.cancelReason}</div>
        )}

        {/* 菜品明细 */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">菜品明细（{order.itemCount} 件）</h4>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {order.items.map((item) => (
              <li key={item.key} className="flex items-center gap-3 px-3 py-2.5">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-10 w-10 rounded-lg object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">🍽</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-700">
                    {item.name}
                    {item.specText && <span className="ml-1 text-xs text-slate-400">（{item.specText}）</span>}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatAmount(item.unitPrice)} × {item.quantity}
                  </div>
                </div>
                <span className="text-sm tabular-nums text-slate-600">{formatAmount(item.subtotal)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 状态时间线 */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">状态轨迹</h4>
          <ol className="space-y-0">
            {TIMELINE.map((step) => {
              const ts = order[step.key] as number | undefined
              const done = ts !== undefined
              return (
                <li key={step.key as string} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full ${done ? 'bg-emerald-500' : 'border-2 border-slate-300 bg-white'}`} />
                    <span className="w-px flex-1 bg-slate-200" />
                  </div>
                  <div className="pb-4">
                    <div className={`text-sm ${done ? 'font-medium text-slate-700' : 'text-slate-400'}`}>{step.label}</div>
                    <div className="text-xs text-slate-400">{done ? formatDateTime(ts) : '—'}</div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </Modal>
  )
}
