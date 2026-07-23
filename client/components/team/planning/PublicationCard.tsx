'use client'
import { useState } from 'react'
import ImageUploader from './ImageUploader'
import CarouselUploader from './CarouselUploader'
import AICopyPanel from './AICopyPanel'
import { TEAM, CLIENTS } from '@/lib/team/mock-data'
import type { PlanningPublication, Role } from '@/lib/team/types'
import {
  Video, LayoutGrid, Link2, GripVertical, AlertTriangle,
  CheckCircle2, Clock, FileText, ChevronDown, Trash2,
  Plus, X, Sparkles, Send, Wand2,
} from 'lucide-react'

interface Props {
  publication: PlanningPublication
  role: Role
  clientId: string
  onChange: (next: PlanningPublication) => void
  onReady: (next: PlanningPublication) => void
  onDelete?: () => void
  dragHandleProps?: any
  canDelete?: boolean
}

const DAYS = ['Martes', 'Jueves', 'Domingo', 'Lunes', 'Miércoles', 'Viernes', 'Sábado']

// Suggested owner per field — informational, NOT enforced
const FIELD_OWNER = {
  cover: 'Editor sube la portada del reel',
  carousel: 'Diseñadora sube las imágenes del carrusel',
  drive: 'Editor pega el link del vídeo',
  copy: 'CM escribe el copy',
  schedule: 'CM asigna el día y hora',
}

