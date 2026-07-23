'use client'
import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { CLIENTS, TEAM } from '@/lib/team/mock-data'
import { getAllPlannings, generateShareLink } from '@/lib/team/planning-store'
import type { NavKey } from '@/components/team/Sidebar'
import type { WeeklyPlanning, PlanningPublication } from '@/lib/team/types'
import BraviMascot from '@/components/team/BraviMascot'
import {
  Calendar, Video, LayoutGrid, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, ArrowRight, Sparkles, Film, Image as ImageIcon, Eye,
} from 'lucide-react'

function pubComplete(p: PlanningPublication) {
  return (p.type === 'reel' ? !!p.coverUrl : p.carouselImages.length > 0) &&
    p.copy.trim() &&
    (p.type !== 'reel' || p.driveLink)
}

// Open the public client preview for a planning — works at any moment,
// even when the planning is incomplete or still in draft.
function openClientPreview(planningId: string) {
  const url = generateShareLink(planningId)
  if (url) window.open(url, '_blank')
}

export default function Dashboard({ onNavigate }: { onNavigate: (k: NavKey) => void }) {
  const { user, member } = useAuth()
  const [week, setWeek] = useState(2) // working "a semana vista": week 2 is the active target

  const allPlannings = useMemo(() => getAllPlannings(), [])

  if (!user || !member) return null

  // Filter plannings by role
  const scoped = allPlannings.filter(p => {
    if (user.role === 'admin') return true
    const c = CLIENTS.find(cl => cl.id === p.clientId)
    if (!c) return false
    if (user.role === 'cm') return c.cmId === member.id
    if (user.role === 'editor') return c.editorId === member.id
    if (user.role === 'designer') return c.designerId === member.id
    return false
  }).filter(p => p.week === week)

  // Aggregate KPIs across all scoped plannings
  const allPubs = scoped.flatMap(p => p.publications)
  const total = allPubs.length
  const complete = allPubs.filter(pubComplete).length
  const markedReady = allPubs.filter(p => !!p.markedReadyById).length
  const blocked = allPubs.filter(p => !!p.blockedNoMaterial).length
  const reels = allPubs.filter(p => p.type === 'reel').length
  const carruseles = allPubs.filter(p => p.type === 'carrusel').length

  // Per-client rows
  const rows = scoped.map(p => {
    const client = CLIENTS.find(c => c.id === p.clientId)
    const pubs = p.publications
    const expectedReels = client?.weeklyLoad.reels ?? 0
    const expectedCarruseles = client?.weeklyLoad.carruseles ?? 0
    const doneReels = pubs.filter(x => x.type === 'reel' && pubComplete(x)).length
    const doneCarruseles = pubs.filter(x => x.type === 'carrusel' && pubComplete(x)).length
    const blockedCount = pubs.filter(x => !!x.blockedNoMaterial).length
    const readyCount = pubs.filter(x => !!x.markedReadyById).length
    const missingRaw = pubs.filter(x => x.type === 'reel' && !x.driveLink && !x.blockedNoMaterial).length
    return {
      planning: p,
      client,
      pubs,
      expectedReels,
      expectedCarrueles: expectedCarruseles,
      doneReels,
      doneCarrueles: doneCarruseles,
      blockedCount,
      readyCount,
      missingRaw,
      pct: pubs.length ? Math.round((pubs.filter(pubComplete).length / pubs.length) * 100) : 0,
    }
  }).sort((a, b) => a.pct - b.pct) // most unfinished first

  // Clients without any planning for the week
  const scopedClientIds = user.role === 'admin'
    ? CLIENTS.map(c => c.id)
    : CLIENTS.filter(c => {
        if (user.role === 'cm') return c.cmId === member.id
        if (user.role === 'editor') return c.editorId === member.id
        if (user.role === 'designer') return c.designerId === member.id
        return false
      }).map(c => c.id)
  const missingClients = scopedClientIds.filter(id => !scoped.some(p => p.clientId === id))
    .map(id => CLIENTS.find(c => c.id === id)!)
    .filter(Boolean)

  const kpis = [
    { label: 'Publicaciones', value: total, icon: Film, color: '#7A1832', bg: '#FFF1B5' },
    { label: 'Completas', value: complete, icon: CheckCircle2, color: '#2a8a4a', bg: '#B8D8B0' },
    { label: 'Marcadas listo', value: markedReady, icon: Sparkles, color: '#A04060', bg: '#FFF1B5' },
    { label: 'Sin material', value: blocked, icon: AlertTriangle, color: '#c0394e', bg: '#FFF5F5' },
  ]

  // BRAVI contextual messages
  const braviMessages: { text: string; mood?: 'motivate' | 'tip' | 'info' | 'warn' | 'celebrate' }[] = (() => {
    const firstName = user.name.split(' ')[0]
    if (blocked > 0) {
      return [
        { text: `${firstName}, hay ${blocked} publicación${blocked > 1 ? 'es' : ''} bloqueada${blocked > 1 ? 's' : ''} por falta de material bruto. Si hoy toca editar, avisa al cliente o márcalo y sigue con otra.`, mood: 'warn' },
        { text: 'Marcar «sin material» no es rendirte: es dejar claro qué cliente no respondió. ¡Sigue con los que sí tienen material!', mood: 'tip' },
      ]
    }
    if (total === 0) {
      return [
        { text: `Hola ${firstName} 👋 Todavía no hay planificaciones para semana ${week}. Crea la primera desde Planificación.`, mood: 'info' },
        { text: 'Trabajamos a semana vista: lo que haces hoy se entrega al cliente el lunes. ¡Vamos!', mood: 'motivate' },
      ]
    }
    if (complete === total && total > 0) {
      return [
        { text: `¡Todo completo para semana ${week}! 🎉 Si eres CM o admin, toca enviar a los clientes.`, mood: 'celebrate' },
        { text: 'Semana cerrada. Si te sobra tiempo, adelanta copys de la próxima o revisa tareas pendientes.', mood: 'tip' },
      ]
    }
    if (missingClients.length > 0) {
      return [
        { text: `${firstName}, faltan ${missingClients.length} cliente${missingClients.length > 1 ? 's' : ''} por crear planificación esta semana. ¿Empezamos por ahí?`, mood: 'warn' },
        { text: 'Un cliente sin planificación hoy es un cliente sin contenido el lunes. ¡Vamos!', mood: 'motivate' },
      ]
    }
    const remaining = total - complete
    const pendingReels = reels - allPubs.filter(p => p.type === 'reel' && pubComplete(p)).length
    const pendingCarruseles = carruseles - allPubs.filter(p => p.type === 'carrusel' && pubComplete(p)).length
    const missingDriveLinks = allPubs.filter(p => p.type === 'reel' && !p.driveLink && !p.blockedNoMaterial).length
    const msgs: { text: string; mood?: 'motivate' | 'tip' | 'info' | 'warn' | 'celebrate' }[] = []
    if (user.role === 'editor') {
      msgs.push({ text: `Hoy toca avanzar reels: ${pendingReels} pendientes. Sube portada + link de Drive.`, mood: 'motivate' })
    } else if (user.role === 'designer') {
      msgs.push({ text: `Quedan ${pendingCarruseles} carruseles por completar. Sube mínimo 3 imágenes en cada uno.`, mood: 'motivate' })
    } else if (user.role === 'cm') {
      msgs.push({ text: `${missingDriveLinks} reels sin link de Drive. Si el editor ya subió, faltará solo el copy.`, mood: 'info' })
    } else if (user.role === 'admin') {
      msgs.push({ text: `Vista general: ${complete}/${total} completas, ${markedReady} marcadas listas. Todo bajo control.`, mood: 'info' })
    }
    msgs.push({ text: `Faltan ${remaining} publicación${remaining > 1 ? 'es' : ''} por completar esta semana. ¡Tú puedes!`, mood: 'tip' })
    return msgs
  })()

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#FFF1B5] p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[20px] font-bold text-[#1a1a1a]">Hola, {user.name} 👋</h2>
            <p className="text-[13px] text-[#8a8680] mt-0.5">
              Trabajamos a semana vista: esta pantalla muestra el progreso de la semana que se enviará al cliente.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-[#FFFDF5] border border-[#FFF1B5] rounded-lg p-1">
            {[1, 2].map(w => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  week === w ? 'bg-[#7A1832] text-white' : 'text-[#8a8680] hover:text-[#1a1a1a]'
                }`}
              >
                Semana {w}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BRAVI mascot */}
      <BraviMascot messages={braviMessages} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-[#FFF1B5] p-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
                  <Icon size={18} style={{ color: k.color }} />
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-[#8a8680]">{k.label}</div>
                  <div className="text-[22px] font-bold text-[#1a1a1a] leading-none mt-0.5">{k.value}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Alertas de material bruto */}
      {blocked > 0 && (
        <div className="bg-[#FFF5F5] border border-[#ffd0d0] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-[#c0394e]" />
            <h3 className="font-semibold text-[13px] text-[#c0394e]">Publicaciones bloqueadas por falta de material bruto</h3>
          </div>
          <div className="space-y-1.5">
            {rows.filter(r => r.blockedCount > 0).map(r => (
              <div key={r.planning.id} className="flex items-center gap-2 text-[12px]">
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ background: r.client?.logoColor }}>
                  {r.client?.name[0]}
                </span>
                <span className="font-medium text-[#1a1a1a]">{r.client?.name}</span>
                <span className="text-[#8a8680]">· {r.blockedCount} bloqueada{r.blockedCount > 1 ? 's' : ''}</span>
                {r.pubs.filter(p => p.blockedNoMaterial && p.blockedReason).map(p => (
                  <span key={p.id} className="text-[#c0394e] italic">— {p.blockedReason}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clientes sin planificación creada */}
      {missingClients.length > 0 && (
        <div className="bg-[#FFF1B5]/60 border border-[#FFF1B5] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-[#7A1832]" />
            <h3 className="font-semibold text-[13px] text-[#7A1832]">Sin planificación creada para semana {week}</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missingClients.map(c => (
              <span key={c.id} className="text-[11.5px] bg-white border border-[#FFF1B5] px-2 py-1 rounded-md flex items-center gap-1.5">
                <span className="w-4 h-4 rounded flex items-center justify-center text-white text-[9px] font-bold" style={{ background: c.logoColor }}>{c.name[0]}</span>
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de progreso por cliente */}
      <div className="bg-white rounded-2xl border border-[#FFF1B5] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#FFF1B5] flex items-center gap-2">
          <TrendingUp size={15} className="text-[#7A1832]" />
          <h3 className="font-semibold text-[13px] text-[#1a1a1a]">Progreso por cliente · Semana {week}</h3>
          <span className="ml-auto text-[11px] text-[#8a8680]">{rows.length} clientes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#FFFDF5] text-[#8a8680] text-[10.5px] uppercase tracking-wide">
                <th className="text-left font-medium px-4 py-2">Cliente</th>
                <th className="text-center font-medium px-2 py-2 min-w-[80px]">Reels</th>
                <th className="text-center font-medium px-2 py-2 min-w-[80px]">Carruseles</th>
                <th className="text-center font-medium px-2 py-2 min-w-[60px]">Listas</th>
                <th className="text-center font-medium px-2 py-2 min-w-[70px]">Material</th>
                <th className="text-left font-medium px-3 py-2 min-w-[140px]">Progreso</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#8a8680]">
                    No hay planificaciones para esta semana todavía.
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.planning.id} className="border-t border-[#FFF1B5] hover:bg-[#FFFDF5]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold" style={{ background: r.client?.logoColor }}>
                        {r.client?.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-[#1a1a1a]">{r.client?.name}</div>
                        <div className="text-[10.5px] text-[#8a8680]">{r.client?.city}</div>
                      </div>
                    </div>
                  </td>
                  {/* Reels */}
                  <td className="px-2 py-3 text-center">
                    <ReelCell done={r.doneReels} expected={r.expectedReels} />
                  </td>
                  {/* Carruseles */}
                  <td className="px-2 py-3 text-center">
                    <CarruselCell done={r.doneCarrueles} expected={r.expectedCarrueles} />
                  </td>
                  {/* Ready */}
                  <td className="px-2 py-3 text-center">
                    <span className={`text-[12px] font-semibold ${r.readyCount === r.pubs.length && r.pubs.length > 0 ? 'text-[#2a8a4a]' : 'text-[#8a8680]'}`}>
                      {r.readyCount}/{r.pubs.length}
                    </span>
                  </td>
                  {/* Material */}
                  <td className="px-2 py-3 text-center">
                    {r.blockedCount > 0 ? (
                      <span className="text-[10.5px] text-[#c0394e] bg-[#FFF5F5] border border-[#ffd0d0] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit mx-auto">
                        <AlertTriangle size={10} /> {r.blockedCount}
                      </span>
                    ) : r.missingRaw > 0 ? (
                      <span className="text-[10.5px] text-[#f08c00] bg-[#FFF8D1] px-2 py-0.5 rounded-full font-medium w-fit mx-auto block">
                        {r.missingRaw} link
                      </span>
                    ) : (
                      <CheckCircle2 size={14} className="text-[#2a8a4a] mx-auto" />
                    )}
                  </td>
                  {/* Progress bar */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#FFF1B5] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${r.pct}%`,
                            background: r.pct === 100 ? '#2a8a4a' : r.pct >= 50 ? '#7A1832' : '#A04060',
                          }}
                        />
                      </div>
                      <span className="text-[10.5px] text-[#8a8680] w-9 text-right">{r.pct}%</span>
                    </div>
                  </td>
                  {/* Action */}
                  <td className="px-2 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openClientPreview(r.planning.id)}
                        title="Vista previa del cliente (lo que verá cuando se le envíe)"
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[#d0cecb] hover:text-[#7A1832] hover:bg-[#FFF1B5]/40 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => onNavigate('planificacion')}
                        className="text-[11.5px] text-[#7A1832] font-medium hover:underline flex items-center gap-1"
                      >
                        Abrir <ArrowRight size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow quick guide */}
      <div className="bg-gradient-to-br from-[#FFFDF5] to-[#FFF1B5]/60 rounded-2xl border border-[#FFF1B5] p-5">
        <h3 className="font-semibold text-[14px] text-[#7A1832] mb-3 flex items-center gap-2">
          <Sparkles size={15} /> Tu día a día, en 4 pasos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Step n={1} title="Mira la Semana" body="Aquí ves qué falta por cliente. Lo más rojo = lo más urgente." />
          <Step n={2} title="Abre Planificación" body="Entra al cliente, edita tu parte (portada, link, copy, imágenes)." />
          <Step n={3} title="Marca listo" body="Cuando tu parte esté, pulsa «Marcar listo y avisar CM»." />
          <Step n={4} title="El CM envía" body="Cuando todo está listo, el CM genera el link y lo manda al cliente." />
        </div>
      </div>
    </div>
  )
}

function ReelCell({ done, expected }: { done: number; expected: number }) {
  const ok = done >= expected
  return (
    <span className={`inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-md ${ok ? 'text-[#2a8a4a] bg-[#B8D8B0]/40' : 'text-[#7A1832] bg-[#FFF1B5]/60'}`}>
      <Video size={11} /> {done}/{expected}
    </span>
  )
}

function CarruselCell({ done, expected }: { done: number; expected: number }) {
  if (expected === 0) return <span className="text-[10.5px] text-[#d0cecb]">—</span>
  const ok = done >= expected
  return (
    <span className={`inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-md ${ok ? 'text-[#2a8a4a] bg-[#B8D8B0]/40' : 'text-[#7A1832] bg-[#FFF1B5]/60'}`}>
      <LayoutGrid size={11} /> {done}/{expected}
    </span>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#FFF1B5] p-3">
      <div className="w-6 h-6 rounded-full bg-[#7A1832] text-white text-[11px] font-bold flex items-center justify-center mb-2">
        {n}
      </div>
      <div className="text-[12.5px] font-semibold text-[#1a1a1a] mb-0.5">{title}</div>
      <div className="text-[11.5px] text-[#8a8680] leading-snug">{body}</div>
    </div>
  )
}