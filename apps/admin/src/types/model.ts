/**
 * 领域模型类型定义（商家后台）
 * 与顾客小程序 / 后端接口契约保持一致，见 docs/01-系统设计.md 第 5、6 章。
 * 金额单位：元（number，两位小数以内）；后端落库为分，Phase 3 在接口层转换。
 */

/** 员工角色（RBAC） */
export type StaffRole = 'admin' | 'manager' | 'waiter' | 'kitchen'

/** 员工账号 */
export interface Staff {
  id: string
  username: string
  name: string
  role: StaffRole
  /** 1 启用 / 0 禁用 */
  status: 0 | 1
  createdAt: number
}

/** 菜品分类 */
export interface Category {
  id: string
  name: string
  /** 展示排序（小在前） */
  sort: number
  /** 1 启用 / 0 停用 */
  status: 0 | 1
}

/** 菜品上架状态：在售 / 下架 / 售罄 */
export type DishStatus = 'on' | 'off' | 'soldout'

/** 菜品 */
/** 规格选项（大份/小份、微辣等）；priceDelta 为相对基础价的差价（元） */
export interface SpecOption {
  id: string
  label: string
  priceDelta: number
}

/** 规格组（份量 / 辣度 / 温度） */
export interface SpecGroup {
  id: string
  name: string
  options: SpecOption[]
}

export interface Dish {
  id: string
  name: string
  image: string
  /** 基础价格（元） */
  price: number
  categoryId: string
  description: string
  /** 月销量 */
  sales: number
  /** 评分 1-5 */
  rating: number
  status: DishStatus
  /** 热门推荐 */
  isHot: boolean
  /** 招牌菜 */
  isSignature: boolean
  /** 展示排序（小在前） */
  sort: number
  /** 可选规格组（份量/辣度等），顾客端加购时必选 */
  specs?: SpecGroup[]
}

/** 餐桌 */
export interface DiningTable {
  id: string
  /** 桌号编码，如 A01 */
  code: string
  /** 区域：大厅 / 包间 */
  area: string
  /** 可坐人数 */
  capacity: number
  /** 1 启用 / 0 停用 */
  status: 0 | 1
}

/** 订单状态（状态机见设计文档 8.3 节） */
export type OrderStatus =
  | 'PENDING'    // 待接单
  | 'ACCEPTED'   // 已接单
  | 'COOKING'    // 制作中
  | 'READY'      // 制作完成（出餐）
  | 'COMPLETED'  // 已完成（用餐结束）
  | 'CANCELLED'  // 已取消

/** 订单明细（名称/价格为下单时快照） */
export interface OrderItem {
  key: string
  dishId: string
  name: string
  /** 菜品图（历史种子订单可缺省） */
  image?: string
  /** 规格描述，如「大份 / 特辣」 */
  specText?: string
  /** 单价（元，含规格差价） */
  unitPrice: number
  quantity: number
  subtotal: number
}

/** 订单 */
export interface Order {
  orderNo: string
  tableCode: string
  items: OrderItem[]
  itemCount: number
  totalAmount: number
  remark: string
  status: OrderStatus
  createdAt: number
  acceptedAt?: number
  cookingAt?: number
  readyAt?: number
  completedAt?: number
  cancelledAt?: number
  cancelReason?: string
}

/** 登录用户信息（脱敏，不含密码） */
export interface AuthUser {
  id: string
  username: string
  name: string
  role: StaffRole
}
