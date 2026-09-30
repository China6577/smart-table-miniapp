# AGENTS.md — 智能桌台扫码点餐系统

面向 AI 编码助手与开发者的项目约定。修改任何代码前请先阅读本文件。

## 项目概述

餐厅桌面扫码点餐系统，三端一体：

| 端 | 位置 | 技术栈 |
|---|---|---|
| 顾客微信小程序 | `apps/miniprogram/` | 原生小程序 + TypeScript |
| 商家后台 + 厨房 KDS | `apps/admin/` | React 19 + Vite + Tailwind CSS 4 + Zustand + ECharts |
| 后端 API | `server/` | NestJS 11 + TypeORM + PostgreSQL + Redis + JWT |

pnpm monorepo（`pnpm-workspace.yaml`），设计文档见 `docs/01-系统设计.md`（接口契约第 6 章、状态机第 8.3 节）。

## 常用命令

```bash
# 本地开发
pnpm admin:dev                # 商家后台（http://localhost:5174，代理 /api → localhost:3100）
pnpm --filter @smart-table/server start:dev   # 后端热重载（需本地 PG/Redis 或用 Docker）

# 校验（提交前必跑）
pnpm exec tsc --noEmit                      # admin 类型检查（在 apps/admin 下）
pnpm mp:lint                                # 小程序类型检查（等价 tsc --noEmit）

# Docker 环境（推荐，一键起 PG + Redis + API）
docker compose up -d --build api            # API 暴露在 http://localhost:3100/api
docker compose up -d                        # 全量启动
docker logs smart-table-api --tail 50       # 看启动/播种日志
curl http://localhost:3100/api/health         # 健康检查（DB 连通性 + uptime）

# 生产编排（叠加生产覆盖层：强密钥必填 / 关 dev 端点 / PG+Redis 端口收敛）
# 1. 准备 cp .env.example .env 并填入强随机 JWT_SECRET
# 2. 启动 docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 端到端接口验证（Docker API 启动后）
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-api.ps1
node scripts/verify-ws.mjs                        # WebSocket 实时推送验证（需 Node 22+）
```

微信开发者工具调试小程序真实后端时：详情 → 本地设置 → 勾选「不校验合法域名」。

## 关键领域规则（改动前必读）

### 1. 金额单位：分 / 元

- **数据库存储：分**（integer）
- **接口输出：元**（number，两位小数以内）
- 转换必须走 `server/src/utils/money.ts` 的 `fenToYuan` / `yuanToFen`，禁止手写乘除

### 2. 订单状态机（单一事实来源 `server/src/utils/order-status.ts`）

```
PENDING → ACCEPTED → COOKING → READY → COMPLETED
   ↘ CANCELLED（仅 PENDING/ACCEPTED 可取消）
```

- 后端 `canTransition()` 强校验非法跳转；三端状态定义必须一致：
  - admin: `apps/admin/src/types/model.ts`（`OrderStatus`）
  - 小程序: `apps/miniprogram/miniprogram/types/model.ts`
- 每次流转写入对应时间戳（acceptedAt/cookingAt/readyAt/completedAt/cancelledAt）并落 `order_events` 审计表
- KDS 的「开始制作」特殊：PENDING 自动先接单再进 COOKING（`order.service.ts` 的 `start()`）

### 3. 下单幂等

顾客下单带 `clientToken`，服务端按令牌查重复提交返回首单。小程序购物车条目字段名是 **`count`**（不是 quantity），后端 DTO 已对齐。

### 4. 价格权威

服务端定价：无规格按数据库价；有规格接受客户端 `unitPrice`（含差价）但不低于基础价。

### 5. RBAC 角色

`admin > manager > waiter > kitchen`。后端用 `@Roles('admin', 'manager')` 装饰器 + guard；admin 前端用 `RequireRole` 组件。员工管理有保护规则：不能降级自己的店长角色、系统至少保留一名管理员。

### 6. 数据模式切换（mock / http）

两套前端都有模式开关，业务代码零改动：

| 端 | 开关位置 | 当前值 |
|---|---|---|
| admin | `apps/admin/src/config/index.ts` → `apiMode` | `'http'` |
| 小程序 | `apps/miniprogram/miniprogram/config/index.ts` → `useMock` | `false` |

