/** 登录态管理：token + 用户信息，localStorage 持久化（zustand persist） */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/api'
import type { AuthUser } from '@/types/model'

interface AuthState {
  token: string | null
  user: AuthUser | null
  logging: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      logging: false,
      login: async (username, password) => {
        set({ logging: true })
        try {
          const { token, user } = await authApi.login(username, password)
          set({ token, user })
        } finally {
          set({ logging: false })
        }
      },
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'smart-table-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
)
