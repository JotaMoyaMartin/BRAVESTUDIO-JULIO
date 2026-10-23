'use client'
import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { demoSavePlan } from '@/lib/demo-store'
import { generatePlan, PlannerItem } from '@/lib/ai/prompts/planner'
import { generateReel, ReelOutput } from '@/lib/ai/prompts/reels'
import { generateCarousel, CarouselOutput } from '@/lib/ai/prompts/carousels'
import type { SingleStory } from '@/lib/ai/prompts/stories'
import { READY_SEQUENCES, readyToStories } from '@/lib/stories/sequences'
import { addWeeklyStories } from '@/lib/plan/stories-in-plan'
import { buildBrandFullContext, hasBrandContext, BrandFullContextInput } from '@/lib/ai/brand-context'
import UsarMiMarcaToggle from '@/components/ui/UsarMiMarcaToggle'
import AIUnavailableNotice from '@/components/ui/AIUnavailableNotice'
import PageHeader from '@/components/ui/PageHeader'
import { ContentItem } from '@/types/database'
import { useSessionState, clearSectionState } from '@/lib/session-store'
import { useToast } from '@/components/ui/Toast'
import {
  Sparkles, RefreshCw, Trash2, Calendar, ChevronDown, ChevronUp,
  Film, LayoutGrid, Copy, Check, BookOpen, ArrowLeft, CircleDot,
} from 'lucide-react'
import Link from 'next/link'

const SERVICES_OPTIONS = ['Balayage', 'Rubios', 'Canas', 'Alisados', 'Tratamientos', 'Corte', 'Color', 'General']

type Objective = 'autoridad' | 'reservas' | 'visibilidad'
type PlanObjective = Objective | 'mezcla'
/** Stories del plan: secuencia lista (texto de cada story). */
interface StoryGuion { title: string; stories: SingleStory[]; captionWithHashtags: string; visualIdea: string; sequenceId: string }
type Guion = ReelOutput | CarouselOutput | StoryGuion

const asObjective = (o: string, fallback: PlanObjective): Objective =>
  o === 'autoridad' || o === 'reservas' || o === 'visibilidad' ? o : fallback === 'mezcla' ? 'autoridad' : fallback

/** Guion de una idea del plan: se escribe SOBRE su título para que encaje. */
async function genGuion(item: Pick<PlannerItem, 'type' | 'service' | 'title' | 'hookIdea' | 'objective' | 'sequenceId'>, planObjective: PlanObjective, brandContext?: string): Promise<Guion> {
  if (item.type === 'story') {
    const seq = READY_SEQUENCES.find(s => s.id === item.sequenceId) ?? READY_SEQUENCES[0]
    return { title: seq.title, stories: readyToStories(seq), captionWithHashtags: '', visualIdea: seq.stories.map(st => st.visual).join(' · '), sequenceId: seq.id }
  }
  // En un plan «mezcla» cada publicación lleva su propio objetivo.
  const objective = asObjective(item.objective, planObjective)
  // El título ES el tema: así el guion habla exactamente de lo que promete.
  const freeText = item.title || undefined
  return item.type === 'reel'
    ? await generateReel({ service: item.service, objective, brandContext, freeText })
    : await generateCarousel({ service: item.service, objective, slideCount: 5, brandContext, freeText })
}

export default function PlanificarClient({ userId, brand, initialItems, initialTab = 'crear' }: { userId: string; brand: BrandFullContextInput | null; initialItems: ContentItem[]; initialTab?: 'crear' | 'ver' }) {
  const isDemoMode = userId === 'demo'
  // El plan en curso vive en el navegador: se pinta tras montar (sin error de hidratación).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/calendario" className="inline-flex items-center gap-1 text-[14px] font-semibold text-cereza hover:underline">
          <ArrowLeft size={15} aria-hidden /> Mi plan
        </Link>
        <PageHeader
          title="Planifica tu mes"
          subtitle="Elige cuánto y de qué quieres hablar. Te propongo las publicaciones y van directas a tu plan."
        />
      </div>

      {mounted ? <CrearTab userId={userId} brand={brand} isDemoMode={isDemoMode} onSaved={() => {}} /> : <div className="h-64 rounded-[var(--radius-lg)] bg-white/60 animate-pulse" aria-busy="true" />}
    </div>
  )
}

/* ---------------- CREAR TAB ---------------- */

