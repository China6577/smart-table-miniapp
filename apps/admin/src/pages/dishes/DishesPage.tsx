/** 菜品管理：列表筛选、新增/编辑、上下架/售罄切换、删除 */
import { useMemo, useState } from 'react'
import type { Dish } from '@/types/model'
import { dishApi } from '@/api'
import { ApiError } from '@/api/request'
import { useDataStore } from '@/store/data-store'
import { useUiStore } from '@/store/ui-store'
import { Button } from '@/components/ui/Button'
import { Badge, Empty } from '@/components/ui/feedback'
import { Input, Select, Textarea } from '@/components/ui/form'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { IconPlus, IconSearch } from '@/components/ui/icons'
import { formatAmount } from '@/utils/format'

interface DishFormValues {
  name: string
  categoryId: string
  price: string
  description: string
  image: string
  status: Dish['status']
  isHot: boolean
  isSignature: boolean
}

/** 规格组草稿（表单编辑态；priceDelta 用字符串承接输入，提交时归一化） */
interface SpecGroupDraft {
  name: string
  options: Array<{ label: string; priceDelta: string }>
}

/** 常用规格一键模板：按中餐家常菜场景整理，选项可自由增删改价 */
const SPEC_PRESETS: Array<{ label: string; draft: SpecGroupDraft }> = [
  {
    label: '份量',
    draft: {
      name: '份量',
      // 基础价即小份价（差价不允许为负），标准/大份按加价递增，商家可自由调整
      options: [
        { label: '小份', priceDelta: '0' },
        { label: '标准份', priceDelta: '3' },
        { label: '大份', priceDelta: '6' },
      ],
    },
  },
  {
    label: '辣度',
    draft: {
      name: '辣度',
      options: [
        { label: '不辣', priceDelta: '0' },
        { label: '微辣', priceDelta: '0' },
        { label: '中辣', priceDelta: '0' },
        { label: '特辣', priceDelta: '0' },
      ],
    },
  },
  {
    label: '温度',
    draft: {
      name: '温度',
      options: [
        { label: '冰', priceDelta: '0' },
        { label: '常温', priceDelta: '0' },
        { label: '热', priceDelta: '0' },
      ],
    },
  },
  {
    label: '甜度',
    draft: {
      name: '甜度',
      options: [
        { label: '无糖', priceDelta: '0' },
        { label: '三分糖', priceDelta: '0' },
        { label: '半糖', priceDelta: '0' },
        { label: '七分糖', priceDelta: '0' },
        { label: '全糖', priceDelta: '0' },
      ],
    },
  },
  {
    label: '米饭',
    draft: {
      name: '米饭',
      options: [
        { label: '小碗', priceDelta: '0' },
        { label: '大碗', priceDelta: '1' },
      ],
    },
  },
  {
    label: '面条软硬',
    draft: {
      name: '面条软硬',
      options: [
        { label: '偏硬', priceDelta: '0' },
        { label: '适中', priceDelta: '0' },
        { label: '偏软', priceDelta: '0' },
      ],
    },
  },
  {
    label: '忌口',
    draft: {
      name: '忌口',
      options: [
        { label: '正常', priceDelta: '0' },
        { label: '免葱', priceDelta: '0' },
        { label: '免蒜', priceDelta: '0' },
        { label: '免香菜', priceDelta: '0' },
      ],
    },
  },
  {
    label: '加料',
    draft: {
      name: '加料',
      options: [
        { label: '不加', priceDelta: '0' },
        { label: '加蛋', priceDelta: '3' },
        { label: '加肉', priceDelta: '5' },
        { label: '加香肠', priceDelta: '4' },
      ],
    },
  },
]

const EMPTY_FORM: DishFormValues = {
  name: '',
  categoryId: '',
  price: '',
  description: '',
  image: '',
  status: 'on',
  isHot: false,
  isSignature: false,
}

