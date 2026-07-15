'use client'

import { Crown, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PreviewPremiumBanner() {
  const router = useRouter()

  function exitPreview() {
    document.cookie = 'brave_preview_premium=; path=/; max-age=0'
    router.push('/admin')
  }

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-[var(--radius-sm)] mb-4"
      style={{
        background: 'linear-gradient(90deg, rgba(184,134,11,0.12) 0%, rgba(184,134,11,0.06) 100%)',
        border: '1.5px solid rgba(184,134,11,0.25)',
      }}
    >
      <div className="flex items-center gap-2">
        <Crown size={16} style={{ color: '#b8860b' }} />
        <span className="text-sm font-bold" style={{ color: '#b8860b' }}>
          Vista Premium
        </span>
        <span className="text-xs text-cherry-dark opacity-60">
          · Estás viendo la app como una usuaria premium
        </span>
      </div>
      <button
        onClick={exitPreview}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all hover:opacity-80"
        style={{ background: 'rgba(184,134,11,0.15)', color: '#b8860b' }}
      >
        <X size={13} /> Salir de preview
      </button>
    </div>
  )
}