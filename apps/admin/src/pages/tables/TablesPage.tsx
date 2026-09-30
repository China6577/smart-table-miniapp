/** 桌号管理：大厅/包间分组展示、增删改、桌码二维码生成（绑定桌号参数） */
import { useMemo, useState } from 'react'
import QRCode from 'qrcode'
import type { DiningTable } from '@/types/model'
import { tableApi } from '@/api'
import { ApiError } from '@/api/request'
import { useDataStore } from '@/store/data-store'
import { useUiStore } from '@/store/ui-store'
import { Button } from '@/components/ui/Button'
import { Badge, Empty } from '@/components/ui/feedback'
import { Input, Select } from '@/components/ui/form'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { IconPlus, IconEdit, IconTrash, IconQr } from '@/components/ui/icons'

export function TablesPage() {
  const tables = useDataStore((s) => s.tables)
  const toast = useUiStore((s) => s.toast)
  const [editing, setEditing] = useState<DiningTable | 'new' | null>(null)
  const [deleting, setDeleting] = useState<DiningTable | null>(null)
  const [qrTable, setQrTable] = useState<DiningTable | null>(null)

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

  const grouped = useMemo(() => {
    const map = new Map<string, DiningTable[]>()
    for (const table of tables) {
      const list = map.get(table.area) ?? []
      list.push(table)
      map.set(table.area, list)
    }
    return [...map.entries()]
  }, [tables])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">顾客扫桌上二维码进入小程序，桌码自动绑定桌号（如 table=A01）；打印后贴在对应桌面即可</p>
        <Button onClick={() => setEditing('new')}>
          <IconPlus className="h-4 w-4" />
          新增桌号
        </Button>
      </div>

      {tables.length === 0 ? (
        <Empty text="暂无餐桌，请新增桌号" />
      ) : (
        grouped.map(([area, list]) => (
          <section key={area}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              {area}
              <span className="font-normal text-slate-400">（{list.length} 桌）</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {list.map((table) => (
                <div key={table.id} className="group relative rounded-xl border border-slate-200 bg-white p-4 text-center hover:border-emerald-300 hover:shadow-sm">
                  <div className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold ${table.status === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {table.code}
                  </div>
                  <div className="text-xs text-slate-400">可坐 {table.capacity} 人</div>
                  {table.status === 0 ? (
                    <Badge tone="gray" className="mt-2">
                      已停用
                    </Badge>
                  ) : (
                    <Badge tone="green" className="mt-2">
                      使用中
                    </Badge>
                  )}
                  <div className="mt-3 flex justify-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="查看桌码" onClick={() => setQrTable(table)}>
                      <IconQr className="h-4 w-4" />
                    </button>
                    <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="编辑" onClick={() => setEditing(table)}>
                      <IconEdit className="h-4 w-4" />
                    </button>
                    <button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="删除" onClick={() => setDeleting(table)}>
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {editing !== null && (
        <TableFormModal
          table={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => setEditing(null)}
          mutate={mutate}
        />
      )}

      <ConfirmModal
        open={deleting !== null}
        title="删除桌号"
        message={deleting ? <>确定删除桌号 <b className="text-slate-800">{deleting.code}</b> 吗？删除后该桌二维码将失效。</> : null}
        confirmText="删除"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          const ok = await mutate(() => tableApi.remove(deleting.id), `桌号 ${deleting.code} 已删除`)
          if (ok) setDeleting(null)
        }}
      />

      <QrModal table={qrTable} onClose={() => setQrTable(null)} />
    </div>
  )
}

function TableFormModal({
  table,
  onClose,
  onDone,
  mutate,
}: {
  table: DiningTable | null
  onClose: () => void
  onDone: () => void
  mutate: (fn: () => Promise<unknown>, success: string) => Promise<boolean>
}) {
  const [form, setForm] = useState({
    code: table?.code ?? '',
    area: table?.area ?? '大厅',
    capacity: String(table?.capacity ?? 4),
    status: table ? (table.status === 1 ? '1' : '0') : '1',
  })
  const [errors, setErrors] = useState<{ code?: string; capacity?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    const next: typeof errors = {}
    if (!/^[A-Za-z]\d{1,2}$/.test(form.code.trim())) next.code = '桌号格式为字母+数字，如 A01'
    const capacity = Number(form.capacity)
    if (Number.isNaN(capacity) || capacity < 1 || capacity > 30) next.capacity = '可坐人数应为 1-30'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setSubmitting(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        area: form.area,
        capacity,
        status: form.status === '1' ? (1 as const) : (0 as const),
      }
      const ok = table
        ? await mutate(() => tableApi.update(table.id, payload), `桌号 ${payload.code} 已更新`)
        : await mutate(() => tableApi.create(payload), `桌号 ${payload.code} 已新增`)
      if (ok) onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      title={table ? `编辑桌号 · ${table.code}` : '新增桌号'}
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
        <Input
          label="桌号"
          required
          value={form.code}
          error={errors.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          placeholder="如 A01 / B12"
          hint="A 区为大厅，B 区为包间（建议）"
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="区域"
            value={form.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            options={[
              { value: '大厅', label: '大厅' },
              { value: '包间', label: '包间' },
              { value: '露台', label: '露台' },
            ]}
          />
          <Input label="可坐人数" required type="number" min="1" max="30" value={form.capacity} error={errors.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">状态</span>
          <div className="flex h-10 items-center gap-4">
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
              <input type="radio" className="accent-emerald-600" name="table-status" checked={form.status === '1'} onChange={() => setForm((f) => ({ ...f, status: '1' }))} />
              启用
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
              <input type="radio" className="accent-emerald-600" name="table-status" checked={form.status === '0'} onChange={() => setForm((f) => ({ ...f, status: '0' }))} />
              停用
            </label>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/** 桌码二维码弹窗：扫码进入小程序并携带桌号参数 */
function QrModal({ table, onClose }: { table: DiningTable | null; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const qrContent = table
    ? `https://smart-table.example.com/scan?table=${table.code}#wechat_redirect`
    : ''

  if (table && !dataUrl && !loading) {
    setLoading(true)
    QRCode.toDataURL(qrContent, { width: 480, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then((url) => setDataUrl(url))
      .catch(() => setDataUrl(''))
      .finally(() => setLoading(false))
  }

  return (
    <Modal open={table !== null} title={`桌码 · ${table?.code ?? ''} 桌`} onClose={onClose} width="max-w-sm">
      {table && (
        <div className="space-y-4 text-center">
          <div className="rounded-xl border border-slate-200 p-4">
            {loading ? (
              <div className="flex h-56 items-center justify-center text-sm text-slate-400">生成中…</div>
            ) : dataUrl ? (
              <img src={dataUrl} alt={`${table.code} 桌二维码`} className="mx-auto h-56 w-56" />
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-red-500">二维码生成失败</div>
            )}
          </div>
          <div>
            <div className="text-base font-semibold text-slate-800">{table.code} 桌</div>
            <div className="mt-1 text-xs text-slate-400">扫码点餐 · 自动带入桌号</div>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-left text-xs break-all text-slate-400">{qrContent}</div>
          {dataUrl && (
            <a
              href={dataUrl}
              download={`桌码-${table.code}.png`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              下载图片（打印贴桌）
            </a>
          )}
          <p className="text-left text-xs leading-5 text-slate-400">
            演示说明：此处展示 URL 二维码。生产环境由后端调用微信「小程序码」接口生成 scene=table={'{桌号}'} 的加密小程序码（Phase 3/6），防伪造且免登录直达点餐页。
          </p>
        </div>
      )}
    </Modal>
  )
}
