'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { CLIENTS, TEAM } from '@/lib/team/mock-data'
import type { Client } from '@/lib/team/types'
import {
  Search, ArrowLeft, Sparkles, Check, X, Pencil, FileText,
  Loader2, Plus, RefreshCw, AlertCircle, MessageSquare,
  ChevronDown, ChevronUp,
} from 'lucide-react'

interface Idea {
  id: string
  order_idx: number
  title: string
  type: 'reel' | 'carrusel'
  pillar?: string
  objective?: string
  service?: string
  hook_idea?: string
  status: 'propuesta' | 'confirmada' | 'descartada' | 'guion_listo' | 'hecha'
  script_id?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

interface Script {
  id: string
  title: string
  content_json: Record<string, unknown> | null
  visual_idea: string | null
  caption_with_hashtags: string | null
  type: string
  service: string | null
  status: string
}
const TYPE_LABELS: Record<string, string> = { reel: 'Reel', carrusel: 'Carrusel' }

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  propuesta:        { label: 'Propuesta',        color: '#1971c2', bg: '#E7F5FF' },
  confirmada:       { label: 'Confirmada',       color: '#2f9e44', bg: '#EBFBEE' },
  descartada:       { label: 'Descartada',        color: '#8a8680', bg: '#f4f3f1' },
  guion_listo:      { label: 'Guion listo',       color: '#9c36b5', bg: '#F8F0FC' },
  hecha:            { label: 'Hecha',             color: '#2f9e44', bg: '#D3F9D8' },
}

