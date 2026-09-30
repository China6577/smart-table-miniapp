/**
 * 领域模型类型定义（与后端数据库/接口契约保持一致，见 docs/01-系统设计.md）
 */

/** 菜品分类 */
export interface Category {
  id: string
  name: string
}

/** 菜品上架状态：在售 / 售罄 */
export type DishStatus = 'on' | 'soldout'

/** 规格选项（如：小份 / 大份，可带差价） */
export interface SpecOption {
  id: string
  label: string
  /** 相对菜品基础价的差价（元），正数为加价 */
  priceDelta: number
}

/** 规格组（如：份量 / 辣度 / 温度） */
export interface SpecGroup {
  id: string
  name: string
  options: SpecOption[]
}

/** 菜品 */
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
  /** 热门推荐（首页第一个分类展示） */
  isHot?: boolean
  /** 可选规格组 */
  specs?: SpecGroup[]
}

/** 购物车条目 */
export interface CartItem {
  /** 唯一键：dishId + 规格文本，同菜品同规格自动合并 */
  key: string
  dishId: string
  name: string
  image: string
  /** 含规格差价的单价（元） */
  unitPrice: number
  /** 规格描述，如「大份 / 特辣」 */
  specText?: string
  count: number
}

/** 规格选择结果 */
export interface SpecSelection {
  optionIds: string[]
  specText: string
  unitPrice: number
}

/** 订单状态（状态机见设计文档第 8.3 节） */
export type OrderStatus =
  | 'PENDING'    // 待接单
  | 'ACCEPTED'   // 已接单
  | 'COOKING'    // 制作中
  | 'READY'      // 制作完成
  | 'COMPLETED'  // 已完成
  | 'CANCELLED'  // 已取消

/** 订单明细（下单时的名称/价格快照） */
export interface OrderItem {
  key: string
  dishId: string
  name: string
  image: string
  specText?: string
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
  /** 下单幂等令牌（Phase 3 后端去重用） */
  clientToken?: string
}

/** 餐厅信息 */
export interface RestaurantInfo {
  name: string
  announcement: string
  phone: string
  address: string
  businessHours: string
}
