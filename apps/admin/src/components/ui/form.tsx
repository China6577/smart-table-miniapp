/** 表单输入组件：带标签与错误提示 */
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const fieldBase =
  'w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50'

interface FieldWrapperProps {
  label?: string
  error?: string
  required?: boolean
  children: ReactNode
  hint?: string
}

function FieldWrapper({ label, error, required, hint, children }: FieldWrapperProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className = '', ...rest }: InputProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={rest.required}>
      <input className={`${fieldBase} h-10 ${error ? 'border-red-400' : ''} ${className}`} {...rest} />
    </FieldWrapper>
  )
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, className = '', ...rest }: TextareaProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={rest.required}>
      <textarea className={`${fieldBase} py-2 ${error ? 'border-red-400' : ''} ${className}`} {...rest} />
    </FieldWrapper>
  )
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: Array<{ value: string | number; label: string }>
}

export function Select({ label, error, hint, options, className = '', ...rest }: SelectProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={rest.required}>
      <select className={`${fieldBase} h-10 ${error ? 'border-red-400' : ''} ${className}`} {...rest}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  )
}