function CrearTab({ userId, brand, isDemoMode, onSaved }: { userId: string; brand: BrandFullContextInput | null; isDemoMode: boolean; onSaved: () => void }) {
  const hasBrand = hasBrandContext(brand)
  const [useMiMarca, setUseMiMarca] = useSessionState<boolean>(`u:${userId}:planificar:useMiMarca`, hasBrand)
  const brandContext = useMemo(() => {
    if (!useMiMarca || !brand) return undefined
    return buildBrandFullContext(brand) || undefined
  }, [useMiMarca, brand])

  const [duration, setDuration] = useSessionState<'1week' | '1month'>(`u:${userId}:planificar:duration`, '1month')
  const [postsPerWeek, setPostsPerWeek] = useSessionState<2 | 3 | 4 | 5>(`u:${userId}:planificar:postsPerWeek`, 3)
  const [format, setFormat] = useSessionState<'reels' | 'carrusels' | 'mixed'>(`u:${userId}:planificar:format`, 'mixed')
  const [objective, setObjective] = useSessionState<PlanObjective>(`u:${userId}:planificar:objective`, 'mezcla')
  const [includeStories, setIncludeStories] = useSessionState<boolean>(`u:${userId}:planificar:stories`, true)
  const [showOptions, setShowOptions] = useState(false)
  const [services, setServices] = useSessionState<string[]>(`u:${userId}:planificar:services`, [])
  const [freeText, setFreeText] = useSessionState<string>(`u:${userId}:planificar:freeText`, '')
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useSessionState<PlannerItem[] | null>(`u:${userId}:planificar:plan`, null)
  // true = la IA falló y el plan es una plantilla de ejemplo.
  const [planMock, setPlanMock] = useSessionState<boolean>(`u:${userId}:planificar:planMock`, false)
  const [savedIds, setSavedIds] = useSessionState<string[]>(`u:${userId}:planificar:savedIds`, [])
  const [refreshCounters, setRefreshCounters] = useSessionState<Record<string, number>>(`u:${userId}:planificar:refreshCounters`, {})
  // Guion de cada idea: se genera UNA vez y es el mismo que se ve y se guarda.
  const [guiones, setGuiones] = useSessionState<Record<string, Guion>>(`u:${userId}:planificar:guiones`, {})
  const toast = useToast()

  const canGenerate = services.length > 0 || freeText.trim().length > 0

  function toggleService(s: string) {
    setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : prev.length < 3 ? [...prev, s] : prev)
  }

  /** Servicios por defecto: los de Mi Marca (si existen) o los más pedidos. */
  const defaultServices = useMemo(() => {
    const fromBrand = (brand?.main_services || []).map(x => SERVICES_OPTIONS.find(o => o.toLowerCase() === x.trim().toLowerCase())).filter(Boolean) as string[]
    return fromBrand.length ? fromBrand.slice(0, 4) : ['Rubios', 'Balayage', 'Color', 'Tratamientos']
  }, [brand])

  /** «Planifícame el mes»: un toque, con valores sensatos y variedad. */
  async function quickPlan() {
    setDuration('1month'); setPostsPerWeek(3); setFormat('mixed'); setObjective('mezcla'); setIncludeStories(true)
    setServices(defaultServices.slice(0, 3)); setFreeText('')
    await generate({ duration: '1month', postsPerWeek: 3, format: 'mixed', objective: 'mezcla', services: defaultServices, freeText: '', includeStories: true })
  }

  async function generate(o?: { duration: '1week' | '1month'; postsPerWeek: 2 | 3 | 4 | 5; format: 'reels' | 'carrusels' | 'mixed'; objective: PlanObjective; services: string[]; freeText: string; includeStories: boolean }) {
    const opts = o ?? { duration, postsPerWeek, format, objective, services: services.length ? services : ['General'], freeText, includeStories }
    if (!o && !canGenerate) return
    setGenerating(true)
    const result = await generatePlan({
      duration: opts.duration, postsPerWeek: opts.postsPerWeek, format: opts.format, objective: opts.objective,
      services: opts.services,
      freeText: opts.freeText,
      brandContext,
    })
    setPlan(opts.includeStories ? addWeeklyStories(result.items, opts.services) : result.items)
    setPlanMock(!!result.mock)
    setSavedIds([])
    setGuiones({})
    setGenerating(false)
  }

  async function regenerateItem(id: string) {
    if (!plan) return
    const item = plan.find(p => p.id === id)
    if (!item) return
    if (item.type === 'story') {
      // Otra secuencia lista del mismo servicio (o cualquiera que no esté ya en el plan).
      const inPlan = new Set(plan.map(p => p.sequenceId).filter(Boolean))
      const next = READY_SEQUENCES.find(sq => sq.service === item.service && !inPlan.has(sq.id)) ?? READY_SEQUENCES.find(sq => !inPlan.has(sq.id))
      if (!next) return
      const g = await genGuion({ ...item, sequenceId: next.id }, objective)
      setPlan(prev => prev!.map(p => p.id === id ? { ...p, title: next.title, service: next.service, sequenceId: next.id, hookIdea: next.stories[0]?.text ?? '' } : p))
      setGuiones(prev => ({ ...prev, [id]: g }))
      setRefreshCounters(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
      return
    }
    // Nueva idea sobre el mismo servicio: el guion nuevo manda (título incluido).
    // Sin título: idea nueva del mismo servicio y objetivo.
    const g = await genGuion({ ...item, title: '', hookIdea: '' }, objective, brandContext)
    const hookIdea = item.type === 'reel'
      ? (g as ReelOutput).script.hook
      : (g as CarouselOutput).slides[0]?.text || ''
    setPlan(prev => prev!.map(p => p.id === id ? { ...p, title: g.title, hookIdea } : p))
    setGuiones(prev => ({ ...prev, [id]: g }))
    setRefreshCounters(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }

  function removeItem(id: string) {
    setPlan(prev => prev!.filter(p => p.id !== id))
  }

  /** Guarda una idea; devuelve false (y avisa) si la base de datos falla. */
  async function persist(payload: Record<string, unknown>): Promise<boolean> {
    if (isDemoMode) {
      demoSavePlan(payload as Parameters<typeof demoSavePlan>[0])
      return true
    }
    const supabase = createClient()
    const { error } = await supabase.from('content_items').insert({ user_id: userId, ...payload })
    if (error) {
      console.warn('[planificar] guardar', error)
      return false
    }
    return true
  }

  async function saveItem(item: PlannerItem, guion: Guion, scheduledDate: string | null) {
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
    if (!(await persist(payload))) {
      toast.show('No se ha podido guardar. Revisa tu conexión e inténtalo de nuevo.', 'info')
      return
    }
    setSavedIds(prev => [...prev, item.id])
    onSaved()
  }

  const [savingAll, setSavingAll] = useState(false)

  async function saveAll() {
    if (!plan) return
    setSavingAll(true)
    const unsaved = plan.filter(item => !savedIds.includes(item.id))
    const ok: string[] = []
    for (const item of unsaved) {
      const guion = guiones[item.id] ?? await genGuion(item, objective, brandContext)
      if (!guiones[item.id]) setGuiones(prev => ({ ...prev, [item.id]: guion }))
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
      if (await persist(payload)) ok.push(item.id)
    }
    setSavedIds(prev => [...prev, ...ok])
    if (ok.length < unsaved.length) toast.show(`No se han podido guardar ${unsaved.length - ok.length} ideas. Pulsa otra vez «Guardar».`, 'info')
    onSaved()
    setSavingAll(false)
  }

  const objectiveDescriptions: Record<PlanObjective, string> = {
    mezcla: 'Un poco de todo: enseñar, conseguir citas y llegar a más gente. El feed no se repite.',
    autoridad: 'Errores frecuentes, diagnósticos, mitos y verdades. Posiciónate como experta.',
    reservas: 'Transformaciones, casos reales, objeciones. Provoca conversaciones y citas.',
    visibilidad: 'Listas, tendencias, contenido guardable. Más alcance y seguidores.',
  }

  const allSaved = plan !== null && plan.length > 0 && plan.every(i => savedIds.includes(i.id))
  const savedCount = plan ? plan.filter(i => savedIds.includes(i.id)).length : 0

  if (plan) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg" style={{ color: '#1a1a1a' }}>Tu planificación está lista</h2>
            <p className="text-sm" style={{ color: '#591427', opacity: 0.7 }}>
              {plan.length} ideas — {savedCount > 0 ? `${savedCount} guardadas` : 'guarda las que quieras o todas de golpe'}
            </p>
          </div>
          <button onClick={() => { clearSectionState(`u:${userId}:planificar`); setPlan(null); setSavedIds([]); setServices([]); setFreeText(''); setRefreshCounters({}) }} className="btn-ghost text-sm">
            <RefreshCw size={14} /> Empezar de nuevo
          </button>
        </div>

        {/* Save all banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl" style={{ background: allSaved ? '#C1DBE8' : '#FFF1B5', border: '1.5px solid rgba(122,24,50,0.1)' }}>
          <p className="text-sm font-medium" style={{ color: allSaved ? '#2a5a6a' : '#591427' }}>
            {allSaved ? `✓ Toda la planificación guardada (${plan.length} ideas)` : `Guarda toda la planificación de una vez — ${plan.length - savedCount} pendientes`}
          </p>
          <div className="flex items-center gap-2">
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
            {allSaved && (
              <Link href="/calendario" className="btn-secondary text-sm py-2 px-4">
                <Calendar size={15} /> Ver en Mi plan →
              </Link>
            )}
          </div>
        </div>

        {planMock && (
          <AIUnavailableNotice demo={isDemoMode} onRetry={() => generate()} retrying={generating} />
        )}

        <div className="space-y-3">
          {plan.map(item => (
            <PlanDraftCard
              isDemoMode={isDemoMode}
              key={`${item.id}-${refreshCounters[item.id] || 0}`}
              item={item}
              objective={objective}
              isSaved={savedIds.includes(item.id)}
              onRegenerate={() => regenerateItem(item.id)}
              onRemove={() => removeItem(item.id)}
              guion={guiones[item.id] ?? null}
              onGuion={g => setGuiones(prev => ({ ...prev, [item.id]: g }))}
              brandContext={brandContext}
              onSave={(guion, date) => saveItem(item, guion, date)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Un toque: mes variado con Mi Marca (lo que hará casi siempre) */}
      <div className="rounded-[var(--radius-lg)] bg-burdeos text-crema p-5 sm:p-6 space-y-4" data-tone="dark">
        <div className="space-y-1.5">
          <p className="text-xl font-semibold">Planifícame el mes</p>
          <p className="text-[15px] text-crema/80 max-w-xl">
            12 publicaciones (reels y carruseles) + stories cada viernes. Varío los temas{defaultServices.length ? ` (${defaultServices.join(', ')})` : ''} y los enfoques: enseñar, conseguir citas y llegar a más gente.
          </p>
        </div>
        <button onClick={quickPlan} disabled={generating} className="btn-primary w-full sm:w-auto justify-center !bg-mantequilla !text-burdeos text-base py-3.5 px-6">
          <Sparkles size={18} aria-hidden /> {generating ? 'Preparando tu mes…' : 'Planifícame el mes'}
        </button>
      </div>

      <button onClick={() => setShowOptions(v => !v)} aria-expanded={showOptions} className="w-full flex items-center justify-between gap-3 rounded-2xl border border-borde bg-white px-4 py-3.5 text-left">
        <span>
          <span className="block text-[15px] font-semibold text-ink">Prefiero ajustarlo yo</span>
          <span className="block text-[13px] text-tinta-2">Duración, cuántas por semana, formato, objetivo y servicios</span>
        </span>
        {showOptions ? <ChevronUp size={18} className="text-cereza" /> : <ChevronDown size={18} className="text-cereza" />}
      </button>

      {showOptions && <>
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
          {(['mezcla', 'autoridad', 'reservas', 'visibilidad'] as const).map(obj => (
            <button key={obj} onClick={() => setObjective(obj)} className="w-full text-left p-4 rounded-xl transition-all"
              style={{ background: objective === obj ? '#7A1832' : '#F5F0E8', color: objective === obj ? 'white' : '#591427' }}>
              <p className="font-semibold capitalize">{obj === 'mezcla' ? 'Mezcla (recomendado)' : obj}</p>
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

      <label className="flex items-center gap-3 rounded-2xl bg-white border border-borde px-4 py-3.5">
        <input type="checkbox" checked={includeStories} onChange={e => setIncludeStories(e.target.checked)} className="w-5 h-5 accent-[var(--color-cereza)]" />
        <span>
          <span className="block text-[15px] font-semibold text-ink">Incluir stories cada viernes</span>
          <span className="block text-[13px] text-tinta-2">Una secuencia lista de 3 stories por semana</span>
        </span>
      </label>

      <UsarMiMarcaToggle
        enabled={useMiMarca}
        onChange={setUseMiMarca}
        disabled={generating}
        hasBrand={hasBrand}
      />

      <button onClick={() => generate()} disabled={generating || !canGenerate} className="btn-primary w-full justify-center text-base py-4"
        style={{ opacity: !canGenerate ? 0.5 : 1 }}>
        <Sparkles size={20} />
        {generating ? 'Generando tu planificación...' : '✨ Generar planificación'}
      </button>
      {!canGenerate && (
        <p className="text-center text-sm" style={{ color: '#7A1832', opacity: 0.6 }}>Selecciona un servicio o escribe un tema para continuar</p>
      )}
      </>}
    </div>
  )
}

function PlanDraftCard({ item, objective, isSaved, onRegenerate, onRemove, onSave, guion, onGuion, brandContext, isDemoMode }: {
  item: PlannerItem
  isDemoMode: boolean
  objective: PlanObjective
  isSaved: boolean
  guion: Guion | null
  onGuion: (g: Guion) => void
  brandContext?: string
  onRegenerate: () => void
  onRemove: () => void
  onSave: (guion: Guion, date: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [editingDate, setEditingDate] = useState(false)
  const [date, setDate] = useState(item.suggestedDate || '')
  const [loadingGuion, setLoadingGuion] = useState(false)

  function ensureGuion(): Guion | Promise<Guion> {
    if (guion) return guion
    setLoadingGuion(true)
    return genGuion(item, objective, brandContext).then(g => {
      onGuion(g)
      setLoadingGuion(false)
      return g
    })
  }

  /** La IA falló en este guion: pedirlo otra vez. */
  function retryGuion() {
    setLoadingGuion(true)
    genGuion(item, objective, brandContext).then(g => {
      onGuion(g)
      setLoadingGuion(false)
    })
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

  async function handleSave() {
    const g = await ensureGuion()
    onSave(g, date || null)
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)', boxShadow: '0 2px 8px rgba(90,20,39,0.05)' }}>
      <button onClick={handleExpand} className="w-full p-4 text-left flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          {item.type === 'reel' ? <Film size={18} style={{ color: '#7A1832', marginTop: 2 }} /> : item.type === 'story' ? <CircleDot size={18} style={{ color: '#8A5A12', marginTop: 2 }} /> : <LayoutGrid size={18} style={{ color: '#7A1832', marginTop: 2 }} />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: '#7A1832', color: 'white' }}>{item.type}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFF1B5', color: '#591427' }}>{item.service}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#591427' }}>{item.objective}</span>
              {(date || item.suggestedDate) && <span className="text-xs" style={{ color: '#591427', opacity: 0.6 }}>{humanDate(date || item.suggestedDate!)}</span>}
              {isSaved && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#C1DBE8', color: '#2a5a6a' }}>✓ En planificación</span>}
            </div>
            <p className="font-semibold text-sm" style={{ color: '#1a1a1a' }}>{item.title}</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: '#7A1832', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: '#7A1832', flexShrink: 0 }} />}
      </button>

      {expanded && loadingGuion && (
        <div className="border-t px-5 py-6 text-center" style={{ borderColor: 'rgba(255,241,181,0.5)' }}>
          <p className="text-sm" style={{ color: '#591427', opacity: 0.7 }}>Generando guion…</p>
        </div>
      )}

      {expanded && guion && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'rgba(255,241,181,0.5)' }}>
          {'mock' in guion && guion.mock && (
            <AIUnavailableNotice demo={isDemoMode} onRetry={retryGuion} retrying={loadingGuion} />
          )}
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

/* ---------------- shared ---------------- */

/** «mié 28 oct» a partir de AAAA-MM-DD (fecha local, sin desfase). */
function humanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
}

function GuionView({ item, guion, copied, onCopy }: {
  item: PlannerItem
  guion: Guion
  copied: string | null
  onCopy: (text: string, key: string) => void
}) {
  if (item.type === 'story') {
    const st = guion as StoryGuion
    const full = st.stories.map(x => `Story ${x.number} (${x.role}): ${x.text}`).join('\n\n')
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>SECUENCIA DE STORIES</p>
          <CopyChip text={full} id="guion" copied={copied} onCopy={onCopy} label="Copiar las 3" />
        </div>
        {st.stories.map(x => (
          <div key={x.number} className="p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832' }}>Story {x.number} · {x.role}</span>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: '#1a1a1a' }}>{x.text}</p>
          </div>
        ))}
      </div>
    )
  }
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