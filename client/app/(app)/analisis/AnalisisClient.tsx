'use client'
// ANÁLISIS — la casa de "Instagram conectado". Estados:
//   no configurado → en preparación · sin conectar → hero de conexión ·
//   caducado → reconectar · activa → cuenta + Análisis de perfil (informe IA).
// Demo: informe de EJEMPLO calculado con el motor real (lib/social/demo-analysis).

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChartNoAxesColumn, Check, Lock, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import SectionTitle from '@/components/ui/SectionTitle'
import { useToast } from '@/components/ui/Toast'
import ProfileReportView from '@/components/social/ProfileReportView'
import InstagramGlyph, { IG_GRADIENT } from '@/components/social/InstagramGlyph'
import { buildDemoReport } from '@/lib/social/demo-analysis'
import type { ProfileReport } from '@/lib/social/analysis'
import type { SocialConnectInfo } from '@/lib/social/types'

interface Props {
  demo?: boolean
  ready?: boolean
  info?: SocialConnectInfo | null
  needsReauth?: boolean
  counts?: { media: number; dailyDays: number }
  userId?: string
  initialReport?: ProfileReport | null
}

/** Bloqueo de actualización manual: 1 h desde la última sync (server limita a 3/h). */
const HOUR_MS = 3_600_000

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: 'La conexión con Instagram está en preparación — necesitamos la aprobación de Meta.',
  denied: 'No se completó la conexión con Instagram — puedes intentarlo cuando quieras.',
  state_mismatch: 'La sesión de conexión caducó — prueba otra vez desde aquí.',
  meta_error: 'Instagram rechazó la conexión. Comprueba que tu cuenta es profesional (de empresa o de creadora) e inténtalo de nuevo.',
}

const BENEFITS = [
  'Un informe de tu perfil: qué formato te funciona y cuándo publicar',
  'Tu bio y tu nombre reescritos para que te encuentren',
  'Ideas que pasan a Mi plan con un toque',
]

