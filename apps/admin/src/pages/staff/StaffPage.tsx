/** 员工管理：账号 / 角色（RBAC）/ 启停用，仅店长可访问 */
import { useState } from 'react'
import type { Staff, StaffRole } from '@/types/model'
import { staffApi } from '@/api'
import { ApiError } from '@/api/request'
import { useAuthStore } from '@/store/auth-store'
import { useDataStore } from '@/store/data-store'
import { useUiStore } from '@/store/ui-store'
import { Button } from '@/components/ui/Button'
import { Badge, Empty } from '@/components/ui/feedback'
import { Input, Select } from '@/components/ui/form'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { IconPlus, IconEdit, IconTrash } from '@/components/ui/icons'
import { ROLE_META } from '@/utils/status'
import { formatDate } from '@/utils/format'

const ROLE_TONE: Record<StaffRole, 'green' | 'blue' | 'orange' | 'sky'> = {
  admin: 'green',
  manager: 'blue',
  waiter: 'orange',
  kitchen: 'sky',
}

export function StaffPage() {
  const staffList = useDataStore((s) => s.staff)
  const me = useAuthStore((s) => s.user)
  const toast = useUiStore((s) => s.toast)
  const [editing, setEditing] = useState<Staff | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Staff | null>(null)

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          角色权限：店长（全部）· 经理（订单/菜品/数据）· 服务员（订单/看板）· 厨房（仅 KDS 大屏）；演示账号密码统一为 123456
        </p>
        <Button onClick={() => setEditing('new')}>
          <IconPlus className="h-4 w-4" />
          新增员工
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {staffList.length === 0 ? (
          <Empty text="暂无员工" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">账号</th>
                <th className="px-4 py-3 font-medium">姓名</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">入职时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((staff) => {
                const isMe = staff.id === me?.id
                return (
                  <tr key={staff.id} className="group hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium tabular-nums text-slate-800">
                      {staff.username}
                      {isMe && <span className="ml-1.5 text-xs text-emerald-600">（我）</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{staff.name}</td>
                    <td className="px-4 py-3">
                      <Badge tone={ROLE_TONE[staff.role]}>{ROLE_META[staff.role]?.text ?? staff.role}</Badge>
                    </td>
                    <td className="px-4 py-3">{staff.status === 1 ? <Badge tone="green">启用</Badge> : <Badge tone="gray">禁用</Badge>}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(staff.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
                        {staff.status === 1 ? (
                          <Button size="sm" variant="outline" disabled={isMe} onClick={() => mutate(() => staffApi.update(staff.id, { status: 0 }), `「${staff.name}」已禁用`)}>
                            禁用
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => mutate(() => staffApi.update(staff.id, { status: 1 }), `「${staff.name}」已启用`)}>
                            启用
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setEditing(staff)}>
                          <IconEdit className="h-4 w-4" />
                          编辑
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" disabled={isMe} onClick={() => setDeleting(staff)}>
                          <IconTrash className="h-4 w-4" />
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing !== null && (
        <StaffFormModal
          staff={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => setEditing(null)}
          mutate={mutate}
        />
      )}

      <ConfirmModal
        open={deleting !== null}
        title="删除员工"
        message={deleting ? <>确定删除员工「{deleting.name}（{deleting.username}）」吗？删除后该账号无法登录。</> : null}
        confirmText="删除"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          const ok = await mutate(() => staffApi.remove(deleting.id), `员工「${deleting.name}」已删除`)
          if (ok) setDeleting(null)
        }}
      />
    </div>
  )
}

function StaffFormModal({
  staff,
  onClose,
  onDone,
  mutate,
}: {
  staff: Staff | null
  onClose: () => void
  onDone: () => void
  mutate: (fn: () => Promise<unknown>, success: string) => Promise<boolean>
}) {
  const [form, setForm] = useState({
    username: staff?.username ?? '',
    name: staff?.name ?? '',
    role: staff?.role ?? ('waiter' as StaffRole),
  })
  const [errors, setErrors] = useState<{ username?: string; name?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    const next: typeof errors = {}
    if (!staff) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username.trim())) next.username = '3-20 位字母 / 数字 / 下划线'
    }
    if (!form.name.trim()) next.name = '请输入姓名'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setSubmitting(true)
    try {
      const ok = staff
        ? await mutate(() => staffApi.update(staff.id, { name: form.name.trim(), role: form.role }), `「${form.name}」信息已更新`)
        : await mutate(() => staffApi.create({ username: form.username.trim(), name: form.name.trim(), role: form.role }), `员工「${form.name}」已新增`)
      if (ok) onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      title={staff ? `编辑员工 · ${staff.name}` : '新增员工'}
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
        <Input label="登录账号" required disabled={staff !== null} value={form.username} error={errors.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="如 waiter03" hint={staff ? '账号创建后不可修改' : '初始密码为 123456，员工登录后可自行修改'} />
        <Input label="姓名" required value={form.name} error={errors.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="真实姓名" />
        <Select
          label="角色"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
          options={(['admin', 'manager', 'waiter', 'kitchen'] as StaffRole[]).map((role) => ({
            value: role,
            label: `${ROLE_META[role].text} — ${ROLE_META[role].desc}`,
          }))}
        />
      </div>
    </Modal>
  )
}
