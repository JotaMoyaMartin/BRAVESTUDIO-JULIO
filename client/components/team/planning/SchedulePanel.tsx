'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { CLIENTS } from '@/lib/team/mock-data'
import type { WeeklyPlanning, PlanningPublication } from '@/lib/team/types'
import {
  Calendar, Link2, Send, Loader2, CheckCircle2, XCircle,
  Circle, Sparkles, AlertCircle, Clock,
} from 'lucide-react'

interface ScheduledPost {
  id: string
  publication_id: string
  network: string
  metricool_post_id: string | null
  status: string
  scheduled_at: string | null
  error: string | null
  updated_at: string
}

interface Props {
  planning: WeeklyPlanning
  onUpdatePub: (pub: PlanningPublication) => void
}

const DAY_OFFSET: Record<string, number> = {
  Lunes: 0, Martes: 1, Miércoles: 2, Jueves: 3,
  Viernes: 4, Sábado: 5, Domingo: 6,
}

const NETWORK_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
}

const ALL_NETWORKS = ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok']

/**
 * Deriva una fecha ISO por defecto a partir del día de la semana + hora +
 * weekStartDate. Si no hay weekStartDate, usa el próximo día de la semana.
 * Devuelve un valor compatible con <input type="datetime-local"> (sin timezone).
 */
function deriveDefaultDate(day: string | null, time: string, weekStartDate?: string | null): string {
  const t = time || '12:00'
  if (weekStartDate) {
    try {
      const ws = new Date(weekStartDate)
      const offset = day ? (DAY_OFFSET[day] ?? 0) : 0
      const d = new Date(ws)
      d.setDate(ws.getDate() + offset)
      const [hh, mm] = t.split(':')
      d.setHours(parseInt(hh, 10) || 12, parseInt(mm, 10) || 0, 0, 0)
      return toLocalInput(d)
    } catch { /* fall through */ }
  }
  // Próximo día de la semana
  const now = new Date()
  const target = day ? (DAY_OFFSET[day] ?? 1) : 1
  const d = new Date(now)
  const cur = d.getDay() === 0 ? 6 : d.getDay() - 1 // Lun=0..Dom=6
  let add = target - cur
  if (add <= 0) add += 7
  d.setDate(d.getDate() + add)
  const [hh, mm] = t.split(':')
  d.setHours(parseInt(hh, 10) || 12, parseInt(mm, 10) || 0, 0, 0)
  return toLocalInput(d)
}

/** Convierte un Date a valor de <input type="datetime-local"> (YYYY-MM-DDTHH:MM). */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Convierte un valor de datetime-local a formato que Metricool espera (sin Z, hora local). */
function toMetricoolDateTime(local: string): string {
  if (!local) return ''
  // El input datetime-local da "2026-07-29T12:00" — ya es hora local.
  // Metricool espera dateTime sin timezone (la timezone va aparte en el body).
  // Añadimos segundos si faltan.
  return local.length === 16 ? local + ':00' : local
}

