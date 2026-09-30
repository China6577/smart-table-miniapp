/**
 * 订单管理：实时订单列表（数据源 = 实时订单池，WebSocket/跨页广播驱动），
 * 状态分组 Tab、搜索、日期过滤、流转操作、详情弹窗。
 */
import { useMemo, useState } from 'react'
import type { Order, OrderStatus } from '@/types/model'
import { orderApi } from '@/api'
import { useDataStore } from '@/store/data-store'
import { useUiStore } from '@/store/ui-store'
import { ApiError } from '@/api/request'
import { Button } from '@/components/ui/Button'
import { Badge, Empty, Pagination } from '@/components/ui/feedback'
import { Select } from '@/components/ui/form'
import { IconSearch } from '@/components/ui/icons'
import { STATUS_META, STATUS_BADGE_CLASS } from '@/utils/status'
import { formatAmount, formatTime, startOfDay, tsToDateStr } from '@/utils/format'
import { OrderDetailModal } from './OrderDetailModal'
import { CancelOrderModal } from './CancelOrderModal'

const PAGE_SIZE = 12

type StatusTab = OrderStatus | ''

const TABS: Array<{ key: StatusTab; label: string }> = [
  { key: '', label: '全部' },
  { key: 'PENDING', label: '待接单' },
  { key: 'ACCEPTED', label: '已接单' },
  { key: 'COOKING', label: '制作中' },
  { key: 'READY', label: '制作完成' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'CANCELLED', label: '已取消' },
]

export function OrdersPage() {
  const orders = useDataStore((s) => s.orders)
  const toast = useUiStore((s) => s.toast)
  const [tab, setTab] = useState<StatusTab>('')
  const [keyword, setKeyword] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday'>('all')
  const [page, setPage] = useState(1)
  const [detailNo, setDetailNo] = useState('')
  const [cancelNo, setCancelNo] = useState('')
  const [acting, setActing] = useState('')

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const todayStart = startOfDay()
    return orders.filter((o) => {
      if (tab && o.status !== tab) return false
      if (kw && !o.orderNo.includes(kw) && !o.tableCode.toLowerCase().includes(kw)) return false
      if (dateFilter === 'today' && o.createdAt < todayStart) return false
      if (dateFilter === 'yesterday' && (o.createdAt < todayStart - 86_400_000 || o.createdAt >= todayStart)) return false
      return true
    })
  }, [orders, tab, keyword, dateFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageOrders = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const detail = orders.find((o) => o.orderNo === detailNo) ?? null

  const counts = useMemo(() => {
    const map = new Map<OrderStatus, number>()
    for (const o of orders) map.set(o.status, (map.get(o.status) ?? 0) + 1)
    return map
  }, [orders])

  async function run(orderNo: string, fn: () => Promise<unknown>, successText: string) {
    setActing(orderNo)
    try {
      await fn()
      toast(successText)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : '操作失败', 'error')
    } finally {
      setActing('')
    }
  }

  return (
    <div className="space-y-4">
      {/* 状态 Tab */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key)
              setPage(1)
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
            {t.key && (counts.get(t.key) ?? 0) > 0 && (
              <span className={`ml-1.5 tabular-nums ${tab === t.key ? 'text-emerald-100' : 'text-slate-400'}`}>
                {counts.get(t.key)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 过滤器 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-64 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="搜索订单号 / 桌号"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          className="w-32"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value as typeof dateFilter)
            setPage(1)
          }}
          options={[
            { value: 'all', label: '全部时间' },
            { value: 'today', label: `今天（${tsToDateStr(Date.now()).slice(5)}）` },
            { value: 'yesterday', label: '昨天' },
          ]}
        />
        <span className="ml-auto text-xs text-slate-400">订单实时更新 · 共 {filtered.length} 单</span>
      </div>

      {/* 订单表格 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {pageOrders.length === 0 ? (
          <Empty text="暂无符合条件的订单" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">订单号</th>
                <th className="px-4 py-3 font-medium">桌号</th>
                <th className="px-4 py-3 font-medium">菜品</th>
                <th className="px-4 py-3 font-medium">金额</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageOrders.map((order) => (
                <OrderRow
                  key={order.orderNo}
                  order={order}
                  acting={acting === order.orderNo}
                  onDetail={() => setDetailNo(order.orderNo)}
                  onAction={(fn, text) => run(order.orderNo, fn, text)}
                  onCancelRequest={setCancelNo}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />

      <OrderDetailModal
        order={detail}
        onClose={() => setDetailNo('')}
        onCancelRequest={(orderNo) => {
          setDetailNo('')
          setCancelNo(orderNo)
        }}
        onAction={async (fn) => {
          try {
            await fn()
          } catch (e) {
            toast(e instanceof ApiError ? e.message : '操作失败', 'error')
          }
        }}
      />

      <CancelOrderModal orderNo={cancelNo || null} onClose={() => setCancelNo('')} />
    </div>
  )
}

function OrderRow({
  order,
  acting,
  onDetail,
  onAction,
  onCancelRequest,
}: {
  order: Order
  acting: boolean
  onDetail: () => void
  onAction: (fn: () => Promise<unknown>, successText: string) => void
  onCancelRequest: (orderNo: string) => void
}) {
  const meta = STATUS_META[order.status]
  const summary = order.items.map((it) => `${it.name}×${it.quantity}`).join('、')
  return (
    <tr className="group hover:bg-slate-50/60">
      <td className="px-4 py-3">
        <button className="font-medium tabular-nums text-emerald-700 hover:underline" onClick={onDetail}>
          {order.orderNo}
        </button>
        <div className="text-xs text-slate-400">{formatTime(order.createdAt)}</div>
      </td>
      <td className="px-4 py-3">
        <Badge tone="green">{order.tableCode} 桌</Badge>
      </td>
      <td className="max-w-64 px-4 py-3">
        <div className="truncate text-slate-700" title={summary}>
          {summary}
        </div>
        {order.remark && <div className="truncate text-xs text-amber-600">备注：{order.remark}</div>}
      </td>
      <td className="px-4 py-3 font-medium tabular-nums text-slate-800">{formatAmount(order.totalAmount)}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE_CLASS[meta.tone]}`}>
          {meta.text}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
          {order.status === 'PENDING' && (
            <>
              <Button size="sm" variant="outline" disabled={acting} onClick={() => onCancelRequest(order.orderNo)}>
                取消
              </Button>
              <Button size="sm" loading={acting} onClick={() => onAction(() => orderApi.accept(order.orderNo), '已接单')}>
                接单
              </Button>
            </>
          )}
          {order.status === 'ACCEPTED' && (
            <Button size="sm" loading={acting} onClick={() => onAction(() => orderApi.start(order.orderNo), '已开始制作')}>
              开始制作
            </Button>
          )}
          {order.status === 'COOKING' && (
            <Button size="sm" loading={acting} onClick={() => onAction(() => orderApi.finish(order.orderNo), '已出餐')}>
              制作完成
            </Button>
          )}
          {order.status === 'READY' && (
            <Button size="sm" variant="warn" loading={acting} onClick={() => onAction(() => orderApi.serve(order.orderNo), '订单已完成')}>
              上桌完成
            </Button>
          )}
          {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
            <Button size="sm" variant="ghost" onClick={onDetail}>
              查看
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}