export function DishesPage() {
  const dishes = useDataStore((s) => s.dishes)
  const categories = useDataStore((s) => s.categories)
  const toast = useUiStore((s) => s.toast)
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState<Dish | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Dish | null>(null)

  const filtered = useMemo(() => {
    const kw = keyword.trim()
    return dishes.filter((d) => {
      if (kw && !d.name.includes(kw)) return false
      if (categoryId && d.categoryId !== categoryId) return false
      if (statusFilter && d.status !== statusFilter) return false
      return true
    })
  }, [dishes, keyword, categoryId, statusFilter])

  async function mutate(fn: () => Promise<unknown>, success: string) {
    try {
      await fn()
      toast(success)
      return true
    } catch (e) {
      toast(e instanceof ApiError ? e.message : '操作失败', 'error')
      return false
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-56 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="搜索菜品名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <Select
          className="w-32"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={[{ value: '', label: '全部分类' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <Select
          className="w-32"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: '全部状态' },
            { value: 'on', label: '在售' },
            { value: 'soldout', label: '售罄' },
            { value: 'off', label: '已下架' },
          ]}
        />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400">共 {filtered.length} 道菜品</span>
          <Button onClick={() => setEditing('new')}>
            <IconPlus className="h-4 w-4" />
            新增菜品
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <Empty text="暂无符合条件的菜品" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">菜品</th>
                <th className="px-4 py-3 font-medium">分类</th>
                <th className="px-4 py-3 font-medium">价格</th>
                <th className="px-4 py-3 font-medium">月销</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((dish) => (
                <tr key={dish.id} className="group hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={dish.image} alt={dish.name} className="h-12 w-12 rounded-lg object-cover" loading="lazy" />
                      <div>
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          {dish.name}
                          {dish.isHot && <Badge tone="orange">热门</Badge>}
                          {dish.isSignature && <Badge tone="green">招牌</Badge>}
                        </div>
                        <div className="max-w-56 truncate text-xs text-slate-400">{dish.description}</div>
                        {dish.specs?.length ? (
                          <div className="mt-0.5 text-xs text-emerald-600">
                            规格：{dish.specs.map((g) => g.name).join(' / ')}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{categories.find((c) => c.id === dish.categoryId)?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium tabular-nums text-slate-800">{formatAmount(dish.price)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{dish.sales}</td>
                  <td className="px-4 py-3">
                    <DishStatusBadge status={dish.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
                      {dish.status === 'on' ? (
                        <Button size="sm" variant="outline" onClick={() => mutate(() => dishApi.update(dish.id, { status: 'soldout' }), `「${dish.name}」已标记售罄`)}>
                          标记售罄
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => mutate(() => dishApi.update(dish.id, { status: 'on' }), `「${dish.name}」已上架`)}>
                          上架
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setEditing(dish)}>
                        编辑
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => setDeleting(dish)}>
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing !== null && (
        <DishFormModal
          dish={editing === 'new' ? null : editing}
          categories={categories.filter((c) => c.status === 1)}
          onClose={() => setEditing(null)}
          onDone={() => setEditing(null)}
          mutate={mutate}
        />
      )}

      <ConfirmModal
        open={deleting !== null}
        title="删除菜品"
        message={
          deleting ? (
            <>
              确定删除菜品「{deleting.name}」吗？
              <br />
              删除后顾客端将立即不可见，历史订单中的记录不受影响。
            </>
          ) : null
        }
        confirmText="删除"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          const ok = await mutate(() => dishApi.remove(deleting.id), `「${deleting.name}」已删除`)
          if (ok) setDeleting(null)
        }}
      />
    </div>
  )
}

function DishStatusBadge({ status }: { status: Dish['status'] }) {
  if (status === 'on') return <Badge tone="green">在售</Badge>
  if (status === 'soldout') return <Badge tone="amber">售罄</Badge>
  return <Badge tone="gray">已下架</Badge>
}

function DishFormModal({
  dish,
  categories,
  onClose,
  onDone,
  mutate,
}: {
  dish: Dish | null
  categories: Array<{ id: string; name: string }>
  onClose: () => void
  onDone: () => void
  mutate: (fn: () => Promise<unknown>, success: string) => Promise<boolean>
}) {
  const [form, setForm] = useState<DishFormValues>(() =>
    dish
      ? {
          name: dish.name,
          categoryId: dish.categoryId,
          price: String(dish.price),
          description: dish.description,
          image: dish.image,
          status: dish.status,
          isHot: dish.isHot,
          isSignature: dish.isSignature,
        }
      : { ...EMPTY_FORM, categoryId: categories[0]?.id ?? '' },
  )
  const [specs, setSpecs] = useState<SpecGroupDraft[]>(() =>
    dish?.specs?.map((g) => ({
      name: g.name,
      options: g.options.map((o) => ({ label: o.label, priceDelta: String(o.priceDelta) })),
    })) ?? [],
  )
  const [errors, setErrors] = useState<Partial<Record<keyof DishFormValues, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  function validate(): boolean {
    const next: Partial<Record<keyof DishFormValues, string>> = {}
    if (!form.name.trim()) next.name = '请输入菜品名称'
    if (!form.categoryId) next.categoryId = '请选择分类'
    const price = Number(form.price)
    if (!form.price || Number.isNaN(price) || price <= 0) next.price = '请输入有效价格'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit() {
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        price: Number(form.price),
        description: form.description.trim(),
        image: form.image.trim(),
        status: form.status,
        isHot: form.isHot,
        isSignature: form.isSignature,
      }
      // 规格归一化：剔除未填名称的行；差价非法值按 0 处理
      const specPayload = specs
        .map((g) => ({
          name: g.name.trim(),
          options: g.options
            .map((o) => ({ label: o.label.trim(), priceDelta: Number(o.priceDelta) || 0 }))
            .filter((o) => o.label),
        }))
        .filter((g) => g.name && g.options.length > 0)

      const ok = await mutate(async () => {
        let dishId = dish?.id
        if (dish) {
          await dishApi.update(dish.id, payload)
        } else {
          const created = await dishApi.create(payload)
          dishId = created.id
        }
        // 整组替换：空数组 = 清除全部规格
        if (dishId) await dishApi.updateSpecs(dishId, specPayload)
      }, dish ? `「${payload.name}」已更新` : `「${payload.name}」已新增`)
      if (ok) onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      title={dish ? `编辑菜品 · ${dish.name}` : '新增菜品'}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={submit} loading={submitting}>
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="shrink-0">
            {form.image ? (
              <img src={form.image} alt="预览" className="h-24 w-24 rounded-xl border border-slate-200 object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
                暂无图片
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4">
            <Input label="菜品名称" required value={form.name} error={errors.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="如：宫保鸡丁" />
            <Input
              label="图片地址"
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="留空自动按名称生成菜单图"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="分类"
            required
            value={form.categoryId}
            error={errors.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Input
            label="价格（元）"
            required
            type="number"
            min="0.01"
            step="0.01"
            value={form.price}
            error={errors.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="如 38"
          />
        </div>
        <Textarea label="简介" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="一句话介绍口味与特色" />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="上架状态"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Dish['status'] }))}
            options={[
              { value: 'on', label: '在售' },
              { value: 'soldout', label: '售罄（今日卖完）' },
              { value: 'off', label: '下架（长期不卖）' },
            ]}
          />
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">推荐标签</span>
            <div className="flex h-10 items-center gap-4">
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
                <input type="checkbox" className="h-4 w-4 accent-orange-500" checked={form.isHot} onChange={(e) => setForm((f) => ({ ...f, isHot: e.target.checked }))} />
                热门推荐
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
                <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={form.isSignature} onChange={(e) => setForm((f) => ({ ...f, isSignature: e.target.checked }))} />
                招牌菜
              </label>
            </div>
          </div>
        </div>

        {/* 规格（大份小份 / 辣度等）：整组编辑，保存时全量替换 */}
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-sm font-medium text-slate-700">规格</span>
              <span className="ml-2 text-xs text-slate-400">顾客加购时必选，如大份/小份、辣度</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* 已有同名组时不再展示该模板，避免重复组名产生歧义数据 */}
              {SPEC_PRESETS.filter((preset) => !specs.some((g) => g.name.trim() === preset.draft.name)).map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500 transition-colors hover:border-emerald-400 hover:text-emerald-600"
                  onClick={() => setSpecs((s) => [...s, JSON.parse(JSON.stringify(preset.draft))])}
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>

          {specs.length === 0 ? (
            <div className="mt-3 rounded-lg bg-slate-50 py-4 text-center text-xs text-slate-400">
              暂无规格，顾客直接按基础价加购；点击上方模板快速添加
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {specs.map((group, gi) => (
                <div key={gi} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      className="h-8 w-36 rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-emerald-500 focus:outline-none"
                      value={group.name}
                      placeholder="规格名（如份量）"
                      onChange={(e) =>
                        setSpecs((s) => s.map((g, i) => (i === gi ? { ...g, name: e.target.value } : g)))
                      }
                    />
                    <span className="text-xs text-slate-400">{group.options.length} 个选项</span>
                    <button
                      type="button"
                      className="ml-auto text-xs text-red-400 transition-colors hover:text-red-500"
                      onClick={() => setSpecs((s) => s.filter((_, i) => i !== gi))}
                    >
                      删除组
                    </button>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {group.options.map((option, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-emerald-500 focus:outline-none"
                          value={option.label}
                          placeholder="选项名（如大份）"
                          onChange={(e) =>
                            setSpecs((s) =>
                              s.map((g, i) =>
                                i === gi
                                  ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, label: e.target.value } : o)) }
                                  : g,
                              ),
                            )
                          }
                        />
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="text-xs text-slate-400">加价</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-sm tabular-nums focus:border-emerald-500 focus:outline-none"
                            value={option.priceDelta}
                            onChange={(e) =>
                              setSpecs((s) =>
                                s.map((g, i) =>
                                  i === gi
                                    ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, priceDelta: e.target.value } : o)) }
                                    : g,
                                ),
                              )
                            }
                          />
                          <span className="text-xs text-slate-400">元</span>
                        </div>
                        <button
                          type="button"
                          className="text-sm text-slate-400 transition-colors hover:text-red-500"
                          onClick={() =>
                            setSpecs((s) =>
                              s.map((g, i) => (i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g)),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs text-emerald-600 transition-colors hover:text-emerald-700"
                    onClick={() =>
                      setSpecs((s) =>
                        s.map((g, i) => (i === gi ? { ...g, options: [...g.options, { label: '', priceDelta: '0' }] } : g)),
                      )
                    }
                  >
                    + 添加选项
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-xs text-slate-500 transition-colors hover:text-emerald-600"
                onClick={() => setSpecs((s) => [...s, { name: '', options: [{ label: '', priceDelta: '0' }] }])}
              >
                + 添加规格组
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
