'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { saveToLibrary } from '@/lib/content-utils'
import { generateReelChecked, hashSeed, ReelOutput, ContentObjective } from '@/lib/ai/prompts/reels'
import { generateReelIdeas, IdeaItem } from '@/lib/ai/prompts/idea-specs'
import { useDictateText } from '@/lib/speech'
import { useSessionState, clearSectionState } from '@/lib/session-store'
import { buildBrandFullContext, hasBrandContext, BrandFullContextInput } from '@/lib/ai/brand-context'
import { openTeleprompter, composeReelSpokenScript } from '@/lib/teleprompter/input'
import UsarMiMarcaToggle from '@/components/ui/UsarMiMarcaToggle'
import BraviGuide from '@/components/bravi/BraviGuide'
import { Film, Copy, BookOpen, RefreshCw, Check, ChevronLeft, Clapperboard, ChevronDown, Plus, RotateCcw, Sparkles, Mic } from 'lucide-react'

const SERVICES = ['Balayage', 'Rubios', 'Canas', 'Alisados', 'Tratamientos', 'Corte', 'Color', 'General']

type Objective = ContentObjective

interface GeneratedScript {
  idea: IdeaItem
  reel: ReelOutput
  /** true = la IA no respondió y salió un guion de ejemplo (no personalizado). */
  mock?: boolean
}

const STEPS: Array<{ id: 'topic' | 'objective' | 'ideas' | 'scripts'; label: string }> = [
  { id: 'topic', label: 'Idea' },
  { id: 'objective', label: 'Objetivo' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'scripts', label: 'Guiones' },
]

