import { appConfig } from '../config/index'
import { request } from './request'
import { delay } from '../utils/delay'
import { categories } from '../mock/categories'
import { dishes } from '../mock/dishes'
import { restaurant } from '../mock/restaurant'
import type { Category, Dish, RestaurantInfo } from '../types/model'

/** 菜单与餐厅信息服务（Mock / 真实接口可切换） */

export async function getRestaurant(): Promise<RestaurantInfo> {
  if (appConfig.useMock) {
    await delay(200)
    return restaurant
  }
  return request<RestaurantInfo>({ url: '/customer/restaurant' })
}

export async function getCategories(): Promise<Category[]> {
  if (appConfig.useMock) {
    await delay(120)
    return categories
  }
  return request<Category[]>({ url: '/customer/categories' })
}

/** 全量菜品（本地按分类/关键词过滤；Phase 3 改为服务端过滤） */
export async function getDishes(): Promise<Dish[]> {
  if (appConfig.useMock) {
    await delay(300)
    return dishes
  }
  return request<Dish[]>({ url: '/customer/dishes' })
}

export async function getDishById(id: string): Promise<Dish | undefined> {
  if (appConfig.useMock) {
    await delay(120)
    return dishes.find((dish) => dish.id === id)
  }
  return request<Dish>({ url: `/customer/dishes/${id}` })
}
