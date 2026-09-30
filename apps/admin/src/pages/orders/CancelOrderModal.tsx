/** 取消订单弹窗：必选取消原因（契约要求） */
import { useState } from 'react'
import { orderApi } from '@/api'
import { ApiError } from '@/api/request'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/form'
import { useUiStore } from '@/store/ui-store'

const PRESET_REASONS = ['顾客临时有事离开', '等待时间过长，顾客退单', '菜品原料不足', '顾客点错了重新下单', '商家手动取消']

export function CancelOrderModal({ orderNo, onClose }: { orderNo: string | null; onClose: () => void }) {
  const toast = useUiStore((s) => s.toast)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!orderNo) return null
  // 闭包内 TS 无法保留早退收窄结果，显式绑定非空订单号
  const activeNo: string = orderNo

  async function submit() {
    if (!reason.trim()) {
      toast('请选择或填写取消原因', 'error')
      return
    }
    setSubmitting(true)
    try {
      await orderApi.cancel(activeNo, reason.trim())
      toast('订单已取消')
      onClose()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : '取消失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      title={`取消订单 ${orderNo}`}
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            再想想
          </Button>
          <Button variant="danger" onClick={submit} loading={submitting}>
            确认取消订单
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">选择取消原因</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  reason === preset ? 'bg-red-50 text-red-600 ring-1 ring-red-300' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          label="或填写其他原因"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="取消原因将记录在订单轨迹中"
        />
      </div>
    </Modal>
  )
}
