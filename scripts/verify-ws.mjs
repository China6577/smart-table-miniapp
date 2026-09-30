/**
 * WebSocket 实时推送端到端验证（配合 docker compose 环境使用）：
 *   node scripts/verify-ws.mjs
 * 验证点：
 *   1. 员工 JWT 订阅 -> 收到全量订单流（created / status）
 *   2. 桌号订阅 -> 仅收到本桌订单流
 *   3. 其他桌号订阅 -> 不收到该桌事件（作用域隔离）
 * 依赖 Node 22+（原生 WebSocket / fetch），零第三方包。
 */
const BASE = 'http://localhost:3100/api'
const WS_URL = 'ws://localhost:3100/api/ws'
const TABLE = 'A02'

/** 单个 WS 客户端：订阅后收集 order:changed 事件 */
class WsClient {
  constructor(name) {
    this.name = name
    this.events = []
    this.subscribed = null
    this.opened = new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL)
      this.ws.onopen = resolve
      this.ws.onerror = () => reject(new Error(`${name} 连接失败`))
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.event === 'order:changed') this.events.push(msg.data)
          if (msg.event === 'subscribed') this.subscribed = msg.data
        } catch {
          // 忽略非 JSON 帧
        }
      }
    })
  }
  send(event, data) {
    this.ws.send(JSON.stringify({ event, data }))
  }
  close() {
    this.ws.close()
  }
}

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (json.code !== 0) throw new Error(`${method} ${path} 失败: ${json.message}`)
  return json.data
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const fail = (msg) => {
  console.error(`FAIL  ${msg}`)
  process.exit(1)
}

// ---- 1. 登录 + 建立三类订阅 ----
const { token } = await api('POST', '/admin/auth/login', { username: 'admin', password: '123456' })
const staff = new WsClient('admin端')
const ownTable = new WsClient(`本桌${TABLE}`)
const otherTable = new WsClient('他桌B05')
await Promise.all([staff.opened, ownTable.opened, otherTable.opened])
staff.send('subscribe', { token })
ownTable.send('subscribe', { tableCode: TABLE })
otherTable.send('subscribe', { tableCode: 'B05' })
await sleep(500)
if (staff.subscribed?.scope !== 'admin') fail('admin 订阅未确认')
if (ownTable.subscribed?.tableCode !== TABLE) fail('桌号订阅未确认')
console.log('OK    三路订阅就绪（admin / 本桌 / 他桌）')

// ---- 2. 顾客下单 -> 三路推送断言 ----
const dishes = await api('GET', `/customer/dishes?tableCode=${TABLE}`)
const order = await api('POST', '/customer/orders', {
  tableCode: TABLE,
  items: [{ dishId: dishes[0].id, count: 1 }],
  clientToken: `ws-verify-${Date.now()}`,
})
await sleep(500)
const gotCreated = (c) => c.events.some((e) => e.kind === 'created' && e.order.orderNo === order.orderNo)
if (!gotCreated(staff)) fail('admin 端未收到下单推送')
if (!gotCreated(ownTable)) fail('本桌未收到下单推送')
if (otherTable.events.length > 0) fail('他桌收到了不该收到的推送（作用域隔离失效）')
console.log(`OK    下单推送送达（admin + 本桌），他桌隔离正常，订单 ${order.orderNo}`)

// ---- 3. 商家流转 -> status 推送断言 ----
await api('POST', `/admin/orders/${order.orderNo}/accept`, undefined, token)
await sleep(500)
const gotStatus = (c) =>
  c.events.some((e) => e.kind === 'status' && e.order.orderNo === order.orderNo && e.order.status === 'ACCEPTED')
if (!gotStatus(staff)) fail('admin 端未收到接单推送')
if (!gotStatus(ownTable)) fail('本桌未收到接单推送')
if (otherTable.events.length > 0) fail('他桌收到了不该收到的推送')
console.log('OK    接单推送送达（admin + 本桌），状态 ACCEPTED')

// ---- 收尾 ----
for (const c of [staff, ownTable, otherTable]) c.close()
console.log('')
console.log('=== WebSocket 实时推送全部验证通过 ===')
process.exit(0)
