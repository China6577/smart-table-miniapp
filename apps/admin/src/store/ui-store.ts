/** UI 状态：全局 Toast、顾客下单模拟器与提示音开关（跨刷新记忆） */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface UiState {
  simulatorEnabled: boolean
  soundEnabled: boolean
  toasts: ToastItem[]
  setSimulator: (enabled: boolean) => void
  setSound: (enabled: boolean) => void
  toast: (message: string, type?: ToastType) => void
  dismiss: (id: number) => void
}

let toastSeq = 0

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      simulatorEnabled: true,
      soundEnabled: true,
      toasts: [],
      setSimulator: (enabled) => set({ simulatorEnabled: enabled }),
      setSound: (enabled) => set({ soundEnabled: enabled }),
      toast: (message, type = 'success') => {
        const id = ++toastSeq
        set((state) => ({ toasts: [...state.toasts, { id, type, message }] }))
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
        }, 2600)
      },
      dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'smart-table-ui',
      partialize: (state) => ({ simulatorEnabled: state.simulatorEnabled, soundEnabled: state.soundEnabled }),
    },
  ),
)
