/** 登录页：账号密码登录，演示账号一键填充 */
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { Input } from '@/components/ui/form'
import { Button } from '@/components/ui/Button'
import { ApiError } from '@/api/request'
import { RESTAURANT } from '@/config'

const DEMO_ACCOUNTS = [
  { username: 'admin', name: '张伟 · 店长（全部权限）' },
  { username: 'manager', name: '王芳 · 经理（不含员工管理）' },
  { username: 'waiter01', name: '李强 · 服务员（订单与看板）' },
  { username: 'kitchen01', name: '陈师傅 · 厨房（仅 KDS 大屏）' },
]

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const logging = useAuthStore((s) => s.logging)
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState('')

  const from = (location.state as { from?: string } | null)?.from

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const { user } = await (async () => {
        await login(username.trim(), password)
        return { user: useAuthStore.getState().user }
      })()
      if (user?.role === 'kitchen') {
        navigate('/kds', { replace: true })
      } else {
        navigate(from && from !== '/login' ? from : '/', { replace: true })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败，请稍后再试')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow-lg shadow-emerald-200">
            餐
          </div>
          <h1 className="text-xl font-semibold text-slate-800">{RESTAURANT.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{RESTAURANT.slogan}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Input
            label="账号"
            placeholder="请输入员工账号"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={logging} disabled={!username || !password}>
            登 录
          </Button>
        </form>

        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">
          <p className="mb-2 text-xs font-medium text-slate-500">演示账号（密码均为 123456，点击自动填充）</p>
          <div className="grid gap-1">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                type="button"
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => {
                  setUsername(acc.username)
                  setPassword('123456')
                  setError('')
                }}
              >
                <span className="font-medium">{acc.username}</span>
                <span className="text-xs text-slate-400">{acc.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
