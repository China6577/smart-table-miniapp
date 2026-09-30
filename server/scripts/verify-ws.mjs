/**
 * WebSocket 实时链路端到端验证（需 docker compose API 已启动）：
 * 1. 员工端：JWT 订阅 → 模拟顾客下单 → 断言收到 kind=created 推送
 * 2. 顾客端：桌号订阅 → 商家接单 → 断言收到 kind=status 推送
 * 运行：node scripts/verify-ws.mjs（在 server 目录下）
 */
import WebSocket from 'ws'

const BASE = 'http://localhost:3100/api'
const WS_URL = 'ws://localhost:3100/api/ws'

const login = await fetch(`${BASE}/admin/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: '123456' }),
}).then((r) => r.json())
if (login.code !== 0) throw new Error(`登录失败: ${login.message}`)
const token = login.data.token
console.log('1. 员工登录 OK')

// ---- 员工端订阅全量流 ----
const adminEvents = []
const wsAdmin = new WebSocket(WS_URL)
wsAdmin.on('message', (raw) => {
  const msg = JSON.parse(raw.toString())
  if (msg.event === 'subscribed') console.log(`2. 员工订阅 OK scope=${msg.data.scope}`)
  if (msg.event === 'order:changed') adminEvents.push(msg.data)
})
await new Promise((resolve, reject) => {
  wsAdmin.on('open', resolve)
  wsAdmin.on('error', reject)
})
wsAdmin.send(JSON.stringify({ event: 'subscribe', data: { token } }))
await new Promise((r) => setTimeout(r, 300))

const sim = await fetch(`${BASE}/dev/simulate-order`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json())
if (sim.code !== 0) throw new Error(`模拟下单失败: ${sim.message}`)
console.log(`3. 模拟顾客下单 OK: ${sim.data.orderNo} (${sim.data.tableCode} 桌)`)

await new Promise((r) => setTimeout(r, 1500))
const hitCreated = adminEvents.find((e) => e.order.orderNo === sim.data.orderNo && e.kind === 'created')
if (!hitCreated) throw new Error('员工端未收到新订单推送')
console.log(`4. 员工端收到新订单推送 OK: status=${hitCreated.order.status}, totalAmount=${hitCreated.order.totalAmount}`)

// ---- 顾客端按桌号订阅 ----
const custEvents = []
const wsCust = new WebSocket(WS_URL)
wsCust.on('message', (raw) => {
  const msg = JSON.parse(raw.toString())
  if (msg.event === 'subscribed') console.log(`5. 顾客订阅 OK scope=${msg.data.scope} table=${msg.data.tableCode}`)
  if (msg.event === 'order:changed') custEvents.push(msg.data)
})
await new Promise((resolve, reject) => {
  wsCust.on('open', resolve)
  wsCust.on('error', reject)
})
wsCust.send(JSON.stringify({ event: 'subscribe', data: { tableCode: sim.data.tableCode } }))
await new Promise((r) => setTimeout(r, 300))

const accept = await fetch(`${BASE}/admin/orders/${sim.data.orderNo}/accept`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json())
if (accept.code !== 0) throw new Error(`接单失败: ${accept.message}`)
console.log(`6. 商家接单 OK: ${accept.data.orderNo} -> ${accept.data.status}`)

await new Promise((r) => setTimeout(r, 1500))
const hitStatus = custEvents.find((e) => e.order.orderNo === sim.data.orderNo && e.kind === 'status')
if (!hitStatus) throw new Error('顾客端未收到状态流转推送')
console.log(`7. 顾客端收到状态推送 OK: ${hitStatus.order.status}`)

// ---- 其他桌不应收到本桌推送（负向校验）----
const wsOther = new WebSocket(WS_URL)
const otherEvents = []
wsOther.on('message', (raw) => {
  const msg = JSON.parse(raw.toString())
  if (msg.event === 'order:changed') otherEvents.push(msg.data)
})
await new Promise((resolve, reject) => {
  wsOther.on('open', resolve)
  wsOther.on('error', reject)
})
wsOther.send(JSON.stringify({ event: 'subscribe', data: { tableCode: 'Z99' } }))
await new Promise((r) => setTimeout(r, 200))
// 再触发一笔单，Z99 桌不应收到
await fetch(`${BASE}/dev/simulate-order`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
await new Promise((r) => setTimeout(r, 1500))
if (otherEvents.length > 0) throw new Error('桌号隔离失效：Z99 桌收到了非本桌推送')
console.log('8. 桌号隔离 OK：其他桌未收到本桌订单')

wsAdmin.close()
wsCust.close()
wsOther.close()
console.log('=== WebSocket 实时链路全部通过 ===')
