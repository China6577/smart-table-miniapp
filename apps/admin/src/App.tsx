/**
 * 应用根组件：
 * - 路由表与鉴权 / 角色守卫
 * - 顾客下单模拟器随开关启停
 * - 全局 Toast
 */
import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { useUiStore } from '@/store/ui-store'
import { startSimulator, stopSimulator } from '@/mock/simulator'
import type { StaffRole } from '@/types/model'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ToastHub } from '@/components/ui/feedback'
import { LoginPage } from '@/pages/login/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { OrdersPage } from '@/pages/orders/OrdersPage'
import { DishesPage } from '@/pages/dishes/DishesPage'
import { CategoriesPage } from '@/pages/categories/CategoriesPage'
import { TablesPage } from '@/pages/tables/TablesPage'
import { StaffPage } from '@/pages/staff/StaffPage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { KdsPage } from '@/pages/kds/KdsPage'

/** 未登录跳转登录页 */
function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

/** 角色不满足时显示 403 面板 */
function RequireRole({ roles, children }: { roles: StaffRole[]; children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user || !roles.includes(user.role)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-slate-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-12 w-12">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
        <p className="text-sm">当前角色没有访问该页面的权限</p>
      </div>
    )
  }
  return <>{children}</>
}

/** 模拟器随 UI 开关启停（全局唯一处启动） */
function useSimulatorBootstrap() {
  useEffect(() => {
    const apply = (enabled: boolean) => (enabled ? startSimulator() : stopSimulator())
    apply(useUiStore.getState().simulatorEnabled)
    return useUiStore.subscribe((state, prev) => {
      if (state.simulatorEnabled !== prev.simulatorEnabled) apply(state.simulatorEnabled)
    })
  }, [])
}

export default function App() {
  useSimulatorBootstrap()

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/kds"
          element={
            <RequireAuth>
              <KdsPage />
            </RequireAuth>
          }
        />

        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route
            path="/dishes"
            element={
              <RequireRole roles={['admin', 'manager']}>
                <DishesPage />
              </RequireRole>
            }
          />
          <Route
            path="/categories"
            element={
              <RequireRole roles={['admin', 'manager']}>
                <CategoriesPage />
              </RequireRole>
            }
          />
          <Route
            path="/tables"
            element={
              <RequireRole roles={['admin', 'manager']}>
                <TablesPage />
              </RequireRole>
            }
          />
          <Route
            path="/staff"
            element={
              <RequireRole roles={['admin']}>
                <StaffPage />
              </RequireRole>
            }
          />
          <Route
            path="/analytics"
            element={
              <RequireRole roles={['admin', 'manager']}>
                <AnalyticsPage />
              </RequireRole>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHub />
    </>
  )
}
