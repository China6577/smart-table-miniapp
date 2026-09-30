import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import bcrypt from 'bcryptjs'
import { appConfig } from '../../config'
import { CategoryEntity } from '../../database/entities/category.entity'
import { DiningTableEntity } from '../../database/entities/dining-table.entity'
import { DishEntity } from '../../database/entities/dish.entity'
import { SpecGroupEntity } from '../../database/entities/spec-group.entity'
import { SpecOptionEntity } from '../../database/entities/spec-option.entity'
import { StaffEntity } from '../../database/entities/staff.entity'
import { OrderEntity } from '../../database/entities/order.entity'
import { OrderItemEntity } from '../../database/entities/order-item.entity'
import { RedisService } from '../redis/redis.service'
import { OrderNoService } from '../order/order-no.service'
import { yuanToFen } from '../../utils/money'
import { genId } from '../../utils/ids'
import { mulberry32, pickWeighted, randInt } from '../../utils/rng'
import {
  dishImage,
  seedCategories,
  seedDishRows,
  seedSpecGroups,
  seedStaffRows,
  seedTables,
} from './seed-data'

/** 播种随机种子：固定值保证每次生成结果一致（报表数字稳定） */
const SEED = 20260826

const REMARK_POOL = ['不要辣', '少油少盐', '米饭软一点', '有小孩，不要辣', '赶时间，加急', '多加饭', '餐具多备一套', '辣子少放']
const CANCEL_REASON_POOL = ['顾客临时有事离开', '等待时间过长，顾客退单', '顾客点错了重新下单', '菜品原料不足']
const SPEC_TEXTS = ['大份', '小碗', '大碗', '微辣', '中辣', '特辣', '加冰', '去冰']

/**
 * 演示数据播种：
 * - 首次启动（SEED_DEMO=true 且无菜品时）自动播种
 * - 近 30 天历史订单 + 今日在途订单（订单管理 / KDS 一打开就有内容）
 * - /api/dev/reset-demo 可随时重置（需 ALLOW_DEV_ENDPOINTS=true）
 */
