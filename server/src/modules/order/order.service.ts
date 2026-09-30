import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { BusinessException } from '../../common/business.exception'
import { DiningTableEntity } from '../../database/entities/dining-table.entity'
import { DishEntity } from '../../database/entities/dish.entity'
import { OrderEntity } from '../../database/entities/order.entity'
import { OrderEventEntity } from '../../database/entities/order-event.entity'
import { OrderItemEntity } from '../../database/entities/order-item.entity'
import { toOrderDto } from '../../common/mappers'
import { canTransition, isOrderStatus, type OrderStatus } from '../../utils/order-status'
import { yuanToFen } from '../../utils/money'
import { genId } from '../../utils/ids'
import { OrderNoService } from './order-no.service'
import { RealtimeService } from '../realtime/realtime.service'
import type { CancelDto, CreateOrderDto, OrderQueryDto, TransitionDto } from './order.dto'

/** 顾客端「我的订单」返回上限（本桌当日） */
const CUSTOMER_LIST_LIMIT = 50

@Injectable()
export class OrderService {
  constructor(
    private readonly orderNoService: OrderNoService,
    private readonly realtime: RealtimeService,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly itemRepo: Repository<OrderItemEntity>,
    @InjectRepository(OrderEventEntity)
    private readonly eventRepo: Repository<OrderEventEntity>,
    @InjectRepository(DishEntity)
    private readonly dishRepo: Repository<DishEntity>,
    @InjectRepository(DiningTableEntity)
    private readonly tableRepo: Repository<DiningTableEntity>,
  ) {}

  // ---------------- 顾客端 ----------------

