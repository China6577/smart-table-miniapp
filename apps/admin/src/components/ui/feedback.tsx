/** 徽标、统计卡片、空状态、分页、Toast */
import type { ReactNode } from 'react'
import { useUiStore } from '@/store/ui-store'
import { formatNumber } from '@/utils/format'

// ---------------- 徽标 ----------------

type BadgeTone = 'green' | 'orange' | 'blue' | 'red' | 'gray' | 'amber' | 'sky'

const BADGE_CLASS: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  orange: 'bg-orange-50 text-orange-600 ring-orange-200',
  blue: 'bg-blue-50 text-blue-600 ring-blue-200',
  red: 'bg-red-50 text-red-600 ring-red-200',
  gray: 'bg-slate-100 text-slate-500 ring-slate-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
}

export function Badge({ tone = 'gray', children, className = '' }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_CLASS[tone]} ${className}`}>
      {children}
    </span>
  )
}

// ---------------- 统计卡片 ----------------

export interface StatCardProps {
  label: string
  value: string
  sub?: ReactNode
  icon?: ReactNode
  tone?: 'green' | 'orange' | 'blue' | 'amber'
}

const STAT_ICON_CLASS = {
  green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-orange-50 text-orange-500',
  blue: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
}

export function StatCard({ label, value, sub, icon, tone = 'green' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-800">{value}</div>
        </div>
        {icon && <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${STAT_ICON_CLASS[tone]}`}>{icon}</div>}
      </div>
      {sub && <div className="mt-2 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

// ---------------- 空状态 ----------------

export function Empty({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-slate-400">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="h-12 w-12">
        <path d="M4 7h16v13H4zM4 7l2-4h12l2 4M9 11h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm">{text}</p>
      {children}
    </div>
  )
}

// ---------------- 分页 ----------------

export interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between px-1 py-3">
      <span className="text-sm text-slate-500">
        显示 {start}-{end} 条，共 {formatNumber(total)} 条
      </span>
      <div className="flex items-center gap-1">
        <button
          className="h-8 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          上一页
        </button>
        <span className="px-3 text-sm tabular-nums text-slate-500">
          {page} / {pageCount}
        </span>
        <button
          className="h-8 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  )
}

// ---------------- Toast ----------------

const TOAST_CLASS = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-slate-800',
} as const

export function ToastHub() {
  const toasts = useUiStore((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${TOAST_CLASS[t.type]}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
