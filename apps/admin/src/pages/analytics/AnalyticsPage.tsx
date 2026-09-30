/**
 * 数据分析：经营概览（含环比）、营业额/订单趋势、菜品销量排行、分类占比、
 * 桌台分析（翻台率/桌均消费/Top 桌台）、时段销售分析。
 * 数据全部来自服务端统计接口（mock 模式走本地 Mock 服务，口径一致），
 * 订单数据变化（version）后自动刷新。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { statsApi } from '@/api'
import type {
  CategoryShareItem,
  DishRankItem,
  HourlyPoint,
  OverviewStats,
  TableOverview,
  TrendPoint,
} from '@/types/api'
import { useDataStore } from '@/store/data-store'
import { BaseChart, ChartCard } from '@/components/charts/BaseChart'
import { StatCard } from '@/components/ui/feedback'
import { formatAmount, formatNumber, daysAgo, tsToDateStr } from '@/utils/format'
import { IconMoney, IconOrders, IconFire } from '@/components/ui/icons'

const RANGES = [
  { key: 7, label: '近 7 天' },
  { key: 14, label: '近 14 天' },
  { key: 30, label: '近 30 天' },
] as const

/** 环比角标：正绿负红，无基准（null）显示 - */
function GrowthTag({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-400">环比 -</span>
  const up = value >= 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      环比 {up ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  )
}

export function AnalyticsPage() {
  const version = useDataStore((s) => s.version)
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7)
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [tableOverview, setTableOverview] = useState<TableOverview | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [ranking, setRanking] = useState<DishRankItem[]>([])
  const [share, setShare] = useState<CategoryShareItem[]>([])
  const [hourly, setHourly] = useState<HourlyPoint[]>([])

  const from = tsToDateStr(daysAgo(rangeDays - 1))
  const to = tsToDateStr(Date.now())

  const load = useCallback(async () => {
    const range = { from, to }
    // 五个统计接口并行；时段分布一次请求取区间日均（替代旧版逐日循环）
    const [ov, tb, tr, rk, sh, hr] = await Promise.all([
      statsApi.overview(range),
      statsApi.tableOverview(range, 10),
      statsApi.salesTrend(range),
      statsApi.dishRanking(range, 10),
      statsApi.categoryShare(range),
      statsApi.hourlyRange(range),
    ])
    setOverview(ov)
    setTableOverview(tb)
    setTrend(tr)
    setRanking(rk)
    setShare(sh)
    setHourly(hr)
  }, [from, to])

  useEffect(() => {
    void load()
  }, [load, version])

  const comboOption = useMemo(() => buildComboOption(trend), [trend])
  const rankOption = useMemo(() => buildRankOption(ranking), [ranking])
  const shareOption = useMemo(() => buildShareOption(share), [share])
  const hourlyOption = useMemo(() => buildHourlyOption(hourly), [hourly])
  const tableOption = useMemo(() => buildTableOption(tableOverview?.topTables ?? []), [tableOverview])

  return (
    <div className="space-y-6">
      {/* 范围切换 + 汇总指标 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeDays(r.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                rangeDays === r.key ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">
          统计区间：{from} ~ {to}（数据实时更新）
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="区间营业额"
          value={overview ? formatAmount(overview.revenue) : '-'}
          icon={<IconMoney />}
          tone="green"
          sub={<GrowthTag value={overview?.revenueGrowth ?? null} />}
        />
        <StatCard
          label="区间订单数"
          value={overview ? formatNumber(overview.orderCount) : '-'}
          icon={<IconOrders />}
          tone="blue"
          sub={<GrowthTag value={overview?.orderGrowth ?? null} />}
        />
        <StatCard
          label="平均客单价"
          value={overview ? formatAmount(overview.avgAmount) : '-'}
          icon={<IconFire />}
          tone="orange"
        />
        <StatCard
          label="取消订单"
          value={overview ? `${overview.cancelCount} 单` : '-'}
          tone="amber"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
            </svg>
          }
          sub={<span>取消率 {overview ? overview.cancelRate.toFixed(1) : '-'}%</span>}
        />
      </div>

      <ChartCard title="营业额与订单量趋势" subtitle="柱状为营业额（元），折线为订单量（单）">
        <BaseChart option={comboOption} height={320} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="菜品销量排行 Top10" subtitle="按销量（份）">
          <BaseChart option={rankOption} height={360} />
        </ChartCard>
        <ChartCard title="分类销售占比" subtitle="按营业额（元）">
          <BaseChart option={shareOption} height={360} />
        </ChartCard>
      </div>

      {/* 桌台分析：餐饮排班与营销的核心依据 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="grid grid-cols-2 gap-4 content-start xl:col-span-2">
          <StatCard label="翻台率" value={tableOverview ? `${tableOverview.turnoverRate}` : '-'} tone="green" sub={<span>单 / 使用桌</span>} />
          <StatCard label="桌均消费" value={tableOverview ? formatAmount(tableOverview.avgTableAmount) : '-'} tone="blue" sub={<span>营业额 / 使用桌</span>} />
          <StatCard
            label="桌台使用率"
            value={tableOverview ? `${tableOverview.usageRate.toFixed(1)}%` : '-'}
            tone="orange"
            sub={<span>{tableOverview ? `${tableOverview.usedTables}/${tableOverview.totalTables} 桌` : '-'}</span>}
          />
          <StatCard
            label="桌台订单数"
            value={tableOverview ? formatNumber(tableOverview.orderCount) : '-'}
            tone="amber"
            sub={<span>区间内有效订单</span>}
          />
        </div>
        <div className="xl:col-span-3">
          <ChartCard title="桌台营业额排行 Top10" subtitle="按营业额（元），标注区域">
            <BaseChart option={tableOption} height={320} />
          </ChartCard>
        </div>
      </div>

      <ChartCard title="时段销售分析" subtitle="区间内日均每小时订单量（单）与营业额（元）">
        <BaseChart option={hourlyOption} height={300} />
      </ChartCard>
    </div>
  )
}

// ---------------- 图表配置 ----------------

function buildComboOption(trend: TrendPoint[]) {
  return {
    grid: { top: 40, left: 60, right: 60, bottom: 30 },
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['营业额', '订单量'], textStyle: { color: '#64748b' }, top: 0 },
    xAxis: {
      type: 'category' as const,
      data: trend.map((p) => p.date.slice(5)),
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: [
      { type: 'value' as const, name: '营业额', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
      { type: 'value' as const, name: '订单量', axisLabel: { color: '#94a3b8' }, splitLine: { show: false } },
    ],
    series: [
      {
        name: '营业额',
        type: 'bar' as const,
        data: trend.map((p) => p.revenue),
        barWidth: '45%',
        itemStyle: { color: '#059669', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '订单量',
        type: 'line' as const,
        yAxisIndex: 1,
        data: trend.map((p) => p.orderCount),
        smooth: true,
        itemStyle: { color: '#ea580c' },
      },
    ],
  }
}

function buildRankOption(items: DishRankItem[]) {
  return {
    grid: { top: 10, left: 100, right: 40, bottom: 30 },
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'value' as const, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    yAxis: { type: 'category' as const, data: [...items].reverse().map((it) => it.name), axisLabel: { color: '#475569' } },
    series: [
      {
        type: 'bar' as const,
        data: [...items].reverse().map((it) => it.quantity),
        barWidth: 14,
        itemStyle: { color: '#059669', borderRadius: [0, 7, 7, 0] },
        label: { show: true, position: 'right' as const, color: '#94a3b8' },
      },
    ],
  }
}

function buildTableOption(items: Array<{ tableCode: string; area: string; orderCount: number; revenue: number }>) {
  return {
    grid: { top: 10, left: 110, right: 55, bottom: 30 },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: Array<{ dataIndex: number }>) => {
        const it = items[params[0]?.dataIndex]
        if (!it) return ''
        return `${it.tableCode}（${it.area}）<br/>营业额 ¥${it.revenue}<br/>订单 ${it.orderCount} 单`
      },
    },
    xAxis: { type: 'value' as const, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    yAxis: {
      type: 'category' as const,
      data: [...items].reverse().map((it) => `${it.tableCode} · ${it.area}`),
      axisLabel: { color: '#475569' },
    },
    series: [
      {
        type: 'bar' as const,
        data: [...items].reverse().map((it) => it.revenue),
        barWidth: 14,
        itemStyle: { color: '#0284c7', borderRadius: [0, 7, 7, 0] },
        label: { show: true, position: 'right' as const, color: '#94a3b8', formatter: '¥{c}' },
      },
    ],
  }
}

function buildShareOption(items: CategoryShareItem[]) {
  return {
    tooltip: { trigger: 'item' as const, formatter: '{b}: ¥{c}（{d}%）' },
    legend: { orient: 'vertical' as const, right: 10, top: 'center' as const, textStyle: { color: '#475569' } },
    series: [
      {
        type: 'pie' as const,
        radius: ['42%', '68%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: items.map((it) => ({ name: it.name, value: it.revenue })),
      },
    ],
  }
}

function buildHourlyOption(points: HourlyPoint[]) {
  const business = points.filter((p) => p.hour >= 10 && p.hour <= 22)
  return {
    grid: { top: 40, left: 50, right: 55, bottom: 30 },
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['订单量', '营业额'], textStyle: { color: '#64748b' }, top: 0 },
    xAxis: { type: 'category' as const, data: business.map((p) => `${p.hour}时`), axisLabel: { color: '#94a3b8' }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
    yAxis: [
      { type: 'value' as const, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
      { type: 'value' as const, axisLabel: { color: '#94a3b8' }, splitLine: { show: false } },
    ],
    series: [
      {
        name: '订单量',
        type: 'bar' as const,
        data: business.map((p) => p.orderCount),
        barWidth: '50%',
        itemStyle: { color: '#0284c7', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '营业额',
        type: 'line' as const,
        yAxisIndex: 1,
        data: business.map((p) => p.revenue),
        smooth: true,
        itemStyle: { color: '#ea580c' },
      },
    ],
  }
}
