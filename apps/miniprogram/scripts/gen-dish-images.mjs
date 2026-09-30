import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * 生成 mock/dish-images.ts：30 道菜品的演示图片 URL。
 * 图片为预生成的本地静态文件（server/public/dishes/{id}.jpg，由后端 /api/static 托管），
 * 与数据库种子同源，mock/http 双模式体验一致。
 * 重新生成：pnpm gen:images
 */

const dishes = [
  { id: 'd001', subject: 'Kung Pao chicken, diced chicken stir-fried with roasted peanuts, dried red chilies and scallions' },
  { id: 'd002', subject: 'Yu-Xiang shredded pork, silky shredded pork in sweet and sour garlic sauce with wood ear mushrooms, carrots and pickled chili' },
  { id: 'd003', subject: 'Sichuan boiled beef slices in red chili oil broth topped with dried chilies and Sichuan peppercorns over bean sprouts' },
  { id: 'd004', subject: 'Chinese braised pork belly, glossy caramelized soy-braised pork belly chunks' },
  { id: 'd005', subject: 'Chinese home-style stir-fried tomatoes with soft scrambled eggs' },
  { id: 'd006', subject: 'Chinese shredded pork stir-fried with fresh green peppers' },
  { id: 'd007', subject: 'Twice-cooked pork slices with leeks and green peppers in fermented bean sauce' },
  { id: 'd008', subject: 'Chinese braised beef stew with potatoes in rich brown sauce' },
  { id: 'd009', subject: 'Chinese farmhouse stir-fried pork belly with fresh green chili peppers' },
  { id: 'd010', subject: 'Sweet and sour pork ribs, glossy caramel glaze topped with sesame seeds' },
  { id: 'd011', subject: 'Cola braised chicken wings, glossy dark glazed wings in a plate' },
  { id: 'd012', subject: 'Chinese braised whole fish in soy sauce with scallions, ginger and cilantro' },
  { id: 'd013', subject: 'Chinese white cut chicken, poached chicken pieces with ginger scallion dipping sauce' },
  { id: 'd014', subject: 'Mapo tofu, soft tofu cubes in spicy bean sauce with minced pork and Sichuan peppercorns' },
  { id: 'd015', subject: 'Stir-fried broccoli with minced garlic' },
  { id: 'd016', subject: 'Di San Xian, stir-fried potato, eggplant and green pepper in savory brown sauce' },
  { id: 'd017', subject: 'Hot and sour shredded potatoes, crispy julienned potatoes with dried chilies' },
  { id: 'd018', subject: 'Chinese dry-fried green beans with minced pork' },
  { id: 'd019', subject: 'Simple plate of stir-fried seasonal green leafy vegetables' },
  { id: 'd020', subject: 'Chinese seaweed and egg drop soup in a white ceramic bowl' },
  { id: 'd021', subject: 'Sweet corn and pork ribs soup in a ceramic pot' },
  { id: 'd022', subject: 'West Lake beef soup, thick silky soup with minced beef and egg white ribbons' },
  { id: 'd023', subject: 'Winter melon and pork meatball soup in a white bowl' },
  { id: 'd024', subject: 'Steamed white rice in a Chinese ceramic rice bowl' },
  { id: 'd025', subject: 'Yangzhou fried rice with shrimp, ham, egg and green peas' },
  { id: 'd026', subject: 'Scallion oil noodles, glossy soy-tossed noodles topped with crispy scallions' },
  { id: 'd027', subject: 'Boiled Chinese dumplings with chive and egg filling arranged on a white plate' },
  { id: 'd028', subject: 'Iced sour plum drink suanmeitang in a tall glass with ice cubes' },
  { id: 'd029', subject: 'Fresh lemon water in a glass with lemon slices and ice' },
  { id: 'd030', subject: 'A chilled red can of Chinese herbal tea with a small glass of herbal tea beside it' },
]

const API_BASE = 'http://localhost:3100'

function buildImageUrl(id) {
  return `${API_BASE}/api/static/dishes/${id}.jpg`
}

const lines = dishes.map((dish) => `  ${dish.id}: '${buildImageUrl(dish.subject)}',`)

const content = `// 本文件由 scripts/gen-dish-images.mjs 自动生成，请勿手工修改
// 重新生成：pnpm gen:images

export const dishImages: Record<string, string> = {
${lines.join('\n')}
}
`

writeFileSync(join(__dirname, '..', 'miniprogram', 'mock', 'dish-images.ts'), content, 'utf8')
console.log(`Generated ${dishes.length} dish image urls -> miniprogram/mock/dish-images.ts`)
