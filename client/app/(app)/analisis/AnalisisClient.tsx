'use client'
// ANÁLISIS — la casa de "Instagram conectado". Estados:
//   no configurado → en preparación · sin conectar → hero de conexión ·
//   caducado → reconectar · activa → cabecera + acciones + historial.
// Fase 3 añadirá aquí el Diagnóstico BRÄVE (placeholder ya integrado).

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChartNoAxesColumn, Lock, RefreshCw, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import SectionTitle from '@/components/ui/SectionTitle'
import { useToast } from '@/components/ui/Toast'
import type { SocialConnectInfo } from '@/lib/social/types'

interface Props {
  demo?: boolean
  ready?: boolean
  info?: SocialConnectInfo | null
  needsReauth?: boolean
  counts?: { media: number; dailyDays: number }
}

/** Bloqueo de actualización manual: 1 h desde la última sync (server limita a 3/h). */
const HOUR_MS = 3_600_000

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: 'La conexión con Instagram está en preparación — necesitamos la aprobación de Meta.',
  denied: 'No se completó la conexión con Instagram — puedes intentarlo cuando quieras.',
  state_mismatch: 'La sesión de conexión caducó — prueba otra vez desde aquí.',
  meta_error: 'Instagram rechazó la conexión — inténtalo de nuevo en unos minutos.',
  no_page: 'Tu cuenta de Facebook no tiene ninguna Página — crea una Página y vuelve a conectarte.',
  no_ig: 'Tu Página no tiene una cuenta de Instagram profesional vinculada — vincúlala desde los ajustes de tu Página.',
}

