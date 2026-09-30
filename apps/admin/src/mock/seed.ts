/**
 * Mock 种子数据：
 * - 7 个分类 / 30 道菜品（与顾客小程序菜单完全一致，保证两端体验统一）
 * - 18 张餐桌 / 5 名员工
 * - 近 30 天历史订单（种子随机生成，报表数字稳定）+ 今日在途订单（订单管理/KDS 有内容可操作）
 */
import type { Category, DiningTable, Dish, Order, OrderItem, Staff } from '@/types/model'
import { mulberry32, randInt, pickWeighted } from '@/utils/rng'
import { itemKey } from '@/utils/id'

const SEED = 20260826

/** 菜品图：本地静态演示图（server/public/dishes/{id}.jpg，与后端种子同源） */
function dishImage(id: string): string {
  return `http://localhost:3100/api/static/dishes/${id}.jpg`
}

export const categories: Category[] = [
  { id: 'sign', name: '招牌菜', sort: 1, status: 1 },
  { id: 'home', name: '家常菜', sort: 2, status: 1 },
  { id: 'meat', name: '荤菜', sort: 3, status: 1 },
  { id: 'veg', name: '素菜', sort: 4, status: 1 },
  { id: 'soup', name: '汤类', sort: 5, status: 1 },
  { id: 'staple', name: '主食', sort: 6, status: 1 },
  { id: 'drink', name: '饮料', sort: 7, status: 1 },
]

/** [id, 名称, 图片主体, 价格, 分类, 简介, 月销, 评分, 在售?, 热门?] */
type DishRow = [string, string, string, number, string, string, number, number, boolean, boolean]

