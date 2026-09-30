/** 后台主框架：侧边导航 + 顶栏 + 内容区 */
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { useDataStore } from '@/store/data-store'
import { useUiStore } from '@/store/ui-store'
import { useNewOrderAlert } from '@/hooks/use-new-order-alert'
import { ROLE_META } from '@/utils/status'
import { formatDateTime } from '@/utils/format'
import { RESTAURANT } from '@/config'
import {
  IconDashboard,
  IconOrders,
  IconDish,
  IconCategory,
  IconTable,
  IconStaff,
  IconChart,
  IconScreen,
  IconLogout,
  IconVolume,
  IconVolumeOff,
  IconRefresh,
} from '@/components/ui/icons'
import { ConfirmModal } from '@/components/ui/Modal'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  roles: Array<'admin' | 'manager' | 'waiter' | 'kitchen'>
  badge?: 'pending'
}

const ALL_ROLES: NavItem['roles'] = ['admin', 'manager', 'waiter', 'kitchen']

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '数据看板', icon: IconDashboard, roles: ALL_ROLES },
  { to: '/orders', label: '订单管理', icon: IconOrders, roles: ALL_ROLES, badge: 'pending' },
  { to: '/dishes', label: '菜品管理', icon: IconDish, roles: ['admin', 'manager'] },
  { to: '/categories', label: '分类管理', icon: IconCategory, roles: ['admin', 'manager'] },
  { to: '/tables', label: '桌号管理', icon: IconTable, roles: ['admin', 'manager'] },
  { to: '/staff', label: '员工管理', icon: IconStaff, roles: ['admin'] },
  { to: '/analytics', label: '数据分析', icon: IconChart, roles: ['admin', 'manager'] },
]

const PAGE_TITLES: Record<string, string> = {
  '/': '数据看板',
  '/orders': '订单管理',
  '/dishes': '菜品管理',
  '/categories': '分类管理',
  '/tables': '桌号管理',
  '/staff': '员工管理',
  '/analytics': '数据分析',
}

function useClock(): string {
  const [now, setNow] = useState(() => formatDateTime(Date.now()))
  useEffect(() => {
    const timer = setInterval(() => setNow(formatDateTime(Date.now())), 30_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

export function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const pendingCount = useDataStore((s) => s.orders.filter((o) => o.status === 'PENDING').length)
  const reset = useDataStore((s) => s.reset)
  const simulatorEnabled = useUiStore((s) => s.simulatorEnabled)
  const setSimulator = useUiStore((s) => s.setSimulator)
  const soundEnabled = useUiStore((s) => s.soundEnabled)
  const setSound = useUiStore((s) => s.setSound)
  const toast = useUiStore((s) => s.toast)
  const [resetOpen, setResetOpen] = useState(false)
  const location = useLocation()
  const clock = useClock()
  useNewOrderAlert()

  const navItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role))

  return (
    <div className="flex h-screen bg-slate-100">
      {/* 侧边导航 */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">餐</div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{RESTAURANT.name}</div>
            <div className="text-xs text-slate-400">商家管理后台</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge === 'pending' && pendingCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <Link
            to="/kds"
            target="_blank"
            className="flex items-center gap-3 rounded-lg bg-slate-800 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            <IconScreen className="h-5 w-5" />
            <span className="flex-1">厨房大屏 KDS</span>
            <span className="text-xs text-slate-400">新窗口</span>
          </Link>
          <div className="mt-3 flex items-center gap-3 px-1 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
              {user?.name?.slice(0, 1) ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-700">{user?.name}</div>
              <div className="text-xs text-slate-400">{user ? ROLE_META[user.role]?.text : ''}</div>
            </div>
            <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600" onClick={logout} title="退出登录">
              <IconLogout className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 主区域 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <h1 className="text-base font-semibold text-slate-800">{PAGE_TITLES[location.pathname] ?? '老地方家常菜'}</h1>
          <div className="flex items-center gap-3">
            {/* 顾客下单模拟器开关：演示实时订单流 */}
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-slate-500" title="开启后系统会模拟顾客扫码下单，实时产生新订单">
              <span>顾客下单模拟</span>
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${simulatorEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                onClick={() => setSimulator(!simulatorEnabled)}
              >
                <span className={`absolute h-4 w-4 rounded-full bg-white shadow transition-all ${simulatorEnabled ? 'left-[1.125rem]' : 'left-0.5'}`} />
              </span>
            </label>
            <button
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              onClick={() => setSound(!soundEnabled)}
              title={soundEnabled ? '新订单提示音：开' : '新订单提示音：关'}
            >
              {soundEnabled ? <IconVolume className="h-5 w-5" /> : <IconVolumeOff className="h-5 w-5" />}
            </button>
            <button
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              onClick={() => setResetOpen(true)}
              title="重置演示数据"
            >
              <IconRefresh className="h-5 w-5" />
            </button>
            <span className="text-xs tabular-nums text-slate-400">{clock}</span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <ConfirmModal
        open={resetOpen}
        title="重置演示数据"
        message="将清空本地的菜品 / 订单等所有改动，恢复到初始演示数据（不影响顾客小程序端）。确定继续吗？"
        confirmText="重置"
        danger
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          reset()
          setResetOpen(false)
          toast('演示数据已重置')
        }}
      />
    </div>
  )
}
