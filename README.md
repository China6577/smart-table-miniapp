# 智能桌台扫码点餐系统（Smart Table）

真实线下场景的餐厅扫码点餐系统：顾客扫桌码免登录点餐，订单实时进入商家后台与厨房。

## 仓库结构

| 目录 | 说明 | 阶段 |
| --- | --- | --- |
| `apps/miniprogram` | 顾客微信小程序（原生 + TypeScript） | Phase 1 ✅ |
| `apps/admin` | 商家后台（React 19 + Vite + Tailwind） | Phase 2 |
| `apps/kitchen` | 厨房 KDS（React 19） | Phase 2 |
| `server` | NestJS 后端 + PostgreSQL + Redis + WebSocket | Phase 3 |
| `docs` | 系统设计文档 | — |

## 快速开始（顾客小程序）

```bash
cd apps/miniprogram
pnpm install
pnpm gen:images   # 重新生成菜品图片资源（可选）
pnpm lint         # TypeScript 类型检查
```

用微信开发者工具打开 `apps/miniprogram` 目录即可预览（当前使用 Mock 数据驱动，
`miniprogram/config/index.ts` 中 `useMock: true`；Phase 3 后端就绪后切为 `false`）。

真实上线前：将 `project.config.json` 的 `appid` 替换为正式小程序 AppID，
并为菜品图片域名配置 downloadFile 合法域名。

## 设计文档

见 [docs/01-系统设计.md](docs/01-系统设计.md)（架构 / 数据库 / 接口 / 页面 / 业务流程）。