const dishRows: DishRow[] = [
  ['d001', '宫保鸡丁', 'Kung Pao chicken, diced chicken stir-fried with roasted peanuts, dried red chilies and scallions', 38, 'sign', '经典川味家常菜，鸡肉嫩滑，花生香脆', 235, 4.8, true, true],
  ['d002', '鱼香肉丝', 'Yu-Xiang shredded pork, silky shredded pork in sweet and sour garlic sauce with wood ear mushrooms, carrots and pickled chili', 32, 'sign', '鱼香味浓，肉丝滑嫩，酸甜适口', 198, 4.7, true, true],
  ['d003', '水煮牛肉', 'Sichuan boiled beef slices in red chili oil broth topped with dried chilies and Sichuan peppercorns over bean sprouts', 58, 'sign', '麻辣鲜香，牛肉嫩滑，配菜入味', 156, 4.9, true, false],
  ['d004', '红烧肉', 'Chinese braised pork belly, glossy caramelized soy-braised pork belly chunks', 42, 'home', '肥而不腻，入口即化，酱香浓郁', 187, 4.9, true, true],
  ['d005', '西红柿炒鸡蛋', 'Chinese home-style stir-fried tomatoes with soft scrambled eggs', 18, 'home', '酸甜可口，国民家常菜', 326, 4.8, true, true],
  ['d006', '青椒肉丝', 'Chinese shredded pork stir-fried with fresh green peppers', 28, 'home', '青椒脆嫩，肉丝滑嫩，下饭首选', 174, 4.6, true, false],
  ['d007', '回锅肉', 'Twice-cooked pork slices with leeks and green peppers in fermented bean sauce', 36, 'home', '蒜苗飘香，肥而不腻，川味十足', 142, 4.7, true, false],
  ['d008', '土豆烧牛肉', 'Chinese braised beef stew with potatoes in rich brown sauce', 39, 'home', '土豆软糯，牛肉酥烂，汤汁拌饭一绝', 128, 4.7, true, false],
  ['d009', '农家小炒肉', 'Chinese farmhouse stir-fried pork belly with fresh green chili peppers', 34, 'home', '螺丝椒配五花肉，香辣下饭', 165, 4.8, true, false],
  ['d010', '糖醋排骨', 'Sweet and sour pork ribs, glossy caramel glaze topped with sesame seeds', 45, 'meat', '酸甜适口，色泽红亮，老少皆宜', 156, 4.8, true, false],
  ['d011', '可乐鸡翅', 'Cola braised chicken wings, glossy dark glazed wings in a plate', 29, 'meat', '可乐香甜，鸡翅软嫩入味', 143, 4.7, true, false],
  ['d012', '红烧鱼', 'Chinese braised whole fish in soy sauce with scallions, ginger and cilantro', 48, 'meat', '鱼肉鲜嫩，酱香浓郁，今日活鱼现杀', 118, 4.6, false, false],
  ['d013', '白切鸡', 'Chinese white cut chicken, poached chicken pieces with ginger scallion dipping sauce', 36, 'meat', '皮爽肉滑，原汁原味，配姜蓉蘸料', 96, 4.5, true, false],
  ['d014', '麻婆豆腐', 'Mapo tofu, soft tofu cubes in spicy bean sauce with minced pork and Sichuan peppercorns', 22, 'veg', '麻辣鲜香，豆腐嫩滑，经典川菜', 214, 4.8, true, true],
  ['d015', '蒜蓉西兰花', 'Stir-fried broccoli with minced garlic', 18, 'veg', '蒜香浓郁，清爽健康', 132, 4.6, true, false],
  ['d016', '地三鲜', 'Di San Xian, stir-fried potato, eggplant and green pepper in savory brown sauce', 20, 'veg', '茄子土豆青椒，东北经典', 121, 4.7, true, false],
  ['d017', '酸辣土豆丝', 'Hot and sour shredded potatoes, crispy julienned potatoes with dried chilies', 16, 'veg', '酸辣爽脆，开胃下饭', 298, 4.8, true, true],
  ['d018', '干煸四季豆', 'Chinese dry-fried green beans with minced pork', 22, 'veg', '干香入味，咸鲜微辣', 134, 4.6, true, false],
  ['d019', '清炒时蔬', 'Simple plate of stir-fried seasonal green leafy vegetables', 15, 'veg', '当季绿叶菜，清淡爽口', 88, 4.5, true, false],
  ['d020', '紫菜蛋花汤', 'Chinese seaweed and egg drop soup in a white ceramic bowl', 12, 'soup', '清淡鲜美，暖胃开胃', 286, 4.7, true, true],
  ['d021', '玉米排骨汤', 'Sweet corn and pork ribs soup in a ceramic pot', 28, 'soup', '玉米清甜，排骨软烂，滋补靓汤', 152, 4.8, true, false],
  ['d022', '西湖牛肉羹', 'West Lake beef soup, thick silky soup with minced beef and egg white ribbons', 26, 'soup', '滑嫩鲜香，营养丰富', 94, 4.6, true, false],
  ['d023', '冬瓜丸子汤', 'Winter melon and pork meatball soup in a white bowl', 22, 'soup', '丸子 Q 弹，冬瓜清甜', 103, 4.6, true, false],
  ['d024', '米饭', 'Steamed white rice in a Chinese ceramic rice bowl', 2, 'staple', '东北五常大米，软糯香甜', 1205, 4.9, true, true],
  ['d025', '扬州炒饭', 'Yangzhou fried rice with shrimp, ham, egg and green peas', 18, 'staple', '粒粒分明，配料丰富', 167, 4.7, true, false],
  ['d026', '葱油拌面', 'Scallion oil noodles, glossy soy-tossed noodles topped with crispy scallions', 15, 'staple', '葱油焦香，面条劲道', 139, 4.6, true, false],
  ['d027', '韭菜鸡蛋水饺', 'Boiled Chinese dumplings with chive and egg filling arranged on a white plate', 16, 'staple', '皮薄馅大，一份十二只', 158, 4.7, true, false],
  ['d028', '酸梅汤', 'Iced sour plum drink suanmeitang in a tall glass with ice cubes', 8, 'drink', '酸甜解腻，冰爽过瘾', 242, 4.8, true, true],
  ['d029', '柠檬水', 'Fresh lemon water in a glass with lemon slices and ice', 6, 'drink', '现切柠檬，清爽解渴', 198, 4.7, true, false],
  ['d030', '王老吉', 'A chilled red can of Chinese herbal tea with a small glass of herbal tea beside it', 5, 'drink', '清凉降火，罐装 330ml', 176, 4.6, true, false],
]

export const dishes: Dish[] = dishRows.map(
  // subject（图片主体描述）保留在行数据中但不解构：图片已改用本地静态文件
  ([id, name, , price, categoryId, description, sales, rating, onSale, isHot], index) => ({
    id,
    name,
    image: dishImage(id),
    price,
    categoryId,
    description,
    sales,
    rating,
    status: onSale ? 'on' : 'soldout',
    isHot,
    isSignature: categoryId === 'sign',
    sort: index + 1,
  }),
)

