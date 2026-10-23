'use client'
/**
 * «Estado de la IA» en el panel de admin: luz verde/ámbar/rojo, fallos de
 * hoy, último fallo explicado y qué hacer, y botón «Probar ahora».
 */
import { useCallback, useEffect, useState } from 'react'
import { Activity, Loader2, RefreshCw } from 'lucide-react'
import type { AIStatus } from '@/lib/ai/monitor-core'

const LIGHT = {
  verde: { dot: '#2A7A4A', bg: '#EAF3EC' },
  ambar: { dot: '#C98A1B', bg: '#FFF4DC' },
  rojo: { dot: '#B8324F', bg: '#FBE7EB' },
  'sin-datos': { dot: '#9C8B7A', bg: '#F4EDE4' },
} as const

const when = (iso: string) => new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AIStatusCard() {
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [state, setState] = useState<'cargando' | 'ok' | 'sin-tabla' | 'error'>('cargando')
  const [probing, setProbing] = useState(false)
  const [probe, setProbe] = useState<{ ok: boolean; ms: number } | null>(null)

  const apply = (j: { status?: AIStatus | null; missingTable?: boolean; error?: string }) => {
    if (j.missingTable) { setState('sin-tabla'); return }
    if (j.error) { setState('error'); return }
    setStatus(j.status ?? null); setState('ok')
  }
  const load = useCallback(async () => {
    try { apply(await fetch('/api/admin/ai-status').then(r => r.json())) } catch { setState('error') }
  }, [])
  useEffect(() => { load() }, [load])

  async function probar() {
    setProbing(true); setProbe(null)
    try {
      const j = await fetch('/api/admin/ai-status', { method: 'POST' }).then(r => r.json())
      apply(j)
      if (j.probe) setProbe(j.probe)
    } catch { setState('error') }
    setProbing(false)
  }

  const l = LIGHT[status?.light ?? 'sin-datos']
  return (
    <section className="rounded-[var(--radius-lg)] border border-borde p-5 space-y-4" style={{ background: state === 'ok' ? l.bg : '#fff' }} aria-label="Estado de la IA">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex w-4 h-4" aria-hidden>
            {status?.light === 'rojo' && <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: l.dot }} />}
            <span className="relative inline-flex w-4 h-4 rounded-full" style={{ background: l.dot }} />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-tinta-2 flex items-center gap-1.5"><Activity size={14} aria-hidden /> Estado de la IA</p>
            <h2 className="text-[19px] font-semibold text-ink leading-tight">
              {state === 'cargando' ? 'Comprobando…' : state === 'sin-tabla' ? 'Falta activar el registro' : state === 'error' ? 'No se ha podido leer el estado' : status?.titulo ?? 'Sin datos'}
            </h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost text-sm" aria-label="Actualizar"><RefreshCw size={15} aria-hidden /></button>
          <button onClick={probar} disabled={probing || state === 'sin-tabla'} className="btn-primary text-sm">
            {probing ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null} {probing ? 'Probando…' : 'Probar ahora'}
          </button>
        </div>
      </div>

      {state === 'sin-tabla' && (
        <p className="text-[14px] text-ink">Pega en Supabase (SQL Editor) el archivo <strong>SQL-ESTADO-IA.sql</strong> y vuelve a cargar esta página.</p>
      )}

      {probe && (
        <p className="text-[14px] font-semibold" style={{ color: probe.ok ? '#2A7A4A' : '#B8324F' }} role="status">
          {probe.ok ? `✓ La IA ha respondido en ${(probe.ms / 1000).toFixed(1)} s.` : '✕ La IA no ha respondido. Mira el motivo abajo.'}
        </p>
      )}

      {state === 'ok' && status && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/70 p-3"><p className="text-[12px] text-tinta-2">Fallos hoy</p><p className="text-[22px] font-semibold tabular-nums text-ink">{status.fallosHoy}</p></div>
            <div className="rounded-2xl bg-white/70 p-3"><p className="text-[12px] text-tinta-2">Últimos 30 min</p><p className="text-[22px] font-semibold tabular-nums text-ink">{status.fallos30min}</p></div>
            <div className="rounded-2xl bg-white/70 p-3 col-span-2 sm:col-span-1"><p className="text-[12px] text-tinta-2">Última prueba</p>
              <p className="text-[15px] font-semibold text-ink">{status.ultimaPrueba ? `${status.ultimaPrueba.ok ? '✓ Bien' : '✕ Falló'} · ${when(status.ultimaPrueba.at)}` : 'Ninguna aún'}</p></div>
          </div>
          {status.ultimoFallo && (
            <div className="rounded-2xl bg-white/80 p-4 space-y-1.5">
              <p className="text-[13px] text-tinta-2">Último fallo · {when(status.ultimoFallo.created_at)} · {status.ultimoFallo.section ?? '—'}</p>
              <p className="text-[16px] font-semibold text-ink">{status.ultimoFallo.titulo}</p>
              <p className="text-[14px] text-ink"><strong>Qué hacer:</strong> {status.ultimoFallo.que_hacer}</p>
              {status.ultimoFallo.detail && <p className="text-[12px] text-tinta-2 break-words">Detalle técnico: {status.ultimoFallo.detail}</p>}
            </div>
          )}
          {status.porSeccion.length > 0 && (
            <p className="text-[13px] text-tinta-2">Dónde ha fallado hoy: {status.porSeccion.map(s => `${s.section} (${s.count})`).join(' · ')}</p>
          )}
          <p className="text-[12px] text-tinta-2">Si falla varias veces seguidas te llega un email. La IA se prueba sola cada mañana.</p>
        </>
      )}
    </section>
  )
}
