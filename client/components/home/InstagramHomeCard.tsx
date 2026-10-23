/**
 * INICIO · tu Instagram (22-oct-2026). Una sola tarjeta con el estado de la
 * conexión y, si ya hay Análisis de perfil, lo más útil de él: números reales
 * y el primer cambio recomendado. Todo lleva a /analisis.
 */
import Link from 'next/link'
import { ArrowRight, RefreshCw, Sparkles } from 'lucide-react'
import InstagramGlyph, { IG_GRADIENT } from '@/components/social/InstagramGlyph'
import { showInstagram } from '@/lib/features'

export type InstagramHomeState = 'demo' | 'preparing' | 'disconnected' | 'expired' | 'connected'

export interface InstagramHomeSummary {
  followers: number | null
  postsPerWeek: number
  bestFormat: string | null
  tip: string | null
}

export default function InstagramHomeCard({
  state,
  username = null,
  summary = null,
}: {
  state: InstagramHomeState
  username?: string | null
  summary?: InstagramHomeSummary | null
}) {
  if (state === 'preparing' || !showInstagram()) return null

  const icon = (
    <span className="h-11 w-11 rounded-2xl flex items-center justify-center text-white flex-shrink-0" style={{ background: IG_GRADIENT }}>
      <InstagramGlyph size={21} />
    </span>
  )

  // ── Conectada con informe: resumen real ──────────────────────────────
  if (state === 'connected' && summary) {
    return (
      <Link href="/analisis" className="card block p-5 group">
        <div className="flex items-center gap-3">
          {icon}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-tinta-2">Tu Instagram</p>
            <p className="text-[16px] font-semibold text-ink truncate">@{username}</p>
          </div>
          <ArrowRight size={18} className="text-cereza transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-warm-gray/60 py-2.5">
            <p className="text-[17px] font-bold text-ink">{summary.followers !== null ? summary.followers.toLocaleString('es-ES') : '—'}</p>
            <p className="text-[11.5px] text-tinta-2">seguidores</p>
          </div>
          <div className="rounded-xl bg-warm-gray/60 py-2.5">
            <p className="text-[17px] font-bold text-ink">{String(summary.postsPerWeek).replace('.', ',')}</p>
            <p className="text-[11.5px] text-tinta-2">publ. por semana</p>
          </div>
          <div className="rounded-xl bg-warm-gray/60 py-2.5">
            <p className="text-[17px] font-bold text-ink">{summary.bestFormat ?? '—'}</p>
            <p className="text-[11.5px] text-tinta-2">te funcionan más</p>
          </div>
        </div>
        {summary.tip && (
          <p className="mt-3 text-[14px] text-ink flex gap-2">
            <Sparkles size={16} className="text-cereza flex-shrink-0 mt-0.5" aria-hidden />
            <span><b>Tu siguiente mejora:</b> {summary.tip}</span>
          </p>
        )}
      </Link>
    )
  }

  const copy = {
    demo: { title: 'Conecta tu Instagram', text: 'Te decimos qué te funciona y cómo mejorar tu bio. Mira un ejemplo del informe.', cta: 'Ver ejemplo' },
    disconnected: { title: 'Conecta tu Instagram', text: 'Te decimos qué te funciona, cuándo publicar y cómo mejorar tu bio.', cta: 'Conectar' },
    expired: { title: 'Vuelve a conectar Instagram', text: `La conexión${username ? ` de @${username}` : ''} caducó. Es un toque y no pierdes nada.`, cta: 'Reconectar' },
    connected: { title: `@${username ?? 'instagram'} conectado`, text: 'Ya podemos leer tu cuenta. Saca tu análisis de perfil con mejoras concretas.', cta: 'Analizar' },
  }[state]

  return (
    <Link href="/analisis" className="card flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon}
        <div className="min-w-0">
          <p className="text-[15.5px] font-semibold text-ink">{copy.title}</p>
          <p className="text-[13.5px] text-tinta-2 leading-snug">{copy.text}</p>
        </div>
      </div>
      <span className="btn-primary text-sm justify-center sm:flex-shrink-0">
        {state === 'expired' ? <RefreshCw size={14} aria-hidden /> : <InstagramGlyph size={15} />}
        {copy.cta}
      </span>
    </Link>
  )
}
