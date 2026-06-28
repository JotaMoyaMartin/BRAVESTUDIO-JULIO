'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  demoGetPlan, demoSavePlan, demoUpdatePlan, demoDeletePlan, demoReorderPlan,
} from '@/lib/demo-store'
import { generateMockPlan, PlannerItem } from '@/lib/ai/prompts/planner'
import { getMockReel, ReelOutput } from '@/lib/ai/prompts/reels'
import { getMockCarousel, CarouselOutput } from '@/lib/ai/prompts/carousels'
import { BrandProfile, ContentItem } from '@/types/database'
import {
  Sparkles, RefreshCw, Trash2, Calendar, ChevronDown, ChevronUp,
  Film, LayoutGrid, Download, Copy, Check, BookOpen, ArrowUp, ArrowDown, List as ListIcon,
} from 'lucide-react'

const SERVICES_OPTIONS = ['Balayage', 'Rubios', 'Canas', 'Alisados', 'Tratamientos', 'Corte', 'Color', 'General']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

type PartialBrand = Pick<BrandProfile, 'optimized_summary' | 'salon_name' | 'main_services' | 'service_to_promote'> | null
type Objective = 'autoridad' | 'reservas' | 'visibilidad'
type Guion = ReelOutput | CarouselOutput

function genGuion(type: 'reel' | 'carrusel', service: string, objective: Objective): Guion {
  return type === 'reel'
    ? getMockReel({ service, objective })
    : getMockCarousel({ service, objective, slideCount: 5 })
}

function scriptToText(item: ContentItem): string {
  const json = (item.content_json || {}) as Record<string, unknown>
  const cap = item.caption_with_hashtags || ''
  if (item.type === 'reel' && json.script) {
    const s = json.script as Record<string, string>
    return `GANCHO:\n${s.hook}\n\nCONTEXTO:\n${s.context}\n\nSOLUCIÓN:\n${s.solution}\n\nCTA:\n${s.cta}${cap ? `\n\nPUBLICACIÓN:\n${cap}` : ''}`
  }
  if (item.type === 'carrusel' && json.slides) {
    const slides = json.slides as Array<{ number: number; role: string; text: string }>
    return slides.map(s => `Slide ${s.number} — ${s.role}:\n${s.text}`).join('\n\n') + (cap ? `\n\nPUBLICACIÓN:\n${cap}` : '')
  }
  return cap || item.title
}