export const tables: DiningTable[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `t-a${i + 1}`,
    code: `A${String(i + 1).padStart(2, '0')}`,
    area: '大厅',
    capacity: 4,
    status: 1 as const,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `t-b${i + 1}`,
    code: `B${String(i + 1).padStart(2, '0')}`,
    area: '包间',
    capacity: i < 2 ? 10 : 8,
    status: 1 as const,
  })),
]

export const staff: Staff[] = [
  { id: 's1', username: 'admin', name: '张伟', role: 'admin', status: 1, createdAt: Date.now() - 400 * 86_400_000 },
  { id: 's2', username: 'manager', name: '王芳', role: 'manager', status: 1, createdAt: Date.now() - 300 * 86_400_000 },
  { id: 's3', username: 'waiter01', name: '李强', role: 'waiter', status: 1, createdAt: Date.now() - 200 * 86_400_000 },
  { id: 's4', username: 'waiter02', name: '赵敏', role: 'waiter', status: 1, createdAt: Date.now() - 120 * 86_400_000 },
  { id: 's5', username: 'kitchen01', name: '陈师傅', role: 'kitchen', status: 1, createdAt: Date.now() - 180 * 86_400_000 },
]

const REMARK_POOL = ['不要辣', '少油少盐', '米饭软一点', '有小孩，不要辣', '赶时间，加急', '多加饭', '餐具多备一套', '辣子少放']

const CANCEL_REASON_POOL = ['顾客临时有事离开', '等待时间过长，顾客退单', '顾客点错了重新下单', '菜品原料不足']

const SPEC_TEXTS = ['大份', '小碗', '大碗', '微辣', '中辣', '特辣', '加冰', '去冰']

/** 营业时段：午餐 11:00-13:30 / 晚餐 17:00-20:30 */
function businessTime(rand: () => number, dayStart: number, latest: number): number {
  const lunch = rand() < 0.55
  const hour = lunch ? 11 + Math.floor(rand() * 2.5) : 17 + Math.floor(rand() * 3.5)
  const minute = randInt(rand, 0, 59)
  const ts = dayStart + hour * 3_600_000 + minute * 60_000
  return Math.min(ts, latest)
}

function buildItems(rand: () => number, dishPool: Dish[], withImage: boolean): OrderItem[] {
  const count = randInt(rand, 2, 5)
  const picked: OrderItem[] = []
  for (let i = 0; i < count; i++) {
    const dish = pickWeighted(rand, dishPool, (d) => d.sales + 30)
    const isStaple = dish.categoryId === 'staple'
    const quantity = isStaple ? randInt(rand, 1, 4) : randInt(rand, 1, 2)
    const hasSpec = !isStaple && rand() < 0.25
    const specText = hasSpec ? SPEC_TEXTS[randInt(rand, 0, SPEC_TEXTS.length - 1)] : undefined
    const unitPrice = dish.price + (specText && specText === '大份' ? 12 : 0)
    const existing = picked.find((it) => it.dishId === dish.id && it.specText === specText)
    if (existing) {
      existing.quantity += quantity
      existing.subtotal = existing.unitPrice * existing.quantity
    } else {
      picked.push({
        key: itemKey(dish.id, specText),
        dishId: dish.id,
        name: dish.name,
        image: withImage ? dish.image : undefined,
        specText,
        unitPrice,
        quantity,
        subtotal: unitPrice * quantity,
      })
    }
  }
  return picked
}

function makeOrder(rand: () => number, orderNo: string, table: DiningTable, createdAt: number, dishPool: Dish[], withImage: boolean): Order {
  const items = buildItems(rand, dishPool, withImage)
  const totalAmount = Math.round(items.reduce((sum, it) => sum + it.subtotal, 0) * 100) / 100
  return {
    orderNo,
    tableCode: table.code,
    items,
    itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
    totalAmount,
    remark: rand() < 0.22 ? REMARK_POOL[randInt(rand, 0, REMARK_POOL.length - 1)] : '',
    status: 'PENDING',
    createdAt,
  }
}

