/**
 * 演示种子数据定义（与前端 Mock 完全一致，保证两端体验统一）：
 * - 7 个分类 / 30 道菜品（真实食物摄影图 URL 同源生成）
 * - 18 张餐桌 / 5 名员工（密码统一 123456，bcrypt 哈希存储）
 * - 规格组与小程序 mock 对齐（份量 / 辣度 / 温度）
 */

import { appConfig } from '../../config'

/** 菜品演示图：本地静态文件（server/public/dishes/{id}.jpg），由 /api/static 托管，短 URL 稳定离线可用 */
export function dishImage(id: string): string {
  return `${appConfig.publicBaseUrl}/api/static/dishes/${id}.jpg`
}

export interface SeedCategory {
  id: string
  name: string
  sort: number
}

export const seedCategories: SeedCategory[] = [
  { id: 'sign', name: '招牌菜', sort: 1 },
  { id: 'home', name: '家常菜', sort: 2 },
  { id: 'meat', name: '荤菜', sort: 3 },
  { id: 'veg', name: '素菜', sort: 4 },
  { id: 'soup', name: '汤类', sort: 5 },
  { id: 'staple', name: '主食', sort: 6 },
  { id: 'drink', name: '饮料', sort: 7 },
]

/** [id, 名称, 图片主体, 价格(元), 分类, 简介, 月销, 评分, 在售, 热门] */
export type SeedDishRow = [string, string, string, number, string, string, number, number, boolean, boolean]

export const seedDishRows: SeedDishRow[] = [
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

/** 规格组（id 与小程序 mock 对齐；priceDelta 单位：分） */
export interface SeedSpecGroup {
  dishId: string
  id: string
  name: string
  sort: number
  options: Array<{ id: string; label: string; priceDelta: number }>
}

export const seedSpecGroups: SeedSpecGroup[] = [
  {
    dishId: 'd001',
    id: 'd001-size',
    name: '份量',
    sort: 1,
    options: [
      { id: 'd001-size-a', label: '标准份', priceDelta: 0 },
      { id: 'd001-size-b', label: '大份', priceDelta: 1200 },
    ],
  },
  {
    dishId: 'd003',
    id: 'd003-spicy',
    name: '辣度',
    sort: 1,
    options: [
      { id: 'd003-spicy-a', label: '微辣', priceDelta: 0 },
      { id: 'd003-spicy-b', label: '中辣', priceDelta: 0 },
      { id: 'd003-spicy-c', label: '特辣', priceDelta: 0 },
    ],
  },
  {
    dishId: 'd024',
    id: 'd024-size',
    name: '份量',
    sort: 1,
    options: [
      { id: 'd024-size-a', label: '小碗', priceDelta: 0 },
      { id: 'd024-size-b', label: '大碗', priceDelta: 100 },
    ],
  },
  {
    dishId: 'd028',
    id: 'd028-temp',
    name: '温度',
    sort: 1,
    options: [
      { id: 'd028-temp-a', label: '常温', priceDelta: 0 },
      { id: 'd028-temp-b', label: '去冰', priceDelta: 0 },
      { id: 'd028-temp-c', label: '冰镇', priceDelta: 0 },
    ],
  },
  {
    dishId: 'd029',
    id: 'd029-temp',
    name: '温度',
    sort: 1,
    options: [
      { id: 'd029-temp-a', label: '常温', priceDelta: 0 },
      { id: 'd029-temp-b', label: '冰镇', priceDelta: 0 },
    ],
  },
  {
    dishId: 'd030',
    id: 'd030-temp',
    name: '温度',
    sort: 1,
    options: [
      { id: 'd030-temp-a', label: '常温', priceDelta: 0 },
      { id: 'd030-temp-b', label: '冰镇', priceDelta: 0 },
    ],
  },
]

/** [username, 姓名, 角色]（密码统一 123456，bcrypt 哈希） */
export const seedStaffRows: Array<[string, string, string]> = [
  ['admin', '张伟', 'admin'],
  ['manager', '王芳', 'manager'],
  ['waiter01', '李强', 'waiter'],
  ['waiter02', '赵敏', 'waiter'],
  ['kitchen01', '陈师傅', 'kitchen'],
]

export interface SeedTable {
  id: string
  code: string
  area: string
  capacity: number
}

export const seedTables: SeedTable[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `t-a${i + 1}`,
    code: `A${String(i + 1).padStart(2, '0')}`,
    area: '大厅',
    capacity: 4,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `t-b${i + 1}`,
    code: `B${String(i + 1).padStart(2, '0')}`,
    area: '包间',
    capacity: i < 2 ? 10 : 8,
  })),
]
