'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { CLIENTS, TEAM } from '@/lib/team/mock-data'
import { savePlanning, generateShareLink, notifyPublicationReady, notifyPlanningSent } from '@/lib/team/planning-store'
import type { WeeklyPlanning, PlanningPublication } from '@/lib/team/types'
import PublicationCard from './PublicationCard'
import InstagramFit from './InstagramFit'
import BraviMascot from '@/components/team/BraviMascot'
import SchedulePanel from './SchedulePanel'
import {
  ChevronLeft, Plus, Video, LayoutGrid, Link2, Copy, Check,
  AlertCircle, Clock, Send, Eye, Sparkles,
} from 'lucide-react'

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  borrador: { label: 'Borrador', color: '#8a8680', bg: '#f4f3f1' },
  lista_revision: { label: 'Lista para revisión', color: '#591427', bg: '#C1DBE8' },
  enviada: { label: 'Enviada al cliente', color: '#f08c00', bg: '#FFF8D1' },
  aprobada: { label: 'Aprobada', color: '#2f9e44', bg: '#EBFBEE' },
  cambios: { label: 'Cambios solicitados', color: '#e03131', bg: '#FFF5F5' },
}

interface Props {
  initialPlanning: WeeklyPlanning
  onBack: () => void
  onOpenPublicPreview?: () => void
}

