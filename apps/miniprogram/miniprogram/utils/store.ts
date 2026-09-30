export type Listener<T> = (state: T) => void

export interface Store<T extends object> {
  getState(): T
  setState(patch: Partial<T>): void
  subscribe(listener: Listener<T>): () => void
}

/**
 * 轻量全局状态管理（发布-订阅模式）。
 * 原生小程序没有跨页面响应式状态，通过本模块实现页面/组件间的状态同步：
 * 页面在 onLoad 中 subscribe、onUnload 中调用返回的取消函数。
 */
export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<Listener<T>>()

  return {
    getState() {
      return state
    },
    setState(patch) {
      state = { ...state, ...patch }
      listeners.forEach((listener) => listener(state))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