/** 为历史订单补全状态时间戳（已完成 / 已取消） */
function completeHistory(order: Order, rand: () => number, cancelled: boolean): Order {
  if (cancelled) {
    order.cancelledAt = order.createdAt + randInt(rand, 2, 10) * 60_000
    order.cancelReason = CANCEL_REASON_POOL[randInt(rand, 0, CANCEL_REASON_POOL.length - 1)]
    order.status = 'CANCELLED'
    return order
  }
  order.acceptedAt = order.createdAt + randInt(rand, 1, 4) * 60_000
  order.cookingAt = order.acceptedAt + randInt(rand, 2, 6) * 60_000
  order.readyAt = order.cookingAt + randInt(rand, 8, 18) * 60_000
  order.completedAt = order.readyAt + randInt(rand, 35, 75) * 60_000
  order.status = 'COMPLETED'
  return order
}

/**
 * 生成近 30 天历史订单 + 今日在途订单。
 * 在途订单（PENDING/ACCEPTED/COOKING/READY）让订单管理和 KDS 一打开就有真实内容。
 */
export function generateOrders(): Order[] {
  const rand = mulberry32(SEED)
  const onSale = dishes.filter((d) => d.status !== 'off')
  const orders: Order[] = []
  const now = Date.now()
  const dayStartOf = (ts: number) => new Date(new Date(ts).setHours(0, 0, 0, 0)).getTime()

  // ---- 近 30 天（含今天）历史订单 ----
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const dayStart = dayStartOf(now) - dayOffset * 86_400_000
    const weekday = new Date(dayStart).getDay()
    const isWeekend = weekday === 0 || weekday === 6
    const base = isWeekend ? 44 : 30
    let count = base + randInt(rand, -8, 10)
    const isToday = dayOffset === 0
    const latest = isToday ? now - 30 * 60_000 : dayStart + 21 * 3_600_000 + 30 * 60_000
    if (isToday) {
      // 按已过去营业时长等比折算，保证打开后台就能看到当日数据
      const elapsed = latest - (dayStart + 10 * 3_600_000)
      count = Math.max(6, Math.round((count * elapsed) / (11.5 * 3_600_000)))
    }
    for (let i = 0; i < count; i++) {
      const table = pickWeighted(rand, tables, () => 1)
      const createdAt = businessTime(rand, dayStart, latest)
      if (createdAt > latest) continue
      const orderNo = `${dateCode(dayStart)}${String(orders.filter((o) => o.createdAt >= dayStart && o.createdAt < dayStart + 86_400_000).length + 1).padStart(4, '0')}`
      const order = makeOrder(rand, orderNo, table, createdAt, onSale, isToday)
      completeHistory(order, rand, rand() < 0.035)
      orders.push(order)
    }
  }

  // ---- 今日在途订单（订单管理 / KDS 演示内容） ----
  const liveSpecs: Array<{ minutesAgo: number; advance: number }> = [
    { minutesAgo: 42, advance: 25 },
    { minutesAgo: 35, advance: 18 },
    { minutesAgo: 28, advance: 6 },
    { minutesAgo: 20, advance: 5 },
    { minutesAgo: 14, advance: 3 },
    { minutesAgo: 9, advance: 0 },
    { minutesAgo: 3, advance: 0 },
  ]
  for (const spec of liveSpecs) {
    const table = pickWeighted(rand, tables, () => 1)
    const createdAt = now - spec.minutesAgo * 60_000
    const orderNo = `${dateCode(now)}${String(900 + liveSpecs.indexOf(spec) + 1).padStart(4, '0')}`
    const order = makeOrder(rand, orderNo, table, createdAt, onSale, true)
    // advance 分钟后订单被推进到某个在途状态（0 = 仍是待接单）
    const flowTs = createdAt + spec.advance * 60_000
    if (spec.advance >= 18) {
      order.status = 'READY'
      order.acceptedAt = createdAt + 2 * 60_000
      order.cookingAt = createdAt + 5 * 60_000
      order.readyAt = flowTs
    } else if (spec.advance >= 5) {
      order.status = 'COOKING'
      order.acceptedAt = createdAt + 2 * 60_000
      order.cookingAt = flowTs
    } else if (spec.advance >= 3) {
      order.status = 'ACCEPTED'
      order.acceptedAt = flowTs
    }
    orders.push(order)
  }

  return orders.sort((a, b) => b.createdAt - a.createdAt)
}

function dateCode(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}
