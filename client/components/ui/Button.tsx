'use client'
import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs rounded-[var(--radius-sm)]',
  md: 'px-4 py-2.5 text-sm rounded-[var(--radius-sm)]',
  lg: 'px-6 py-3.5 text-sm rounded-[var(--radius-sm)]',
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-cherry text-white hover:bg-cherry-dark hover:shadow-[0_4px_16px_rgba(122,24,50,0.3)]',
  secondary: 'bg-buttermilk text-cherry-dark hover:bg-[#ffe98a]',
  ghost: 'bg-transparent text-cherry border border-[rgba(122,24,50,0.2)] hover:bg-[rgba(122,24,50,0.06)] hover:border-cherry',
  danger: 'bg-[var(--color-danger)] text-white hover:opacity-90',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, fullWidth = false, className = '', children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none',
          SIZES[size],
          VARIANTS[variant],
          fullWidth ? 'w-full' : '',
          className,
        ].filter(Boolean).join(' ')}
        {...rest}
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          icon
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button