/** 分类管理：名称 / 排序 / 启停用，含菜品数量统计 */
import { useState } from 'react'
import type { Category } from '@/types/model'
import { categoryApi } from '@/api'
import { ApiError } from '@/api/request'
import { useDataStore } from '@/store/data-store'
import { useUiStore } from '@/store/ui-store'
import { Button } from '@/components/ui/Button'
import { Badge, Empty } from '@/components/ui/feedback'
import { Input } from '@/components/ui/form'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { IconPlus, IconEdit, IconTrash } from '@/components/ui/icons'

export function CategoriesPage() {
  const categories = useDataStore((s) => s.categories)
  const dishes = useDataStore((s) => s.dishes)
  const toast = useUiStore((s) => s.toast)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

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

  const dishCount = (catId: string) => dishes.filter((d) => d.categoryId === catId).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">分类决定顾客端点餐页的左侧导航顺序（数字小的在前）</p>
        <Button onClick={() => setEditing('new')}>
          <IconPlus className="h-4 w-4" />
          新增分类
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {categories.length === 0 ? (
          <Empty text="暂无分类" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">排序</th>
                <th className="px-4 py-3 font-medium">分类名称</th>
                <th className="px-4 py-3 font-medium">菜品数</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="group hover:bg-slate-50/60">
                  <td className="px-4 py-3 tabular-nums text-slate-500">{cat.sort}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{cat.name}</td>
                  <td className="px-4 py-3 text-slate-600">{dishCount(cat.id)}</td>
                  <td className="px-4 py-3">{cat.status === 1 ? <Badge tone="green">启用</Badge> : <Badge tone="gray">停用</Badge>}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(cat)}>
                        <IconEdit className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => setDeleting(cat)}>
                        <IconTrash className="h-4 w-4" />
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
        <CategoryFormModal
          category={editing === 'new' ? null : editing}
          maxSort={Math.max(0, ...categories.map((c) => c.sort))}
          onClose={() => setEditing(null)}
          onDone={() => setEditing(null)}
          mutate={mutate}
        />
      )}

      <ConfirmModal
        open={deleting !== null}
        title="删除分类"
        message={deleting ? <>确定删除分类「{deleting.name}」吗？分类下没有菜品时才能删除。</> : null}
        confirmText="删除"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          const ok = await mutate(() => categoryApi.remove(deleting.id), `分类「${deleting.name}」已删除`)
          if (ok) setDeleting(null)
        }}
      />
    </div>
  )
}

function CategoryFormModal({
  category,
  maxSort,
  onClose,
  onDone,
  mutate,
}: {
  category: Category | null
  maxSort: number
  onClose: () => void
  onDone: () => void
  mutate: (fn: () => Promise<unknown>, success: string) => Promise<boolean>
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [sort, setSort] = useState(String(category?.sort ?? maxSort + 1))
  const [status, setStatus] = useState<'1' | '0'>((category?.status ?? 1) === 1 ? '1' : '0')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!name.trim()) {
      setError('请输入分类名称')
      return
    }
    const sortNum = Number(sort)
    if (Number.isNaN(sortNum) || sortNum < 0) {
      setError('排序必须为非负数字')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const payload = { name: name.trim(), sort: sortNum, status: status === '1' ? (1 as const) : (0 as const) }
      const ok = category
        ? await mutate(() => categoryApi.update(category.id, payload), '分类已更新')
        : await mutate(() => categoryApi.create(payload), '分类已新增')
      if (ok) onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      title={category ? `编辑分类 · ${category.name}` : '新增分类'}
      onClose={onClose}
      width="max-w-md"
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
        <Input label="分类名称" required value={name} error={error} onChange={(e) => setName(e.target.value)} placeholder="如：热菜 / 凉菜 / 汤类" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="排序（小在前）" type="number" min="0" value={sort} onChange={(e) => setSort(e.target.value)} />
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">状态</span>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value as '1' | '0')}
            >
              <option value="1">启用</option>
              <option value="0">停用</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  )
}
