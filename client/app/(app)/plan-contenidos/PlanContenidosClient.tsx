'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ContentItem } from '@/types/database'
import { formatContentForCopy } from '@/lib/content-utils'
import BraviGuide from '@/components/bravi/BraviGuide'
import { createClient } from '@/lib/supabase/client'
import {
  Check, Film, LayoutGrid, FileText, CheckCircle2, Circle, Copy,
  Sparkles, MessageSquare, Loader2,
} from 'lucide-react'

interface Idea {
  id: string
  order_idx: number
  title: string
  type: 'reel' | 'carrusel' | 'story'
  pillar?: string | null
  objective?: string | null
  service?: string | null
  hook_idea?: string | null
  status: 'propuesta' | 'confirmada' | 'descartada' | 'guion_listo' | 'hecha'
  script_id?: string | null
  notes?: string | null
}

interface Props {
  items: ContentItem[]
}

const TYPE_LABELS: Record<string, string> = {
  reel: 'Reel',
  carrusel: 'Carrusel',
  story: 'Story',
}

const STATUS_IDEA: Record<string, { label: string; color: string; bg: string }> = {
  propuesta:   { label: 'Pendiente de confirmar', color: '#1971c2', bg: '#E7F5FF' },
  confirmada:  { label: 'Confirmada',              color: '#2f9e44', bg: '#EBFBEE' },
  guion_listo: { label: 'Guion listo',             color: '#9c36b5', bg: '#F8F0FC' },
  hecha:       { label: 'Hecha',                   color: '#2f9e44', bg: '#D3F9D8' },
  descartada:  { label: 'Descartada',              color: '#8a8680', bg: '#f4f3f1' },
}