export default function PlanningWorkspace({ initialPlanning, onBack, onOpenPublicPreview }: Props) {
  const { user, member } = useAuth()
  const [planning, setPlanning] = useState<WeeklyPlanning>(initialPlanning)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [selectedPubId, setSelectedPubId] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string>(initialPlanning.shareToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/team/preview/${initialPlanning.shareToken}` : '')
  const [copied, setCopied] = useState(false)
  const [savedError, setSavedError] = useState<string | null>(null)

  if (!user || !member) return null

  const client = CLIENTS.find(c => c.id === planning.clientId)
  const cfg = STATUS_CFG[planning.status]
  const canManageStatus = user.role === 'admin' || user.role === 'cm'
  const canAddPub = user.role === 'admin'

  // Sort publications by order
  const pubs = [...(planning.publications || [])].sort((a, b) => a.order - b.order)

  // Completeness
  const missingCovers = pubs.filter(p => p.type === 'reel' ? !p.coverUrl : p.carouselImages.length === 0).length
  const missingCopy = pubs.filter(p => !p.copy.trim()).length
  const missingDrive = pubs.filter(p => p.type === 'reel' && !p.driveLink).length
  const totalComplete = pubs.filter(p =>
    (p.type === 'reel' ? !!p.coverUrl : p.carouselImages.length > 0) &&
    p.copy.trim() &&
    (p.type !== 'reel' || p.driveLink)
  ).length
  const totalMarkedReady = pubs.filter(p => !!p.markedReadyById).length
  const allReady = totalComplete === pubs.length && pubs.length > 0

  // BRAVI contextual messages
  const braviMessages: { text: string; mood?: 'motivate' | 'tip' | 'info' | 'warn' | 'celebrate' }[] = (() => {
    if (pubs.length === 0) {
      return [
        { text: 'Esta planificación está vacía. Un admin tiene que crear las publicaciones (2 reels + 1 carrusel por cliente) para que el equipo pueda empezar a trabajar.', mood: 'info' },
        { text: '¿Eres admin? Usa los botones «Añadir reel» y «Añadir carrusel» para montar la estructura de la semana.', mood: 'tip' },
      ]
    }
    if (planning.status === 'aprobada') {
      return [{ text: '¡El cliente aprobó! 🎉 Esta semana está lista. ¿Habilitamos la próxima?', mood: 'celebrate' }]
    }
    if (planning.status === 'cambios') {
      return [
        { text: 'El cliente pidió cambios. Lee el comentario, resuelve y vuelve a enviar.', mood: 'warn' },
        { text: 'Las correcciones son parte del oficio: ajusta y reenvía, tú puedes.', mood: 'tip' },
      ]
    }
    if (planning.status === 'enviada') {
      return [{ text: 'Planificación enviada al cliente ✉️. Ahora toca esperar su respuesta.', mood: 'info' }]
    }
    if (user.role === 'editor') {
      const pendingReelCovers = pubs.filter(p => p.type === 'reel' && !p.coverUrl && !p.blockedNoMaterial).length
      const blockedReels = pubs.filter(p => p.type === 'reel' && p.blockedNoMaterial).length
      if (blockedReels > 0) return [{ text: `${blockedReels} reel${blockedReels > 1 ? 's' : ''} sin material bruto. Marcaste bien — el CM lo sabe. Sigue con los que sí tienen material.`, mood: 'warn' }]
      if (pendingReelCovers > 0) return [{ text: `Te faltan ${pendingReelCovers} portada${pendingReelCovers > 1 ? 's' : ''} de reel. Sube la imagen y pega el link de Drive.`, mood: 'motivate' }]
      return [{ text: 'Tus reels están listos ✅. Cuando termines, pulsa «Marcar listo» para avisar al CM.', mood: 'tip' }]
    }
    if (user.role === 'designer') {
      const pendingCarruseles = pubs.filter(p => p.type === 'carrusel' && p.carouselImages.length === 0).length
      if (pendingCarruseles > 0) return [{ text: `Te faltan ${pendingCarruseles} carrusel${pendingCarruseles > 1 ? 'es' : ''} por completar. Sube mínimo 3 imágenes en cada uno.`, mood: 'motivate' }]
      return [{ text: 'Carruseles completos ✅. Pulsa «Marcar listo» para avisar al CM.', mood: 'tip' }]
    }
    if (user.role === 'cm') {
      if (missingCopy > 0) return [{ text: `Faltan ${missingCopy} copy${missingCopy > 1 ? 's' : ''} por escribir. Si quieres, usa el botón «Copy con IA».`, mood: 'tip' }]
      if (allReady) return [{ text: 'Todo listo ✨. Ya puedes marcar para revisión y enviar al cliente.', mood: 'celebrate' }]
      return [{ text: 'Tu parte: escribir copies, reordenar el feed y enviar al cliente cuando todo esté listo.', mood: 'info' }]
    }
    // admin
    if (allReady) return [{ text: 'Todo completo ✨. Como admin puedes enviar al cliente o crear la próxima semana.', mood: 'celebrate' }]
    return [{ text: `Faltan ${pubs.length - totalComplete} piezas por completar. Cada rol aporta su parte.`, mood: 'info' }]
  })()

  const persist = (next: WeeklyPlanning) => {
    setPlanning(next)
    const ok = savePlanning(next)
    if (!ok) setSavedError('No se pudo guardar (almacén lleno — las imágenes base64 pesan demasiado)')
    else setSavedError(null)
  }

  const updatePub = (updated: PlanningPublication) => {
    const next = { ...planning, publications: planning.publications.map(p => p.id === updated.id ? updated : p) }
    persist(next)
  }

  const readyPub = (updated: PlanningPublication) => {
    const wasReady = planning.publications.find(p => p.id === updated.id)?.markedReadyById
    const next = { ...planning, publications: planning.publications.map(p => p.id === updated.id ? updated : p) }
    persist(next)
    // Notify CMs only when transitioning to ready
    if (!wasReady && updated.markedReadyById) {
      notifyPublicationReady(next, updated.title || 'Publicación')
    }
  }

  const addPub = (type: 'reel' | 'carrusel') => {
    const newPub: PlanningPublication = {
      id: `pub-${Date.now()}`,
      type,
      title: 'Nueva publicación',
      coverUrl: null,
      coverAlternatives: [],
      carouselImages: [],
      copy: '',
      driveLink: null,
      day: null,
      time: '12:00',
      order: pubs.length,
      authorId: member.id,
      markedReadyById: null,
      markedReadyAt: null,
      blockedNoMaterial: false,
      blockedReason: null,
    }
    const next = { ...planning, publications: [...planning.publications, newPub] }
    persist(next)
  }

  const deletePub = (id: string) => {
    const remaining = planning.publications.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i }))
    persist({ ...planning, publications: remaining })
  }

  // Drag and drop reorder
  const onDragStart = (idx: number) => setDraggedIdx(idx)
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (draggedIdx !== null && draggedIdx !== idx) setDragOverIdx(idx)
  }
  const onDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null)
      setDragOverIdx(null)
      return
    }
    const next = [...pubs]
    const [moved] = next.splice(draggedIdx, 1)
    next.splice(idx, 0, moved)
    const reordered = next.map((p, i) => ({ ...p, order: i }))
    persist({ ...planning, publications: reordered })
    setDraggedIdx(null)
    setDragOverIdx(null)
  }

  // Status transitions
  const markListReview = () => persist({ ...planning, status: 'lista_revision' as const })
  const sendToClient = () => {
    const url = generateShareLink(planning.id)
    setShareUrl(url)
    const next: WeeklyPlanning = { ...planning, status: 'enviada' }
    persist(next)
    notifyPlanningSent(next)
  }
  const resolveChanges = () => persist({ ...planning, status: 'lista_revision' as const, clientComment: '' })

  // Open the public client preview at any moment, even when incomplete.
  // Generates a share token (without changing status) and opens in a new tab.
  const openClientPreview = () => {
    let url = shareUrl
    if (!url) {
      url = generateShareLink(planning.id)
      setShareUrl(url)
    }
    window.open(url, '_blank')
  }

  const copyUrl = () => {
    navigator.clipboard?.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#8a8680] hover:text-[#1a1a1a]">
          <ChevronLeft size={15} /> Volver
        </button>
        <button
          onClick={openClientPreview}
          className="flex items-center gap-1.5 text-[12.5px] text-[#7A1832] font-medium hover:gap-2.5 transition-all"
          title="Ver la presentación como la verá el cliente (aunque no esté completada)"
        >
          <Eye size={15} /> Vista previa del cliente
        </button>
      </div>

      {/* BRAVI contextual hint */}
      <BraviMascot messages={braviMessages} />

      {/* Header card */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-5 flex items-start gap-4">
        {client && (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-[18px] font-bold shrink-0" style={{ background: client.logoColor }}>
            {client.name[0]}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[20px] font-bold text-[#1a1a1a]">{client?.name}</h2>
            <span className="text-[12px] px-2.5 py-1 rounded-md font-medium" style={{ color: cfg.color, background: cfg.bg }}>
              {cfg.label}
            </span>
          </div>
          <div className="text-[13px] text-[#8a8680] mt-1">
            Planificación semana {planning.week} · {planning.month} · {pubs.length} publicaciones
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left: publications */}
        <div className="space-y-3">
          {/* Status banner */}
          {planning.status === 'cambios' && planning.clientComment && (
            <div className="bg-[#FFF5F5] border border-[#ffd0d0] rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-[#e03131] mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-[13px] font-medium text-[#e03131]">El cliente ha solicitado cambios</div>
                <div className="text-[12.5px] text-[#3d3d3d] mt-1">{planning.clientComment}</div>
              </div>
              {canManageStatus && (
                <button onClick={resolveChanges} className="text-[12px] bg-white border border-[#e8e6e3] hover:bg-[#FFFDF5] text-[#3d3d3d] px-3 py-1.5 rounded-md">
                  Resolver y reenviar
                </button>
              )}
            </div>
          )}
          {planning.status === 'aprobada' && (
            <div className="bg-[#EBFBEE] border border-[#b6f0bd] rounded-xl p-4 flex items-center gap-3">
              <Check size={18} className="text-[#2f9e44]" />
              <div className="text-[13px] text-[#2f9e44] font-medium">El cliente ha aprobado esta planificación.</div>
            </div>
          )}

          {/* Programación a redes vía Metricool (solo premium + admin/cm) */}
          {(planning.status === 'aprobada' || planning.status === 'cambios') &&
            canManageStatus && client?.supabase_user_id && (
              <SchedulePanel
                planning={planning}
                onUpdatePub={updatePub}
              />
            )}

          {savedError && (
            <div className="bg-[#FFF5F5] border border-[#ffd0d0] rounded-xl p-3 text-[12.5px] text-[#e03131] flex items-center gap-2">
              <AlertCircle size={15} /> {savedError}
            </div>
          )}

          {/* Publications */}
          {pubs.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-[#e8e6e3] py-12 text-center">
              <div className="text-[14px] font-medium text-[#1a1a1a] mb-1">Esta planificación no tiene publicaciones todavía</div>
              <div className="text-[12px] text-[#8a8680] mb-4">
                {canAddPub
                  ? 'Añade el primer reel o carrusel para empezar a montar la semana.'
                  : 'Un administrador debe crear las publicaciones. Avísale si ves esto vacío.'}
              </div>
              {canAddPub && (
                <div className="flex gap-2 justify-center">
                  <button onClick={() => addPub('reel')} className="text-[12.5px] font-medium bg-[#7A1832] hover:bg-[#591427] text-white px-3 py-2 rounded-lg flex items-center gap-1.5">
                    <Plus size={14} /> Añadir reel
                  </button>
                  <button onClick={() => addPub('carrusel')} className="text-[12.5px] font-medium bg-white border border-[#7A1832] text-[#7A1832] hover:bg-[#FFF1B5]/40 px-3 py-2 rounded-lg flex items-center gap-1.5">
                    <Plus size={14} /> Añadir carrusel
                  </button>
                </div>
              )}
            </div>
          )}

          {pubs.map((pub, idx) => (
            <div
              key={pub.id}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={e => onDrop(e, idx)}
              className={`transition-all ${dragOverIdx === idx && draggedIdx !== null && draggedIdx !== idx ? 'border-t-2 border-[#7A1832]' : ''}`}
            >
              <PublicationCard
                publication={pub}
                role={user.role}
                clientId={planning.clientId}
                onChange={updatePub}
                onReady={readyPub}
                onDelete={() => deletePub(pub.id)}
                canDelete={pubs.length > 1}
                dragHandleProps={{
                  draggable: true,
                  onDragStart: () => onDragStart(idx),
                  onDragEnd: () => { setDraggedIdx(null); setDragOverIdx(null) },
                }}
              />
            </div>
          ))}

          {/* Add buttons */}
          {canAddPub && (
            <div className="flex gap-2">
              <button
                onClick={() => addPub('reel')}
                className="flex-1 bg-white border border-dashed border-[#e8e6e3] hover:border-[#7A1832]/60 hover:bg-[#FFF1B5]/30 rounded-xl p-3 text-[12.5px] text-[#8a8680] hover:text-[#7A1832] font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={15} /> Añadir reel
              </button>
              <button
                onClick={() => addPub('carrusel')}
                className="flex-1 bg-white border border-dashed border-[#e8e6e3] hover:border-[#7A1832]/60 hover:bg-[#FFF1B5]/30 rounded-xl p-3 text-[12.5px] text-[#8a8680] hover:text-[#7A1832] font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={15} /> Añadir carrusel
              </button>
            </div>
          )}

          {/* Status actions */}
          <div className="flex gap-2 pt-2">
            {planning.status === 'borrador' && canManageStatus && (
              <button onClick={markListReview} className="flex items-center gap-2 bg-[#591427] hover:bg-[#1753a0] text-white text-[13px] font-medium px-4 py-2.5 rounded-lg">
                <Check size={15} /> Marcar lista para revisión
              </button>
            )}
            {planning.status === 'lista_revision' && canManageStatus && (
              <button onClick={sendToClient} className="flex items-center gap-2 bg-[#7A1832] hover:bg-[#591427] text-white text-[13px] font-medium px-4 py-2.5 rounded-lg">
                <Send size={15} /> Enviar al cliente y generar link
              </button>
            )}
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          {/* Fit preview */}
          <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 sticky top-20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[13px] text-[#1a1a1a]">Feed de Instagram</h3>
              <span className="text-[10.5px] text-[#8a8680]">{pubs.length} publicaciones</span>
            </div>
            <InstagramFit publications={pubs} onSelect={id => setSelectedPubId(id)} selectedId={selectedPubId} size="md" />
            <div className="text-[11px] text-[#8a8680] mt-3 text-center">
              Vista previa del orden de publicación
            </div>
          </div>

          {/* Completeness */}
          <div className="bg-white rounded-xl border border-[#FFF1B5] p-4">
            <h3 className="font-semibold text-[13px] text-[#1a1a1a] mb-3">Estado de la planificación</h3>
            <div className="space-y-2">
              <CompletenessItem icon={Video} label="Portadas / Carruseles" total={pubs.length} missing={missingCovers} />
              <CompletenessItem icon={LayoutGrid} label="Link de vídeos" total={pubs.filter(p => p.type === 'reel').length} missing={missingDrive} />
              <CompletenessItem icon={Copy} label="Copies escritos" total={pubs.length} missing={missingCopy} />
            </div>
            <div className="mt-3 pt-3 border-t border-[#f4f3f1] space-y-1.5">
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-[#8a8680] flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[#591427]" /> Completas
                </span>
                <span className="font-medium text-[#591427]">{totalComplete}/{pubs.length}</span>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-[#8a8680] flex items-center gap-1.5">
                  <Check size={12} className="text-[#2f9e44]" /> Marcadas listo
                </span>
                <span className="font-medium text-[#2f9e44]">{totalMarkedReady}/{pubs.length}</span>
              </div>
              {allReady ? (
                <div className="text-[12px] text-[#2f9e44] flex items-center gap-2 pt-1">
                  <Check size={14} /> Todo listo para enviar
                </div>
              ) : (
                <div className="text-[12px] text-[#8a8680] flex items-center gap-2 pt-1">
                  <Clock size={14} /> Faltan {pubs.length - totalComplete} piezas por completar
                </div>
              )}
            </div>
          </div>

          {/* Share link */}
          {shareUrl && (
            <div className="bg-gradient-to-br from-[#FFF1B5] to-[#A04060] rounded-xl border border-[#C1DBE8] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Link2 size={14} className="text-[#7A1832]" />
                <h3 className="font-semibold text-[13px] text-[#1a1a1a]">Link para el cliente</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-[#C1DBE8] rounded-md p-1.5">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 text-[11px] text-[#3d3d3d] bg-transparent focus:outline-none font-mono truncate px-1"
                />
                <button
                  onClick={copyUrl}
                  className={`text-[11px] px-2 py-1 rounded font-medium flex items-center gap-1 ${copied ? 'bg-[#2f9e44] text-white' : 'bg-[#7A1832] hover:bg-[#591427] text-white'}`}
                >
                  {copied ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                </button>
              </div>
              <button
                onClick={() => window.open(shareUrl, '_blank')}
                className="w-full mt-2 text-[12px] text-[#7A1832] font-medium hover:underline flex items-center justify-center gap-1.5"
              >
                <Eye size={13} /> Abrir vista del cliente
              </button>
            </div>
          )}

          {/* Role hint */}
          <div className="bg-white rounded-xl border border-[#FFF1B5] p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={13} className="text-[#7A1832]" />
              <h3 className="font-semibold text-[12.5px] text-[#1a1a1a]">Tu rol: {user.name}</h3>
            </div>
            <p className="text-[11.5px] text-[#8a8680] leading-relaxed">
              {user.role === 'admin' && 'Como admin puedes editar todo, añadir publicaciones y enviar al cliente.'}
              {user.role === 'editor' && 'Como editor puedes subir portadas y pegar el link de Drive de los reels.'}
              {user.role === 'designer' && 'Como diseñadora puedes subir las imágenes de los carruseles.'}
              {user.role === 'cm' && 'Como CM puedes escribir los copies, reordenar las publicaciones y enviar al cliente.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompletenessItem({ icon: Icon, label, total, missing }: { icon: any; label: string; total: number; missing: number }) {
  const done = total - missing
  const isComplete = missing === 0
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center ${isComplete ? 'bg-[#EBFBEE]' : 'bg-[#FFF8D1]'}`}>
        <Icon size={14} className={isComplete ? 'text-[#2f9e44]' : 'text-[#f08c00]'} />
      </div>
      <div className="flex-1">
        <div className="text-[12px] text-[#1a1a1a]">{label}</div>
        <div className={`text-[11px] ${isComplete ? 'text-[#2f9e44]' : 'text-[#f08c00]'}`}>
          {isComplete ? `${done}/${total} listos` : `Faltan ${missing}`}
        </div>
      </div>
    </div>
  )
}