- admin 的 `data-store.ts` 是全站唯一数据镜像：mock 模式订阅 BroadcastChannel，http 模式 WebSocket 推送即时合并订单 + 低频轮询兜底（订单/基础数据各 60s）。**换传输层（如 socket.io/MQ）时改这里，页面不动。**
- admin 模拟器：mock 直写本地库；http 调 `POST /api/dev/simulate-order`
- `/api/dev/*` 端点仅在 `ALLOW_DEV_ENDPOINTS=true` 时可用，生产必须关闭

## 代码结构约定

### 后端（server/src/）

```
common/        拦截器（统一响应体 {code, message, data}）、JWT guard、RBAC guard、DTO 映射器
database/entities/  TypeORM 实体（字段长度注意：image_url varchar(1024)，qr_code_url text）
modules/       按业务域：auth/menu/order/staff/table/stats/customer/seed/redis/dev
utils/         order-status 状态机、money 金额、ids、rng（种子随机）
```

- 实体时间戳一律 `timestamp`，禁用 `datetime`（PostgreSQL 不支持）
- 实体 → DTO 映射集中在 `common/mappers.ts`（分→元、Date→毫秒时间戳）
- 业务错误抛 `BusinessException(code, message)`，全局过滤器统一包装
- 演示数据播种在 `modules/seed/`，种子随机用 `mulberry32` 保证可复现
- 菜品演示图是预生成文件 `server/public/dishes/{id}.jpg`（30 张），由 `/api/static` 静态托管；种子 URL 前缀取 `PUBLIC_BASE_URL`（默认 http://localhost:3100），换域名时改该环境变量

### 商家后台（apps/admin/src/）

```
api/           接口统一管理（request.ts 为唯一请求出口）
store/         Zustand：auth-store（登录态）、ui-store（Toast/模拟器）、data-store（实时镜像）
pages/         路由页面：dashboard/orders/dishes/categories/tables/staff/analytics/kds/login
mock/          本地 Mock 服务（localStorage + BroadcastChannel）
```

### 小程序（apps/miniprogram/miniprogram/）

```
services/      请求封装 + menu/order 服务（mock/http 双分叉）
store/         cart-store（购物车 + 当前桌号，localStorage 持久化）
pages/         index/dish-detail/search/order-confirm/order-detail/order-list
mock/          本地菜品数据；dish-images.ts 由脚本生成（pnpm mp:images），勿手改
```

## 编码规范

- **TypeScript strict** 全端开启，提交前 `tsc --noEmit` 零错误
- **注释用中文**，写在文件/函数头部说明「为什么」，不解释显而易见的「是什么」
- 微信小程序 `Page()` / `Component()` 必须显式声明泛型与 Custom 接口（方法、事件处理器都要在类型里）
- 路径别名：admin 用 `@/` 指向 `src/`；小程序用相对路径
- ECharts 体积大，admin 构建已配置 manualChunks 分包，勿破坏
- UI 定位：真实餐厅软件（参考美团餐饮系统），白/绿/橙配色，大按钮清晰文字，老人易用；不做高端奢侈风格

## 验证清单（改完代码后）

1. `tsc --noEmit` 零错误（admin + miniprogram 两端）
2. 改后端：`docker compose up -d --build api` 重建后看日志无崩溃
3. 跑 `scripts/verify-api.ps1`：登录 → Dashboard → 下单 → 接单 → 流转 → 统计全绿
4. 涉及实体改动：确认 TypeORM synchronize 自动迁移生效，注意字段长度（长 URL 场景用 text/varchar(1024)）

## 演示账号

| 账号 | 密码 | 角色 |
|---|---|---|
| admin | 123456 | 店长（全权限） |
| kitchen | 123456 | 厨房屏（KDS） |

## 路线图

- [x] Phase 1：顾客小程序
- [x] Phase 2：商家后台 + KDS
- [x] Phase 3：NestJS 后端 + Docker Compose（三端已接真实 API）
- [x] Phase 4：WebSocket 实时订单通知（原生 ws 网关 /api/ws，admin+小程序已接入，轮询仅兜底）
- [x] Phase 5：数据分析深化（stats/overview 含环比、stats/table-overview 翻台率/桌均消费/Top 桌台、hourly 支持区间一次取数；analytics 页服务端化）
- [x] Phase 6：生产部署加固（docker-compose.prod.yml、生产启动 fail-fast 自检、/api/health 探针、CORS_ORIGINS 白名单、PG/Redis 端口收敛、.env.example 模板；OSS 图片为上线时替换项）