@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    private readonly redis: RedisService,
    private readonly orderNoService: OrderNoService,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(DishEntity)
    private readonly dishRepo: Repository<DishEntity>,
    @InjectRepository(SpecGroupEntity)
    private readonly groupRepo: Repository<SpecGroupEntity>,
    @InjectRepository(SpecOptionEntity)
    private readonly optionRepo: Repository<SpecOptionEntity>,
    @InjectRepository(DiningTableEntity)
    private readonly tableRepo: Repository<DiningTableEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly itemRepo: Repository<OrderItemEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!appConfig.seedDemo) return
    const count = await this.dishRepo.count()
    if (count > 0) return
    await this.seed()
  }

  /** 清空全部数据并重新播种（演示重置） */
  async resetDemo(): Promise<void> {
    // 按外键依赖顺序清理
    await this.orderRepo.query('DELETE FROM order_event')
    await this.orderRepo.query('DELETE FROM order_item')
    await this.orderRepo.query('DELETE FROM order_info')
    await this.optionRepo.query('DELETE FROM dish_spec_option')
    await this.groupRepo.query('DELETE FROM dish_spec_group')
    await this.dishRepo.query('DELETE FROM dish')
    await this.categoryRepo.query('DELETE FROM category')
    await this.tableRepo.query('DELETE FROM dining_table')
    await this.staffRepo.query('DELETE FROM staff')

    this.orderNoService.resetBaseline()
    await this.redis.resetSequences()
    await this.seed()
  }

  async seed(): Promise<void> {
    await this.seedCategories()
    const dishes = await this.seedDishes()
    const tables = await this.seedTables()
    await this.seedStaff()
    await this.seedOrders(dishes, tables)

    // 让订单号序列从当前最大流水之后继续，避免撞唯一索引
    this.orderNoService.resetBaseline()
    // eslint-disable-next-line no-console
    console.log('[smart-table] 演示数据播种完成：30 道菜 / 18 桌 / 5 名员工 / 近 30 天订单')
  }

  // ---------------- 基础数据 ----------------

  private async seedCategories(): Promise<void> {
    await this.categoryRepo.save(
      seedCategories.map((row) =>
        this.categoryRepo.create({ id: row.id, name: row.name, sort: row.sort, status: 1 }),
      ),
    )
  }

  private async seedDishes(): Promise<DishEntity[]> {
    const dishes = await this.dishRepo.save(
      seedDishRows.map(([id, name, subject, price, categoryId, description, sales, rating, onSale, isHot], index) =>
        this.dishRepo.create({
          id,
          name,
          imageUrl: dishImage(id),
          price: yuanToFen(price),
          categoryId,
          description,
          sales,
          rating,
          status: onSale ? 1 : 0,
          isHot,
          isSignature: categoryId === 'sign',
          sort: index + 1,
        }),
      ),
    )

    // 规格组 + 选项
    for (const group of seedSpecGroups) {
      await this.groupRepo.save(
        this.groupRepo.create({ id: group.id, dishId: group.dishId, name: group.name, required: true, sort: group.sort }),
      )
      await this.optionRepo.save(
        group.options.map((option, index) =>
          this.optionRepo.create({
            id: option.id,
            groupId: group.id,
            label: option.label,
            priceDelta: option.priceDelta,
            sort: index + 1,
          }),
        ),
      )
    }
    return dishes
  }

  private async seedTables(): Promise<DiningTableEntity[]> {
    return this.tableRepo.save(
      seedTables.map((row) => this.tableRepo.create({ ...row, status: 1, qrCodeUrl: null })),
    )
  }

  private async seedStaff(): Promise<void> {
    const passwordHash = await bcrypt.hash('123456', 10)
    const now = Date.now()
    await this.staffRepo.save(
      seedStaffRows.map(([username, name, role], index) =>
        this.staffRepo.create({
          id: `s${index + 1}`,
          username,
          name,
          role,
          passwordHash,
          status: 1,
          createdAt: new Date(now - (400 - index * 60) * 86_400_000),
        }),
      ),
    )
  }

  // ---------------- 历史订单 ----------------

  /** 近 30 天历史订单（已完成/已取消）+ 今日在途订单（PENDING/ACCEPTED/COOKING/READY） */
  private async seedOrders(dishes: DishEntity[], tables: DiningTableEntity[]): Promise<void> {
    const rand = mulberry32(SEED)
    const onSale = dishes.filter((d) => d.status !== 0)
    const orders: OrderEntity[] = []
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
        const createdAt = businessTime(rand, dayStart, latest)
        if (createdAt > latest) continue
        const orderNo = `${dateCode(dayStart)}${String(daySeq(orders, dayStart) + 1).padStart(4, '0')}`
        orders.push(this.makeOrder(rand, orderNo, pickWeighted(rand, tables, () => 1), createdAt, onSale))
      }
    }

    // 完成历史订单状态（约 3.5% 取消率）
    for (const order of orders) {
      completeHistory(order, rand)
    }

    // ---- 今日在途订单（订单管理 / KDS 演示内容）----
    const liveSpecs: Array<{ minutesAgo: number; advance: number }> = [
      { minutesAgo: 42, advance: 25 },
      { minutesAgo: 35, advance: 18 },
      { minutesAgo: 28, advance: 6 },
      { minutesAgo: 20, advance: 5 },
      { minutesAgo: 14, advance: 3 },
      { minutesAgo: 9, advance: 0 },
      { minutesAgo: 3, advance: 0 },
    ]
    liveSpecs.forEach((spec, index) => {
      const createdAt = now - spec.minutesAgo * 60_000
      const orderNo = `${dateCode(now)}${String(900 + index + 1).padStart(4, '0')}`
      const order = this.makeOrder(rand, orderNo, pickWeighted(rand, tables, () => 1), createdAt, onSale)
      const flowTs = createdAt + spec.advance * 60_000
      if (spec.advance >= 18) {
        order.status = 'READY'
        order.acceptedAt = new Date(createdAt + 2 * 60_000)
        order.cookingAt = new Date(createdAt + 5 * 60_000)
        order.readyAt = new Date(flowTs)
      } else if (spec.advance >= 5) {
        order.status = 'COOKING'
        order.acceptedAt = new Date(createdAt + 2 * 60_000)
        order.cookingAt = new Date(flowTs)
      } else if (spec.advance >= 3) {
        order.status = 'ACCEPTED'
        order.acceptedAt = new Date(flowTs)
      }
      orders.push(order)
    })

    // 分批落库（cascade 保存明细）
    for (let i = 0; i < orders.length; i += 50) {
      await this.orderRepo.save(orders.slice(i, i + 50))
    }
  }

  /** 构造一单（金额单位：分） */
  private makeOrder(rand: () => number, orderNo: string, table: DiningTableEntity, createdAt: number, dishPool: DishEntity[]): OrderEntity {
    const items = this.buildItems(rand, dishPool)
    return this.orderRepo.create({
      id: genId('o'),
      orderNo,
      tableId: table.id,
      tableCode: table.code,
      status: 'PENDING',
      totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      remark: rand() < 0.22 ? REMARK_POOL[randInt(rand, 0, REMARK_POOL.length - 1)] : null,
      createdAt: new Date(createdAt),
      items,
    })
  }

  /** 随机点 2-5 道菜（主食数量偏多；约 25% 概率带规格） */
  private buildItems(rand: () => number, dishPool: DishEntity[]): OrderItemEntity[] {
    const count = randInt(rand, 2, 5)
    const picked: OrderItemEntity[] = []
    for (let i = 0; i < count; i++) {
      const dish = pickWeighted(rand, dishPool, (d) => d.sales + 30)
      const isStaple = dish.categoryId === 'staple'
      const quantity = isStaple ? randInt(rand, 1, 4) : randInt(rand, 1, 2)
      const hasSpec = !isStaple && rand() < 0.25
      const specText = hasSpec ? SPEC_TEXTS[randInt(rand, 0, SPEC_TEXTS.length - 1)] : null
      const unitPrice = specText === '大份' ? dish.price + 1200 : dish.price

      const existing = picked.find((item) => item.dishId === dish.id && item.specText === specText)
      if (existing) {
        existing.quantity += quantity
        existing.subtotal = existing.unitPrice * existing.quantity
        continue
      }
      picked.push(
        this.itemRepo.create({
          id: genId('oi'),
          dishId: dish.id,
          dishName: dish.name,
          imageUrl: dish.imageUrl,
          specText,
          unitPrice,
          quantity,
          subtotal: unitPrice * quantity,
        }),
      )
    }
    return picked
  }
}