export default function AnalisisClient({
  demo = false,
  ready = false,
  info = null,
  needsReauth = false,
  counts = { media: 0, dailyDays: 0 },
}: Props) {
  const router = useRouter()
  const toast = useToast()

  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [disconnected, setDisconnected] = useState(false)
  const [reauth, setReauth] = useState(needsReauth)
  const [lastSyncMs, setLastSyncMs] = useState<number | null>(
    info?.lastSyncAt ? new Date(info.lastSyncAt).getTime() : null,
  )
  const [, setTick] = useState(0)

  // ── Flash de ?error= / ?connected=1 (post-mount: sin Suspense necesario) ──
  useEffect(() => {
    if (demo) return
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const connectedParam = params.get('connected')
    const flash: { tone: 'success' | 'info'; message: string } | null =
      error && ERROR_MESSAGES[error]
        ? { tone: 'info', message: ERROR_MESSAGES[error] }
        : connectedParam
          ? {
              tone: 'success',
              message: 'Instagram conectado — tu primer volcado de datos llega ahora mismo.',
            }
          : null
    if (flash) {
      toast.show(flash.message, flash.tone)
      // Limpiar la query para que el feedback no reaparezca al recargar.
      window.history.replaceState(null, '', '/analisis')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo])

  // Ticker ligero de 30 s para la cuenta atrás del botón Actualizar.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const connected = !!info && !demo && !disconnected
  const caducada = connected && reauth
  const activa = connected && !caducada

  const remainingMs = lastSyncMs ? Math.max(0, lastSyncMs + HOUR_MS - Date.now()) : 0
  const canSync = activa && !syncing && remainingMs === 0

  function handleConnect() {
    setConnecting(true)
    // Navega a la ruta OAuth (carga completa: la cookie de state y el
    // redirect externo a Instagram lo piden así).
    window.location.href = '/api/social/oauth/authorize'
  }

  async function handleSync() {
    if (!canSync) return
    setSyncing(true)
    try {
      const res = await fetch('/api/social/sync', { method: 'POST' })
      if (res.ok) {
        const data = (await res.json()) as {
          daily: number; media: number; stories: number; errors: string[]
        }
        setLastSyncMs(Date.now())
        const piezas = data.media + data.stories
        toast.show(
          `Datos actualizados — ${piezas} ${piezas === 1 ? 'contenido' : 'contenidos'}, ${data.daily} ${data.daily === 1 ? 'día' : 'días'}.`,
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
      return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return iso.slice(0, 10)
    }
  }

  const horaFmt = (iso: string | null): string => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div>
      <SectionTitle
        title="Análisis"
        subtitle={demo ? 'Vista previa demo' : 'Qué está funcionando en tu Instagram'}
        icon={<ChartNoAxesColumn size={22} />}
        className="mb-6"
      />

      {/* ── Estado demo: vista previa con la conexión deshabilitada ──── */}
      {demo && (
        <div
          className="rounded-[var(--radius-lg)] p-6 sm:p-8 text-center mb-4"
          style={{
            background: 'var(--color-buttermilk)',
            border: '2px solid var(--color-cherry)',
            boxShadow: '0 10px 30px -18px rgba(122,24,50,0.35)',
          }}
        >
          <h3 className="text-xl sm:text-2xl font-bold text-ink">Conecta Instagram para que BRÄVE analice qué está funcionando</h3>
          <p className="text-sm text-cherry-dark opacity-75 mt-2">
            estás en modo demo — la conexión con la cuenta real se activa al crear tu cuenta.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <Badge tone="neutral">Demo</Badge>
          </div>
        </div>
      )}

      {/* ── Estado 2: listo y sin conectar → hero de conexión ────────── */}
      {!demo && ready && !connected && (
        <Card padding="lg" className="mb-4 text-center">
          <span
            className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(122,24,50,0.08)' }}
          >
            <ChartNoAxesColumn size={26} className="text-cherry" />
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-ink mb-2">Conecta Instagram</h3>
          <p className="text-sm text-cherry-dark opacity-80 max-w-md mx-auto">
            Así BRÄVE ve cada día qué funciona en tu cuenta: qué alcanza, qué guardan tus
            clientas y qué contenido merece repetirse.
          </p>
          <p className="text-xs text-cherry-dark opacity-60 max-w-md mx-auto mt-2 mb-5">
            Conectar es seguro: nunca pedimos tu contraseña — autorizas en la app de Instagram.
          </p>
          <Button
            size="lg"
            loading={connecting}
            onClick={handleConnect}
            icon={<ChartNoAxesColumn size={16} />}
          >
            Conectar Instagram
          </Button>
        </Card>
      )}

      {/* ── Estado 3: conexión caducada → reconectar ────────────────── */}
      {caducada && (
        <Card padding="md" className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: 'rgba(122,24,50,0.08)' }}
              >
                <RefreshCw size={18} className="text-cherry" />
              </span>
              <div>
                <p className="text-sm font-bold text-cherry-dark">Conexión caducada</p>
                <p className="text-xs text-cherry-dark opacity-70">
                  El acceso de Instagram venció{info?.username ? ` para @${info.username}` : ''} — basta con autorizar otra vez.
                </p>
              </div>
            </div>
            <Button onClick={handleConnect} icon={<RefreshCw size={16} />}>Reconectar</Button>
          </div>
        </Card>
      )}

      {/* ── Estado 1bis: en preparación (cuando ready=false y no demo) ── */}
      {!ready && !demo && (
        <div
          className="rounded-[var(--radius-lg)] p-6 sm:p-8 text-center mb-4"
          style={{
            background: 'var(--color-buttermilk)',
            border: '2px solid var(--color-cherry)',
            boxShadow: '0 10px 30px -18px rgba(122,24,50,0.35)',
          }}
        >
          <span
            className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'var(--color-cherry)' }}
          >
            <Lock size={24} className="text-white" />
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-ink">La conexión con Instagram está en preparación</h3>
          <p className="text-sm text-cherry-dark opacity-80 max-w-md mx-auto mt-2">
            Necesitamos la aprobación de Meta para leer los datos de tu cuenta — tan pronto
            esté lista, la activamos.
          </p>
          <div className="mt-3"><Badge tone="neutral">En preparación</Badge></div>
        </div>
      )}

      {/* ── Estado 4: conexión activa ───────────────────────────────── */}
      {activa && info && (
        <Card padding="none" className="mb-4 overflow-hidden">
          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-bold"
                  style={{ background: 'var(--color-cherry)', color: 'white' }}
                  title={info.username || 'cuenta de Instagram'}
                >
                  {(info.username || 'I').slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-cherry-dark truncate">
                    @{info.username || 'instagram'}
                  </p>
                  <p className="text-xs text-cherry-dark opacity-60">
                    Conectado el {fechaFmt(info.connectedAt)}
                    {info.lastSyncAt
                      ? ` · Últ. actualización ${fechaFmt(info.lastSyncAt)} ${horaFmt(info.lastSyncAt)}`
                      : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  loading={syncing}
                  disabled={!canSync}
                  onClick={handleSync}
                  icon={<RefreshCw size={14} />}
                >
                  Actualizar datos
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={confirmingDelete}
                  icon={<Trash2 size={14} />}
                >
                  Desconectar
                </Button>
              </div>
            </div>

            {!canSync && remainingMs > 0 && (
              <p className="text-[11px] text-cherry-dark opacity-50 mt-3">
                Puedes actualizar una vez por hora — siguiente intento en{' '}
                {Math.max(1, Math.round(remainingMs / 60_000))} min.
              </p>
            )}

            <div
              className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4"
              style={{ borderColor: 'rgba(122,24,50,0.08)' }}
            >
              <Badge tone="cherry">
                {counts.media} {counts.media === 1 ? 'pieza' : 'piezas'}
              </Badge>
              <Badge tone="neutral">
                {counts.dailyDays} {counts.dailyDays === 1 ? 'día' : 'días'} de historial
              </Badge>
            </div>
          </div>

          {/* Confirmación textual inline (2 clicks, sin window.confirm) */}
          {confirmingDelete && (
            <div className="p-4 border-t" style={{ background: 'var(--color-warm-light)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-cherry-dark">
                  ¿Seguro? Se borrarán tus datos sociales de BRÄVE.
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" variant="danger" onClick={handleDisconnect}>
                    Sí, borrar todo
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Nota: aún sin piezas traídas ─────────────────────────────── */}
      {activa && counts.media === 0 && (
        <p className="text-sm text-cherry-dark opacity-75 text-center mb-4">
          Estamos empezando a conocer tu cuenta — los datos aparecerán tras la siguiente
          sincronización diaria.
        </p>
      )}

      {/* ── Estado 6: placeholder del Diagnóstico BRÄVE (Fase 3) ────── */}
      {activa && counts.media > 0 && (
        <div
          className="rounded-[var(--radius-md)] p-6 mb-4"
          style={{
            background: 'var(--color-buttermilk)',
            border: '1.5px solid rgba(122,24,50,0.25)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-cherry-dark">
                El Diagnóstico BRÄVE aparecerá aquí cuando tengas suficientes datos
              </p>
              <p className="text-xs text-cherry-dark opacity-70 mt-1 max-w-md">
                BRÄVE aprenderá qué funciona en tu cuenta y qué hacer con ello — mientras
                tanto, tu historial va entrando.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              loading={syncing}
              disabled={!canSync}
              onClick={handleSync}
              icon={<RefreshCw size={14} />}
            >
              Actualizar datos
            </Button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-cherry-dark opacity-40 mt-6">
        Conectamos en modo lectura: BRÄVE mira tus métricas y nunca toca tus publicaciones
        ni tus mensajes.
      </p>
    </div>
  )
}