export default function SchedulePanel({ planning, onUpdatePub }: Props) {
  const { user } = useAuth()
  const client = CLIENTS.find(c => c.id === planning.clientId)
  const actorId = user?.id

  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null) // publicationId programando
  const [error, setError] = useState<string | null>(null)
  const [configNetworks, setConfigNetworks] = useState<string[]>([])
  const [hasConfig, setHasConfig] = useState<boolean | null>(null)

  const isPremium = !!client?.supabase_user_id

  const load = useCallback(async () => {
    if (!actorId || !client?.supabase_user_id) return
    setError(null)
    try {
      const [statusRes, cfgRes] = await Promise.all([
        fetch(`/team/api/planning/scheduled-status?actorId=${encodeURIComponent(actorId)}&clientId=${encodeURIComponent(planning.clientId)}&planningId=${encodeURIComponent(planning.id)}`),
        fetch(`/team/api/metricool/config?actorId=${encodeURIComponent(actorId)}&clientId=${encodeURIComponent(planning.clientId)}`),
      ])
      const statusJson = await statusRes.json()
      if (!statusRes.ok) throw new Error(statusJson.error || 'Error al cargar estado')
      setScheduledPosts(statusJson.posts || [])

      const cfgJson = await cfgRes.json()
      if (cfgRes.ok) {
        setHasConfig(!!cfgJson.has_token)
        setConfigNetworks(cfgJson.config?.networks || ['instagram'])
      } else {
        setHasConfig(false)
        setConfigNetworks(['instagram'])
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [actorId, client?.supabase_user_id, planning.clientId, planning.id])

  useEffect(() => {
    if (isPremium) load()
    else setLoading(false)
  }, [isPremium, load])

  if (!user || !isPremium) return null

  const pubs = [...(planning.publications || [])].sort((a, b) => a.order - b.order)

  // Estado por publicación: qué redes programadas, fallidas, pendientes
  function postsForPub(pubId: string): ScheduledPost[] {
    return scheduledPosts.filter(p => p.publication_id === pubId)
  }

  function isPubFullyScheduled(pub: PlanningPublication): boolean {
    const nets = pub.networks?.length ? pub.networks : configNetworks
    if (!nets.length) return false
    const done = postsForPub(pub.id).filter(p => p.status === 'scheduled' && nets.includes(p.network))
    return done.length === nets.length
  }

  async function schedulePub(pub: PlanningPublication) {
    if (!actorId) return
    const nets = pub.networks?.length ? pub.networks : configNetworks
    if (!nets.length) {
      setError('Selecciona al menos una red')
      return
    }
    if (!pub.mediaUrl?.trim()) {
      setError('Pega la URL pública del archivo')
      return
    }
    if (!pub.scheduledDate) {
      setError('Confirma la fecha de programación')
      return
    }
    setSending(pub.id)
    setError(null)
    try {
      const res = await fetch('/team/api/planning/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId,
          clientId: planning.clientId,
          planningId: planning.id,
          publications: [{
            publicationId: pub.id,
            mediaUrl: pub.mediaUrl.trim(),
            caption: pub.copy || '',
            scheduledDate: toMetricoolDateTime(pub.scheduledDate),
            networks: nets,
            type: pub.type,
          }],
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error al programar')
      // Recargar estado
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSending(null)
    }
  }

  async function scheduleAll() {
    for (const pub of pubs) {
      if (isPubFullyScheduled(pub)) continue
      if (!pub.mediaUrl?.trim() || !pub.scheduledDate) continue
      await schedulePub(pub)
    }
  }

  const totalScheduled = pubs.filter(p => isPubFullyScheduled(p)).length
  const availableNetworks = configNetworks.length ? configNetworks : ALL_NETWORKS

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 flex items-center gap-2 text-[12.5px] text-[#8a8680]">
        <Loader2 size={15} className="animate-spin" /> Cargando estado de programación…
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#FFF1B5] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#FFF1B5] bg-[#FFFDF5] flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#7A1832] flex items-center justify-center text-white shrink-0">
          <Send size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-[#1a1a1a]">Programar en redes vía Metricool</div>
          <div className="text-[11px] text-[#8a8680]">
            {totalScheduled}/{pubs.length} publicaciones programadas
          </div>
        </div>
        <button
          onClick={scheduleAll}
          disabled={!!sending}
          className="text-[12px] px-3 py-1.5 rounded-lg bg-[#7A1832] text-white font-medium hover:bg-[#591427] disabled:opacity-40 flex items-center gap-1.5"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          Programar todas
        </button>
      </div>

      {!hasConfig && (
        <div className="px-4 py-3 bg-[#FFF8D1] border-b border-[#e8e6e3] flex items-start gap-2 text-[12px] text-[#3d3d3d]">
          <AlertCircle size={14} className="text-[#f08c00] mt-0.5 shrink-0" />
          <div>
            Esta clienta no tiene Metricool configurado. Ve a <strong>Clientes → Métricas</strong> para añadir las credenciales antes de programar.
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 bg-[#FFF5F5] border-b border-[#ffd0d0] text-[12px] text-[#e03131] flex items-center gap-2">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* Lista de publicaciones */}
      <div className="divide-y divide-[#f4f3f1]">
        {pubs.map(pub => {
          const posts = postsForPub(pub.id)
          const nets = pub.networks?.length ? pub.networks : configNetworks
          const isDone = isPubFullyScheduled(pub)
          return (
            <div key={pub.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                {/* Estado global */}
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-[#2f9e44]" />
                  ) : posts.some(p => p.status === 'failed') ? (
                    <XCircle size={16} className="text-[#e03131]" />
                  ) : (
                    <Circle size={16} className="text-[#d0cecb]" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* Título */}
                  <div>
                    <div className="text-[12.5px] font-medium text-[#1a1a1a] truncate">
                      {pub.title || 'Sin título'}
                    </div>
                    <div className="text-[11px] text-[#8a8680]">
                      {pub.type === 'reel' ? 'Reel' : 'Carrusel'} · {pub.day || 'Sin día'} · {pub.time}
                    </div>
                  </div>

                  {/* Fecha + URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10.5px] uppercase tracking-wider text-[#8a8680] flex items-center gap-1">
                        <Calendar size={11} /> Fecha programada
                      </span>
                      <input
                        type="datetime-local"
                        value={pub.scheduledDate || deriveDefaultDate(pub.day, pub.time, planning.weekStartDate)}
                        onChange={e => onUpdatePub({ ...pub, scheduledDate: e.target.value })}
                        className="text-[12px] px-2.5 py-1.5 rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10.5px] uppercase tracking-wider text-[#8a8680] flex items-center gap-1">
                        <Link2 size={11} /> URL pública del archivo
                      </span>
                      <input
                        type="url"
                        value={pub.mediaUrl || ''}
                        onChange={e => onUpdatePub({ ...pub, mediaUrl: e.target.value })}
                        placeholder="https://drive.google.com/..."
                        className="text-[12px] px-2.5 py-1.5 rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832]"
                      />
                    </label>
                  </div>

                  {/* Redes */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {availableNetworks.map(net => {
                      const post = posts.find(p => p.network === net)
                      const checked = nets.includes(net)
                      return (
                        <label
                          key={net}
                          className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border cursor-pointer transition-colors ${
                            checked
                              ? 'bg-[#FFF1B5] border-[#7A1832]/30 text-[#7A1832] font-medium'
                              : 'bg-white border-[#e8e6e3] text-[#8a8680] hover:border-[#7A1832]/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              const next = e.target.checked
                                ? [...new Set([...nets, net])]
                                : nets.filter(n => n !== net)
                              onUpdatePub({ ...pub, networks: next })
                            }}
                            className="sr-only"
                          />
                          {NETWORK_LABELS[net] || net}
                          {post?.status === 'scheduled' && <CheckCircle2 size={11} className="text-[#2f9e44]" />}
                          {post?.status === 'failed' && <XCircle size={11} className="text-[#e03131]" />}
                        </label>
                      )
                    })}
                  </div>

                  {/* Errores por red */}
                  {posts.filter(p => p.status === 'failed' && p.error).map(p => (
                    <div key={p.network} className="text-[11px] text-[#e03131] flex items-center gap-1.5">
                      <XCircle size={11} /> {NETWORK_LABELS[p.network] || p.network}: {p.error}
                    </div>
                  ))}

                  {/* Programados: mostrar IDs */}
                  {posts.filter(p => p.status === 'scheduled').map(p => (
                    <div key={p.network} className="text-[11px] text-[#2f9e44] flex items-center gap-1.5">
                      <CheckCircle2 size={11} /> {NETWORK_LABELS[p.network] || p.network}: ID {p.metricool_post_id}
                    </div>
                  ))}

                  {/* Botón programar */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => schedulePub(pub)}
                      disabled={sending === pub.id || !pub.mediaUrl?.trim() || !pub.scheduledDate || !hasConfig}
                      className="text-[12px] px-3 py-1.5 rounded-lg bg-[#7A1832] text-white font-medium hover:bg-[#591427] disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {sending === pub.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      {isDone ? 'Reprogramar' : 'Programar'}
                    </button>
                    {isDone && (
                      <span className="text-[11px] text-[#2f9e44] flex items-center gap-1">
                        <CheckCircle2 size={12} /> Programado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {pubs.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[#8a8680]">
            No hay publicaciones en esta planificación.
          </div>
        )}
      </div>
    </div>
  )
}