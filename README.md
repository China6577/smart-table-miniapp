# 智能桌台扫码点餐系统（Smart Table）

真实线下场景的餐厅扫码点餐系统：顾客扫桌码免登录点餐，订单经 WebSocket 实时推送进入商家后台与厨房 KDS。

三端一体，pnpm monorepo：

| 目录 | 说明 | 技术栈 |
| --- | --- | --- |
| `apps/miniprogram` | 顾客微信小程序（点餐 / 规格 / 购物车 / 订单） | 原生小程序 + TypeScript |
| `apps/admin` | 商家后台 + 厨房 KDS（订单 / 菜品 / 桌台 / 员工 / 数据分析） | React 19 + Vite + Tailwind CSS 4 + Zustand + ECharts |
| `server` | 后端 API（RBAC / 订单状态机 / 统计 / 实时网关） | NestJS 11 + TypeORM + PostgreSQL + Redis + JWT + ws |
| `docs` | 系统设计文档（架构 / 数据库 / 接口契约 / 状态机） | — |

## 功能概览

- **顾客小程序**：扫桌码进入、分类菜单、多规格选择、加购飞入动画、下单幂等（clientToken）、订单状态实时刷新
- **商家后台**：订单管理（接单 / 制作 / 出餐 / 取消）、菜品与分类管理、桌台管理、员工管理（RBAC）、模拟器
- **厨房 KDS**：看板式烹饪队列，「开始制作」自动接单，状态流转全留痕（order_events 审计）
- **实时链路**：原生 ws 网关 `/api/ws` 推送订单事件，admin 与小程序均已接入，轮询仅作兜底
- **数据分析**：营业总览（含环比）、桌台翻台率 / 桌均消费 / Top 桌台、时段销量、菜品排行、品类占比
- **生产加固**：生产 compose 覆盖层、启动 fail-fast 自检、`/api/health` 探针、CORS 白名单、强密钥校验

## 快速开始

### 1. 后端（推荐 Docker，一键起 PG + Redis + API）

```bash
docker compose up -d --build api
curl http://localhost:3100/api/health   # {"status":"ok","db":true,...}
```

### 2. 商家后台 + KDS

```bash
pnpm install
pnpm admin:dev      # http://localhost:5174（已代理 /api → localhost:3100）
```

### 3. 顾客小程序

用微信开发者工具打开 `apps/miniprogram` 目录。

- 本地联调真实后端：详情 → 本地设置 → 勾选「不校验合法域名」
- 当前数据模式：`miniprogram/config/index.ts` → `useMock: false`（已接真实 API）
- 真实上线前：将 `project.config.json` 的 `appid` 换成正式 AppID，并配置图片域名

### 演示账号

| 账号 | 密码 | 角色 |
| --- | --- | --- |
| admin | 123456 | 店长（全权限） |
| kitchen | 123456 | 厨房屏（KDS） |

## 常用命令

```bash
pnpm admin:dev                                  # 商家后台开发服务
pnpm admin:build                                # 商家后台构建
pnpm mp:lint                                    # 小程序类型检查（tsc --noEmit）
pnpm mp:images                                  # 重新生成菜品演示图（勿手改 dish-images.ts）
pnpm --filter @smart-table/server start:dev     # 后端本地热重载（需本地 PG/Redis）

# 端到端验证（Docker API 启动后）
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-api.ps1   # 登录→下单→流转→统计
node scripts/verify-ws.mjs                                                   # WebSocket 推送验证
```

类型检查（提交前必跑）：admin 端在 `apps/admin` 下执行 `pnpm exec tsc --noEmit`。

## 生产部署

```bash
cp .env.example .env      # 填入强随机 JWT_SECRET（≥32 字符，弱密钥启动即失败）
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

生产覆盖层自动收敛：关闭 `/api/dev/*` 调试端点与演示数据播种、PG/Redis 端口不对外、CORS 白名单生效。
菜品图片现为本地静态资源（`server/public/dishes`），上线时可替换为 OSS（改 `PUBLIC_BASE_URL`）。

## 开发约定

- 金额：库存分、接口出元，转换走 `server/src/utils/money.ts`
- 订单状态机单一事实来源：`server/src/utils/order-status.ts`（PENDING → ACCEPTED → COOKING → READY → COMPLETED / CANCELLED）
- 前端数据模式开关：admin `src/config/index.ts` → `apiMode`；小程序 `config/index.ts` → `useMock`
- 详细规范（编码 / 验证清单 / 领域规则）见 [AGENTS.md](AGENTS.md)

## 设计文档

见 [docs/01-系统设计.md](docs/01-系统设计.md)（架构 / 数据库 / 接口 / 页面 / 业务流程）。