  /**
   * 顾客下单（免登录）：
   * - clientToken 幂等：同一令牌重复提交返回首单（防网络重试导致重复下单）
   * - 桌号必须存在且启用；菜品必须在售
   * - 价格策略：无规格时服务端按数据库权威定价；有规格时接受客户端单价
   *   （含规格差价，小程序端由规格组差价计算得出），但不低于基础价
   */
  async submit(dto: CreateOrderDto) {
    if (dto.clientToken) {
      const existed = await this.orderRepo.findOne({
        where: { clientToken: dto.clientToken },
        relations: ['items'],
      })
      if (existed) return toOrderDto(existed)
    }

    const table = await this.tableRepo.findOne({ where: { code: dto.tableCode, status: 1 } })
    if (!table) throw new BusinessException(422, `桌号 ${dto.tableCode} 不存在或已停用，请扫码重试`)

    const dishIds = [...new Set(dto.items.map((item) => item.dishId))]
    const dishes = await this.dishRepo.find({ where: { id: In(dishIds) } })
    const dishMap = new Map(dishes.map((dish) => [dish.id, dish]))

    const items: OrderItemEntity[] = []
    for (const line of dto.items) {
      const dish = dishMap.get(line.dishId)
      if (!dish || dish.status === 0) throw new BusinessException(422, `菜品「${line.dishId}」已下架，请刷新菜单`)
      if (dish.status === 2) throw new BusinessException(422, `「${dish.name}」已售罄，请更换其他菜品`)

      // 规格价由客户端传入（含差价），无规格时以数据库价格为准
      const unitPrice = line.specText
        ? Math.max(yuanToFen(line.unitPrice ?? dish.price), dish.price)
        : dish.price
      items.push(
        this.itemRepo.create({
          id: genId('oi'),
          dishId: dish.id,
          dishName: dish.name,
          imageUrl: dish.imageUrl,
          specText: line.specText ?? null,
          unitPrice,
          quantity: line.count,
          subtotal: unitPrice * line.count,
        }),
      )
    }

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)
    const order = this.orderRepo.create({
      id: genId('o'),
      orderNo: await this.orderNoService.next(),
      tableId: table.id,
      tableCode: table.code,
      status: 'PENDING',
      totalAmount,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      remark: dto.remark?.trim() || null,
      clientToken: dto.clientToken ?? null,
      items,
    })
    await this.orderRepo.save(order)
    await this.writeEvent(order, null, 'PENDING', '顾客')
    const result = toOrderDto(order)
    this.realtime.publishOrder('created', result)
    return result
  }

  /** 本桌当日订单（设计文档 6.2：GET /customer/orders?tableCode=） */
  async listForCustomer(tableCode?: string) {
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .where('o.createdAt >= :dayStart', { dayStart })
      .orderBy('o.createdAt', 'DESC')
      .take(CUSTOMER_LIST_LIMIT)
    if (tableCode) qb.andWhere('o.tableCode = :tableCode', { tableCode })

    const orders = await qb.getMany()
    return orders.map(toOrderDto)
  }

  async detail(orderNo: string) {
    const order = await this.requireOrder(orderNo)
    return toOrderDto(order)
  }

  /** 顾客自助取消：仅「待接单」状态允许（商家已接单后需联系服务员） */
  async customerCancel(orderNo: string) {
    const order = await this.requireOrder(orderNo)
    if (order.status !== 'PENDING') throw new BusinessException(422, '订单已接单，请联系服务员取消')
    return this.applyTransition(order, 'CANCELLED', '顾客自助取消', '顾客')
  }

  // ---------------- 商家端 ----------------

  /** 分页查询：状态 / 日期 / 关键词过滤，按下单时间倒序 */
  async listForAdmin(query: OrderQueryDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 10

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .orderBy('o.createdAt', 'DESC')

    if (query.status) qb.andWhere('o.status = :status', { status: query.status })
    if (query.date) {
      const from = dateStrToTs(query.date)
      qb.andWhere('o.createdAt >= :from AND o.createdAt < :to', { from, to: from + 86_400_000 })
    }
    if (query.keyword) {
      qb.andWhere('(o.orderNo LIKE :kw OR LOWER(o.tableCode) LIKE :kw)', { kw: `%${query.keyword}%` })
    }

    const [list, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    return { list: list.map(toOrderDto), total, page, pageSize }
  }

  /** 通用状态流转（管理端 status 动作） */
  async transition(orderNo: string, dto: TransitionDto, operator: string) {
    const to = assertOrderStatus(dto.to)
    const order = await this.requireOrder(orderNo)
    if (!canTransition(order.status, to)) {
      throw new BusinessException(422, `当前状态「${order.status}」不允许流转到「${to}」`)
    }
    if (to === 'CANCELLED' && !dto.reason?.trim()) throw new BusinessException(422, '取消订单必须填写原因')
    return this.applyTransition(order, to, dto.reason?.trim(), operator)
  }

  /** 取消订单（必须填写原因） */
  async cancel(orderNo: string, dto: CancelDto, operator: string) {
    const order = await this.requireOrder(orderNo)
    if (!canTransition(order.status, 'CANCELLED')) {
      throw new BusinessException(422, `当前状态「${order.status}」不允许取消`)
    }
    return this.applyTransition(order, 'CANCELLED', dto.reason, operator)
  }

  /** KDS 快捷动作「开始制作」：待接单自动先接单，已接单直接进入制作 */
  async start(orderNo: string, operator: string) {
    const order = await this.requireOrder(orderNo)
    if (order.status === 'PENDING') {
      await this.applyTransition(order, 'ACCEPTED', undefined, operator)
      return this.applyTransition(order, 'COOKING', undefined, operator)
    }
    if (order.status === 'ACCEPTED') {
      return this.applyTransition(order, 'COOKING', undefined, operator)
    }
    throw new BusinessException(422, '当前状态不允许开始制作')
  }

  // ---------------- 模拟顾客下单（演示） ----------------

  /** 随机模拟一位顾客扫码下单，供演示环境的订单流演示 */
  async createSimulatedOrder(): Promise<ReturnType<typeof toOrderDto>> {
    const [dishes, tables] = await Promise.all([
      this.dishRepo.find({ where: { status: 1 } }),
      this.tableRepo.find({ where: { status: 1 } }),
    ])
    if (!dishes.length || !tables.length) throw new BusinessException(422, '缺少可用的菜品或餐桌数据')

    const count = 2 + Math.floor(Math.random() * 4)
    const picked = new Map<string, OrderItemEntity>()
    for (let i = 0; i < count; i++) {
      const dish = dishes[Math.floor(Math.random() * dishes.length)]
      const quantity = dish.categoryId === 'staple' ? 1 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2)
      const specText =
        Math.random() < 0.2
          ? dish.categoryId === 'staple'
            ? Math.random() < 0.5
              ? '小碗'
              : '大碗'
            : Math.random() < 0.5
              ? '微辣'
              : '中辣'
          : undefined
      const unitPrice = specText === '大碗' ? dish.price + (dish.price > 10 ? 1200 : 100) : dish.price
      const key = specText ? `${dish.id}#${specText}` : dish.id
      const existing = picked.get(key)
      if (existing) {
        existing.quantity += quantity
        existing.subtotal = existing.unitPrice * existing.quantity
      } else {
        picked.set(
          key,
          this.itemRepo.create({
            id: genId('oi'),
            dishId: dish.id,
            dishName: dish.name,
            imageUrl: dish.imageUrl,
            specText: specText ?? null,
            unitPrice,
            quantity,
            subtotal: unitPrice * quantity,
          }),
        )
      }
    }

    const table = tables[Math.floor(Math.random() * tables.length)]
    const items = [...picked.values()]
    const remarks = ['不要辣', '少油少盐', '赶时间，麻烦快一点', '有小孩，口味清淡', '多加饭', '餐具多备一套']
    const order = this.orderRepo.create({
      id: genId('o'),
      orderNo: await this.orderNoService.next(),
      tableId: table.id,
      tableCode: table.code,
      status: 'PENDING',
      totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      remark: Math.random() < 0.25 ? remarks[Math.floor(Math.random() * remarks.length)] : null,
      items,
    })
    await this.orderRepo.save(order)
    await this.writeEvent(order, null, 'PENDING', '模拟顾客')
    const dto = toOrderDto(order)
    this.realtime.publishOrder('created', dto)
    return dto
  }

  // ---------------- 内部工具 ----------------

  private async requireOrder(orderNo: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({ where: { orderNo }, relations: ['items'] })
    if (!order) throw new BusinessException(404, '订单不存在')
    return order
  }

  /** 执行状态机流转：写时间戳 + 落审计事件 */
  private async applyTransition(order: OrderEntity, to: OrderStatus, reason?: string, operator = '系统'): Promise<ReturnType<typeof toOrderDto>> {
    const from = order.status
    const now = new Date()
    switch (to) {
      case 'ACCEPTED':
        order.acceptedAt = now
        break
      case 'COOKING':
        order.cookingAt = now
        break
      case 'READY':
        order.readyAt = now
        break
      case 'COMPLETED':
        order.completedAt = now
        break
      case 'CANCELLED':
        order.cancelledAt = now
        if (reason) order.cancelReason = reason
        break
    }
    order.status = to
    await this.orderRepo.save(order)
    await this.writeEvent(order, from, to, operator)
    const dto = toOrderDto(order)
    this.realtime.publishOrder('status', dto)
    return dto
  }

  private async writeEvent(order: OrderEntity, from: OrderStatus | null, to: OrderStatus, operator: string): Promise<void> {
    await this.eventRepo.save(
      this.eventRepo.create({
        id: genId('oe'),
        orderId: order.id,
        fromStatus: from,
        toStatus: to,
        operator,
      }),
    )
  }
}

/** YYYY-MM-DD → 当日 0 点时间戳 */
export function dateStrToTs(date: string): number {
  const ts = new Date(`${date}T00:00:00`).getTime()
  if (!Number.isFinite(ts)) throw new BusinessException(422, '日期格式不合法')
  return ts
}

/** 目标状态合法性校验（同时完成类型收窄） */
function assertOrderStatus(value: string): OrderStatus {
  if (!isOrderStatus(value)) throw new BusinessException(422, '非法的目标状态')
  return value
}
