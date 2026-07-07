import { forwardRef, HTMLAttributes } from 'react'

type Padding = 'none' | 'sm' | 'md' | 'lg'
type Shadow = 'none' | 'soft' | 'medium' | 'strong'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding
  shadow?: Shadow
  interactive?: boolean
}

const PADDING: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

const SHADOW: Record<Shadow, string> = {
  none: '',
  soft: 'shadow-soft',
  medium: 'shadow-medium',
  strong: 'shadow-strong',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', shadow = 'soft', interactive = false, className = '', children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          'bg-white rounded-[var(--radius-md)] border border-soft',
          SHADOW[shadow],
          PADDING[padding],
          interactive ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-medium cursor-pointer' : '',
          className,
        ].filter(Boolean).join(' ')}
        {...rest}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
export default Card