/** 营业时段随机时间：午餐 11:00-13:30 / 晚餐 17:00-20:30 */
function businessTime(rand: () => number, dayStart: number, latest: number): number {
  const lunch = rand() < 0.55
  const hour = lunch ? 11 + Math.floor(rand() * 2.5) : 17 + Math.floor(rand() * 3.5)
  const minute = randInt(rand, 0, 59)
  const ts = dayStart + hour * 3_600_000 + minute * 60_000
  return Math.min(ts, latest)
}

/** 为历史订单补全状态时间戳（已完成 / 已取消） */
function completeHistory(order: OrderEntity, rand: () => number): void {
  const created = new Date(order.createdAt).getTime()
  if (rand() < 0.035) {
    order.status = 'CANCELLED'
    order.cancelledAt = new Date(created + randInt(rand, 2, 10) * 60_000)
    order.cancelReason = CANCEL_REASON_POOL[randInt(rand, 0, CANCEL_REASON_POOL.length - 1)]
    return
  }
  order.status = 'COMPLETED'
  order.acceptedAt = new Date(created + randInt(rand, 1, 4) * 60_000)
  order.cookingAt = new Date(order.acceptedAt!.getTime() + randInt(rand, 2, 6) * 60_000)
  order.readyAt = new Date(order.cookingAt!.getTime() + randInt(rand, 8, 18) * 60_000)
  order.completedAt = new Date(order.readyAt!.getTime() + randInt(rand, 35, 75) * 60_000)
}

function dateCode(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

/** 统计某日已有订单数（用于当日流水号） */
function daySeq(orders: OrderEntity[], dayStart: number): number {
  return orders.filter((o) => {
    const ts = new Date(o.createdAt).getTime()
    return ts >= dayStart && ts < dayStart + 86_400_000
  }).length
}