export default function AnalisisClient({
  demo = false,
  ready = false,
  info = null,
  needsReauth = false,
  counts = { media: 0, dailyDays: 0 },
  userId = 'demo',
  initialReport = null,
}: Props) {
  const router = useRouter()
  const toast = useToast()

  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [report, setReport] = useState<ProfileReport | null>(initialReport)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [disconnected, setDisconnected] = useState(false)
  const [reauth, setReauth] = useState(needsReauth)
  const [lastSyncMs, setLastSyncMs] = useState<number | null>(
    info?.lastSyncAt ? new Date(info.lastSyncAt).getTime() : null,
  )
  const [, setTick] = useState(0)
  const demoReport = useMemo(() => (demo ? buildDemoReport() : null), [demo])

  const connected = !!info && !demo && !disconnected
  const caducada = connected && reauth
  const activa = connected && !caducada

  // ── Flash de ?error= / ?connected=1 (post-mount: sin Suspense necesario) ──
  useEffect(() => {
    if (demo) return
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const justConnected = params.get('connected')
    if (error && ERROR_MESSAGES[error]) toast.show(ERROR_MESSAGES[error], 'info')
    if (error || justConnected) window.history.replaceState(null, '', '/analisis')
    // Recién conectada: el primer análisis (que trae sus datos) arranca solo.
    if (justConnected && activa && !initialReport) {
      toast.show('Instagram conectado. Estamos analizando tu perfil…', 'success')
      void handleAnalyze()
    } else if (justConnected) {
      toast.show('Instagram conectado.', 'success')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo])

  // Ticker ligero de 30 s para la cuenta atrás del botón Actualizar.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const remainingMs = lastSyncMs ? Math.max(0, lastSyncMs + HOUR_MS - Date.now()) : 0
  const canSync = activa && !syncing && remainingMs === 0

  function handleConnect() {
    setConnecting(true)
    // Navega a la ruta OAuth (carga completa: la cookie de state y el
    // redirect externo a Instagram lo piden así).
    window.location.href = '/api/social/oauth/authorize'
  }

  async function handleAnalyze(bio?: string) {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/social/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bio ? { bio } : {}),
      })
      const data = (await res.json().catch(() => ({}))) as { report?: ProfileReport; message?: string }
      if (res.ok && data.report) {
        setReport(data.report)
        toast.show('Tu análisis está listo.', 'success')
        router.refresh()
      } else if (res.status === 409) {
        setReauth(true)
        toast.show('El acceso de Instagram caducó — reconecta tu cuenta.', 'info')
      } else {
        toast.show(data.message || 'No se pudo analizar ahora — inténtalo de nuevo en unos minutos.', 'info')
      }
    } catch {
      toast.show('Sin conexión con el servidor — inténtalo de nuevo.', 'info')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSync() {
    if (!canSync) return
    setSyncing(true)
    try {
      const res = await fetch('/api/social/sync', { method: 'POST' })
      if (res.ok) {
        const data = (await res.json()) as { daily: number; media: number; stories: number; errors: string[] }
        setLastSyncMs(Date.now())
        const piezas = data.media + data.stories
        toast.show(
          `Datos actualizados — ${piezas} ${piezas === 1 ? 'publicación' : 'publicaciones'}. Pulsa «Analizar de nuevo» para ver el informe al día.`,
          'success',
        )
        router.refresh()
      } else if (res.status === 409) {
        setReauth(true)
        toast.show('El acceso de Instagram caducó — reconecta tu cuenta.', 'info')
      } else if (res.status === 404) {
        toast.show('No hay ninguna cuenta conectada — conecta Instagram primero.', 'info')
      } else if (res.status === 429) {
        const data = (await res.json().catch(() => ({}))) as { retryAfter?: number }
        const mins = Math.max(1, Math.ceil((data.retryAfter ?? 3600) / 60))
        setLastSyncMs(Date.now() - HOUR_MS + (data.retryAfter ?? 3600) * 1000)
        toast.show(`Acabas de actualizar tus datos — vuelve a intentarlo en ${mins} min.`, 'info')
      } else {
        toast.show('No se pudo actualizar ahora — inténtalo de nuevo en unos minutos.', 'info')
      }
    } catch {
      toast.show('Sin conexión con el servidor — inténtalo de nuevo.', 'info')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    try {
      const res = await fetch('/api/social/connection', { method: 'DELETE' })
      if (res.ok) {
        setDisconnected(true)
        setConfirmingDelete(false)
        setReport(null)
        toast.show('Conexión y datos sociales borrados.', 'info')
        router.refresh()
      } else {
        toast.show('No se pudo desconectar ahora — inténtalo de nuevo.', 'info')
      }
    } catch {
      toast.show('Sin conexión con el servidor — inténtalo de nuevo.', 'info')
    }
  }

  const fechaFmt = (iso: string | null): string => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    } catch {
      return iso.slice(0, 10)
    }
  }

  const connectHero = (opts: { disabled?: boolean; note?: string }) => (
    <Card padding="lg" className="mb-4">
      <div className="sm:flex sm:items-center sm:gap-8">
        <div className="flex-1">
          <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: IG_GRADIENT }}>
            <InstagramGlyph size={24} />
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-ink mb-2">Conecta tu Instagram y te decimos qué mejorar</h3>
          <ul className="space-y-2 my-4">
            {BENEFITS.map(b => (
              <li key={b} className="flex gap-2 text-[15px] text-ink">
                <Check size={18} className="text-[#2A7A4A] flex-shrink-0 mt-0.5" aria-hidden /> {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="sm:w-72 space-y-3">
          <Button size="lg" fullWidth loading={connecting} disabled={opts.disabled} onClick={handleConnect} icon={<InstagramGlyph size={16} />}>
            Conectar Instagram
          </Button>
          {opts.note && <p className="text-[13px] text-tinta-2 text-center">{opts.note}</p>}
          <p className="text-[12.5px] text-tinta-2 leading-snug">
            Es seguro: nunca te pedimos la contraseña, autorizas desde Instagram. Necesitas una cuenta
            <b> profesional</b> (de empresa o de creadora). Si la tuya es personal, cámbiala gratis en
            Instagram › Configuración › Tipo de cuenta.
          </p>
        </div>
      </div>
    </Card>
  )

  return (
    <div>
      <SectionTitle
        title="Análisis"
        subtitle={demo ? 'Vista previa demo' : 'Qué está funcionando en tu Instagram y qué mejorar'}
        icon={<ChartNoAxesColumn size={22} />}
        className="mb-6"
      />

      {/* ── Demo: hero deshabilitado + informe de ejemplo ────────────── */}
      {demo && (
        <>
          {connectHero({ disabled: true, note: 'Estás en modo demo: la conexión se activa con tu cuenta real. Abajo tienes un ejemplo del informe.' })}
          {demoReport && <ProfileReportView report={demoReport} userId="demo" />}
        </>
      )}

      {/* ── Sin conectar ─────────────────────────────────────────────── */}
      {!demo && ready && !connected && connectHero({})}

      {/* ── Conexión caducada → reconectar ──────────────────────────── */}
      {caducada && (
        <Card padding="md" className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(122,24,50,0.08)' }}>
                <RefreshCw size={18} className="text-cherry" />
              </span>
              <div>
                <p className="text-sm font-bold text-cherry-dark">Tu conexión con Instagram ha caducado</p>
                <p className="text-xs text-cherry-dark opacity-70">
                  Pasa cada cierto tiempo{info?.username ? ` (@${info.username})` : ''}: basta con autorizar otra vez. No pierdes nada.
                </p>
              </div>
            </div>
            <Button onClick={handleConnect} loading={connecting} icon={<RefreshCw size={16} />}>Reconectar</Button>
          </div>
        </Card>
      )}

      {/* ── En preparación (sin credenciales de Meta en el servidor) ─── */}
      {!ready && !demo && (
        <div
          className="rounded-[var(--radius-lg)] p-6 sm:p-8 text-center mb-4"
          style={{ background: 'var(--color-buttermilk)', border: '2px solid var(--color-cherry)', boxShadow: '0 10px 30px -18px rgba(122,24,50,0.35)' }}
        >
          <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--color-cherry)' }}>
            <Lock size={24} className="text-white" />
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-ink">La conexión con Instagram está en preparación</h3>
          <p className="text-sm text-cherry-dark opacity-80 max-w-md mx-auto mt-2">
            Necesitamos la aprobación de Meta para leer los datos de tu cuenta — tan pronto esté lista, la activamos.
          </p>
          <div className="mt-3"><Badge tone="neutral">En preparación</Badge></div>
        </div>
      )}

      {/* ── Conexión activa: cuenta ─────────────────────────────────── */}
      {activa && info && (
        <Card padding="none" className="mb-4 overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white" style={{ background: IG_GRADIENT }}>
                  <InstagramGlyph size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-cherry-dark truncate flex items-center gap-2">
                    @{info.username || 'instagram'} <Badge tone="cherry">Conectado</Badge>
                  </p>
                  <p className="text-xs text-cherry-dark opacity-60">
                    {counts.media} {counts.media === 1 ? 'publicación leída' : 'publicaciones leídas'}
                    {info.lastSyncAt ? ` · datos del ${fechaFmt(info.lastSyncAt)}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" loading={syncing} disabled={!canSync} onClick={handleSync} icon={<RefreshCw size={14} />}>
                  Actualizar datos
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)} disabled={confirmingDelete} icon={<Trash2 size={14} />}>
                  Desconectar
                </Button>
              </div>
            </div>
            {!canSync && remainingMs > 0 && (
              <p className="text-[11px] text-cherry-dark opacity-50 mt-2">
                Puedes actualizar una vez por hora — siguiente intento en {Math.max(1, Math.round(remainingMs / 60_000))} min.
              </p>
            )}
          </div>

          {/* Confirmación textual inline (2 clicks, sin window.confirm) */}
          {confirmingDelete && (
            <div className="p-4 border-t" style={{ background: 'var(--color-warm-light)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-cherry-dark">¿Seguro? Se borrarán tus datos de Instagram y tu informe en BRÄVE.</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>Cancelar</Button>
                  <Button size="sm" variant="danger" onClick={handleDisconnect}>Sí, borrar todo</Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Análisis de perfil ──────────────────────────────────────── */}
      {activa && report && (
        <ProfileReportView report={report} userId={userId} onRegenerate={bio => handleAnalyze(bio)} regenerating={analyzing} />
      )}
      {activa && !report && (
        <div className="rounded-[var(--radius-lg)] bg-mantequilla p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="text-lg font-semibold text-burdeos">{analyzing ? 'Analizando tu perfil…' : 'Tu análisis de perfil'}</p>
            <p className="text-[14px] text-tinta-2 mt-1 max-w-md">
              {analyzing
                ? 'Leemos tu bio y tus últimas publicaciones. Tarda alrededor de un minuto.'
                : 'Leemos tu bio y tus últimas 30 publicaciones y te decimos qué mejorar: bio, nombre, formatos, días y horas, e ideas.'}
            </p>
          </div>
          <Button size="lg" loading={analyzing} onClick={() => handleAnalyze()} icon={<Sparkles size={16} />}>
            Analizar mi perfil
          </Button>
        </div>
      )}

      <p className="text-[12px] text-tinta-2 mt-6">
        BRÄVE solo lee tus datos: nunca publica, borra ni toca tus mensajes.
      </p>
    </div>
  )
}
