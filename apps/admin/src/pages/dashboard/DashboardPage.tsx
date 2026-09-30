/** 数据看板：今日核心指标 + 趋势图表 + 待接单快捷处理（订单变化实时刷新） */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { dashboardApi, orderApi, statsApi } from '@/api'
import type { DashboardSummary, DishRankItem, HourlyPoint, TrendPoint } from '@/types/api'
import { useDataStore } from '@/store/data-store'
import { useUiStore } from '@/store/ui-store'
import { BaseChart, ChartCard } from '@/components/charts/BaseChart'
import { StatCard, Empty } from '@/components/ui/feedback'
import { Button } from '@/components/ui/Button'
import { formatAmount, formatNumber, formatTime, daysAgo, tsToDateStr } from '@/utils/format'
import { IconMoney, IconOrders, IconFire, IconTimer } from '@/components/ui/icons'

const TREND_DAYS = 14

export function DashboardPage() {
  const version = useDataStore((s) => s.version)
  const toast = useUiStore((s) => s.toast)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [topDishes, setTopDishes] = useState<DishRankItem[]>([])
  const [hourly, setHourly] = useState<HourlyPoint[]>([])
  const [acting, setActing] = useState('')

  const load = useCallback(async () => {
    const today = tsToDateStr(Date.now())
    const [s, tr, rank, hr] = await Promise.all([
      dashboardApi.summary(),
      statsApi.salesTrend({ from: tsToDateStr(daysAgo(TREND_DAYS - 1)), to: today }),
      statsApi.dishRanking({ from: today, to: today }, 5),
      statsApi.hourly(today),
    ])
    setSummary(s)
    setTrend(tr)
    setTopDishes(rank)
    setHourly(hr)
  }, [])

  useEffect(() => {
    void load()
  }, [load, version])

  async function quickAccept(orderNo: string) {
    setActing(orderNo)
    try {
      await orderApi.accept(orderNo)
      toast(`订单 #${orderNo.slice(-4)} 已接单`)
    } finally {
      setActing('')
    }
  }

  // 订阅稳定引用（s.orders），派生用 useMemo：选择器里 filter/slice 会每次返回新数组引用，
  // 触发 React 19 useSyncExternalStore 快照不一致 → 无限重渲染白屏
  const orders = useDataStore((s) => s.orders)
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'PENDING').slice(0, 5), [orders])

  const revenueTrendOption = useMemo(() => buildTrendOption(trend, 'revenue'), [trend])
  const orderTrendOption = useMemo(() => buildTrendOption(trend, 'orderCount'), [trend])
  const topDishOption = useMemo(() => buildRankOption(topDishes), [topDishes])
  const hourlyOption = useMemo(() => buildHourlyOption(hourly), [hourly])

  const revenueDelta =
    summary && summary.yesterdayRevenue > 0
      ? Math.round(((summary.todayRevenue - summary.yesterdayRevenue) / summary.yesterdayRevenue) * 100)
      : null

  return (
    <div className="space-y-6">
      {/* 核心指标 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="今日营业额"
          value={summary ? formatAmount(summary.todayRevenue) : '—'}
          icon={<IconMoney />}
          tone="green"
          sub={
            revenueDelta !== null ? (
              <span>
                较昨日 {revenueDelta >= 0 ? '↑' : '↓'} {Math.abs(revenueDelta)}%（昨日 {formatAmount(summary!.yesterdayRevenue)}）
              </span>
            ) : undefined
          }
        />
        <StatCard
          label="今日订单数"
          value={summary ? formatNumber(summary.todayOrderCount) : '—'}
          icon={<IconOrders />}
          tone="blue"
          sub={<span>待接单 {summary?.pendingCount ?? 0} 单 · 制作中 {summary?.cookingCount ?? 0} 单</span>}
        />
        <StatCard
          label="平均客单价"
          value={summary ? formatAmount(summary.todayAvgAmount) : '—'}
          icon={<IconFire />}
          tone="orange"
          sub={<span>有效订单均值（不含已取消）</span>}
        />
        <StatCard
          label="待处理事项"
          value={`${(summary?.pendingCount ?? 0) + (summary?.cookingCount ?? 0)}`}
          icon={<IconTimer />}
          tone="amber"
          sub={<span>待接单 + 制作中订单</span>}
        />
      </div>

      {/* 趋势图表 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="营业额趋势" subtitle={`近 ${TREND_DAYS} 天（元）`}>
          <BaseChart option={revenueTrendOption} height={280} />
        </ChartCard>
        <ChartCard title="订单量趋势" subtitle={`近 ${TREND_DAYS} 天（单）`}>
          <BaseChart option={orderTrendOption} height={280} />
        </ChartCard>
        <ChartCard title="今日热销菜品 Top5" subtitle="按销量（份）">
          <BaseChart option={topDishOption} height={260} />
        </ChartCard>
        <ChartCard title="今日时段销售" subtitle="每小时营业额（元）">
          <BaseChart option={hourlyOption} height={260} />
        </ChartCard>
      </div>

      {/* 待接单快捷处理 */}
      <ChartCard title="待接单订单" subtitle="顾客扫码提交后等待确认的订单">
        {pendingOrders.length === 0 ? (
          <Empty text="暂无待接单订单" />
        ) : (
          <div className="space-y-2">
            {pendingOrders.map((order) => (
              <div key={order.orderNo} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">{order.tableCode} 桌</span>
                    <span className="tabular-nums">#{order.orderNo.slice(-4)}</span>
                    <span className="text-slate-400">·</span>
                    <span className="truncate text-xs text-slate-500">
                      {order.items.map((it) => `${it.name}×${it.quantity}`).join('、')}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {formatTime(order.createdAt)} 下单 · {formatAmount(order.totalAmount)}
                    {order.remark ? ` · 备注：${order.remark}` : ''}
                  </div>
                </div>
                <Button size="sm" onClick={() => quickAccept(order.orderNo)} loading={acting === order.orderNo}>
                  接单
                </Button>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  )
}

// ---------------- 图表配置 ----------------

function buildTrendOption(trend: TrendPoint[], kind: 'revenue' | 'orderCount') {
  const isRevenue = kind === 'revenue'
  return {
    grid: { top: 30, left: 50, right: 20, bottom: 30 },
    tooltip: { trigger: 'axis' as const },
    xAxis: {
      type: 'category' as const,
      data: trend.map((p) => p.date.slice(5)),
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        type: 'line' as const,
        data: trend.map((p) => (isRevenue ? p.revenue : p.orderCount)),
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: isRevenue ? '#059669' : '#0284c7' },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: isRevenue ? 'rgba(5,150,105,0.18)' : 'rgba(2,132,199,0.18)' },
              { offset: 1, color: 'rgba(5,150,105,0)' },
            ],
          },
        },
      },
    ],
  }
}

function buildRankOption(items: DishRankItem[]) {
  return {
    grid: { top: 10, left: 90, right: 30, bottom: 30 },
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'value' as const, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    yAxis: {
      type: 'category' as const,
      data: [...items].reverse().map((it) => it.name),
      axisLabel: { color: '#475569' },
    },
    series: [
      {
        type: 'bar' as const,
        data: [...items].reverse().map((it) => it.quantity),
        barWidth: 14,
        itemStyle: { color: '#ea580c', borderRadius: [0, 7, 7, 0] },
        label: { show: true, position: 'right' as const, color: '#94a3b8' },
      },
    ],
  }
}

function buildHourlyOption(points: HourlyPoint[]) {
  const business = points.filter((p) => p.hour >= 10 && p.hour <= 22)
  return {
    grid: { top: 30, left: 50, right: 20, bottom: 30 },
    tooltip: { trigger: 'axis' as const },
    xAxis: {
      type: 'category' as const,
      data: business.map((p) => `${p.hour}时`),
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: { type: 'value' as const, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [
      {
        type: 'bar' as const,
        data: business.map((p) => p.revenue),
        barWidth: '55%',
        itemStyle: { color: '#059669', borderRadius: [5, 5, 0, 0] },
      },
    ],
  }
}
