'use client'
import { useState, useEffect } from 'react'
import { CLIENTS, TEAM } from '@/lib/team/mock-data'
import { getByToken, savePlanning, createNotification } from '@/lib/team/planning-store'
import { createTask } from '@/lib/team/task-store'
import type { WeeklyPlanning, PlanningPublication } from '@/lib/team/types'
import InstagramFit from './InstagramFit'
import BraviMascot from '@/components/team/BraviMascot'
import {
  CheckCircle2, X, Send, Play, Star,
  Calendar, Clock, LayoutGrid, Video, Camera, AlertCircle, Sparkles, StickyNote,
} from 'lucide-react'

const DAY_SHORT: Record<string, string> = {
  Martes: 'Mar', Jueves: 'Jue', Domingo: 'Dom',
  Lunes: 'Lun', Miércoles: 'Mié', Viernes: 'Vie', Sábado: 'Sáb',
}

interface Props {
  token: string
}

export default function ClientPreviewPublic({ token }: Props) {
  const [planning, setPlanning] = useState<WeeklyPlanning | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [comment, setComment] = useState('')
  const [showCommentBox, setShowCommentBox] = useState(false)
  const [priorityNote, setPriorityNote] = useState('')
  const [showPriorityBox, setShowPriorityBox] = useState(false)
  const [prioritySubmitted, setPrioritySubmitted] = useState(false)
  const [submitted, setSubmitted] = useState<'approved' | 'changes' | null>(null)

  useEffect(() => {
    const p = getByToken(token)
    if (!p) setNotFound(true)
    else {
      setPlanning(p)
      if (p.status === 'aprobada') setSubmitted('approved')
      else if (p.status === 'cambios') setSubmitted('changes')
    }
    setLoading(false)
  }, [token])

  const approve = () => {
    if (!planning) return
    const next = { ...planning, status: 'aprobada' as const, clientComment: '' }
    savePlanning(next)
    setPlanning(next)
    setSubmitted('approved')
  }

  const sendChanges = () => {
    if (!planning || !comment.trim()) return
    const next = { ...planning, status: 'cambios' as const, clientComment: comment }
    savePlanning(next)
    setPlanning(next)
    // Auto-create a correction task assigned to the CM of the client.
    const client = CLIENTS.find(c => c.id === planning.clientId)
    if (client) {
      createTask({
        clientId: client.id,
        planningId: planning.id,
        title: `Correcciones de ${client.name} (sem ${planning.week})`,
        description: comment,
        type: 'correction',
        priority: 'alta',
        assignedTo: client.cmId,
        requestedByRole: 'client',
        requestedById: null,
      })
      // Notify the CM and the editor (corrections usually hit reels).
      if (client.cmId) {
        const cm = TEAM.find(t => t.id === client.cmId)
        createNotification({
          type: 'change',
          message: `${client.name} ha solicitado cambios en la planificación (sem ${planning.week}). Revisa la tabla de tareas.`,
          clientId: client.id,
        })
      }
    }
    setSubmitted('changes')
    setShowCommentBox(false)
  }

  const sendPriorityNote = () => {
    if (!planning || !priorityNote.trim()) return
    const client = CLIENTS.find(c => c.id === planning.clientId)
    if (client) {
      // Priority note goes to the CM of the client, who will then route to editor/designer.
      createTask({
        clientId: client.id,
        planningId: planning.id,
        title: `Prioridad para próxima semana · ${client.name}`,
        description: priorityNote,
        type: 'priority_note',
        priority: 'alta',
        assignedTo: client.cmId,
        requestedByRole: 'client',
        requestedById: null,
      })
      createNotification({
        type: 'review',
        message: `${client.name} ha dejado una nota de prioridad para la próxima semana.`,
        clientId: client.id,
      })
    }
    setPrioritySubmitted(true)
    setShowPriorityBox(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF5]">
        <div className="w-8 h-8 border-2 border-[#7A1832] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !planning) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFDF5] px-6 text-center">
        <AlertCircle size={40} className="text-[#d0cecb] mb-3" />
        <h1 className="text-[18px] font-bold text-[#1a1a1a] mb-1">Link no válido</h1>
        <p className="text-[13px] text-[#8a8680]">Esta planificación no existe o ha caducado. Contacta con tu equipo BRÄVE.</p>
      </div>
    )
  }

  const client = CLIENTS.find(c => c.id === planning.clientId)
  const pubs = [...planning.publications].sort((a, b) => a.order - b.order)
  // If the planification is still in draft / pending review, this is a team preview,
  // not a client delivery. Don't show approval buttons.
  const isPreviewOnly = planning.status === 'borrador' || planning.status === 'lista_revision'

  // BRAVI messages for the client
  const braviMessages: { text: string; mood?: 'motivate' | 'tip' | 'info' | 'warn' | 'celebrate' }[] = (() => {
    const salonName = client?.salonName || client?.name || ''
    if (isPreviewOnly) {
      return [
        { text: `Estás en modo vista previa — el equipo BRÄVE todavía está montando esta propuesta. 🚧`, mood: 'info' },
        { text: 'Algunas piezas pueden no estar terminadas (sin portada, sin copy…). Vuelve más tarde para verla completa.', mood: 'tip' },
      ]
    }
    if (submitted === 'approved') {
      return [
        { text: `¡Gracias ${salonName}! 🎉 Tu propuesta está aprobada. El equipo BRÄVE programará las publicaciones.`, mood: 'celebrate' },
      ]
    }
    if (submitted === 'changes') {
      return [
        { text: '¡Gracias por tu feedback! El equipo revisará tus comentarios y te enviará una nueva propuesta pronto. 💬', mood: 'info' },
      ]
    }
    return [
      { text: `¡Hola ${salonName}! 👋 Soy BRAVI. Revisa las propuestas con calma y dime qué piensas.`, mood: 'motivate' },
      { text: 'Si algo no te convence, pulsa «Solicitar cambios». Si todo te gusta, «Aprobar planificación» y listo. ✨', mood: 'tip' },
      { text: '¿Tienes una idea para la próxima semana? Usa lanotita amarilla 🗒️ para dejar una prioridad al equipo.', mood: 'info' },
    ]
  })()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFDF5] via-[#FFF8D1] to-[#FFF1B5]">
      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-[#FFF1B5] blur-3xl opacity-30" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 rounded-full bg-[#C1DBE8] blur-3xl opacity-30" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-[#7A1832] blur-3xl opacity-20" />
      </div>

      {/* Header */}
      <header className="bg-white/85 backdrop-blur-md border-b border-[#FFF1B5] sticky top-0 z-10">
        <div className="max-w-[680px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {client && (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[14px] font-bold shadow-md" style={{ background: client.logoColor }}>
                {client.name[0]}
              </div>
            )}
            <div>
              <div className="font-semibold text-[14px] text-[#1a1a1a]">{client?.salonName || client?.name}</div>
              <div className="text-[11.5px] text-[#8a8680]">Propuesta · Semana {planning.week} · {planning.month}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8a8680]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7A1832] to-[#A04060] flex items-center justify-center text-white text-[11px] font-bold shadow">B</div>
            <span className="font-medium">BRÄVE</span>
          </div>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-4 py-6 pb-32 relative">
        {/* Preview-only banner */}
        {isPreviewOnly && (
          <div className="mb-5 bg-[#FFF8D1] border border-[#FFF1B5] rounded-xl p-3 flex items-start gap-2.5 max-w-[680px] mx-auto">
            <AlertCircle size={16} className="text-[#f08c00] mt-0.5 shrink-0" />
            <div className="text-[12.5px] text-[#7a5e1a] leading-snug">
              <span className="font-semibold">Vista previa del equipo.</span> Esta propuesta aún no se ha enviado al cliente. Algunas piezas pueden estar incompletas (sin portada, sin copy, sin día asignado). Los botones de aprobación estarán disponibles cuando el CM la envíe.
            </div>
          </div>
        )}

        {/* Intro */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#7A1832] bg-white/80 backdrop-blur px-3 py-1 rounded-full mb-3 shadow-sm">
            <Sparkles size={12} /> Propuesta de contenido
          </div>
          <h1 className="text-[24px] font-bold text-[#1a1a1a] mb-1">Tu planificación semanal</h1>
          <p className="text-[13px] text-[#8a8680]">Revisa las propuestas, aprueba o solicita cambios cuando quieras.</p>
        </div>

        {/* BRAVI welcome */}
        <div className="max-w-[480px] mx-auto mb-5">
          <BraviMascot messages={braviMessages} />
        </div>

        {/* Fit preview */}
        <section className="bg-white rounded-2xl border border-[#FFF1B5] p-4 mb-5 max-w-[480px] mx-auto shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[14px] text-[#1a1a1a] flex items-center gap-1.5">
              <Camera size={15} className="text-[#7A1832]" /> Vista del feed
            </h2>
            <span className="text-[11px] text-[#8a8680]">orden de publicación</span>
          </div>
          <InstagramFit publications={pubs} size="md" />
        </section>

        {/* Publications */}
        <section className="space-y-4">
          {pubs.map((pub, idx) => (
            <PublicationView key={pub.id} pub={pub} clientColor={client?.logoColor || '#7A1832'} index={idx} />
          ))}
        </section>
      </main>

      {/* Priority note section (above action footer) */}
      {prioritySubmitted && (
        <div className="max-w-[680px] mx-auto mb-3 px-4">
          <div className="bg-gradient-to-r from-[#FFF1B5] to-[#A04060] text-[#1a1a1a] rounded-xl p-3 flex items-center gap-2 shadow-md">
            <StickyNote size={18} />
            <span className="text-[12.5px] font-medium">Nota de prioridad enviada. Tu CM la tendrá en cuenta para la próxima semana.</span>
          </div>
        </div>
      )}

      {showPriorityBox && !submitted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#FFF1B5] z-30">
          <div className="max-w-[680px] mx-auto px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#A04060]">
              <StickyNote size={14} /> Nota de prioridad para la próxima semana
            </div>
            <textarea
              value={priorityNote}
              onChange={e => setPriorityNote(e.target.value)}
              placeholder="Ej: La semana que viene quiero dar prioridad a un reel sobre el nuevo servicio de balayage…"
              rows={3}
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] focus:outline-none focus:border-[#A04060] focus:ring-2 focus:ring-[#A04060]/20 resize-y"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPriorityBox(false)}
                className="px-4 py-2.5 text-[13px] text-[#8a8680] hover:text-[#1a1a1a]"
              >
                Cancelar
              </button>
              <button
                onClick={sendPriorityNote}
                disabled={!priorityNote.trim()}
                className="flex-1 bg-[#A04060] hover:bg-[#e09e04] disabled:opacity-50 text-white text-[13px] font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
              >
                <Send size={14} /> Enviar nota al equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action footer */}
      {!submitted && !showPriorityBox && !isPreviewOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#FFF1B5] z-20">
          <div className="max-w-[680px] mx-auto px-4 py-3">
            {showCommentBox ? (
              <div className="space-y-2">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Cuéntanos qué cambios te gustaría…"
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] focus:outline-none focus:border-[#7A1832] focus:ring-2 focus:ring-[#7A1832]/10 resize-y"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCommentBox(false)}
                    className="px-4 py-2.5 text-[13px] text-[#8a8680] hover:text-[#1a1a1a]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={sendChanges}
                    disabled={!comment.trim()}
                    className="flex-1 bg-[#e03131] hover:bg-[#c12929] disabled:opacity-50 text-white text-[13px] font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Send size={14} /> Enviar comentarios
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={approve}
                  className="flex-1 bg-gradient-to-r from-[#2f9e44] to-[#C1DBE8] hover:from-[#2a8c3b] hover:to-[#5aa9f7] text-white text-[14px] font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg"
                >
                  <CheckCircle2 size={18} /> Aprobar planificación
                </button>
                <button
                  onClick={() => setShowCommentBox(true)}
                  className="flex-1 bg-white border-2 border-[#A04060] hover:bg-[#FFF1B5] text-[#7A1832] text-[14px] font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <X size={18} /> Solicitar cambios
                </button>
                <button
                  onClick={() => setShowPriorityBox(true)}
                  title="Dejar nota de prioridad para próxima semana"
                  className="bg-white border-2 border-[#FFF8D1] hover:bg-[#FFF8D1] text-[#A04060] text-[14px] font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <StickyNote size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submitted state */}
      {submitted && (
        <div className="fixed bottom-0 left-0 right-0 z-20">
          <div className={`max-w-[680px] mx-auto m-4 rounded-2xl p-4 ${submitted === 'approved' ? 'bg-gradient-to-r from-[#2f9e44] to-[#591427]' : 'bg-gradient-to-r from-[#7A1832] to-[#7A1832]'} text-white shadow-lg`}>
            <div className="flex items-center gap-3">
              {submitted === 'approved' ? <CheckCircle2 size={22} /> : <Send size={22} />}
              <div>
                <div className="font-semibold text-[14px]">
                  {submitted === 'approved' ? '¡Planificación aprobada!' : 'Comentarios enviados'}
                </div>
                <div className="text-[11.5px] opacity-90">
                  {submitted === 'approved'
                    ? 'Tu equipo BRÄVE empezará a programar las publicaciones.'
                    : 'Tu equipo revisará tus comentarios y te enviará una nueva propuesta.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PublicationView({ pub, clientColor, index }: { pub: PlanningPublication; clientColor: string; index: number }) {
  const cover = pub.type === 'reel' ? pub.coverUrl : (pub.carouselImages[0] || null)
  const altCovers = pub.type === 'reel' ? (pub.coverAlternatives || []) : []
  const otherSlides = pub.type === 'carrusel' ? pub.carouselImages.slice(1) : []
  const [activeCoverIdx, setActiveCoverIdx] = useState(0)
  const allCovers = pub.type === 'reel' ? [cover, ...altCovers].filter(Boolean) : [cover]
  const activeCover = allCovers[activeCoverIdx] || null

  // Alternating accent per card
  const accents = ['#7A1832', '#591427', '#7A1832', '#A04060']
  const accent = accents[index % accents.length]

  return (
    <article className="bg-white rounded-2xl border border-[#FFF1B5] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header chip — colored */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-[#f4f3f1]" style={{ background: `${accent}10` }}>
        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: accent }}>
          <Calendar size={12} />
          {pub.day || 'Sin asignar'}
        </div>
        <span className="text-[#d0cecb]">·</span>
        <div className="flex items-center gap-1 text-[11.5px] text-[#8a8680]">
          <Clock size={12} /> {pub.time}
        </div>
        <span className="ml-auto text-[11px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1" style={{ color: accent, background: 'white' }}>
          {pub.type === 'reel' ? <Video size={11} /> : <LayoutGrid size={11} />}
          {pub.type === 'reel' ? 'Reel' : `Carrusel${pub.carouselImages.length > 1 ? ` · ${pub.carouselImages.length}` : ''}`}
        </span>
      </div>

      {/* Body: 2-col layout — media left, info right */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0">
        {/* Media column */}
        <div className="bg-gradient-to-br from-[#FFFDF5] to-[#FFF1B5]/50 p-3 flex flex-col gap-2">
          {pub.type === 'reel' ? (
            activeCover ? (
              <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-black mx-auto" style={{ maxWidth: '240px', width: '100%' }}>
                <img src={activeCover} alt={pub.title} className="w-full h-full object-cover" />
                {pub.driveLink && (
                  <a
                    href={pub.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 bg-white/95 hover:bg-white text-[#1a1a1a] text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 shadow"
                  >
                    <Play size={12} fill="#1a1a1a" /> Ver vídeo
                  </a>
                )}
                {allCovers.length > 1 && (
                  <div className="absolute top-2 left-2 flex gap-1">
                    {allCovers.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveCoverIdx(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeCoverIdx ? 'bg-white w-4' : 'bg-white/50'}`}
                        aria-label={`Propuesta ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-[9/16] rounded-lg bg-white border border-dashed border-[#e8e6e3] flex items-center justify-center text-[#d0cecb] mx-auto" style={{ maxWidth: '240px', width: '100%' }}>
                <Video size={32} />
              </div>
            )
          ) : pub.carouselImages.length > 0 ? (
            <>
              {/* Main cover */}
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden mx-auto w-full" style={{ maxWidth: '240px' }}>
                <img src={pub.carouselImages[0]} alt="Portada" className="w-full h-full object-cover" />
                <div className="absolute top-1.5 left-1.5 bg-[#7A1832] text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                  <Star size={9} fill="white" /> PORTADA
                </div>
              </div>
              {/* Other slides thumbnails */}
              {otherSlides.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {otherSlides.map((img, i) => (
                    <div key={i} className="relative aspect-[4/5] rounded-md overflow-hidden ring-1 ring-[#FFF1B5]">
                      <img src={img} alt={`Slide ${i + 2}`} className="w-full h-full object-cover" />
                      <div className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[8px] font-medium px-1 py-0.5 rounded-full">
                        {i + 2}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-[4/5] rounded-lg bg-white border border-dashed border-[#e8e6e3] flex items-center justify-center text-[#d0cecb] mx-auto w-full" style={{ maxWidth: '240px' }}>
              <LayoutGrid size={32} />
            </div>
          )}

          {/* Alt covers thumbnails for reels */}
          {pub.type === 'reel' && altCovers.length > 0 && (
            <div className="mt-1">
              <div className="text-[10px] text-[#8a8680] mb-1 flex items-center gap-1">
                <Sparkles size={10} style={{ color: accent }} /> Otras propuestas
              </div>
              <div className="flex gap-1.5">
                {altCovers.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveCoverIdx(i + 1)}
                    className={`relative aspect-[9/16] w-12 rounded overflow-hidden transition-all ${activeCoverIdx === i + 1 ? 'ring-2' : 'ring-1 ring-[#e8e6e3] hover:ring-[#7A1832]/40'}`}
                    style={activeCoverIdx === i + 1 ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
                  >
                    <img src={img} alt={`Propuesta ${i + 2}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info column */}
        <div className="p-4 flex flex-col">
          <h3 className="text-[16px] font-semibold text-[#1a1a1a] mb-1">{pub.title}</h3>
          {pub.copy ? (
            <p className="text-[13px] text-[#3d3d3d] whitespace-pre-wrap leading-relaxed flex-1">{pub.copy}</p>
          ) : (
            <p className="text-[12px] text-[#d0cecb] italic">El copy estará disponible pronto.</p>
          )}

          {pub.type === 'carrusel' && pub.carouselImages.length > 1 && (
            <div className="text-[10.5px] text-[#8a8680] mt-3 pt-3 border-t border-[#f4f3f1] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#7A1832]" />
              {pub.carouselImages.length} slides · primera = portada
            </div>
          )}
          {pub.type === 'reel' && altCovers.length > 0 && (
            <div className="text-[10.5px] text-[#8a8680] mt-3 pt-3 border-t border-[#f4f3f1] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
              {allCovers.length} propuestas de portada · toca para cambiar
            </div>
          )}
        </div>
      </div>
    </article>
  )
}