export default function PlanificarClient({ userId, brand, initialItems, initialTab = 'crear' }: { userId: string; brand: PartialBrand; initialItems: ContentItem[]; initialTab?: 'crear' | 'ver' }) {
  const isDemoMode = userId === 'demo'
  const [tab, setTab] = useState<'crear' | 'ver'>(initialTab)
  const [saved, setSaved] = useState<ContentItem[]>(initialItems)

  useEffect(() => {
    if (isDemoMode) setSaved(demoGetPlan() as unknown as ContentItem[])
  }, [tab])

  function refreshSaved() {
    if (isDemoMode) setSaved(demoGetPlan() as unknown as ContentItem[])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Planificación</h1>
        <p className="mt-1 text-sm" style={{ color: '#591427', opacity: 0.8 }}>
          Genera, organiza y guarda todo tu contenido en un solo lugar
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: '#F5F0E8' }}>
        {([['crear', 'Crear planificación'], ['ver', 'Ver planificación']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: tab === id ? '#7A1832' : 'transparent', color: tab === id ? 'white' : '#591427' }}
          >
            {label}{id === 'ver' && saved.length > 0 ? ` (${saved.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'crear'
        ? <CrearTab userId={userId} brand={brand} isDemoMode={isDemoMode} onSaved={() => { refreshSaved() }} />
        : <VerTab userId={userId} isDemoMode={isDemoMode} items={saved} setItems={setSaved} refresh={refreshSaved} />
      }
    </div>
  )
}

/* ---------------- CREAR TAB ---------------- */

function CrearTab({ userId, brand, isDemoMode, onSaved }: { userId: string; brand: PartialBrand; isDemoMode: boolean; onSaved: () => void }) {
  const [duration, setDuration] = useState<'1week' | '1month'>('1month')
  const [postsPerWeek, setPostsPerWeek] = useState<2 | 3 | 4 | 5>(3)
  const [format, setFormat] = useState<'reels' | 'carrusels' | 'mixed'>('mixed')
  const [objective, setObjective] = useState<Objective>('autoridad')
  const [services, setServices] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useState<PlannerItem[] | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [refreshCounters, setRefreshCounters] = useState<Record<string, number>>({})

  const canGenerate = services.length > 0 || freeText.trim().length > 0

  function toggleService(s: string) {
    setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : prev.length < 3 ? [...prev, s] : prev)
  }

  async function generate() {
    if (!canGenerate) return
    setGenerating(true)
    await new Promise(r => setTimeout(r, 600))
    const result = generateMockPlan({
      duration, postsPerWeek, format, objective,
      services: services.length ? services : ['General'],
      freeText,
      brandContext: brand?.optimized_summary || undefined,
    })
    setPlan(result.items)
    setSavedIds(new Set())
    setGenerating(false)
  }

  function regenerateItem(id: string) {
    if (!plan) return
    const item = plan.find(p => p.id === id)
    if (!item) return
    const g = genGuion(item.type, item.service, objective)
    const hookIdea = item.type === 'reel'
      ? (g as ReelOutput).script.hook
      : (g as CarouselOutput).slides[0]?.text || ''
    setPlan(prev => prev!.map(p => p.id === id ? { ...p, title: g.title, hookIdea } : p))
    setRefreshCounters(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }

  function removeItem(id: string) {
    setPlan(prev => prev!.filter(p => p.id !== id))
  }

  function saveItem(item: PlannerItem, guion: Guion, scheduledDate: string | null) {
    const payload = {
      type: item.type,
      title: item.title,
      service: item.service,
      objective: item.objective,
      format: item.format,
      content_json: guion as unknown as Record<string, unknown>,
      caption_with_hashtags: guion.captionWithHashtags,
      visual_idea: guion.visualIdea,
      scheduled_date: scheduledDate,
      status: scheduledDate ? 'scheduled' : 'library',
    }
    if (isDemoMode) {
      demoSavePlan(payload)
    } else {
      const supabase = createClient()
      supabase.from('content_items').insert({ user_id: userId, ...payload }).then(() => {})
    }
    setSavedIds(prev => { const s = new Set(Array.from(prev)); s.add(item.id); return s })
    onSaved()
  }

  const [savingAll, setSavingAll] = useState(false)

  async function saveAll() {
    if (!plan) return
    setSavingAll(true)
    const unsaved = plan.filter(item => !savedIds.has(item.id))
    for (const item of unsaved) {
      const guion = genGuion(item.type, item.service, objective)
      const payload = {
        type: item.type,
        title: item.title,
        service: item.service,
        objective: item.objective,
        format: item.format,
        content_json: guion as unknown as Record<string, unknown>,
        caption_with_hashtags: guion.captionWithHashtags,
        visual_idea: guion.visualIdea,
        scheduled_date: item.suggestedDate || null,
        status: item.suggestedDate ? 'scheduled' : 'library',
      }
      if (isDemoMode) {
        demoSavePlan(payload)
      } else {
        const supabase = createClient()
        await supabase.from('content_items').insert({ user_id: userId, ...payload })
      }
    }
    setSavedIds(new Set(plan.map(i => i.id)))
    onSaved()
    setSavingAll(false)
  }

  const objectiveDescriptions: Record<Objective, string> = {
    autoridad: 'Errores frecuentes, diagnósticos, mitos y verdades. Posiciónate como experta.',
    reservas: 'Transformaciones, casos reales, objeciones. Provoca conversaciones y citas.',
    visibilidad: 'Listas, tendencias, contenido guardable. Más alcance y seguidores.',
  }

  const allSaved = plan !== null && plan.length > 0 && plan.every(i => savedIds.has(i.id))
  const savedCount = plan ? plan.filter(i => savedIds.has(i.id)).length : 0

  if (plan) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg" style={{ color: '#1a1a1a' }}>Tu planificación está lista ✨</h2>
            <p className="text-sm" style={{ color: '#591427', opacity: 0.7 }}>
              {plan.length} ideas — {savedCount > 0 ? `${savedCount} guardadas` : 'guarda las que quieras o todas de golpe'}
            </p>
          </div>
          <button onClick={() => setPlan(null)} className="btn-ghost text-sm">Nueva planificación</button>
        </div>

        {/* Save all banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl" style={{ background: allSaved ? '#C1DBE8' : '#FFF1B5', border: '1.5px solid rgba(122,24,50,0.1)' }}>
          <p className="text-sm font-medium" style={{ color: allSaved ? '#2a5a6a' : '#591427' }}>
            {allSaved ? `✓ Toda la planificación guardada (${plan.length} ideas)` : `Guarda toda la planificación de una vez — ${plan.length - savedCount} pendientes`}
          </p>
          {!allSaved && (
            <button
              onClick={saveAll}
              disabled={savingAll}
              className="btn-primary text-sm py-2 px-4"
            >
              <BookOpen size={15} />
              {savingAll ? 'Guardando...' : 'Guardar toda la planificación'}
            </button>
          )}
        </div>

        <div className="space-y-3">
          {plan.map(item => (
            <PlanDraftCard
              key={`${item.id}-${refreshCounters[item.id] || 0}`}
              item={item}
              objective={objective}
              isSaved={savedIds.has(item.id)}
              onRegenerate={() => regenerateItem(item.id)}
              onRemove={() => removeItem(item.id)}
              onSave={(guion, date) => saveItem(item, guion, date)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <OptionGroup label="¿Cuánto tiempo quieres planificar?">
        <div className="flex gap-3">
          {([['1week', '1 semana'], ['1month', '1 mes']] as const).map(([val, lbl]) => (
            <button key={val} onClick={() => setDuration(val)} className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: duration === val ? '#7A1832' : '#F5F0E8', color: duration === val ? 'white' : '#591427' }}>{lbl}</button>
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label="¿Cuántas publicaciones por semana?">
        <div className="flex gap-2">
          {([2, 3, 4, 5] as const).map(n => (
            <button key={n} onClick={() => setPostsPerWeek(n)} className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: postsPerWeek === n ? '#7A1832' : '#F5F0E8', color: postsPerWeek === n ? 'white' : '#591427' }}>{n}</button>
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label="¿Qué formato quieres?">
        <div className="flex gap-3">
          {([['reels', 'Solo Reels', Film], ['carrusels', 'Solo Carruseles', LayoutGrid], ['mixed', 'Mezcla', Sparkles]] as const).map(([val, lbl, Icon]) => (
            <button key={val} onClick={() => setFormat(val)} className="flex-1 flex flex-col items-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: format === val ? '#7A1832' : '#F5F0E8', color: format === val ? 'white' : '#591427' }}>
              <Icon size={18} />{lbl}
            </button>
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label="¿Qué objetivo principal quieres?">
        <div className="space-y-2">
          {(['autoridad', 'reservas', 'visibilidad'] as const).map(obj => (
            <button key={obj} onClick={() => setObjective(obj)} className="w-full text-left p-4 rounded-xl transition-all"
              style={{ background: objective === obj ? '#7A1832' : '#F5F0E8', color: objective === obj ? 'white' : '#591427' }}>
              <p className="font-semibold capitalize">{obj}</p>
              <p className="text-xs mt-0.5 opacity-80">{objectiveDescriptions[obj]}</p>
            </button>
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label={`¿Sobre qué servicios? (máx. 3) — ${services.length}/3 seleccionados`}>
        <div className="flex flex-wrap gap-2">
          {SERVICES_OPTIONS.map(s => (
            <button key={s} onClick={() => toggleService(s)} className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: services.includes(s) ? '#7A1832' : '#F5F0E8', color: services.includes(s) ? 'white' : '#591427',
                opacity: !services.includes(s) && services.length >= 3 ? 0.4 : 1 }}>{s}</button>
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label="¿Quieres hablar de algo concreto?">
        <input value={freeText} onChange={e => setFreeText(e.target.value)}
          placeholder="Ej: alopecia, protector térmico, cabello quemado..."
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }} />
        <p className="text-xs mt-2" style={{ color: '#591427', opacity: 0.7 }}>
          Si escribes un tema aquí, toda la planificación girará en torno a él (aunque no esté en los servicios).
        </p>
      </OptionGroup>

      <button onClick={generate} disabled={generating || !canGenerate} className="btn-primary w-full justify-center text-base py-4"
        style={{ opacity: !canGenerate ? 0.5 : 1 }}>
        <Sparkles size={20} />
        {generating ? 'Generando tu planificación...' : '✨ Generar planificación'}
      </button>
      {!canGenerate && (
        <p className="text-center text-sm" style={{ color: '#7A1832', opacity: 0.6 }}>Selecciona un servicio o escribe un tema para continuar</p>
      )}
    </div>
  )
}

function PlanDraftCard({ item, objective, isSaved, onRegenerate, onRemove, onSave }: {
  item: PlannerItem
  objective: Objective
  isSaved: boolean
  onRegenerate: () => void
  onRemove: () => void
  onSave: (guion: Guion, date: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [guion, setGuion] = useState<Guion | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [editingDate, setEditingDate] = useState(false)
  const [date, setDate] = useState(item.suggestedDate || '')

  function ensureGuion(): Guion {
    if (guion) return guion
    const g = genGuion(item.type, item.service, objective)
    setGuion(g)
    return g
  }

  function handleExpand() {
    const next = !expanded
    setExpanded(next)
    if (next) ensureGuion()
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleSave() {
    onSave(ensureGuion(), date || null)
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)', boxShadow: '0 2px 8px rgba(90,20,39,0.05)' }}>
      <button onClick={handleExpand} className="w-full p-4 text-left flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          {item.type === 'reel' ? <Film size={18} style={{ color: '#7A1832', marginTop: 2 }} /> : <LayoutGrid size={18} style={{ color: '#7A1832', marginTop: 2 }} />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: '#7A1832', color: 'white' }}>{item.type}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFF1B5', color: '#591427' }}>{item.service}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#591427' }}>{item.objective}</span>
              {item.suggestedDate && <span className="text-xs" style={{ color: '#591427', opacity: 0.6 }}>{item.suggestedDay} · {item.suggestedDate}</span>}
              {isSaved && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#C1DBE8', color: '#2a5a6a' }}>✓ En planificación</span>}
            </div>
            <p className="font-semibold text-sm" style={{ color: '#1a1a1a' }}>{item.title}</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: '#7A1832', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: '#7A1832', flexShrink: 0 }} />}
      </button>

      {expanded && guion && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'rgba(255,241,181,0.5)' }}>
          <GuionView item={item} guion={guion} copied={copied} onCopy={copy} />

          {editingDate && (
            <div className="flex gap-2">
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none" style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }} />
              <button onClick={() => setEditingDate(false)} className="btn-ghost text-xs">Listo</button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={onRegenerate} className="btn-ghost text-xs py-1.5 px-3"><RefreshCw size={13} /> Regenerar</button>
            <button onClick={() => setEditingDate(v => !v)} className="btn-ghost text-xs py-1.5 px-3"><Calendar size={13} /> Cambiar fecha</button>
            <button onClick={handleSave} disabled={isSaved} className="btn-primary text-xs py-1.5 px-3" style={{ opacity: isSaved ? 0.6 : 1 }}>
              <BookOpen size={13} /> {isSaved ? '✓ Guardado' : 'Guardar en planificación'}
            </button>
            <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors ml-auto"><Trash2 size={14} style={{ color: '#c0394e' }} /></button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- VER TAB ---------------- */

function VerTab({ userId, isDemoMode, items, setItems, refresh }: {
  userId: string
  isDemoMode: boolean
  items: ContentItem[]
  setItems: React.Dispatch<React.SetStateAction<ContentItem[]>>
  refresh: () => void
}) {
  const [view, setView] = useState<'list' | 'calendar'>('list')

  function persistDelete(id: string) {
    if (isDemoMode) demoDeletePlan(id)
    else { const s = createClient(); s.from('content_items').delete().eq('id', id).then(() => {}) }
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function persistDate(id: string, date: string | null) {
    const patch = { scheduled_date: date, status: date ? 'scheduled' : 'library' }
    if (isDemoMode) demoUpdatePlan(id, patch)
    else { const s = createClient(); s.from('content_items').update(patch).eq('id', id).then(() => {}) }
    setItems(prev => prev.map(i => i.id === id ? { ...i, scheduled_date: date, status: (date ? 'scheduled' : 'library') } as ContentItem : i))
  }

  function persistRegenerate(item: ContentItem) {
    const obj = (item.objective as Objective) || 'autoridad'
    const type = item.type === 'carrusel' ? 'carrusel' : 'reel'
    const g = genGuion(type, item.service || 'General', obj)
    const patch = {
      content_json: g as unknown as Record<string, unknown>,
      caption_with_hashtags: g.captionWithHashtags,
      visual_idea: g.visualIdea,
      title: g.title,
    }
    if (isDemoMode) demoUpdatePlan(item.id, patch)
    else { const s = createClient(); s.from('content_items').update(patch).eq('id', item.id).then(() => {}) }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...patch, content_json: g } as unknown as ContentItem : i))
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const next = [...items]
    const tmp = next[index]; next[index] = next[target]; next[target] = tmp
    setItems(next)
    if (isDemoMode) demoReorderPlan(next.map(i => i.id))
  }

  function downloadPlan() {
    const rows = items.map((item, idx) => {
      const json = (item.content_json || {}) as Record<string, unknown>
      let body = ''
      if (item.type === 'reel' && json.script) {
        const s = json.script as Record<string, string>
        body = `GANCHO: ${s.hook}\nCONTEXTO: ${s.context}\nSOLUCIÓN: ${s.solution}\nCTA: ${s.cta}`
      } else if (item.type === 'carrusel' && json.slides) {
        body = (json.slides as Array<{ number: number; role: string; text: string }>).map(sl => `Slide ${sl.number} (${sl.role}): ${sl.text}`).join('\n')
      }
      return `
        <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #eee;page-break-inside:avoid;">
          <div style="font-size:12px;color:#7A1832;font-weight:bold;">${idx + 1}. ${(item.type || '').toUpperCase()}${item.scheduled_date ? ' · ' + item.scheduled_date : ''}</div>
          <h3 style="margin:4px 0;color:#1a1a1a;">${item.title}</h3>
          <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;color:#333;margin:8px 0;">${body}</pre>
          ${item.caption_with_hashtags ? `<div style="font-size:12px;color:#555;"><strong>Publicación:</strong> ${item.caption_with_hashtags}</div>` : ''}
          ${item.visual_idea ? `<div style="font-size:12px;color:#2a5a6a;margin-top:4px;"><strong>Idea visual:</strong> ${item.visual_idea}</div>` : ''}
        </div>`
    }).join('')
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>Planificación BRÄVE</title></head><body style="font-family:sans-serif;max-width:720px;margin:32px auto;padding:0 16px;">
      <h1 style="color:#7A1832;">Mi planificación BRÄVE</h1>${rows}</body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl p-12 text-center" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <div className="text-5xl mb-4">🤖</div>
        <p className="font-semibold text-lg" style={{ color: '#1a1a1a' }}>Aún no tienes contenido guardado</p>
        <p className="text-sm mt-2" style={{ color: '#591427', opacity: 0.7 }}>
          Crea una planificación o guarda ideas desde Crear Contenido y Stories. Aparecerán aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#F5F0E8' }}>
          {([['list', 'Lista', ListIcon], ['calendar', 'Calendario', Calendar]] as const).map(([id, lbl, Icon]) => (
            <button key={id} onClick={() => setView(id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: view === id ? '#7A1832' : 'transparent', color: view === id ? 'white' : '#591427' }}>
              <Icon size={14} /> {lbl}
            </button>
          ))}
        </div>
        <button onClick={downloadPlan} className="btn-ghost text-sm"><Download size={15} /> Descargar planificación</button>
      </div>

      {view === 'list' ? (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <SavedCard
              key={item.id}
              item={item}
              index={idx}
              total={items.length}
              onDelete={() => persistDelete(item.id)}
              onDate={(d) => persistDate(item.id, d)}
              onRegenerate={() => persistRegenerate(item)}
              onUp={() => move(idx, -1)}
              onDown={() => move(idx, 1)}
            />
          ))}
        </div>
      ) : (
        <CalendarView items={items} />
      )}
    </div>
  )
}

function SavedCard({ item, index, total, onDelete, onDate, onRegenerate, onUp, onDown }: {
  item: ContentItem
  index: number
  total: number
  onDelete: () => void
  onDate: (d: string | null) => void
  onRegenerate: () => void
  onUp: () => void
  onDown: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [editingDate, setEditingDate] = useState(false)
  const [date, setDate] = useState(item.scheduled_date || '')

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const json = (item.content_json || {}) as Record<string, unknown>
  const Icon = item.type === 'reel' ? Film : item.type === 'carrusel' ? LayoutGrid : LayoutGrid

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)', boxShadow: '0 2px 8px rgba(90,20,39,0.05)' }}>
      <div className="flex items-stretch">
        {/* Reorder controls */}
        <div className="flex flex-col justify-center px-1.5 gap-1" style={{ background: '#FFFDF5', borderRight: '1px solid rgba(255,241,181,0.6)' }}>
          <button onClick={onUp} disabled={index === 0} className="p-1 rounded-md disabled:opacity-25 hover:bg-white"><ArrowUp size={14} style={{ color: '#7A1832' }} /></button>
          <button onClick={onDown} disabled={index === total - 1} className="p-1 rounded-md disabled:opacity-25 hover:bg-white"><ArrowDown size={14} style={{ color: '#7A1832' }} /></button>
        </div>

        <button onClick={() => setExpanded(v => !v)} className="flex-1 p-4 text-left flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Icon size={18} style={{ color: '#7A1832', marginTop: 2, flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: '#7A1832', color: 'white' }}>{item.type}</span>
                {item.service && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFF1B5', color: '#591427' }}>{item.service}</span>}
                {item.scheduled_date && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#C1DBE8', color: '#2a5a6a' }}>📅 {item.scheduled_date}</span>}
              </div>
              <p className="font-semibold text-sm truncate" style={{ color: '#1a1a1a' }}>{item.title}</p>
            </div>
          </div>
          {expanded ? <ChevronUp size={16} style={{ color: '#7A1832', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: '#7A1832', flexShrink: 0 }} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'rgba(255,241,181,0.5)' }}>
          <SavedContent item={item} json={json} />

          {editingDate && (
            <div className="flex gap-2">
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none" style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }} />
              <button onClick={() => { onDate(date || null); setEditingDate(false) }} className="btn-primary text-xs">Confirmar</button>
              <button onClick={() => setEditingDate(false)} className="btn-ghost text-xs">Cancelar</button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={() => copy(scriptToText(item), 'all')} className="btn-secondary text-xs py-1.5 px-3">
              {copied === 'all' ? <Check size={13} /> : <Copy size={13} />} {copied === 'all' ? '¡Copiado!' : 'Copiar contenido'}
            </button>
            <button onClick={() => setEditingDate(v => !v)} className="btn-ghost text-xs py-1.5 px-3"><Calendar size={13} /> Cambiar fecha</button>
            <button onClick={onRegenerate} className="btn-ghost text-xs py-1.5 px-3"><RefreshCw size={13} /> Regenerar</button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors ml-auto"><Trash2 size={14} style={{ color: '#c0394e' }} /></button>
          </div>
        </div>
      )}
    </div>
  )
}

function SavedContent({ item, json }: { item: ContentItem; json: Record<string, unknown> }) {
  if (item.type === 'reel' && json.script) {
    const s = json.script as Record<string, string>
    return (
      <div className="space-y-2">
        {([['GANCHO', s.hook], ['CONTEXTO', s.context], ['SOLUCIÓN', s.solution], ['CTA', s.cta]] as const).map(([label, text]) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832' }}>{label}</span>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: '#1a1a1a' }}>{text}</p>
          </div>
        ))}
        {item.caption_with_hashtags && <CaptionBlock text={item.caption_with_hashtags} />}
      </div>
    )
  }
  if (item.type === 'carrusel' && json.slides) {
    const slides = json.slides as Array<{ number: number; role: string; text: string }>
    return (
      <div className="space-y-2">
        {slides.map(sl => (
          <div key={sl.number} className="flex gap-3 p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#7A1832', color: 'white' }}>{sl.number}</div>
            <div><span className="text-xs font-semibold" style={{ color: '#7A1832' }}>{sl.role}</span>
              <p className="text-sm mt-0.5 leading-relaxed" style={{ color: '#1a1a1a' }}>{sl.text}</p></div>
          </div>
        ))}
        {item.caption_with_hashtags && <CaptionBlock text={item.caption_with_hashtags} />}
      </div>
    )
  }
  return <p className="text-sm whitespace-pre-line" style={{ color: '#1a1a1a' }}>{item.caption_with_hashtags || 'Contenido guardado'}</p>
}

function CaptionBlock({ text }: { text: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#7A1832', opacity: 0.6 }}>PUBLICACIÓN</p>
      <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: '#1a1a1a' }}>{text}</p>
    </div>
  )
}

function CalendarView({ items }: { items: ContentItem[] }) {
  const [viewDate, setViewDate] = useState(new Date())
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const startDay = new Date(year, month, 1).getDay()
  const fmt = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const typeColor = (t: string) => t === 'reel' ? '#7A1832' : t === 'carrusel' ? '#2a5a6a' : '#7a6000'
  const unscheduled = items.filter(i => !i.scheduled_date)

  return (
    <div className="space-y-4">
      <div className="rounded-3xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1.5px solid rgba(255,241,181,0.5)' }}>
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="px-3 py-1 rounded-lg" style={{ color: '#7A1832' }}>‹</button>
          <h2 className="font-bold" style={{ color: '#1a1a1a' }}>{MONTHS[month]} {year}</h2>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="px-3 py-1 rounded-lg" style={{ color: '#7A1832' }}>›</button>
        </div>
        <div className="grid grid-cols-7 px-4 pt-3">
          {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: '#591427', opacity: 0.6 }}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 px-4 pb-4">
          {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1
            const dayItems = items.filter(it => it.scheduled_date === fmt(day))
            return (
              <div key={day} className="min-h-[60px] p-1 rounded-xl" style={{ border: '1.5px solid transparent' }}>
                <div className="text-xs font-semibold mb-1 px-1" style={{ color: '#1a1a1a' }}>{day}</div>
                <div className="space-y-0.5">
                  {dayItems.slice(0, 2).map(it => (
                    <div key={it.id} className="text-xs px-1.5 py-0.5 rounded-lg truncate" style={{ background: typeColor(it.type), color: 'white' }}>{it.title}</div>
                  ))}
                  {dayItems.length > 2 && <div className="text-xs px-1" style={{ color: '#7A1832' }}>+{dayItems.length - 2}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {unscheduled.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2" style={{ color: '#1a1a1a' }}>Sin fecha ({unscheduled.length})</h3>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map(it => (
              <span key={it.id} className="text-xs px-3 py-1.5 rounded-xl" style={{ background: '#F5F0E8', color: '#591427' }}>{it.title}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- shared ---------------- */

function GuionView({ item, guion, copied, onCopy }: {
  item: PlannerItem
  guion: Guion
  copied: string | null
  onCopy: (text: string, key: string) => void
}) {
  if (item.type === 'reel') {
    const r = guion as ReelOutput
    const full = `GANCHO:\n${r.script.hook}\n\nCONTEXTO:\n${r.script.context}\n\nSOLUCIÓN:\n${r.script.solution}\n\nCTA:\n${r.script.cta}`
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>GUION DEL REEL</p>
          <CopyChip text={full} id="guion" copied={copied} onCopy={onCopy} label="Copiar guion" />
        </div>
        {([['GANCHO', r.script.hook], ['CONTEXTO', r.script.context], ['SOLUCIÓN', r.script.solution], ['CTA', r.script.cta]] as const).map(([label, text]) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832' }}>{label}</span>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: '#1a1a1a' }}>{text}</p>
          </div>
        ))}
        <PublicacionBlock text={r.captionWithHashtags} copied={copied} onCopy={onCopy} />
        <VisualBlock text={r.visualIdea} />
      </div>
    )
  }
  const c = guion as CarouselOutput
  const full = c.slides.map(s => `Slide ${s.number} — ${s.role}:\n${s.text}`).join('\n\n')
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>SLIDES DEL CARRUSEL</p>
        <CopyChip text={full} id="guion" copied={copied} onCopy={onCopy} label="Copiar todo" />
      </div>
      {c.slides.map(slide => (
        <div key={slide.number} className="flex gap-3 p-3 rounded-xl items-start" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#7A1832', color: 'white' }}>{slide.number}</div>
          <div className="flex-1">
            <span className="text-xs font-semibold" style={{ color: '#7A1832' }}>{slide.role}</span>
            <p className="text-sm mt-0.5 leading-relaxed" style={{ color: '#1a1a1a' }}>{slide.text}</p>
          </div>
          <CopyChip text={slide.text} id={`s${slide.number}`} copied={copied} onCopy={onCopy} label="" />
        </div>
      ))}
      <PublicacionBlock text={c.captionWithHashtags} copied={copied} onCopy={onCopy} />
      <VisualBlock text={c.visualIdea} />
    </div>
  )
}

function PublicacionBlock({ text, copied, onCopy }: { text: string; copied: string | null; onCopy: (t: string, k: string) => void }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>PUBLICACIÓN</p>
        <CopyChip text={text} id="caption" copied={copied} onCopy={onCopy} label="Copiar publicación" />
      </div>
      <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: '#1a1a1a' }}>{text}</p>
    </div>
  )
}

function VisualBlock({ text }: { text: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: '#C1DBE8' }}>
      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#2a5a6a', opacity: 0.7 }}>💡 IDEA VISUAL</p>
      <p className="text-xs" style={{ color: '#1a3a4a' }}>{text}</p>
    </div>
  )
}

function CopyChip({ text, id, copied, onCopy, label }: { text: string; id: string; copied: string | null; onCopy: (t: string, k: string) => void; label: string }) {
  return (
    <button onClick={() => onCopy(text, id)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
      style={{ background: copied === id ? '#7A1832' : '#FFF1B5', color: copied === id ? 'white' : '#591427' }}>
      {copied === id ? <Check size={12} /> : <Copy size={12} />}{label && (copied === id ? '¡Copiado!' : label)}
    </button>
  )
}

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
      <p className="font-semibold text-sm mb-3" style={{ color: '#1a1a1a' }}>{label}</p>
      {children}
    </div>
  )
}
