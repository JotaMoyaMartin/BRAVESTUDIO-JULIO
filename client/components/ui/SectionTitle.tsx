import { ReactNode } from 'react'

interface SectionTitleProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export default function SectionTitle({ title, subtitle, icon, action, className = '' }: SectionTitleProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && <span className="text-cherry">{icon}</span>}
        <div>
          <h2 className="text-lg font-bold text-cherry-dark">{title}</h2>
          {subtitle && (
            <p className="text-sm text-cherry-dark opacity-60 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}