export default function Estrategia() {
  const { user, member } = useAuth()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)

  if (!user || !member) return null

  // Solo admin y CM ven este screen
  if (user.role !== 'admin' && user.role !== 'cm') {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-xl border border-[#FFF1B5] text-center">
        <AlertCircle className="mx-auto mb-2 text-[#8a8680]" />
        <p className="text-[13px] text-[#8a8680]">No tienes acceso a Estrategia.</p>
      </div>
    )
  }

  // Clientes premium mapeados (con supabase_user_id)
  const scoped = useMemo(() => CLIENTS.filter(c => {
    if (!c.supabase_user_id) return false
    if (user.role === 'admin') return true
    if (user.role === 'cm') return c.cmId === member.id
    return false
  }), [user, member])

  const filtered = scoped.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.salonName.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
  })

  if (selected) {
    return <EstrategiaDetail client={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-[400px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8680]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar clienta premium…"
            className="w-full pl-8 pr-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832] focus:bg-white"
          />
        </div>
        <div className="ml-auto text-[12px] text-[#8a8680]">{filtered.length} clientas premium</div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#FFF1B5] p-8 text-center">
          <AlertCircle className="mx-auto mb-2 text-[#8a8680]" />
          <p className="text-[13px] text-[#8a8680]">
            No hay clientas premium mapeadas. Añade <code className="text-[#7A1832]">supabase_user_id</code> en <code>lib/team/mock-data.ts</code>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => {
            const cm = TEAM.find(t => t.id === c.cmId)
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="bg-white rounded-xl border border-[#FFF1B5] p-4 text-left hover:shadow-md hover:border-[#7A1832]/30 transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[15px] font-bold shrink-0" style={{ background: c.logoColor }}>
                    {c.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[14px] text-[#1a1a1a] truncate">{c.name}</div>
                    <div className="text-[11.5px] text-[#8a8680] truncate">{c.salonName}</div>
                    {cm && <div className="text-[11px] text-[#8a8680] mt-0.5">CM: {cm.name}</div>}
                  </div>
                </div>
                <div className="text-[12px] text-[#7A1832] flex items-center gap-1">
                  <Sparkles size={12} /> Ver plan de contenidos
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// DETAIL — plan de ideas de una clienta
// ═══════════════════════════════════════════════

function EstrategiaDetail({ client, onBack }: { client: Client; onBack: () => void }) {
  const { user } = useAuth()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [scripts, setScripts] = useState<Record<string, Script>>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingScriptId, setGeneratingScriptId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ title: string; hook_idea: string }>({ title: '', hook_idea: '' })
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [manualPasteId, setManualPasteId] = useState<string | null>(null)
  const [manualDraft, setManualDraft] = useState({ hook: '', context: '', solution: '', cta: '', visual_idea: '', caption: '' })
  const [savingManual, setSavingManual] = useState(false)
  const [showExternal, setShowExternal] = useState(false)
  const [externalText, setExternalText] = useState('')
  const [savingExternal, setSavingExternal] = useState(false)

  const actorId = user!.id

  const loadIdeas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/team/api/estrategia/ideas/list?clientId=${encodeURIComponent(client.id)}&actorId=${encodeURIComponent(actorId)}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error al cargar ideas')
      setIdeas(j.ideas || [])
      setScripts(j.scripts || {})
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [client.id, actorId])

  useEffect(() => { loadIdeas() }, [loadIdeas])

  async function handleGenerate(count: number) {
    setGenerating(true)
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/team/api/estrategia/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId, clientId: client.id, count }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error al generar')
      setIdeas(prev => [...prev, ...(j.ideas || [])].sort((a, b) => a.order_idx - b.order_idx))
      setInfo(j.mock ? 'IA no configurada — se usaron ideas de ejemplo.' : `${(j.ideas || []).length} ideas generadas.`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setGenerating(false)
    }
  }

  async function patchIdea(id: string, patch: Partial<Idea>) {
    try {
      const res = await fetch(`/team/api/estrategia/ideas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId, ...patch }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error al actualizar')
      setIdeas(prev => prev.map(i => i.id === id ? { ...i, ...j.idea } : i))
      return j.idea as Idea
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    }
  }

  async function handleConfirm(i: Idea) { await patchIdea(i.id, { status: 'confirmada' }) }
  async function handleDiscard(i: Idea) { await patchIdea(i.id, { status: 'descartada' }) }

  async function handleSaveEdit(i: Idea) {
    await patchIdea(i.id, { title: editDraft.title, hook_idea: editDraft.hook_idea })
    setEditingId(null)
  }

  async function handleSaveManualScript(i: Idea) {
    setSavingManual(true)
    setError(null)
    try {
      const res = await fetch(`/team/api/estrategia/ideas/${i.id}/manual-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId, ...manualDraft }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error al guardar guion')
      setIdeas(prev => prev.map(x => x.id === i.id ? { ...x, status: 'guion_listo', script_id: j.script_id } : x))
      if (j.item) {
        setScripts(prev => ({ ...prev, [j.item.id]: j.item }))
      }
      setManualPasteId(null)
      setManualDraft({ hook: '', context: '', solution: '', cta: '', visual_idea: '', caption: '' })
      setInfo('Guion manual guardado y enlazado a la idea.')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSavingManual(false)
    }
  }

  async function handleSaveExternalScript() {
    setSavingExternal(true)
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/team/api/estrategia/ideas/manual-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId, clientId: client.id, rawText: externalText }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error al crear el guion')
      setIdeas(prev => [...prev, j.idea].sort((a, b) => a.order_idx - b.order_idx))
      if (j.item) {
        setScripts(prev => ({ ...prev, [j.item.id]: j.item }))
      }
      setShowExternal(false)
      setExternalText('')
      setInfo(j.mock ? 'IA no configurada — guion guardado sin estructurar.' : 'Guion interpretado y añadido al plan.')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSavingExternal(false)
    }
  }

  async function handleGenerateScript(i: Idea) {
    setGeneratingScriptId(i.id)
    setError(null)
    try {
      const res = await fetch(`/team/api/estrategia/ideas/${i.id}/script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error al generar guion')
      setIdeas(prev => prev.map(x => x.id === i.id ? { ...x, status: 'guion_listo', script_id: j.script_id } : x))
      // Añadir el script recién creado al mapa de scripts
      if (j.item) {
        setScripts(prev => ({ ...prev, [j.item.id]: j.item }))
      }
      setInfo('Guion generado y enlazado a la idea.')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setGeneratingScriptId(null)
    }
  }

  const propuestas = ideas.filter(i => i.status === 'propuesta')
  const confirmadas = ideas.filter(i => i.status === 'confirmada')
  const conGuion = ideas.filter(i => i.status === 'guion_listo')
  const hechas = ideas.filter(i => i.status === 'hecha')
  const descartadas = ideas.filter(i => i.status === 'descartada')

  return (
    <div className="space-y-4 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[#FFF1B5] text-[#7A1832]">
          <ArrowLeft size={18} />
        </button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: client.logoColor }}>
          {client.name[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-[#1a1a1a]">{client.name} — Plan de Contenidos</h1>
          <div className="text-[12px] text-[#8a8680]">{client.salonName} · {client.city}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExternal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#7A1832] text-[#7A1832] text-[13px] font-medium hover:bg-[#FFF1B5]"
          >
            <FileText size={14} /> Pegar guion externo
          </button>
          <button
            onClick={() => handleGenerate(5)}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7A1832] text-white text-[13px] font-medium hover:bg-[#591427] disabled:opacity-50"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Generar ideas con IA
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFF5F5] border border-[#e03131] text-[#e03131] text-[12.5px] px-4 py-2.5 rounded-lg flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {showExternal && (
        <ExternalScriptBox
          text={externalText}
          saving={savingExternal}
          onText={setExternalText}
          onSave={handleSaveExternalScript}
          onCancel={() => setShowExternal(false)}
        />
      )}
      {info && (
        <div className="bg-[#EBFBEE] border border-[#2f9e44] text-[#2f9e44] text-[12.5px] px-4 py-2.5 rounded-lg flex items-center gap-2">
          <Check size={14} /> {info}
        </div>
      )}

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Propuestas', n: propuestas.length, color: '#1971c2', bg: '#E7F5FF' },
          { label: 'Confirmadas', n: confirmadas.length, color: '#2f9e44', bg: '#EBFBEE' },
          { label: 'Con guion', n: conGuion.length, color: '#9c36b5', bg: '#F8F0FC' },
          { label: 'Hechas', n: hechas.length, color: '#2f9e44', bg: '#D3F9D8' },
          { label: 'Descartadas', n: descartadas.length, color: '#8a8680', bg: '#f4f3f1' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#FFF1B5] p-3 text-center">
            <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.n}</div>
            <div className="text-[11px] text-[#8a8680]">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#FFF1B5] p-8 text-center text-[#8a8680] text-[13px]">
          <Loader2 size={18} className="animate-spin inline-block mb-2" /> Cargando ideas…
        </div>
      ) : ideas.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#FFF1B5] p-8 text-center">
          <Sparkles className="mx-auto mb-3 text-[#7A1832]" />
          <p className="text-[14px] font-medium text-[#1a1a1a] mb-1">Aún no hay ideas para {client.name}</p>
          <p className="text-[12.5px] text-[#8a8680] mb-4">Pulsa «Generar ideas con IA» para proponer las primeras 5 ideas basadas en su brand profile.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Propuestas */}
          {propuestas.length > 0 && (
            <Section title="Pendiente de confirmar" subtitle="Revisa y confirma las que quieres convertir en guion">
              {propuestas.map(i => (
                <IdeaCard
                  key={i.id}
                  idea={i}
                  editing={editingId === i.id}
                  editDraft={editDraft}
                  onEdit={() => { setEditingId(i.id); setEditDraft({ title: i.title, hook_idea: i.hook_idea || '' }) }}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={() => handleSaveEdit(i)}
                  onDraft={setEditDraft}
                  onConfirm={() => handleConfirm(i)}
                  onDiscard={() => handleDiscard(i)}
                />
              ))}
            </Section>
          )}

          {/* Confirmadas — pendientes de guion */}
          {confirmadas.length > 0 && (
            <Section title="Confirmadas — pendientes de guion" subtitle="Genera el guion con IA o pégalo desde otro lado">
              {confirmadas.map(i => (
                <div key={i.id} className="space-y-2">
                  <IdeaCard
                    idea={i}
                    showGenerateScript
                    generatingScript={generatingScriptId === i.id}
                    onGenerateScript={() => handleGenerateScript(i)}
                    onDiscard={() => handleDiscard(i)}
                    showPasteScript
                    onPasteScript={() => { setManualPasteId(i.id); setManualDraft({ hook: '', context: '', solution: '', cta: '', visual_idea: '', caption: '' }) }}
                  />
                  {manualPasteId === i.id && (
                    <ManualScriptForm
                      draft={manualDraft}
                      saving={savingManual}
                      onDraft={setManualDraft}
                      onSave={() => handleSaveManualScript(i)}
                      onCancel={() => setManualPasteId(null)}
                    />
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Con guion listo */}
          {conGuion.length > 0 && (
            <Section title="Guion listo" subtitle="La clienta ya puede verlas en su /plan-contenidos">
              {conGuion.map(i => (
                <IdeaCard
                  key={i.id}
                  idea={i}
                  script={i.script_id ? scripts[i.script_id] : undefined}
                  expanded={expandedId === i.id}
                  onToggleExpand={() => setExpandedId(prev => prev === i.id ? null : i.id)}
                />
              ))}
            </Section>
          )}

          {/* Hechas */}
          {hechas.length > 0 && (
            <Section title="Hechas" subtitle="Completadas por la clienta">
              {hechas.map(i => (
                <IdeaCard
                  key={i.id}
                  idea={i}
                  script={i.script_id ? scripts[i.script_id] : undefined}
                  expanded={expandedId === i.id}
                  onToggleExpand={() => setExpandedId(prev => prev === i.id ? null : i.id)}
                />
              ))}
            </Section>
          )}

          {/* Descartadas (colapsadas) */}
          {descartadas.length > 0 && (
            <Section title="Descartadas" subtitle={`${descartadas.length} ideas`} muted>
              {descartadas.map(i => (
                <IdeaCard key={i.id} idea={i} readOnly />
              ))}
            </Section>
          )}

          {/* Generar más */}
          {ideas.length > 0 && (
            <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 flex items-center gap-3">
              <RefreshCw size={14} className="text-[#7A1832]" />
              <div className="flex-1 text-[12.5px] text-[#3d3d3d]">
                ¿La clienta está terminando las ideas? Genera más sin repetir las ya completadas.
              </div>
              <button
                onClick={() => handleGenerate(3)}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#7A1832] text-[#7A1832] text-[12px] font-medium hover:bg-[#FFF1B5] disabled:opacity-50"
              >
                <Plus size={12} /> 3 más
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, subtitle, children, muted }: { title: string; subtitle?: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <div>
      <div className="mb-2">
        <h2 className={`text-[14px] font-semibold ${muted ? 'text-[#8a8680]' : 'text-[#1a1a1a]'}`}>{title}</h2>
        {subtitle && <p className="text-[11.5px] text-[#8a8680]">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function IdeaCard({
  idea,
  editing,
  editDraft,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDraft,
  onConfirm,
  onDiscard,
  showGenerateScript,
  generatingScript,
  onGenerateScript,
  readOnly,
  script,
  expanded,
  onToggleExpand,
  showPasteScript,
  onPasteScript,
}: {
  idea: Idea
  editing?: boolean
  editDraft?: { title: string; hook_idea: string }
  onEdit?: () => void
  onCancelEdit?: () => void
  onSaveEdit?: () => void
  onDraft?: (d: { title: string; hook_idea: string }) => void
  onConfirm?: () => void
  onDiscard?: () => void
  showGenerateScript?: boolean
  generatingScript?: boolean
  onGenerateScript?: () => void
  readOnly?: boolean
  script?: Script
  expanded?: boolean
  onToggleExpand?: () => void
  showPasteScript?: boolean
  onPasteScript?: () => void
}) {
  const st = STATUS_STYLES[idea.status] || STATUS_STYLES.propuesta
  const hasScript = script && script.content_json
  const scriptData = hasScript ? script!.content_json as { hook?: string; context?: string; solution?: string; cta?: string } : null

  return (
    <div className={`bg-white rounded-xl border border-[#FFF1B5] p-4 ${readOnly && idea.status === 'descartada' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>
            {st.label}
          </span>
          <span className="text-[10.5px] text-[#8a8680] uppercase">{TYPE_LABELS[idea.type] || idea.type}</span>
        </div>
        {!readOnly && !editing && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button onClick={onEdit} className="p-1 rounded hover:bg-[#FFF1B5] text-[#8a8680]" title="Editar">
                <Pencil size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <input
            value={editDraft?.title || ''}
            onChange={e => onDraft?.({ title: e.target.value, hook_idea: editDraft?.hook_idea || '' })}
            className="w-full px-2.5 py-1.5 text-[13px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
          />
          <input
            value={editDraft?.hook_idea || ''}
            onChange={e => onDraft?.({ title: editDraft?.title || '', hook_idea: e.target.value })}
            placeholder="Hook (3-8 palabras)"
            className="w-full px-2.5 py-1.5 text-[12px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
          />
          <div className="flex gap-2">
            <button onClick={onSaveEdit} className="px-2.5 py-1 rounded-md bg-[#7A1832] text-white text-[11.5px] font-medium">Guardar</button>
            <button onClick={onCancelEdit} className="px-2.5 py-1 rounded-md text-[#8a8680] text-[11.5px]">Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="font-semibold text-[13.5px] text-[#1a1a1a] mb-1.5 leading-snug">{idea.title}</div>
          {idea.hook_idea && (
            <div className="text-[12px] text-[#7A1832] italic mb-2 flex items-center gap-1">
              <MessageSquare size={11} /> {idea.hook_idea}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mb-2 text-[10.5px]">
            {idea.pillar && <Tag label={`Pilar: ${idea.pillar}`} />}
            {idea.objective && <Tag label={`Obj: ${idea.objective}`} />}
            {idea.service && <Tag label={idea.service} />}
          </div>

          {/* Guion expandible */}
          {hasScript && scriptData && (
            <div className="mt-2">
              <button
                onClick={onToggleExpand}
                className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F8F0FC] text-[#9c36b5] text-[11.5px] font-medium hover:bg-[#f3e8ff] transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <FileText size={12} /> Ver guion completo
                </span>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {expanded && (
                <div className="mt-2 space-y-2.5 border-l-2 border-[#F8F0FC] pl-3">
                  {scriptData.hook && (
                    <ScriptBlock label="Gancho (3-5s)" text={scriptData.hook} color="#7A1832" />
                  )}
                  {scriptData.context && (
                    <ScriptBlock label="Contexto (5-10s)" text={scriptData.context} color="#1971c2" />
                  )}
                  {scriptData.solution && (
                    <ScriptBlock label="Solución (20-30s)" text={scriptData.solution} color="#2f9e44" />
                  )}
                  {scriptData.cta && (
                    <ScriptBlock label="CTA (3-5s)" text={scriptData.cta} color="#9c36b5" />
                  )}
                  {script!.visual_idea && (
                    <ScriptBlock label="Idea visual" text={script!.visual_idea} color="#8a8680" />
                  )}
                  {script!.caption_with_hashtags && (
                    <ScriptBlock label="Copy + hashtags" text={script!.caption_with_hashtags} color="#8a8680" />
                  )}
                </div>
              )}
            </div>
          )}

          {!readOnly && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#FFF1B5]">
              {onConfirm && (
                <button onClick={onConfirm} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#2f9e44] text-white text-[11px] font-medium hover:bg-[#2b8a3e]">
                  <Check size={11} /> Confirmar
                </button>
              )}
              {onDiscard && (
                <button onClick={onDiscard} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[#8a8680] text-[11px] hover:bg-[#FFF5F5] hover:text-[#e03131]">
                  <X size={11} /> Descartar
                </button>
              )}
              {showGenerateScript && onGenerateScript && (
                <button
                  onClick={onGenerateScript}
                  disabled={generatingScript}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#7A1832] text-white text-[11px] font-medium hover:bg-[#591427] disabled:opacity-50"
                >
                  {generatingScript ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
                  Generar guion IA
                </button>
              )}
              {showPasteScript && onPasteScript && (
                <button
                  onClick={onPasteScript}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#7A1832] text-[#7A1832] text-[11px] font-medium hover:bg-[#FFF1B5] ml-auto"
                >
                  <FileText size={11} /> Pegar guion
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ScriptBlock({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide font-semibold mb-0.5" style={{ color }}>{label}</div>
      <div className="text-[12px] text-[#3d3d3d] leading-relaxed">{text}</div>
    </div>
  )
}

function Tag({ label }: { label: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded bg-[#FFFDF5] border border-[#FFF1B5] text-[#7A1832]">{label}</span>
  )
}

function ManualScriptForm({
  draft, saving, onDraft, onSave, onCancel,
}: {
  draft: { hook: string; context: string; solution: string; cta: string; visual_idea: string; caption: string }
  saving: boolean
  onDraft: (d: { hook: string; context: string; solution: string; cta: string; visual_idea: string; caption: string }) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="bg-[#FFFDF5] rounded-xl border border-[#FFF1B5] p-4 space-y-3">
      <div className="text-[13px] font-semibold text-[#1a1a1a] flex items-center gap-1.5">
        <FileText size={14} className="text-[#7A1832]" /> Pegar guion manual
      </div>
      <p className="text-[11.5px] text-[#8a8680]">
        Si tienes el guion hecho en otro lado, pégalo aquí. Solo los campos que apliquen.
      </p>

      <ManualField label="Gancho (hook)" rows={2} value={draft.hook} onChange={v => onDraft({ ...draft, hook: v })} placeholder="Las primeras frases del gancho…" color="#7A1832" />
      <ManualField label="Contexto" rows={3} value={draft.context} onChange={v => onDraft({ ...draft, context: v })} placeholder="El desarrollo del problema o situación…" color="#1971c2" />
      <ManualField label="Solución" rows={4} value={draft.solution} onChange={v => onDraft({ ...draft, solution: v })} placeholder="La explicación de qué, cómo y por qué…" color="#2f9e44" />
      <ManualField label="CTA" rows={2} value={draft.cta} onChange={v => onDraft({ ...draft, cta: v })} placeholder="La llamada a la acción conversacional…" color="#9c36b5" />
      <ManualField label="Idea visual (opcional)" rows={2} value={draft.visual_idea} onChange={v => onDraft({ ...draft, visual_idea: v })} placeholder="Cómo grabarlo…" color="#8a8680" />
      <ManualField label="Copy + hashtags (opcional)" rows={2} value={draft.caption} onChange={v => onDraft({ ...draft, caption: v })} placeholder="Copy para Instagram + hashtags…" color="#8a8680" />

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving || (!draft.hook && !draft.context && !draft.solution && !draft.cta)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7A1832] text-white text-[12px] font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Guardar guion
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-[#8a8680] text-[12px] hover:bg-[#f4f3f1]"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function ManualField({
  label, rows, value, onChange, placeholder, color,
}: {
  label: string
  rows: number
  value: string
  onChange: (v: string) => void
  placeholder?: string
  color: string
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold mb-1" style={{ color }}>{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832] resize-y"
      />
    </label>
  )
}
function ExternalScriptBox({
  text, saving, onText, onSave, onCancel,
}: {
  text: string
  saving: boolean
  onText: (t: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="bg-[#FFFDF5] rounded-xl border-2 border-[#7A1832] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText size={16} className="text-[#7A1832]" />
          <h3 className="text-[15px] font-bold text-[#1a1a1a]">Pegar guion externo</h3>
        </div>
        <button onClick={onCancel} className="p-1.5 rounded-md hover:bg-[#FFF1B5] text-[#8a8680]">
          <X size={16} />
        </button>
      </div>
      <p className="text-[12px] text-[#8a8680]">
        Pega aquí el guion completo tal cual lo traes. La IA de la aplicación lo interpreta y crea la tarjeta con toda la información estructurada para mostrar al cliente.
      </p>
      <textarea
        value={text}
        onChange={e => onText(e.target.value)}
        rows={14}
        placeholder={"Pega el guion entero aquí…\n\nEjemplo:\n\nGANCHO: ¿Por qué tu rubio se vuelve naranja?\nCONTEXTO: El problema no es tu peluquero, es el lavado en casa…\nSOLUCIÓN: Usa agua fría los primeros 15 días y este champú morado…\nCTA: Reserva tu retoque de raíz aquí en el link de mi bio…\n\nIdea visual: primer plano del mechón amarillo → antes/después\nCaption: Tu rubio merece durar. #balayage #rubio #cuidadodelpelo"}
        className="w-full px-3 py-2.5 text-[12.5px] rounded-lg border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832] resize-y font-mono leading-relaxed"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={saving || !text.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#7A1832] text-white text-[13px] font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Interpretar y crear tarjeta
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md text-[#8a8680] text-[13px] hover:bg-[#f4f3f1]"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
