/**
 * 顾客下单模拟器：
 * 定时生成真实订单（随机桌号 + 菜品），让后台 / KDS 有持续的新订单流入，
 * 演示「扫码点餐 → 商家实时收到订单」的完整链路。
 *
 * 多标签页防重：通过 localStorage 锁选举唯一「领导页」，只有领导页生成订单。
 */
import { appConfig } from '@/config'
import { request } from '@/api/request'
import { createSimulatedOrder } from './server'

const LOCK_KEY = 'smart-table-sim-lock'
const LOCK_TTL_MS = 15_000

const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
let timer: ReturnType<typeof setTimeout> | null = null
let running = false

interface SimLock {
  tabId: string
  ts: number
}

function readLock(): SimLock | null {
  try {
    const raw = localStorage.getItem(LOCK_KEY)
    if (!raw) return null
    const lock = JSON.parse(raw) as SimLock
    return typeof lock.tabId === 'string' && typeof lock.ts === 'number' ? lock : null
  } catch {
    return null
  }
}

function writeLock(): void {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId, ts: Date.now() } satisfies SimLock))
  } catch {
    // localStorage 不可用时退化为单页模拟（可能多标签重复下单，可接受）
  }
}

/** 是否本页是领导页（锁空闲则抢占，非本人持有时跳过本轮） */
function acquireLeadership(): boolean {
  const lock = readLock()
  if (lock && lock.tabId === tabId) {
    writeLock()
    return true
  }
  if (!lock || Date.now() - lock.ts > LOCK_TTL_MS) {
    writeLock()
    return true
  }
  return false
}

function scheduleNext(): void {
  const interval = appConfig.simulatorMinInterval + Math.random() * (appConfig.simulatorMaxInterval - appConfig.simulatorMinInterval)
  timer = setTimeout(tick, interval)
}

function tick(): void {
  if (!running) return
  void simulateOnce()
  scheduleNext()
}

/** mock 模式直写本地数据库；http 模式调用后端 /api/dev/simulate-order */
async function simulateOnce(): Promise<void> {
  try {
    if (!acquireLeadership()) return
    if (appConfig.apiMode === 'http') {
      await request('POST', '/dev/simulate-order')
    } else {
      createSimulatedOrder()
    }
  } catch (error) {
    console.warn('[simulator] 生成订单失败', error)
  }
}

export function startSimulator(): void {
  if (running) return
  running = true
  scheduleNext()
}

export function stopSimulator(): void {
  running = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

export function isSimulatorRunning(): boolean {
  return running
}
