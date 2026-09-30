/**
 * 厨房 KDS 大屏：
 * 三栏状态泳道（待制作 → 制作中 → 出餐完成），大字号订单卡，新订单声光提醒。
 * 全屏深色设计，适配厨房显示器；数据与后台实时同步（跨标签页广播 / WebSocket）。
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Order } from '@/types/model'
import { orderApi } from '@/api'
import { ApiError } from '@/api/request'
import { useAuthStore } from '@/store/auth-store'
import { useDataStore } from '@/store/data-store'
import { useUiStore } from '@/store/ui-store'
import { useNewOrderAlert } from '@/hooks/use-new-order-alert'
import { kdsLaneOf } from '@/utils/status'
import { elapsedText, formatAmount } from '@/utils/format'
import { RESTAURANT } from '@/config'
import { IconArrowLeft, IconVolume, IconVolumeOff } from '@/components/ui/icons'

const LANES = [
  { key: 'todo', title: '待制作', hint: '接单后开始做', color: 'text-amber-400', dot: 'bg-amber-400' },
  { key: 'cooking', title: '制作中', hint: '正在出餐', color: 'text-sky-400', dot: 'bg-sky-400' },
  { key: 'done', title: '出餐完成', hint: '等服务员上桌', color: 'text-emerald-400', dot: 'bg-emerald-400' },
] as const

export function KdsPage() {
  const orders = useDataStore((s) => s.orders)
  const user = useAuthStore((s) => s.user)
  const soundEnabled = useUiStore((s) => s.soundEnabled)
  const setSound = useUiStore((s) => s.setSound)
  const toast = useUiStore((s) => s.toast)
  const [acting, setActing] = useState('')
  const [now, setNow] = useState(Date.now())
  useNewOrderAlert()

  // 计时刷新：卡片上的等待时长每 15 秒更新
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(timer)
  }, [])

  const laneOrders = useMemo(() => {
    const live = orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED')
    return {
      todo: live.filter((o) => kdsLaneOf(o.status) === 'todo').sort((a, b) => a.createdAt - b.createdAt),
      cooking: live.filter((o) => kdsLaneOf(o.status) === 'cooking').sort((a, b) => (b.cookingAt ?? 0) - (a.cookingAt ?? 0)),
      done: live.filter((o) => kdsLaneOf(o.status) === 'done').sort((a, b) => (b.readyAt ?? 0) - (a.readyAt ?? 0)),
    }
  }, [orders])

  async function advance(order: Order) {
    setActing(order.orderNo)
    try {
      if (order.status === 'PENDING' || order.status === 'ACCEPTED') {
        await orderApi.start(order.orderNo)
        toast(`#${order.orderNo.slice(-4)} 开始制作`)
      } else if (order.status === 'COOKING') {
        await orderApi.finish(order.orderNo)
        toast(`#${order.orderNo.slice(-4)} 已出餐`)
      } else if (order.status === 'READY') {
        await orderApi.serve(order.orderNo)
        toast(`#${order.orderNo.slice(-4)} 已完成`)
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : '操作失败', 'error')
    } finally {
      setActing('')
    }
  }

  const clock = new Date(now)

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-slate-100">
      {/* 顶栏 */}
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-800 px-6">
        {user?.role !== 'kitchen' && (
          <Link to="/" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            <IconArrowLeft className="h-5 w-5" />
            返回后台
          </Link>
        )}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-base font-bold text-white">餐</div>
          <div>
            <div className="text-base font-semibold">{RESTAURANT.name} · 厨房大屏</div>
            <div className="text-xs text-slate-500">订单实时推送 · 点击卡片流转状态</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-5">
          <div className="text-right">
            <div className="text-xl font-semibold tabular-nums">
              {String(clock.getHours()).padStart(2, '0')}:{String(clock.getMinutes()).padStart(2, '0')}
            </div>
            <div className="text-xs text-slate-500">
              {clock.getFullYear()}-{String(clock.getMonth() + 1).padStart(2, '0')}-{String(clock.getDate()).padStart(2, '0')}
            </div>
          </div>
          <button
            className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            onClick={() => setSound(!soundEnabled)}
            title={soundEnabled ? '提示音：开' : '提示音：关'}
          >
            {soundEnabled ? <IconVolume className="h-6 w-6" /> : <IconVolumeOff className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* 泳道 */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-3">
        {LANES.map((lane) => {
          const list = laneOrders[lane.key]
          return (
            <section key={lane.key} className="flex min-h-0 flex-col rounded-2xl bg-slate-800/50 ring-1 ring-slate-700/50">
              <header className="flex items-center gap-2.5 px-5 py-4">
                <span className={`h-2.5 w-2.5 rounded-full ${lane.dot}`} />
                <h2 className={`text-lg font-semibold ${lane.color}`}>{lane.title}</h2>
                <span className="rounded-full bg-slate-700/70 px-2 py-0.5 text-sm font-semibold tabular-nums text-slate-200">{list.length}</span>
                <span className="ml-auto text-xs text-slate-500">{lane.hint}</span>
              </header>
              <div className="kds-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
                {list.length === 0 && (
                  <div className="flex h-32 items-center justify-center text-sm text-slate-600">暂无订单</div>
                )}
                {list.map((order) => (
                  <KdsCard key={order.orderNo} order={order} now={now} acting={acting === order.orderNo} onAdvance={() => advance(order)} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function KdsCard({ order, now, acting, onAdvance }: { order: Order; now: number; acting: boolean; onAdvance: () => void }) {
  const fresh = now - order.createdAt < 60_000
  const since = order.status === 'COOKING' ? (order.cookingAt ?? order.createdAt) : order.createdAt
  const waitMinutes = Math.floor((now - since) / 60_000)
  const urgency = waitMinutes >= 25 ? 'text-red-400' : waitMinutes >= 15 ? 'text-amber-400' : 'text-slate-400'

  const actionText =
    order.status === 'PENDING' || order.status === 'ACCEPTED' ? '开始制作' : order.status === 'COOKING' ? '制作完成' : '确认上桌'

  const actionClass =
    order.status === 'PENDING' || order.status === 'ACCEPTED'
      ? 'bg-emerald-600 hover:bg-emerald-500'
      : order.status === 'COOKING'
        ? 'bg-sky-600 hover:bg-sky-500'
        : 'bg-slate-600 hover:bg-slate-500'

  return (
    <div className={`rounded-xl bg-slate-800 p-4 ring-1 ring-slate-700 ${fresh ? 'order-flash ring-emerald-500/60' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-lg font-bold tabular-nums">{order.tableCode}</span>
          <span className="text-base font-semibold tabular-nums text-slate-300">#{order.orderNo.slice(-4)}</span>
        </div>
        <span className={`text-sm font-medium tabular-nums ${urgency}`}>
          {order.status === 'COOKING' ? '已做' : '已等'}
          {elapsedText(since, now)}
        </span>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-slate-700/60 pt-3">
        {order.items.map((item) => (
          <li key={item.key} className="flex items-baseline gap-2 text-lg leading-7">
            <span className="flex-1 truncate font-medium text-slate-100">{item.name}</span>
            {item.specText && <span className="text-sm text-slate-400">{item.specText}</span>}
            <span className="text-xl font-bold tabular-nums text-amber-300">×{item.quantity}</span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{order.itemCount} 件 · {formatAmount(order.totalAmount)}</span>
        <span>{elapsedText(order.createdAt, now)}前下单</span>
      </div>

      {order.remark && <div className="mt-2 rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm text-amber-300">备注：{order.remark}</div>}

      <button
        className={`mt-3 h-12 w-full rounded-xl text-lg font-semibold text-white transition-colors disabled:opacity-60 ${actionClass}`}
        onClick={onAdvance}
        disabled={acting}
      >
        {acting ? '处理中…' : actionText}
      </button>
    </div>
  )
}
