import type { Category } from '../types/model'

/**
 * 菜品分类：hot 为虚拟分类（取菜品 isHot 标记聚合），其余为真实分类。
 */
export const categories: Category[] = [
  { id: 'hot', name: '热门推荐' },
  { id: 'sign', name: '招牌菜' },
  { id: 'home', name: '家常菜' },
  { id: 'meat', name: '荤菜' },
  { id: 'veg', name: '素菜' },
  { id: 'soup', name: '汤类' },
  { id: 'staple', name: '主食' },
  { id: 'drink', name: '饮料' },
]