// Sección GUIONES — de una idea a guiones completos de Reel, sin fricción:
// 5 ideas → eliges tus favoritas → guiones completos → guardar/grabar.
// (La sección antes se llamaba "Crear Contenido"; los carruseles viven en /carrusel.)
export default function CrearContenidoClient({
  userId,
  brandFull,
  initialService,
  initialTema,
  initialContexto,
  recentTitles = [],
}: {
  userId: string
  brandFull: BrandFullContextInput | null
  initialService?: string | null
  initialTema?: string | null
  initialContexto?: string | null
  recentTitles?: string[]
}) {
  const isDemoMode = userId === 'demo'
  const router = useRouter()
  const hasBrand = hasBrandContext(brandFull)
  const [useMiMarca, setUseMiMarca] = useSessionState<boolean>(`u:${userId}:guiones:useMiMarca`, hasBrand)

  // Contexto efectivo que se pasa a los prompts
  const brandContext = useMemo(() => {
    if (!useMiMarca || !brandFull) return undefined
    return buildBrandFullContext(brandFull) || undefined
  }, [useMiMarca, brandFull])

  const skipToObjective = !!(initialService || initialTema)
  const [step, setStep] = useSessionState<'topic' | 'objective' | 'ideas' | 'scripts'>(`u:${userId}:guiones:step`,
    skipToObjective ? 'objective' : 'topic'
  )
  const [service, setService] = useSessionState<string>(`u:${userId}:guiones:service`, initialService || '')
  const [freeText, setFreeText] = useSessionState<string>(`u:${userId}:guiones:freeText`, initialTema || '')
  const [objective, setObjective] = useSessionState<Objective>(`u:${userId}:guiones:objective`, 'autoridad')
  const [ideas, setIdeas] = useSessionState<IdeaItem[]>(`u:${userId}:guiones:ideas`, [])
  const [selected, setSelected] = useSessionState<string[]>(`u:${userId}:guiones:selected`, [])
  const [scripts, setScripts] = useSessionState<GeneratedScript[]>(`u:${userId}:guiones:scripts`, [])
  const [savedTitles, setSavedTitles] = useSessionState<string[]>(`u:${userId}:guiones:savedTitles`, [])
  // Todo lo que se le ha PROPUESTO alguna vez: los packs nuevos nunca repiten
  // (regla: ideas siempre frescas — cada entrada a Guiones trae ideas nuevas).
  const [shownTitles, setShownTitles] = useSessionState<string[]>(`u:${userId}:guiones:shownTitles`, [])

  const [ideasLoading, setIdeasLoading] = useState(false)
  const [genQueue, setGenQueue] = useState<number | null>(null) // nº idea generándose (1-based)
  const [copied, setCopied] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [regenTick, setRegenTick] = useState(0)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const cancelRef = useRef(false)

  // Al ENTRAR a la sección: si quedó un pack de ideas viejo sin guiones, fuera —
  // los packs nunca se acumulan entre visitas (siempre nuevas al continuar).
  useEffect(() => {
    if (skipToObjective) return
    if ((step === 'ideas' || step === 'objective') && scripts.length === 0) {
      setStep('topic')
      setIdeas([])
      setSelected([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dictado por voz: habla la idea y el texto entra solo (Web Speech API).
  const dictate = useDictateText()
  const dictateToggle = () => {
    if (dictate.listening) dictate.stop()
    else dictate.start(chunk => setFreeText(prev => (prev ? `${prev} ${chunk}` : chunk)))
  }

  const topicService = service || freeText || 'General'
  // El tema es una idea propia (escrita o dictada) → guion DIRECTO, sin pack de ideas.
  const hasOwnIdea = freeText.trim().length > 0

  /** Genera (o amplía) el pack de ideas. NUNCA repite ni lo ya guardado en
   *  biblioteca (recentTitles) ni lo propuesto en visitas anteriores (shownTitles). */
  async function generateIdeas(more: boolean) {
    setIdeasLoading(true)
    const res = await generateReelIdeas({
      brandContext: brandContext || 'No hay contexto de marca disponible. Usa buenas prácticas del sector beauty premium en España.',
      count: 5,
      completedTitles: [...recentTitles, ...shownTitles, ...(more ? ideas.map(i => i.title) : [])],
    })
    const existing = new Set(ideas.map(i => i.title))
    const fresh = res.ideas.filter(i => !existing.has(i.title))
    setIdeas(prev => (more ? [...prev, ...fresh] : fresh))
    if (fresh.length > 0) setShownTitles(prev => [...new Set([...prev, ...fresh.map(i => i.title)])].slice(-300))
    setSelected(prev => (more ? prev : []))
    setIdeasLoading(false)
    setStep('ideas')
  }

  function toggleIdea(title: string) {
    setSelected(prev => (prev.includes(title) ? prev.filter(s => s !== title) : [...prev, title]))
  }

  /** Genera el guion completo de cada idea seleccionada, una a una (card en cuanto
   *  llega). Anti-repetición: cada guion recibe la lista de los YA escritos en la
   *  tanda (título + gancho) para que el siguiente sea claramente distinto. */
  async function generateScripts() {
    const chosen = ideas.filter(i => selected.includes(i.title))
    if (chosen.length === 0) return
    cancelRef.current = false
    setStep('scripts')
    const batch: Array<{ title: string; hook: string }> = scripts.map(s => ({ title: s.reel.title, hook: s.reel.script.hook }))
    for (let k = 0; k < chosen.length; k++) {
      if (cancelRef.current) break
      setGenQueue(k + 1)
      const idea = chosen[k]
      let { reel, mock } = await generateReelChecked(
        {
          service: idea.service || topicService,
          objective,
          brandContext,
          freeText: `IDEA: ${idea.title}\nÁNGULO DEL GANCHO: ${idea.hook_idea}`,
          avoidScripts: batch,
        },
        { seed: hashSeed(`${idea.title}|${idea.hook_idea}`) },
      )
      // Colisión (fallback con la misma variante): reintento con otro seed.
      if (batch.some(b => b.title.toLowerCase() === reel.title.toLowerCase())) {
        ;({ reel, mock } = await generateReelChecked(
          { service: idea.service || topicService, objective, brandContext, freeText: `IDEA: ${idea.title}\nÁNGULO DEL GANCHO: ${idea.hook_idea}`, avoidScripts: batch },
          { seed: hashSeed(`${idea.title}|${idea.hook_idea}`) + 7 },
        ))
      }
      batch.push({ title: reel.title, hook: reel.script.hook })
      setScripts(prev => (prev.some(s => s.idea.title === idea.title) ? prev : [...prev, { idea, reel, mock }]))
    }
    setGenQueue(null)
  }

  /** La estilista dictó/escribió SU idea → un guion DIRECTO sobre eso (sin pack de ideas). */
  async function generateDirectScript() {
    cancelRef.current = false
    setStep('scripts')
    setGenQueue(1)
    const t = freeText.trim()
    const idea: IdeaItem = {
      title: t.length > 64 ? `${t.slice(0, 61)}…` : t,
      type: 'reel',
      pillar: 'Tu idea',
      objective,
      service: service || 'General',
      hook_idea: t,
    }
    const { reel, mock } = await generateReelChecked(
      { service: service || 'General', objective, brandContext, freeText: t },
      { seed: hashSeed(`directa|${t}`) },
    )
    setScripts(prev => [...prev.filter(s => s.idea.title !== idea.title), { idea, reel, mock }])
    setGenQueue(null)
  }

  /** Regenera UN guion (la estilista no gusta): nuevo intento que no repite
   *  el ángulo/gancho de ningún guion ya escrito en la sección (incluido el propio). */
  async function regenerateOne(gen: GeneratedScript) {
    setRegenerating(gen.idea.title)
    const avoid = scripts
      .filter(s => s.idea.title !== gen.idea.title)
      .map(s => ({ title: s.reel.title, hook: s.reel.script.hook }))
    avoid.push({ title: gen.reel.title, hook: gen.reel.script.hook })
    setRegenTick(t => t + 1)
    const { reel, mock } = await generateReelChecked(
      {
        service: gen.idea.service || topicService,
        objective,
        brandContext,
        freeText: `IDEA: ${gen.idea.title}\nÁNGULO DEL GANCHO: ${gen.idea.hook_idea}`,
        avoidScripts: avoid,
      },
      { seed: hashSeed(`${gen.idea.title}|${gen.idea.hook_idea}`) + regenTick * 2 + 1 },
    )
    setScripts(prev => prev.map(s => (s.idea.title === gen.idea.title ? { ...s, reel, mock } : s)))
    setRegenerating(null)
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  /** Guarda UN guion en la biblioteca (status library) — cada card es independiente. */
  async function saveOne(gen: GeneratedScript) {
    setSaving(gen.idea.title)
    await saveToLibrary(userId, {
      type: 'reel',
      title: gen.reel.title,
      service: gen.idea.service || topicService,
      objective,
      content_json: gen.reel as unknown as Record<string, unknown>,
      caption_with_hashtags: gen.reel.captionWithHashtags || null,
      visual_idea: gen.reel.visualIdea || null,
      status: 'library' as const,
      format: 'reel',
      scheduled_date: null,
    }, isDemoMode)
    setSavedTitles(prev => [...prev, gen.idea.title])
    setSaving(null)
  }

  function recordOne(gen: GeneratedScript) {
    openTeleprompter(
      {
        script: composeReelSpokenScript(gen.reel.script),
        title: gen.reel.title,
        source: 'reel',
        returnUrl: '/crear-contenido',
      },
      router,
    )
  }

  function reset() {
    cancelRef.current = true
    clearSectionState(`u:${userId}:guiones`)
    setStep(skipToObjective ? 'objective' : 'topic')
    setIdeas([])
    setSelected([])
    setScripts([])
    setSavedTitles([])
    setService(initialService || '')
    setFreeText(initialTema || '')
    setGenQueue(null)
    setIdeasLoading(false)
  }

  /** Volver atrás conservando ideas/guiones ya generados. */
  function backToIdeas() {
    setStep('ideas')
  }

  const selectedCount = selected.length
  const pendingCount = selectedCount - scripts.filter(s => selected.includes(s.idea.title)).length

  function CopyBtn({ text, id, label = 'Copiar', dark = false }: { text: string; id: string; label?: string; dark?: boolean }) {
    const active = copied === id
    return (
      <button
        onClick={() => copyText(text, id)}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{
          background: dark ? (active ? '#7A1832' : 'rgba(255,255,255,0.15)') : active ? '#7A1832' : '#FFF1B5',
          color: active ? 'white' : dark ? 'white' : '#591427',
          border: dark ? '1.5px solid rgba(255,255,255,0.25)' : 'none',
        }}
      >
        {active ? <Check size={12} /> : <Copy size={12} />}
        {active ? '¡Copiado!' : label}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BraviGuide section="crear-contenido" size={64} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Guiones</h1>
          <p className="mt-1 text-sm" style={{ color: '#591427', opacity: 0.8 }}>De una idea a guiones de Reel listos para grabar</p>
        </div>
      </div>

      {/* Volver atrás / empezar de nuevo — arriba, siempre a mano */}
      {step !== 'topic' && (
        <div className="flex items-center gap-3">
          <button onClick={reset} className="btn-ghost text-xs">
            <RotateCcw size={13} /> Empezar de nuevo
          </button>
          {step === 'scripts' && (
            <button onClick={backToIdeas} className="btn-ghost text-xs">
              <ChevronLeft size={13} /> Ver ideas
            </button>
          )}
          {step === 'scripts' && genQueue && (
            <span className="text-xs font-semibold" style={{ color: '#591427' }}>
              Generando guion {genQueue} de {selectedCount}… (los demás quedan en cola)
            </span>
          )}
        </div>
      )}

      {/* Progreso */}
      {step !== 'topic' && (
        <div className="flex items-center gap-2">
          {STEPS.slice(1).map((s, i) => {
            const current = STEPS.slice(1).findIndex(x => x.id === step)
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: i <= current ? '#7A1832' : '#F5F0E8', color: i <= current ? 'white' : '#591427' }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-xs hidden sm:block" style={{ color: i <= current ? '#7A1832' : '#591427', opacity: i <= current ? 1 : 0.5 }}>{s.label}</span>
                </div>
                {i < STEPS.length - 2 && <div className="w-6 h-0.5" style={{ background: i < current ? '#7A1832' : '#F5F0E8' }} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Step 1: Tema */}
      {step === 'topic' && (
        <div className="space-y-4">
          <p className="font-semibold" style={{ color: '#1a1a1a' }}>¿Sobre qué quieres hablar?</p>
          <div>
            <p className="text-sm mb-2" style={{ color: '#591427', opacity: 0.7 }}>Selecciona un servicio:</p>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map(s => (
                <button
                  key={s}
                  onClick={() => setService(service === s ? '' : s)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ background: service === s ? '#7A1832' : '#F5F0E8', color: service === s ? 'white' : '#591427' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm mb-2" style={{ color: '#591427', opacity: 0.7 }}>O escribe tu idea (o dila a voz):</p>
            <div className="flex items-center gap-2">
              <input
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                placeholder={dictate.listening ? 'Escuchando…' : 'Ej: por qué el protector térmico es importante...'}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
              />
              {dictate.supported && (
                <button
                  onClick={dictateToggle}
                  className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 transition-all"
                  style={{
                    background: dictate.listening ? '#7A1832' : 'white',
                    border: dictate.listening ? 'none' : '1.5px solid rgba(122,24,50,0.2)',
                    boxShadow: dictate.listening ? '0 0 0 4px rgba(122,24,50,0.15)' : 'none',
                  }}
                  aria-label={dictate.listening ? 'Parar dictado por voz' : 'Dictar idea por voz'}
                  aria-pressed={dictate.listening}
                >
                  <Mic size={18} style={{ color: dictate.listening ? 'white' : '#7A1832' }} />
                </button>
              )}
            </div>
            {dictate.listening && (
              <p className="text-xs mt-1.5 font-semibold" style={{ color: '#7A1832' }}>
                <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: '#7A1832', animation: 'pulse 1.2s infinite' }} />
                Escuchando… habla y toca el micro al terminar.
              </p>
            )}
          </div>
          <button
            onClick={() => setStep('objective')}
            disabled={!service && !freeText}
            className="btn-primary w-full justify-center"
            style={{ opacity: !service && !freeText ? 0.5 : 1 }}
          >
            Continuar
          </button>
        </div>
      )}

      {/* Step 2: Objetivo → genera 5 ideas */}
      {step === 'objective' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>Sobre:</span>
            <span className="px-3 py-1 rounded-xl text-sm font-semibold" style={{ background: '#7A1832', color: 'white' }}>{service || freeText}</span>
            <span className="px-3 py-1 rounded-xl text-sm font-semibold" style={{ background: '#F5F0E8', color: '#591427' }}>Reel</span>
            {!skipToObjective && (
              <button onClick={() => setStep('topic')} className="text-xs underline" style={{ color: '#7A1832', opacity: 0.7 }}>Cambiar</button>
            )}
          </div>
          {initialContexto && (
            <div className="rounded-2xl p-3" style={{ background: 'var(--color-pastel-blue)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: '#2a5a6a', opacity: 0.7 }}>CONTEXTO SUGERIDO</p>
              <p className="text-sm" style={{ color: '#1a3a4a' }}>{initialContexto}</p>
            </div>
          )}
          <p className="font-semibold" style={{ color: '#1a1a1a' }}>¿Qué objetivo quieres conseguir?</p>
          <div className="space-y-3">
            {([
              ['autoridad', 'Autoridad', 'Posiciónate como experta con consejos y criterio profesional'],
              ['reservas', 'Reservas', 'Atrae clientas con transformaciones y casos reales'],
              ['visibilidad', 'Visibilidad', 'Llega a más personas con contenido atractivo y guardable'],
              ['educativo', 'Educativo', 'Enseña algo concreto y aporta valor real a tu clienta'],
              ['consejos', 'Consejos', 'Tips prácticos y fáciles de aplicar en casa'],
              ['venta', 'Venta', 'Invita a reservar o comprar de forma directa'],
            ] as const).map(([val, lbl, desc]) => (
              <button
                key={val}
                onClick={() => setObjective(val)}
                className="w-full text-left p-4 rounded-xl transition-all"
                style={{ background: objective === val ? '#7A1832' : '#F5F0E8', color: objective === val ? 'white' : '#591427' }}
              >
                <p className="font-semibold">{lbl}</p>
                <p className="text-xs mt-0.5 opacity-80">{desc}</p>
              </button>
            ))}
          </div>

          <UsarMiMarcaToggle
            enabled={useMiMarca}
            onChange={setUseMiMarca}
            disabled={ideasLoading}
            hasBrand={hasBrand}
          />

          <div className="flex gap-3">
            <button onClick={() => setStep('topic')} className="btn-ghost">Atrás</button>
            {hasOwnIdea ? (
              // Idea propia (dictada/escrita) → GUION DIRECTO sobre eso, sin pack de ideas
              <button
                onClick={generateDirectScript}
                disabled={genQueue !== null}
                className="btn-primary flex-1 justify-center"
              >
                {genQueue !== null ? 'Escribiendo tu guion…' : 'Generar mi guion ✨'}
              </button>
            ) : (
              <button onClick={() => generateIdeas(false)} disabled={ideasLoading} className="btn-primary flex-1 justify-center">
                {ideasLoading ? 'Creando 5 ideas...' : 'Generar 5 ideas ✨'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Ideas — elige tus favoritas */}
      {step === 'ideas' && (
        <div className="space-y-4">
          <div>
            <p className="font-semibold" style={{ color: '#1a1a1a' }}>5 ideas de Reel para tu salón</p>
            <p className="text-sm mt-0.5" style={{ color: '#591427', opacity: 0.7 }}>Toca las que más te gusten (puedes elegir varias) y te genero el guion completo de cada una.</p>
          </div>
          {ideasLoading && <IdeaSkeleton />}
          {!ideasLoading && ideas.length === 0 && (
            <p className="text-sm" style={{ color: '#591427', opacity: 0.7 }}>
              No hay ideas en pantalla — genera un pack nuevo (siempre traerá ideas que no has visto antes).
            </p>
          )}
          <div className="space-y-2.5">
            {ideas.map(idea => {
              const active = selected.includes(idea.title)
              return (
                <button
                  key={idea.title}
                  onClick={() => toggleIdea(idea.title)}
                  className="w-full text-left p-4 rounded-2xl transition-all"
                  style={{
                    background: active ? 'rgba(122,24,50,0.06)' : 'white',
                    border: active ? '2px solid #7A1832' : '1.5px solid rgba(255,241,181,0.8)',
                    boxShadow: active ? '0 2px 12px rgba(122,24,50,0.12)' : '0 2px 12px rgba(90,20,39,0.07)',
                  }}
                  aria-pressed={active}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>{idea.title}</p>
                      <p className="text-xs mt-1" style={{ color: '#591427', opacity: 0.75 }}>Gancho: {idea.hook_idea}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#591427' }}>{idea.service}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#591427' }}>{idea.pillar}</span>
                      </div>
                    </div>
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: active ? '#7A1832' : 'white', border: active ? 'none' : '1.5px solid rgba(122,24,50,0.25)' }}
                    >
                      {active ? <Check size={13} className="text-white" /> : <Plus size={13} style={{ color: 'rgba(122,24,50,0.4)' }} />}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => generateIdeas(true)} disabled={ideasLoading} className="btn-ghost text-sm">
              <RefreshCw size={14} className={ideasLoading ? 'animate-spin' : ''} /> {ideas.length === 0 ? 'Generar ideas' : 'Más ideas'}
            </button>
            <button
              onClick={generateScripts}
              disabled={selectedCount === 0}
              className="btn-primary flex-1 justify-center"
              style={{ opacity: selectedCount === 0 ? 0.5 : 1 }}
            >
              <Sparkles size={15} /> Generar {selectedCount || ''} guion{selectedCount === 1 ? '' : 'es'} completos
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Guiones completos — guardar / grabar / copiar, uno por idea.
          Se listan: los ya generados (incluida la idea dictada directa) + los
          pendientes del pack que siguen en cola. */}
      {step === 'scripts' && (
        <div className="space-y-5">
          {[
            ...scripts.map(gen => ({ idea: gen.idea, gen: gen as GeneratedScript | null })),
            ...ideas
              .filter(i => selected.includes(i.title) && !scripts.some(s => s.idea.title === i.title))
              .map(idea => ({ idea, gen: null as GeneratedScript | null })),
          ].map(card => {
            if (!card.gen) return <ScriptLoadingCard key={card.idea.title} idea={card.idea} />
            const gen = card.gen
            return (
              <ScriptCard
                key={card.idea.title}
                gen={gen}
                saved={savedTitles.includes(card.idea.title)}
                saving={saving === card.idea.title}
                onSave={() => saveOne(gen)}
                onRecord={() => recordOne(gen)}
                onRegen={() => regenerateOne(gen)}
                regenerating={regenerating === card.idea.title}
                CopyBtn={CopyBtn}
              />
            )
          })}
          {genQueue === null && (
            <div className="flex flex-wrap gap-3">
              <button onClick={reset} className="btn-ghost text-sm">
                <RotateCcw size={14} /> Empezar de nuevo
              </button>
              <Link href="/biblioteca" className="btn-secondary text-sm">
                <BookOpen size={14} /> Ver biblioteca
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IdeaSkeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2].map(i => (
        <div key={i} className="p-4 rounded-2xl" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.6)' }}>
          <div className="h-4 w-3/4 rounded" style={{ background: '#F5F0E8', opacity: 0.8 }} />
          <div className="h-3 w-1/2 rounded mt-2" style={{ background: '#F5F0E8', opacity: 0.6 }} />
        </div>
      ))}
      <p className="text-center text-xs font-semibold" style={{ color: '#591427', opacity: 0.7 }}>Pensando ideas para tu salón…</p>
    </div>
  )
}

function ScriptLoadingCard({ idea }: { idea: IdeaItem }) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.6)' }}>
      <div className="flex items-center gap-2">
        <RefreshCw size={14} className="animate-spin" style={{ color: '#7A1832' }} />
        <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>{idea.title}</p>
      </div>
      <p className="text-xs mt-1" style={{ color: '#591427', opacity: 0.7 }}>Escribiendo tu guion…</p>
      <div className="space-y-2 mt-4">
        {[90, 75, 85].map((w, i) => (
          <div key={i} className="h-3 rounded" style={{ width: `${w}%`, background: '#F5F0E8', opacity: 0.7 }} />
        ))}
      </div>
    </div>
  )
}

function ScriptCard({
  gen, saved, saving, onSave, onRecord, onRegen, regenerating, CopyBtn,
}: {
  gen: GeneratedScript
  saved: boolean
  saving: boolean
  onSave: () => void
  onRecord: () => void
  onRegen: () => void
  regenerating: boolean
  CopyBtn: React.ComponentType<{ text: string; id: string; label?: string; dark?: boolean }>
}) {
  const { reel } = gen
  const fullScript = `GANCHO:\n${reel.script.hook}\n\nCONTEXTO:\n${reel.script.context}\n\nSOLUCIÓN:\n${reel.script.solution}\n\nCTA:\n${reel.script.cta}`

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
      <div className="p-5" style={{ background: 'rgba(255,241,181,0.35)' }}>
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-lg leading-snug" style={{ color: '#1a1a1a' }}>{reel.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#7A1832', color: 'white' }}>{gen.idea.service}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'white', color: '#591427' }}>Reel · {gen.idea.pillar}</span>
          {gen.mock && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(122,24,50,0.08)', color: '#591427' }}>
              Ejemplo — IA no disponible
            </span>
          )}
        </div>
        <p className="text-sm mt-2" style={{ color: '#591427', opacity: 0.75 }}>Portada: <strong>{reel.coverText}</strong></p>
      </div>

      {/* Guion */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'rgba(255,241,181,0.5)' }}>
        <p className="font-semibold text-sm" style={{ color: '#1a1a1a' }}>Guion BRÄVE</p>
        <CopyBtn text={fullScript} id={`${reel.title}-script`} label="Copiar guion" />
      </div>
      {([
        ['GANCHO', reel.script.hook, '#7A1832'],
        ['CONTEXTO', reel.script.context, '#591427'],
        ['SOLUCIÓN', reel.script.solution, '#2a5a6a'],
        ['CTA', reel.script.cta, '#7a6000'],
      ] as const).map(([label, text, color]) => (
        <div key={label} className="px-5 py-3.5 border-b" style={{ borderColor: 'rgba(255,241,181,0.3)' }}>
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(122,24,50,0.08)', color }}>
            {label}
          </span>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: '#1a1a1a' }}>{text}</p>
        </div>
      ))}

      {/* Idea visual + caption */}
      <div className="px-5 py-3.5" style={{ background: '#C1DBE8' }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#2a5a6a', opacity: 0.7 }}>IDEA VISUAL</p>
        <p className="text-sm mt-1" style={{ color: '#1a3a4a' }}>{reel.visualIdea}</p>
      </div>
      <div className="px-5 py-3.5 border-b" style={{ borderColor: 'rgba(255,241,181,0.3)' }}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>PUBLICACIÓN IG</p>
          <CopyBtn text={reel.captionWithHashtags} id={`${reel.title}-caption`} label="Copiar" />
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#1a1a1a' }}>{reel.captionWithHashtags}</p>
      </div>

      {/* Actions — cada guion tiene su botón claro en la base de la card */}
      <div className="px-5 py-4 flex flex-wrap items-center gap-2">
        <button onClick={onSave} disabled={saving || saved} className="btn-primary text-sm">
          <BookOpen size={15} /> {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar en biblioteca'}
        </button>
        <button onClick={onRecord} className="btn-secondary text-sm">
          <Clapperboard size={15} /> Grabar con teleprompter
        </button>
        <button onClick={onRegen} disabled={regenerating} className="btn-secondary text-sm">
          <RefreshCw size={15} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Reescribiendo…' : 'Regenerar'}
        </button>
        {saved && (
          <Link href="/biblioteca" className="text-xs font-semibold" style={{ color: '#7A1832' }}>
            Ver en biblioteca →
          </Link>
        )}
      </div>
    </div>
  )
}