export default function PlanContenidosClient({ items: initialItems }: Props) {
  const [items, setItems] = useState<ContentItem[]>(initialItems)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loadingIdeas, setLoadingIdeas] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})
  const [savingNote, setSavingNote] = useState<string | null>(null)

  const loadIdeas = useCallback(async () => {
    setLoadingIdeas(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('content_ideas')
        .select('id, order_idx, title, type, pillar, objective, service, hook_idea, status, script_id, notes, created_at, updated_at')
        .order('order_idx', { ascending: true })
      if (!error) setIdeas((data as Idea[]) || [])
    } catch {
      // ignore — ideas layer is additive
    } finally {
      setLoadingIdeas(false)
    }
  }, [])

  useEffect(() => { loadIdeas() }, [loadIdeas])

  async function toggleDone(itemId: string, currentStatus: string) {
    setMarking(itemId)
    const supabase = createClient()
    if (currentStatus === 'done') {
      await supabase
        .from('content_items')
        .update({ status: 'library', done_at: null })
        .eq('id', itemId)
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'library', done_at: null } : i))
    } else {
      await supabase
        .from('content_items')
        .update({ status: 'done', done_at: new Date().toISOString() })
        .eq('id', itemId)
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'done', done_at: new Date().toISOString() } : i))

      // Si hay una idea enlazada (script_id == itemId), marcarla como hecha
      const linked = ideas.find(i => i.script_id === itemId)
      if (linked && linked.status !== 'hecha') {
        await supabase
          .from('content_ideas')
          .update({ status: 'hecha', updated_at: new Date().toISOString() })
          .eq('id', linked.id)
        setIdeas(prev => prev.map(i => i.id === linked.id ? { ...i, status: 'hecha' } : i))
      }
    }
    setMarking(null)
  }

  async function saveNote(ideaId: string) {
    const txt = (noteDraft[ideaId] ?? '').trim()
    if (!txt) return
    setSavingNote(ideaId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('content_ideas')
        .update({ notes: txt, updated_at: new Date().toISOString() })
        .eq('id', ideaId)
      if (!error) {
        setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, notes: txt } : i))
        setNoteDraft(prev => { const c = { ...prev }; delete c[ideaId]; return c })
      }
    } finally {
      setSavingNote(null)
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const typeIcons: Record<string, typeof Film> = {
    reel: Film,
    carrusel: LayoutGrid,
    story: FileText,
  }

  // Ideass con guion_listo y script_id: buscar el content_item correspondiente
  const itemById = useMemo(() => {
    const m: Record<string, ContentItem> = {}
    for (const it of items) m[it.id] = it
    return m
  }, [items])

  const ideasPropuestas = ideas.filter(i => i.status === 'propuesta')
  const ideasConGuion = ideas.filter(i => i.status === 'guion_listo' && i.script_id && itemById[i.script_id])
  const ideasHechas = ideas.filter(i => i.status === 'hecha' && i.script_id && itemById[i.script_id])
  const ideasSinGuion = ideas.filter(i => i.status === 'confirmada')

  // Progreso del plan
  const totalIdeas = ideasPropuestas.length + ideasConGuion.length + ideasHechas.length + ideasSinGuion.length
  const progressPct = totalIdeas > 0 ? Math.round(((ideasHechas.length) / totalIdeas) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BraviGuide section="crear-contenido" size={64} />
        <div>
          <h1 className="text-2xl font-bold title-shine">Plan de Contenidos</h1>
          <p className="mt-1 text-sm text-cherry-dark opacity-80">
            Ideas estratégicas + guiones BRÄVE preparados por tu estilista.
          </p>
        </div>
      </div>

      {/* ───────────── Capa de Ideas ───────────── */}
      {loadingIdeas ? (
        <div className="rounded-[var(--radius-md)] p-5 bg-white shadow-soft text-sm text-cherry-dark opacity-70 flex items-center gap-2" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
          <Loader2 size={14} className="animate-spin" /> Cargando tu plan…
        </div>
      ) : totalIdeas > 0 ? (
        <IdeasLayer
          ideasPropuestas={ideasPropuestas}
          ideasSinGuion={ideasSinGuion}
          ideasConGuion={ideasConGuion}
          ideasHechas={ideasHechas}
          itemById={itemById}
          noteDraft={noteDraft}
          savingNote={savingNote}
          onNoteDraft={(id, v) => setNoteDraft(p => ({ ...p, [id]: v }))}
          onSaveNote={saveNote}
          onToggleDone={toggleDone}
          marking={marking}
          onCopy={handleCopy}
          copied={copied}
          progressPct={progressPct}
          totalIdeas={totalIdeas}
          doneCount={ideasHechas.length}
        />
      ) : null}

      {/* ───────────── Guiones sueltos (sin idea enlazada) ───────────── */}
      {(() => {
        const linkedIds = new Set(ideas.map(i => i.script_id).filter(Boolean) as string[])
        const loose = items.filter(i => !linkedIds.has(i.id))
        if (loose.length === 0) return null
        const completed = loose.filter(i => i.status === 'done').length
        return (
          <LooseScripts
            items={loose}
            completed={completed}
            typeIcons={typeIcons}
            typeLabels={TYPE_LABELS}
            onToggleDone={toggleDone}
            onCopy={handleCopy}
            marking={marking}
            copied={copied}
          />
        )
      })()}

      {/* Empty state */}
      {items.length === 0 && totalIdeas === 0 && !loadingIdeas && (
        <div
          className="rounded-[var(--radius-lg)] p-8 text-center bg-white shadow-soft"
          style={{ border: '1.5px solid var(--color-buttermilk)' }}
        >
          <div className="text-4xl mb-3 float-soft inline-block">🎬</div>
          <h3 className="text-xl font-bold text-cherry-dark mb-2">Tu plan de contenidos estará disponible pronto</h3>
          <p className="text-sm text-cherry-dark opacity-70 max-w-md mx-auto">
            Tu estilista BRÄVE está preparando tus ideas y guiones personalizados. Cuando estén listos, aparecerán aquí.
          </p>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// IDEAS LAYER
// ════════════════════════════════════════════════════════════════

function IdeasLayer({
  ideasPropuestas, ideasSinGuion, ideasConGuion, ideasHechas, itemById,
  noteDraft, savingNote, onNoteDraft, onSaveNote, onToggleDone, marking, onCopy, copied,
  progressPct, totalIdeas, doneCount,
}: {
  ideasPropuestas: Idea[]
  ideasSinGuion: Idea[]
  ideasConGuion: Idea[]
  ideasHechas: Idea[]
  itemById: Record<string, ContentItem>
  noteDraft: Record<string, string>
  savingNote: string | null
  onNoteDraft: (id: string, v: string) => void
  onSaveNote: (id: string) => void
  onToggleDone: (itemId: string, status: string) => void
  marking: string | null
  onCopy: (text: string, id: string) => void
  copied: string | null
  progressPct: number
  totalIdeas: number
  doneCount: number
}) {
  return (
    <div className="space-y-4">
      {/* Progreso */}
      <div
        className="rounded-[var(--radius-md)] p-4 bg-white shadow-soft"
        style={{ border: '1.5px solid var(--color-buttermilk)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-cherry" />
            <span className="text-sm font-bold text-cherry-dark">Progreso del plan</span>
          </div>
          <span className="text-sm font-bold text-cherry">{doneCount}/{totalIdeas}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-buttermilk)' }}>
          <div
            className="h-full transition-all"
            style={{ width: `${progressPct}%`, background: 'var(--color-pastel-green)' }}
          />
        </div>
        <p className="text-xs text-cherry-dark opacity-60 mt-2">
          {progressPct}% completado · {ideasPropuestas.length} pendientes de confirmar · {ideasSinGuion.length} confirmadas sin guion · {ideasConGuion.length} listas para grabar
        </p>
      </div>

      {/* Hechas */}
      {ideasHechas.length > 0 && (
        <IdeaGroup title="Completadas" subtitle="Guiones que ya has grabado/publicado">
          {ideasHechas.map(i => (
            <IdeaScriptCard
              key={i.id}
              idea={i}
              item={itemById[i.script_id!]!}
              onToggleDone={onToggleDone}
              marking={marking}
              onCopy={onCopy}
              copied={copied}
            />
          ))}
        </IdeaGroup>
      )}

      {/* Con guion listo — pendientes de hacer */}
      {ideasConGuion.length > 0 && (
        <IdeaGroup title="Listas para grabar" subtitle="Tienen guion BRÄVE — cuando lo grabes, márcalo como completado">
          {ideasConGuion.map(i => (
            <IdeaScriptCard
              key={i.id}
              idea={i}
              item={itemById[i.script_id!]!}
              onToggleDone={onToggleDone}
              marking={marking}
              onCopy={onCopy}
              copied={copied}
            />
          ))}
        </IdeaGroup>
      )}

      {/* Confirmadas sin guion todavía */}
      {ideasSinGuion.length > 0 && (
        <IdeaGroup title="Confirmadas — guion en preparación" subtitle="Tu estilista está preparando el guion BRÄVE">
          {ideasSinGuion.map(i => (
            <SimpleIdeaCard key={i.id} idea={i} />
          ))}
        </IdeaGroup>
      )}

      {/* Pendiente de confirmar */}
      {ideasPropuestas.length > 0 && (
        <IdeaGroup
          title="Pendiente de confirmar"
          subtitle="Tu estilista te propone estas ideas. Si tienes dudas o feedback, deja una nota para tu CM."
          highlight
        >
          {ideasPropuestas.map(i => (
            <PropuestaCard
              key={i.id}
              idea={i}
              noteDraft={noteDraft[i.id] ?? i.notes ?? ''}
              saving={savingNote === i.id}
              onDraft={v => onNoteDraft(i.id, v)}
              onSave={() => onSaveNote(i.id)}
            />
          ))}
        </IdeaGroup>
      )}
    </div>
  )
}

function IdeaGroup({ title, subtitle, children, highlight }: { title: string; subtitle?: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div>
      <div className="mb-2">
        <h2 className="text-sm font-bold text-cherry-dark">{title}</h2>
        {subtitle && <p className="text-xs text-cherry-dark opacity-60">{subtitle}</p>}
      </div>
      <div className={`space-y-3 ${highlight ? 'rounded-[var(--radius-md)] p-3' : ''}`} style={highlight ? { background: 'rgba(255,241,181,0.25)', border: '1px dashed var(--color-buttermilk)' } : undefined}>
        {children}
      </div>
    </div>
  )
}

function SimpleIdeaCard({ idea }: { idea: Idea }) {
  const st = STATUS_IDEA[idea.status] || STATUS_IDEA.confirmada
  return (
    <div className="rounded-[var(--radius-sm)] p-3 bg-white" style={{ border: '1px solid var(--color-buttermilk)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: st.color, background: st.bg }}>{st.label}</span>
        <span className="text-[10px] uppercase text-cherry-dark opacity-60">{TYPE_LABELS[idea.type] || idea.type}</span>
      </div>
      <div className="font-semibold text-sm text-cherry-dark">{idea.title}</div>
      {idea.hook_idea && (
        <div className="text-xs text-cherry italic mt-1 flex items-center gap-1">
          <MessageSquare size={11} /> {idea.hook_idea}
        </div>
      )}
    </div>
  )
}

function PropuestaCard({ idea, noteDraft, saving, onDraft, onSave }: { idea: Idea; noteDraft: string; saving: boolean; onDraft: (v: string) => void; onSave: () => void }) {
  const st = STATUS_IDEA[idea.status] || STATUS_IDEA.propuesta
  return (
    <div className="rounded-[var(--radius-sm)] p-3 bg-white" style={{ border: '1px solid var(--color-buttermilk)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: st.color, background: st.bg }}>{st.label}</span>
        <span className="text-[10px] uppercase text-cherry-dark opacity-60">{TYPE_LABELS[idea.type] || idea.type}</span>
      </div>
      <div className="font-semibold text-sm text-cherry-dark">{idea.title}</div>
      {idea.hook_idea && (
        <div className="text-xs text-cherry italic mt-1 flex items-center gap-1">
          <MessageSquare size={11} /> {idea.hook_idea}
        </div>
      )}
      {idea.pillar && idea.service && (
        <div className="text-[11px] text-cherry-dark opacity-70 mt-1">Pilar: {idea.pillar} · Servicio: {idea.service}</div>
      )}

      <div className="mt-3">
        <label className="text-[11px] text-cherry-dark opacity-70 block mb-1">Nota para tu CM (opcional)</label>
        <textarea
          value={noteDraft}
          onChange={e => onDraft(e.target.value)}
          placeholder="¿Te gusta? ¿Quieres cambiar algo? ¿Tienes material?"
          rows={2}
          className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius-sm)] border border-[#e8e6e3] bg-white focus:outline-none focus:border-cherry"
        />
        <button
          onClick={onSave}
          disabled={saving || !noteDraft.trim() || noteDraft.trim() === (idea.notes || '').trim()}
          className="mt-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-cherry text-white text-[11px] font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Guardar nota
        </button>
      </div>
    </div>
  )
}

function IdeaScriptCard({
  idea, item, onToggleDone, marking, onCopy, copied,
}: {
  idea: Idea
  item: ContentItem
  onToggleDone: (itemId: string, status: string) => void
  marking: string | null
  onCopy: (text: string, id: string) => void
  copied: string | null
}) {
  const isDone = item.status === 'done'
  const formattedText = formatContentForCopy(item, 'visual')
  const Icon = ({ reel: Film, carrusel: LayoutGrid, story: FileText } as Record<string, typeof Film>)[item.type] || FileText
  return (
    <div
      className="rounded-[var(--radius-md)] p-4 bg-white shadow-soft"
      style={{
        border: isDone ? '2px solid var(--color-pastel-green)' : '1.5px solid var(--color-buttermilk)',
        opacity: isDone ? 0.8 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0" style={{ background: isDone ? 'var(--color-pastel-green)' : 'var(--color-buttermilk)' }}>
            <Icon size={16} className="text-cherry" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-cherry-dark">{item.title}</p>
            {item.service && <p className="text-xs text-cherry-dark opacity-60">{item.service} · {TYPE_LABELS[item.type] || item.type}</p>}
            {idea.hook_idea && (
              <p className="text-[11px] text-cherry italic mt-0.5 flex items-center gap-1">
                <MessageSquare size={10} /> {idea.hook_idea}
              </p>
            )}
          </div>
        </div>
        {isDone ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 flex-shrink-0" style={{ background: 'var(--color-pastel-green)', color: '#1a3a2a' }}>
            <CheckCircle2 size={11} /> Completado
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0" style={{ background: '#F8F0FC', color: '#9c36b5' }}>
            Listo para grabar
          </span>
        )}
      </div>

      <div className="rounded-[var(--radius-sm)] p-3 mb-2 whitespace-pre-wrap text-sm leading-relaxed" style={{ background: 'var(--color-cream)', border: '1px solid rgba(255,241,181,0.5)', color: 'var(--color-ink)' }}>
        {formattedText}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onToggleDone(item.id, item.status)}
          disabled={marking === item.id}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
          style={{
            background: isDone ? 'var(--color-buttermilk)' : 'var(--color-pastel-green)',
            color: isDone ? 'var(--color-cherry-dark)' : '#1a3a2a',
            opacity: marking === item.id ? 0.5 : 1,
          }}
        >
          {isDone ? <Circle size={13} /> : <CheckCircle2 size={13} />}
          {isDone ? 'Marcar pendiente' : 'Marcar completado'}
        </button>
        <button
          onClick={() => onCopy(formattedText, item.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold btn-ghost"
        >
          {copied === item.id ? <Check size={13} /> : <Copy size={13} />}
          {copied === item.id ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// LOOSE SCRIPTS (sin idea enlazada — los creados directamente)
// ════════════════════════════════════════════════════════════════

function LooseScripts({
  items, completed, typeIcons, typeLabels, onToggleDone, onCopy, marking, copied,
}: {
  items: ContentItem[]
  completed: number
  typeIcons: Record<string, typeof Film>
  typeLabels: Record<string, string>
  onToggleDone: (itemId: string, status: string) => void
  onCopy: (text: string, id: string) => void
  marking: string | null
  copied: string | null
}) {
  const pending = items.length - completed
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-cherry-dark">Otros guiones</h2>
        <p className="text-xs text-cherry-dark opacity-60">Guiones adicionales preparados por tu estilista.</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 rounded-[var(--radius-md)] p-3 bg-white shadow-soft" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
          <p className="text-xs font-bold uppercase tracking-wider text-cherry-dark opacity-60">Total</p>
          <p className="text-xl font-bold text-cherry-dark mt-1">{items.length}</p>
        </div>
        <div className="flex-1 rounded-[var(--radius-md)] p-3 bg-white shadow-soft" style={{ border: '1.5px solid var(--color-pastel-green)' }}>
          <p className="text-xs font-bold uppercase tracking-wider text-cherry-dark opacity-60">Completados</p>
          <p className="text-xl font-bold mt-1" style={{ color: '#2a8a4a' }}>{completed}</p>
        </div>
        <div className="flex-1 rounded-[var(--radius-md)] p-3 bg-white shadow-soft" style={{ border: '1.5px solid var(--color-pastel-blue)' }}>
          <p className="text-xs font-bold uppercase tracking-wider text-cherry-dark opacity-60">Pendientes</p>
          <p className="text-xl font-bold mt-1" style={{ color: '#2a5a6a' }}>{pending}</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map(item => {
          const Icon = typeIcons[item.type] || FileText
          const isDone = item.status === 'done'
          const formattedText = formatContentForCopy(item, 'visual')
          return (
            <div
              key={item.id}
              className="rounded-[var(--radius-md)] p-4 bg-white shadow-soft"
              style={{
                border: isDone ? '2px solid var(--color-pastel-green)' : '1.5px solid var(--color-buttermilk)',
                opacity: isDone ? 0.75 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0" style={{ background: isDone ? 'var(--color-pastel-green)' : 'var(--color-buttermilk)' }}>
                    <Icon size={18} className="text-cherry" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-cherry-dark">{item.title}</p>
                    {item.service && <p className="text-xs text-cherry-dark opacity-60">{item.service} · {typeLabels[item.type] || item.type}</p>}
                  </div>
                </div>
                {isDone && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 flex-shrink-0" style={{ background: 'var(--color-pastel-green)', color: '#1a3a2a' }}>
                    <CheckCircle2 size={12} /> Completado
                  </span>
                )}
              </div>

              <div className="rounded-[var(--radius-sm)] p-4 mb-3 whitespace-pre-wrap text-sm leading-relaxed" style={{ background: 'var(--color-cream)', border: '1px solid rgba(255,241,181,0.5)', color: 'var(--color-ink)' }}>
                {formattedText}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onToggleDone(item.id, item.status)}
                  disabled={marking === item.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{
                    background: isDone ? 'var(--color-buttermilk)' : 'var(--color-pastel-green)',
                    color: isDone ? 'var(--color-cherry-dark)' : '#1a3a2a',
                    opacity: marking === item.id ? 0.5 : 1,
                  }}
                >
                  {isDone ? <Circle size={14} /> : <CheckCircle2 size={14} />}
                  {isDone ? 'Marcar pendiente' : 'Marcar completado'}
                </button>
                <button
                  onClick={() => onCopy(formattedText, item.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold btn-ghost"
                >
                  {copied === item.id ? <Check size={14} /> : <Copy size={14} />}
                  {copied === item.id ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}