'use client'
import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...rest }, ref) => {
    const inputId = id || rest.name
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'px-4 py-2.5 rounded-[var(--radius-sm)] text-sm outline-none transition-colors',
            'bg-cream border-[1.5px] border-soft focus:border-cherry',
            error ? 'border-[var(--color-danger)]' : '',
            className,
          ].filter(Boolean).join(' ')}
          {...rest}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-cherry-dark opacity-50">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, ...rest }, ref) => {
    const inputId = id || rest.name
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={[
            'px-4 py-2.5 rounded-[var(--radius-sm)] text-sm outline-none transition-colors resize-none',
            'bg-cream border-[1.5px] border-soft focus:border-cherry',
            error ? 'border-[var(--color-danger)]' : '',
            className,
          ].filter(Boolean).join(' ')}
          {...rest}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-cherry-dark opacity-50">{hint}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'