export default function PublicationCard({ publication: pub, role, clientId, onChange, onReady, onDelete, dragHandleProps, canDelete }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [showAltCovers, setShowAltCovers] = useState(pub.coverAlternatives?.length > 0)
  const [showAICopy, setShowAICopy] = useState(false)

  const client = CLIENTS.find(c => c.id === clientId)
  const readyMember = pub.markedReadyById ? TEAM.find(t => t.id === pub.markedReadyById) : null
  const isReady = !!pub.markedReadyById

  // Completeness
  const hasCover = pub.type === 'reel' ? !!pub.coverUrl : pub.carouselImages.length > 0
  const hasCopy = !!pub.copy.trim()
  const hasDrive = pub.type === 'reel' ? !!pub.driveLink : true
  const isComplete = hasCover && hasCopy && hasDrive
  const isBlocked = !!pub.blockedNoMaterial

  // "My part done" — role-aware. Editor/designer can mark ready without the copy (CM's part).
  const myPartDone = (() => {
    if (role === 'editor') return pub.type === 'reel' ? (!!pub.coverUrl && !!pub.driveLink) : true
    if (role === 'designer') return pub.type === 'carrusel' ? pub.carouselImages.length > 0 : true
    return isComplete // cm + admin require all fields
  })()
  const canMarkReady = (myPartDone || isReady) && !isBlocked

  const set = (patch: Partial<PlanningPublication>) => onChange({ ...pub, ...patch })

  const markReady = () => {
    if (!canMarkReady) return
    onReady({
      ...pub,
      markedReadyById: pub.markedReadyById ? null : `tm-${role === 'admin' ? 'jota' : role === 'editor' ? 'delfino' : role === 'designer' ? 'tuani' : 'nahir'}`,
      markedReadyAt: pub.markedReadyById ? null : new Date().toISOString(),
    })
  }

  const addAltCover = (url: string) => {
    set({ coverAlternatives: [...(pub.coverAlternatives || []), url] })
    setShowAltCovers(true)
  }

  const removeAltCover = (idx: number) => {
    set({ coverAlternatives: (pub.coverAlternatives || []).filter((_, i) => i !== idx) })
  }

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all ${
      isBlocked ? 'border-[#e03131] border-dashed' : isReady ? 'border-[#2f9e44] shadow-soft' : 'border-[#FFF1B5]'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#f4f3f1] bg-[#FFFDF5]">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-[#d0cecb] hover:text-[#8a8680]">
          <GripVertical size={18} />
        </div>

        {/* Block toggle — editor/admin can flag no raw material */}
        {(role === 'editor' || role === 'admin') && (
          <button
            onClick={() => set({ blockedNoMaterial: !pub.blockedNoMaterial, blockedReason: !pub.blockedNoMaterial ? (pub.blockedReason || '') : null })}
            title="Marcar que falta material bruto del cliente"
            className={`text-[10.5px] px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-colors border ${
              isBlocked
                ? 'bg-[#FFF5F5] text-[#e03131] border-[#ffd0d0]'
                : 'bg-white text-[#8a8680] border-[#e8e6e3] hover:text-[#e03131] hover:border-[#ffd0d0]'
            }`}
          >
            <AlertTriangle size={11} /> {isBlocked ? 'Sin material' : 'Marcar sin material'}
          </button>
        )}

        {/* Type selector — anyone can change it */}
        <div className="flex items-center gap-1 bg-white rounded-md border border-[#e8e6e3] p-0.5">
          <button
            onClick={() => set({ type: 'reel', carouselImages: [], coverUrl: pub.coverUrl || null, driveLink: pub.driveLink || null, coverAlternatives: pub.coverAlternatives || [] })}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${pub.type === 'reel' ? 'bg-[#FFF1B5] text-[#7A1832]' : 'text-[#8a8680]'}`}
          >
            <Video size={12} /> Reel
          </button>
          <button
            onClick={() => set({ type: 'carrusel', coverUrl: null, driveLink: null, coverAlternatives: [], carouselImages: pub.carouselImages.length ? pub.carouselImages : [] })}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${pub.type === 'carrusel' ? 'bg-[#FFF1B5] text-[#7A1832]' : 'text-[#8a8680]'}`}
          >
            <LayoutGrid size={12} /> Carrusel
          </button>
        </div>

        {/* Day/time — anyone can edit */}
        <div className="flex items-center gap-1.5">
          <select
            value={pub.day || ''}
            onChange={e => set({ day: e.target.value || null })}
            className="text-[11.5px] px-2 py-1 rounded-md border border-[#e8e6e3] bg-white text-[#3d3d3d] focus:outline-none focus:border-[#7A1832]"
          >
            <option value="">Sin día</option>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input
            type="time"
            value={pub.time}
            onChange={e => set({ time: e.target.value })}
            className="text-[11.5px] px-2 py-1 rounded-md border border-[#e8e6e3] bg-white text-[#3d3d3d] focus:outline-none focus:border-[#7A1832] w-[78px]"
          />
        </div>

        {/* Status indicator */}
        <div className="ml-auto flex items-center gap-2">
          {isBlocked ? (
            <span className="text-[11px] text-[#e03131] flex items-center gap-1 bg-[#FFF5F5] px-2 py-0.5 rounded-full font-medium border border-[#ffd0d0]">
              <AlertTriangle size={13} /> Sin material bruto
            </span>
          ) : isReady ? (
            <span className="text-[11px] text-[#2f9e44] flex items-center gap-1 bg-[#EBFBEE] px-2 py-0.5 rounded-full font-medium">
              <CheckCircle2 size={13} /> Listo
            </span>
          ) : myPartDone ? (
            <span className="text-[11px] text-[#591427] flex items-center gap-1 bg-[#C1DBE8] px-2 py-0.5 rounded-full font-medium">
              <Sparkles size={12} /> Tu parte lista
            </span>
          ) : isComplete ? (
            <span className="text-[11px] text-[#591427] flex items-center gap-1 bg-[#C1DBE8] px-2 py-0.5 rounded-full font-medium">
              <Sparkles size={12} /> Listo para marcar
            </span>
          ) : (
            <span className="text-[11px] text-[#f08c00] flex items-center gap-1 bg-[#FFF8D1] px-2 py-0.5 rounded-full font-medium">
              <AlertTriangle size={13} /> {!hasCover && !hasCopy ? 'Falta portada y copy' : !hasCover ? 'Falta portada' : !hasCopy ? 'Falta copy' : 'Falta link'}
            </span>
          )}
          {readyMember && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ background: readyMember.color }}
              title={`Marcado listo por ${readyMember.name}`}
            >
              {readyMember.avatar}
            </div>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-[#8a8680] hover:text-[#1a1a1a]">
            <ChevronDown size={16} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <>
          {isBlocked && (
            <div className="px-4 py-2.5 bg-[#FFF5F5] border-b border-[#ffd0d0] flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#e03131] shrink-0" />
              <input
                value={pub.blockedReason || ''}
                onChange={e => set({ blockedReason: e.target.value })}
                placeholder="¿Qué falta? Ej: falta vídeo del servicio X, mala iluminación, etc."
                className="flex-1 text-[12px] text-[#e03131] bg-transparent placeholder-[#e03131]/60 focus:outline-none"
              />
            </div>
          )}
          {pub.type === 'reel' && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
              {/* Cover + alt covers */}
              <div>
                <div className="text-[11px] font-medium text-[#3d3d3d] mb-1.5 flex items-center gap-1">
                  <Video size={11} /> Portada del reel · 9:16
                </div>
                <ImageUploader value={pub.coverUrl} onChange={url => set({ coverUrl: url })} aspect="9:16" label="portada" />

                {/* Alt covers */}
                {showAltCovers && (pub.coverAlternatives || []).map((alt, i) => (
                  <div key={i} className="mt-2">
                    <div className="text-[10.5px] text-[#8a8680] mb-1 flex items-center justify-between">
                      <span>Propuesta {i + 2}</span>
                      <button onClick={() => removeAltCover(i)} className="text-[#e03131] hover:bg-[#FFF5F5] px-1.5 py-0.5 rounded">
                        <X size={11} />
                      </button>
                    </div>
                    <ImageUploader value={alt} onChange={url => {
                      const alts = [...(pub.coverAlternatives || [])]
                      if (url) alts[i] = url
                      else alts.splice(i, 1)
                      set({ coverAlternatives: alts })
                    }} aspect="9:16" label={`propuesta ${i + 2}`} compact />
                  </div>
                ))}

                {/* Add alt cover button */}
                {(!showAltCovers || (pub.coverAlternatives || []).length < 3) && (
                  <button
                    onClick={() => setShowAltCovers(true)}
                    className="mt-2 w-full text-[11px] text-[#7A1832] hover:bg-[#FFF1B5] border border-dashed border-[#A04060] rounded-md py-1.5 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus size={12} /> Añadir propuesta de portada
                  </button>
                )}
                {showAltCovers && (pub.coverAlternatives || []).length === 0 && (
                  <ImageUploader
                    value={null}
                    onChange={url => { if (url) addAltCover(url) }}
                    aspect="9:16"
                    label="propuesta 2"
                  />
                )}
                <div className="text-[10px] text-[#8a8680] mt-1.5">Opcional — el cliente elegirá su favorita</div>
              </div>

              {/* Title, drive link, copy */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1">Título / Tema</label>
                  <input
                    value={pub.title}
                    onChange={e => set({ title: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1 flex items-center gap-1">
                    <Link2 size={12} /> Link del vídeo (Google Drive)
                  </label>
                  <input
                    value={pub.driveLink || ''}
                    onChange={e => set({ driveLink: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-2 text-[12.5px] rounded-lg border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1 flex items-center gap-1">
                    <FileText size={12} /> Copy de la publicación
                    <button
                      type="button"
                      onClick={() => setShowAICopy(s => !s)}
                      className="ml-auto text-[10.5px] font-medium text-[#7A1832] hover:bg-[#FFF1B5] px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                    >
                      <Wand2 size={11} /> {showAICopy ? 'Cerrar IA' : 'Copy con IA'}
                    </button>
                  </label>
                  <textarea
                    value={pub.copy}
                    onChange={e => set({ copy: e.target.value })}
                    rows={5}
                    placeholder="Escribe el copy que acompañará la publicación…"
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832] resize-y"
                  />
                  {showAICopy && (
                    <AICopyPanel
                      clientId={clientId}
                      type={pub.type}
                      topic={pub.title}
                      images={[]}
                      onApply={copy => set({ copy })}
                      onClose={() => setShowAICopy(false)}
                    />
                  )}
                </div>

                {/* Mark ready button */}
                <div className="pt-2 border-t border-[#f4f3f1] flex items-center gap-2 flex-wrap">
                  <button
                    onClick={markReady}
                    disabled={!canMarkReady}
                    className={`text-[12.5px] font-medium px-3 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isReady
                        ? 'bg-[#EBFBEE] text-[#2f9e44] hover:bg-[#D3F9D8]'
                        : 'bg-[#2f9e44] hover:bg-[#2a8c3b] text-white'
                    }`}
                  >
                    {isReady ? <><CheckCircle2 size={14} /> Desmarcar</> : <><Send size={14} /> Marcar listo y avisar CM</>}
                  </button>
                  {!canMarkReady && !isReady && (
                    <span className="text-[10.5px] text-[#8a8680]">
                      {role === 'editor' && !hasCover && 'Sube la portada para marcar listo'}
                      {role === 'editor' && hasCover && !hasDrive && 'Pega el link de Drive para marcar listo'}
                      {role === 'designer' && 'Sube al menos una imagen para marcar listo'}
                      {(role === 'cm' || role === 'admin') && !isComplete && 'Completa todos los campos para marcar listo'}
                    </span>
                  )}
                  {isReady && readyMember && (
                    <span className="text-[10.5px] text-[#8a8680]">Marcado por {readyMember.name}</span>
                  )}
                  {isReady && !hasCopy && (role === 'editor' || role === 'designer') && (
                    <span className="text-[10.5px] text-[#f08c00] ml-auto">Pendiente: copy del CM</span>
                  )}
                </div>

                {canDelete && role === 'admin' && (
                  <div className="pt-2">
                    <button
                      onClick={onDelete}
                      className="text-[11.5px] text-[#e03131] hover:bg-[#FFF5F5] px-2.5 py-1.5 rounded-md flex items-center gap-1.5"
                    >
                      <Trash2 size={13} /> Eliminar publicación
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {pub.type === 'carrusel' && (
            <div className="p-4 space-y-4">
              {/* Carousel full width */}
              <div>
                <div className="text-[11px] font-medium text-[#3d3d3d] mb-1.5 flex items-center gap-1">
                  <LayoutGrid size={11} /> Imágenes del carrusel · 4:5
                </div>
                <CarouselUploader images={pub.carouselImages} onChange={imgs => set({ carouselImages: imgs })} />
              </div>

              {/* Title, copy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1">Título / Tema</label>
                  <input
                    value={pub.title}
                    onChange={e => set({ title: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1 flex items-center gap-1">
                    <FileText size={12} /> Copy de la publicación
                    <button
                      type="button"
                      onClick={() => setShowAICopy(s => !s)}
                      className="ml-auto text-[10.5px] font-medium text-[#7A1832] hover:bg-[#FFF1B5] px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                    >
                      <Wand2 size={11} /> {showAICopy ? 'Cerrar IA' : 'Copy con IA'}
                    </button>
                  </label>
                  <textarea
                    value={pub.copy}
                    onChange={e => set({ copy: e.target.value })}
                    rows={3}
                    placeholder="Escribe el copy…"
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832] resize-y"
                  />
                  {showAICopy && (
                    <AICopyPanel
                      clientId={clientId}
                      type={pub.type}
                      topic={pub.title}
                      images={pub.carouselImages}
                      onApply={copy => set({ copy })}
                      onClose={() => setShowAICopy(false)}
                    />
                  )}
                </div>
              </div>

              {/* Mark ready */}
              <div className="pt-2 border-t border-[#f4f3f1] flex items-center gap-2 flex-wrap">
                <button
                  onClick={markReady}
                  disabled={!canMarkReady}
                  className={`text-[12.5px] font-medium px-3 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    isReady
                      ? 'bg-[#EBFBEE] text-[#2f9e44] hover:bg-[#D3F9D8]'
                      : 'bg-[#2f9e44] hover:bg-[#2a8c3b] text-white'
                  }`}
                >
                  {isReady ? <><CheckCircle2 size={14} /> Desmarcar</> : <><Send size={14} /> Marcar listo y avisar CM</>}
                </button>
                {!canMarkReady && !isReady && (
                  <span className="text-[10.5px] text-[#8a8680]">
                    {role === 'designer' && 'Sube al menos una imagen para marcar listo'}
                    {role === 'editor' && 'El carrusel lo gestiona la diseñadora'}
                    {(role === 'cm' || role === 'admin') && !isComplete && 'Completa todos los campos para marcar listo'}
                  </span>
                )}
                {isReady && readyMember && (
                  <span className="text-[10.5px] text-[#8a8680]">Marcado por {readyMember.name}</span>
                )}
                {isReady && !hasCopy && role === 'designer' && (
                  <span className="text-[10.5px] text-[#f08c00] ml-auto">Pendiente: copy del CM</span>
                )}
              </div>

              {canDelete && role === 'admin' && (
                <div>
                  <button
                    onClick={onDelete}
                    className="text-[11.5px] text-[#e03131] hover:bg-[#FFF5F5] px-2.5 py-1.5 rounded-md flex items-center gap-1.5"
                  >
                    <Trash2 size={13} /> Eliminar publicación
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}