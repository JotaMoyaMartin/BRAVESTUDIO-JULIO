'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { saveToLibrary } from '@/lib/content-utils'
import AddToPlanButton from '@/components/plan/AddToPlanButton'
import { ContentObjective } from '@/lib/ai/prompts/reels'
import {
  STRUCTURES, HOOK_TYPE_LABEL, HOOK_GOAL_LABEL, structuresFor,
  generateHooks, generateGuion, guionToText, guionSpoken,
  HookOption, Understanding, GuionOutput, StructureId,
} from '@/lib/ai/prompts/guiones'
import { useDictateText } from '@/lib/speech'
import { useVoiceNote, formatSeconds, VoiceNoteError } from '@/lib/voice-note'
import { useSessionState, clearSectionState } from '@/lib/session-store'
import { useToast } from '@/components/ui/Toast'
import { buildBrandFullContext, hasBrandContext, BrandFullContextInput } from '@/lib/ai/brand-context'
import { openTeleprompter } from '@/lib/teleprompter/input'
import UsarMiMarcaToggle from '@/components/ui/UsarMiMarcaToggle'
import BraviGuide from '@/components/bravi/BraviGuide'
import {
  Copy, BookOpen, RefreshCw, Check, ChevronLeft, Clapperboard, RotateCcw, Sparkles, Mic,
  Square, X, Camera, Type, Lightbulb, ArrowRight, Pencil, Clock, Loader2,
} from 'lucide-react'

const SERVICES: Array<{ id: string; emoji: string }> = [
  { id: 'Balayage', emoji: '🌅' },
  { id: 'Rubios', emoji: '✨' },
  { id: 'Mechas', emoji: '🎀' },
  { id: 'Canas', emoji: '🤍' },
  { id: 'Color', emoji: '🎨' },
  { id: 'Corte', emoji: '✂️' },
  { id: 'Alisados', emoji: '🌊' },
  { id: 'Keratina', emoji: '💎' },
  { id: 'Tratamientos', emoji: '💧' },
  { id: 'Peinados', emoji: '👰' },
]

type Step = 'topic' | 'hooks' | 'script'

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'topic', label: 'Tema' },
  { id: 'hooks', label: 'Gancho' },
  { id: 'script', label: 'Guion' },
]

// Títulos con la sans de la marca (Poppins): Jota pidió letra fácil de leer, sin serifas con adornos.
const TITLE = { fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em' }

interface CurrentGuion {
  guion: GuionOutput
  hook: HookOption
  mock: boolean
}

// Sección CREAR GUIONES — de un tema (servicio o idea propia escrita/hablada)
// a un guion de Reel con valor: la IA entiende la idea → 5 ganchos de tipos
// distintos → eliges uno → guion completo con la estructura que mejor encaja.
// (La ruta sigue siendo /crear-contenido por enlaces existentes.)
export default function CrearContenidoClient({
  userId,
  brandFull,
  initialService,
  initialTema,
  initialContexto,
  autoStart = false,
  recentTitles = [],
}: {
  userId: string
  brandFull: BrandFullContextInput | null
  initialService?: string | null
  initialTema?: string | null
  initialContexto?: string | null
  /** Viene de Reels virales con la idea escrita: salta directo a los ganchos. */
  autoStart?: boolean
  recentTitles?: string[]
}) {
  const isDemoMode = userId === 'demo'
  const router = useRouter()
  const { show: showToast } = useToast()
  const hasBrand = hasBrandContext(brandFull)
  const k = `u:${userId}:guiones2`
  const [useMiMarca, setUseMiMarca] = useSessionState<boolean>(`${k}:useMiMarca`, hasBrand)

  const brandContext = useMemo(() => {
    if (!useMiMarca || !brandFull) return undefined
    return buildBrandFullContext(brandFull) || undefined
  }, [useMiMarca, brandFull])

  const [step, setStep] = useSessionState<Step>(`${k}:step`, 'topic')
  const [service, setService] = useSessionState<string>(`${k}:service`, initialService || '')
  const [idea, setIdea] = useSessionState<string>(`${k}:idea`, [initialTema, initialContexto].filter(Boolean).join('. '))
  const [understanding, setUnderstanding] = useSessionState<Understanding | null>(`${k}:understanding`, null)
  const [hooks, setHooks] = useSessionState<HookOption[]>(`${k}:hooks`, [])
  const [hooksMock, setHooksMock] = useSessionState<boolean>(`${k}:hooksMock`, false)
  const [pickedHook, setPickedHook] = useSessionState<number | null>(`${k}:picked`, null)
  const [current, setCurrent] = useSessionState<CurrentGuion | null>(`${k}:current`, null)
  const [savedTitles, setSavedTitles] = useSessionState<string[]>(`${k}:saved`, [])
  // Todo lo propuesto alguna vez (ganchos y guiones): nunca se repite.
  const [shownHooks, setShownHooks] = useSessionState<string[]>(`${k}:shownHooks`, [])
  const [written, setWritten] = useSessionState<Array<{ title: string; hook: string }>>(`${k}:written`, [])

  const [hooksLoading, setHooksLoading] = useState(false)
  const [writing, setWriting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  // El estado guardado (localStorage) solo existe en el navegador: se pinta tras
  // montar para que servidor y navegador no discrepen (error de hidratación).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Si se entra con un tema nuevo desde otra sección (Inicio, Sorpréndeme),
  // se empieza limpio en el paso 1 con ese tema.
  useEffect(() => {
    if (initialService || initialTema) {
      const incoming = [initialTema, initialContexto].filter(Boolean).join('. ')
      setIdea(incoming)
      setService(initialService || '')
      setStep('topic')
      setHooks([])
      setCurrent(null)
      setPickedHook(null)
      if (autoStart && incoming) loadHooks(false, incoming)
    } else if (step === 'hooks' && hooks.length === 0) {
      // Se salió mientras se generaban los ganchos: vuelve al tema, no a un paso vacío.
      setStep('topic')
    } else if (step === 'script' && !current) {
      setStep(hooks.length ? 'hooks' : 'topic')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cada paso empieza arriba (en móvil, si no, aterrizas a media lista).
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const topicLabel = service || 'General'
  const hasIdea = idea.trim().length > 0
  const canContinue = !!service || hasIdea

  // ── Voz: nota de voz (Whisper) con caída al dictado del navegador ──
  const dictate = useDictateText()
  const [useDictationFallback, setUseDictationFallback] = useState(false)
  const appendIdea = (t: string) => setIdea(prev => (prev.trim() ? `${prev.trim()} ${t}` : t))
  const voice = useVoiceNote(appendIdea, (e: VoiceNoteError) => {
    if (e === 'no_key' || e === 'unsupported') {
      if (dictate.supported) {
        setUseDictationFallback(true)
        showToast('Uso el dictado del móvil: toca el micro y habla.', 'info')
      } else {
        showToast('La nota de voz aún no está activada. Escribe tu idea, por favor.', 'info')
      }
    } else if (e === 'no_permission') {
      showToast('Necesito permiso para usar el micrófono. Actívalo en el navegador.', 'info')
    } else if (e === 'no_speech') {
      showToast('No te he oído bien. Prueba otra vez, más cerca del móvil.', 'info')
    } else {
      showToast('No he podido pasar tu voz a texto. Prueba otra vez.', 'info')
    }
  })
  function onMic() {
    if (useDictationFallback) {
      if (dictate.listening) dictate.stop()
      else dictate.start(appendIdea)
      return
    }
    if (voice.state === 'recording') voice.stop()
    else voice.start()
  }

  // ── Ganchos ──
  async function loadHooks(more: boolean, ideaOverride?: string) {
    const ideaText = (ideaOverride ?? idea).trim()
    setHooksLoading(true)
    setStep('hooks')
    if (!more) { setPickedHook(null); setHooks([]) }
    const res = await generateHooks({
      service: topicLabel,
      idea: ideaText || undefined,
      brandContext,
      avoid: [...shownHooks, ...(more ? hooks.map(h => h.text) : [])],
      recentTitles,
      understanding: more ? understanding || undefined : undefined,
    })
    setUnderstanding(res.understanding)
    setHooks(res.hooks)
    setHooksMock(res.mock)
    setPickedHook(null)
    if (!res.mock) setShownHooks(prev => [...prev, ...res.hooks.map(h => h.text)].slice(-120))
    setHooksLoading(false)
  }

  // ── Guion ──
  async function writeScript(hook: HookOption, structure: StructureId) {
    setWriting(true)
    setStep('script')
    const { guion, mock } = await generateGuion({
      service: topicLabel,
      objective: hook.goal ?? 'autoridad',
      hook,
      structure,
      idea: idea.trim() || undefined,
      understanding: understanding || undefined,
      brandContext,
      avoid: written.slice(-6),
    })
    setCurrent({ guion, hook, mock })
    if (!mock) setWritten(prev => [...prev, { title: guion.title, hook: guion.script.hook }].slice(-20))
    setWriting(false)
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(key)
        setTimeout(() => setCopied(null), 2000)
      })
      .catch(() => showToast('No se pudo copiar. Selecciónalo y cópialo a mano.', 'info'))
  }

  async function save() {
    if (!current || saving) return
    setSaving(true)
    const g = current.guion
    const ok = await saveToLibrary(userId, {
      type: 'reel',
      title: g.title,
      service: topicLabel,
      objective: current.hook.goal ?? 'autoridad',
      content_json: g as unknown as Record<string, unknown>,
      caption_with_hashtags: g.captionWithHashtags || null,
      visual_idea: g.visualIdea || null,
      status: 'library' as const,
      format: 'reel',
      scheduled_date: null,
    }, isDemoMode)
    setSaving(false)
    // La pantalla nunca miente: «Guardado» solo cuando el insert lo confirmó.
    if (!ok) {
      showToast('No se pudo guardar en tu biblioteca. Intenta de nuevo.', 'info')
      return
    }
    setSavedTitles(prev => [...prev, g.title])
    showToast('Guion guardado en tu biblioteca ✓', 'success')
  }

  function record() {
    if (!current) return
    openTeleprompter(
      { script: guionSpoken(current.guion), title: current.guion.title, source: 'reel', returnUrl: '/crear-contenido' },
      router,
    )
  }

  function reset() {
    clearSectionState(k)
    setStep('topic')
    setService('')
    setIdea('')
    setUnderstanding(null)
    setHooks([])
    setPickedHook(null)
    setCurrent(null)
    setSavedTitles([])
  }

  if (!mounted) return <LoadingCards label="Cargando…" big />

  const stepIndex = STEPS.findIndex(s => s.id === step)
  const canGoTo = (s: Step) => s === 'topic' || (s === 'hooks' && hooks.length > 0) || (s === 'script' && !!current)

  return (
    <div className="space-y-6 pb-4">
      {/* Cabecera */}
      <div className="flex items-center gap-4">
        {/* En móvil Bravi se oculta: el título y la acción mandan en pantalla pequeña. */}
        <div className="hidden sm:block flex-shrink-0 max-w-[220px]">
          <BraviGuide section="crear-contenido" size={56} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl leading-tight text-cherry-dark" style={{ ...TITLE, fontWeight: 600 }}>Crear guiones</h1>
          <p className="mt-1 text-sm text-cherry-dark/75">Cuéntame de qué quieres hablar y te escribo un Reel listo para grabar.</p>
        </div>
      </div>

      {/* Pasos */}
      <nav aria-label="Pasos" className="flex items-center gap-1.5 sm:gap-2">
        {STEPS.map((s, i) => {
          const done = i < stepIndex
          const active = i === stepIndex
          const clickable = !active && canGoTo(s.id) && !hooksLoading && !writing
          return (
            <div key={s.id} className="flex items-center gap-1.5 sm:gap-2 flex-1 last:flex-none">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && setStep(s.id)}
                className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition-all ${active ? 'bg-cherry text-white shadow-md' : done ? 'bg-buttermilk text-cherry-dark' : 'bg-warm-gray text-cherry-dark/50'} ${clickable ? 'cursor-pointer hover:scale-[1.03]' : 'cursor-default'}`}
                aria-current={active ? 'step' : undefined}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-white text-cherry' : done ? 'bg-cherry text-white' : 'bg-white/70'}`}>
                  {done ? <Check size={13} /> : i + 1}
                </span>
                <span className="text-xs sm:text-sm font-semibold">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded-full ${done ? 'bg-cherry' : 'bg-warm-gray'}`} />}
            </div>
          )
        })}
      </nav>

      <AnimatePresence mode="wait">
        {/* ───────────── PASO 1 · TEMA ───────────── */}
        {step === 'topic' && (
          <motion.div key="topic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-5">
            {/* Tu idea */}
            <section className="card p-4 sm:p-5 space-y-3">
              <div>
                <h2 className="text-lg text-ink" style={{ ...TITLE, fontWeight: 600 }}>¿Qué quieres contar?</h2>
                <p className="text-sm text-cherry-dark/70">Escríbelo o mándame una nota de voz, como si se lo contaras a una amiga. Cuanto más detalle, mejor guion.</p>
              </div>
              <div className="relative">
                <textarea
                  value={idea}
                  onChange={e => setIdea(e.target.value)}
                  rows={4}
                  placeholder={voice.state === 'recording' || dictate.listening ? 'Te escucho…' : 'Ej: muchas clientas me piden rubio platino en una sesión y les explico por qué es mejor hacerlo en dos, para no romper el pelo…'}
                  className="w-full px-4 py-3 rounded-2xl text-[15px] leading-relaxed outline-none resize-none bg-cream border-[1.5px] border-cherry/15 focus:border-cherry/50 transition-colors"
                />
                {hasIdea && (
                  <button onClick={() => setIdea('')} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-warm-gray text-cherry-dark/60 flex items-center justify-center hover:bg-cherry/10" aria-label="Borrar texto">
                    <X size={14} />
                  </button>
                )}
              </div>
              <VoiceButton
                state={useDictationFallback ? (dictate.listening ? 'recording' : 'idle') : voice.state}
                seconds={useDictationFallback ? null : voice.seconds}
                level={voice.level}
                onPress={onMic}
                onCancel={useDictationFallback ? undefined : voice.cancel}
              />
            </section>

            {/* Servicio */}
            <section className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg text-ink" style={{ ...TITLE, fontWeight: 600 }}>{hasIdea ? '¿De qué servicio va?' : 'O elige un servicio'}</h2>
                <span className="text-xs text-cherry-dark/50">{hasIdea ? 'Opcional' : 'Y te propongo ideas'}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {SERVICES.map(s => {
                  const on = service === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => setService(on ? '' : s.id)}
                      aria-pressed={on}
                      className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl text-left text-sm font-semibold transition-all border-[1.5px] ${on ? 'bg-cherry text-white border-cherry shadow-md scale-[1.02]' : 'bg-white text-cherry-dark border-buttermilk hover:border-cherry/30 hover:-translate-y-0.5'}`}
                    >
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${on ? 'bg-white/20' : 'bg-warm-light'}`}>{s.emoji}</span>
                      {s.id}
                    </button>
                  )
                })}
              </div>
            </section>

            <UsarMiMarcaToggle enabled={useMiMarca} onChange={setUseMiMarca} disabled={hooksLoading} hasBrand={hasBrand} />

            <StickyBar>
              <button
                onClick={() => loadHooks(false)}
                disabled={!canContinue || voice.state !== 'idle'}
                className="btn-primary w-full justify-center py-3.5 text-base"
              >
                <Sparkles size={17} /> {canContinue ? 'Ver ganchos para mi Reel' : 'Escribe tu idea o elige un servicio'}
              </button>
            </StickyBar>
          </motion.div>
        )}

        {/* ───────────── PASO 2 · GANCHOS ───────────── */}
        {step === 'hooks' && (
          <motion.div key="hooks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-4">
            {hooksMock && !hooksLoading && <MockNotice />}

            {/* Lo que he entendido */}
            {hasIdea && understanding && !hooksLoading && (
              <section className="rounded-3xl p-4 sm:p-5 bg-pastel-blue/45 border-[1.5px] border-pastel-blue">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-cherry-dark/60">Esto es lo que he entendido</p>
                  <button onClick={() => setStep('topic')} className="flex items-center gap-1 text-xs font-semibold text-cherry hover:underline flex-shrink-0">
                    <Pencil size={12} /> Corregir
                  </button>
                </div>
                <p className="mt-1.5 text-base text-ink font-semibold leading-snug">{understanding.tema}</p>
                {understanding.mensaje && <p className="mt-1 text-sm text-ink/80">{understanding.mensaje}</p>}
                {understanding.detalles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {understanding.detalles.map(d => (
                      <span key={d} className="text-xs px-2.5 py-1 rounded-full bg-white/80 text-cherry-dark">{d}</span>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div>
              <h2 className="text-xl text-ink" style={{ ...TITLE, fontWeight: 600 }}>Elige cómo empieza tu Reel</h2>
              <p className="text-sm text-cherry-dark/70 mt-0.5">Los 3 primeros segundos deciden si se quedan a verlo. Toca el que más te guste.</p>
            </div>

            {hooksLoading ? (
              <LoadingCards label={hasIdea ? 'Leyendo tu idea y pensando ganchos…' : 'Pensando ganchos para tu salón…'} />
            ) : (
              <div className="space-y-2.5" role="radiogroup" aria-label="Ganchos">
                {hooks.map((h, i) => {
                  const on = pickedHook === i
                  return (
                    <motion.button
                      key={h.text}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setPickedHook(i)}
                      role="radio"
                      aria-checked={on}
                      className={`w-full text-left p-4 sm:p-5 rounded-3xl transition-all border-2 ${on ? 'bg-white border-cherry shadow-lg' : 'bg-white border-transparent shadow-sm hover:shadow-md hover:-translate-y-0.5'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${on ? 'bg-cherry border-cherry' : 'border-cherry/25'}`}>
                          {on && <Check size={13} className="text-white" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full bg-burdeos text-crema">{HOOK_GOAL_LABEL[h.goal] ?? HOOK_GOAL_LABEL.autoridad}</span>
                            <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full bg-buttermilk text-cherry-dark">{HOOK_TYPE_LABEL[h.type]}</span>
                          </div>
                          <p className="mt-2 text-[17px] leading-snug text-ink" style={{ ...TITLE, fontWeight: 500 }}>«{h.text}»</p>
                          {h.angle && <p className="mt-1.5 text-sm text-cherry-dark/70">{h.angle}</p>}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}

            {!hooksLoading && (
              <button onClick={() => loadHooks(true)} className="btn-ghost w-full justify-center text-sm">
                <RefreshCw size={14} /> Otros 5 ganchos diferentes
              </button>
            )}

            <StickyBar>
              <div className="flex gap-2">
                <button onClick={() => setStep('topic')} className="btn-ghost px-4" aria-label="Volver al tema">
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => pickedHook !== null && writeScript(hooks[pickedHook], hooks[pickedHook].structure)}
                  disabled={pickedHook === null || hooksLoading}
                  className="btn-primary flex-1 justify-center py-3.5 text-base"
                >
                  <Sparkles size={17} /> {pickedHook === null ? 'Elige un gancho' : 'Escribir mi guion'}
                </button>
              </div>
            </StickyBar>
          </motion.div>
        )}

        {/* ───────────── PASO 3 · GUION ───────────── */}
        {step === 'script' && (
          <motion.div key="script" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-4">
            {writing || !current ? (
              <LoadingCards label="Escribiendo tu guion…" big />
            ) : (
              <>
                {current.mock && <MockNotice />}
                <ScriptView
                  current={current}
                  service={topicLabel}
                  copied={copied}
                  onCopy={copyText}
                />

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => writeScript(current.hook, otherStructure(current.hook.goal ?? 'autoridad', current.guion.structure))} className="btn-ghost justify-center text-sm">
                    <RefreshCw size={14} /> Otra versión
                  </button>
                  <button onClick={() => setStep('hooks')} className="btn-ghost justify-center text-sm">
                    <ChevronLeft size={14} /> Otro gancho
                  </button>
                  <AddToPlanButton
                    userId={userId}
                    status="idea"
                    className="btn-ghost justify-center text-sm col-span-2"
                    label="Añadir a mi plan (elige el día)"
                    getPayload={() => ({
                      type: 'reel', title: current.guion.title, service: topicLabel,
                      content_json: current.guion as unknown as Record<string, unknown>,
                      caption_with_hashtags: current.guion.captionWithHashtags || null,
                      visual_idea: current.guion.visualIdea || null, format: 'reel',
                    })}
                  />
                  <button onClick={reset} className="btn-ghost justify-center text-sm col-span-2">
                    <RotateCcw size={14} /> Empezar un guion nuevo
                  </button>
                </div>

                <StickyBar>
                  <div className="flex gap-2">
                    <button
                      onClick={save}
                      disabled={saving || savedTitles.includes(current.guion.title)}
                      className="btn-secondary flex-1 justify-center py-3.5"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : savedTitles.includes(current.guion.title) ? <Check size={16} /> : <BookOpen size={16} />}
                      {saving ? 'Guardando…' : savedTitles.includes(current.guion.title) ? 'Guardado' : 'Guardar'}
                    </button>
                    <button onClick={record} className="btn-primary flex-[1.4] justify-center py-3.5">
                      <Clapperboard size={16} /> Grabar ahora
                    </button>
                  </div>
                  {savedTitles.includes(current.guion.title) && (
                    <Link href="/biblioteca" className="block text-center text-xs font-semibold text-cherry mt-2">Ver en mi biblioteca →</Link>
                  )}
                </StickyBar>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** «Otra versión»: mismo gancho contado con otra estructura (la alumna no elige
 *  estructuras — BRÄVE decide; así la nueva versión se nota distinta de verdad). */
function otherStructure(objective: ContentObjective, currentId: StructureId): StructureId {
  const pool = [...structuresFor(objective), ...STRUCTURES.map(s => s.id)].filter((id, i, a) => a.indexOf(id) === i && id !== currentId)
  return pool[Math.floor(Math.random() * Math.min(4, pool.length))]
}

/** Barra de acción: pegada abajo en móvil (siempre a mano con el pulgar), normal en ordenador. */
function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-cream via-cream/95 to-cream/0 md:static md:mx-0 md:px-0 md:pb-0 md:bg-none">
      {children}
    </div>
  )
}

function VoiceButton({
  state, seconds, level, onPress, onCancel,
}: {
  state: 'idle' | 'recording' | 'transcribing'
  seconds: number | null
  level: number
  onPress: () => void
  onCancel?: () => void
}) {
  if (state === 'transcribing') {
    return (
      <div className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-buttermilk text-cherry-dark text-sm font-semibold">
        <Loader2 size={18} className="animate-spin" /> Pasando tu voz a texto…
      </div>
    )
  }
  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onPress}
          className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl bg-cherry text-white shadow-lg"
          aria-label="Terminar nota de voz"
        >
          <span className="relative w-9 h-9 flex items-center justify-center flex-shrink-0">
            <span className="absolute inset-0 rounded-full bg-white/25 transition-transform duration-100" style={{ transform: `scale(${1 + level * 0.6})` }} />
            <span className="relative w-9 h-9 rounded-full bg-white flex items-center justify-center"><Square size={13} className="text-cherry" fill="currentColor" /></span>
          </span>
          <span className="flex-1 text-left">
            <span className="block text-sm font-bold">Te escucho… toca para terminar</span>
            <span className="block text-xs opacity-80">{seconds !== null ? formatSeconds(seconds) : 'Habla con calma'}</span>
          </span>
          <span className="flex items-end gap-0.5 h-5" aria-hidden>
            {[0.5, 0.9, 0.6, 1, 0.7].map((m, i) => (
              <span key={i} className="w-1 rounded-full bg-white/80 transition-all duration-100" style={{ height: `${Math.max(18, Math.min(100, level * 100 * m + 18))}%` }} />
            ))}
          </span>
        </button>
        {onCancel && (
          <button onClick={onCancel} className="w-12 h-12 rounded-2xl bg-warm-gray text-cherry-dark flex items-center justify-center flex-shrink-0" aria-label="Descartar nota de voz">
            <X size={18} />
          </button>
        )}
      </div>
    )
  }
  return (
    <button
      onClick={onPress}
      className="group w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-[1.5px] border-dashed border-cherry/30 hover:border-cherry hover:bg-cherry/5 transition-all"
    >
      <span className="w-9 h-9 rounded-full bg-cherry text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <Mic size={17} />
      </span>
      <span className="text-left">
        <span className="block text-sm font-bold text-cherry-dark">Mandar nota de voz</span>
        <span className="block text-xs text-cherry-dark/60">Toca, habla y te lo paso a texto</span>
      </span>
    </button>
  )
}

function ScriptView({
  current, service, copied, onCopy,
}: {
  current: CurrentGuion
  service: string
  copied: string | null
  onCopy: (text: string, key: string) => void
}) {
  const g = current.guion
  return (
    <article className="rounded-3xl overflow-hidden bg-white shadow-[var(--shadow-medium)] border border-buttermilk">
      {/* Portada */}
      <header className="p-5 sm:p-6 bg-gradient-to-br from-buttermilk/70 to-warm-light">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cherry text-white">{service}</span>
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-cherry-dark"><Clock size={11} /> ~{g.seconds} s</span>
        </div>
        <h2 className="mt-3 text-2xl leading-tight text-ink" style={{ ...TITLE, fontWeight: 600 }}>{g.title}</h2>
        {g.whyItWorks && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-cherry-dark/80"><Lightbulb size={15} className="mt-0.5 flex-shrink-0 text-cherry" /> {g.whyItWorks}</p>
        )}
      </header>

      {/* Copiar todo */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-b border-buttermilk/70">
        <p className="text-sm font-semibold text-ink">Tu guion</p>
        <CopyBtn active={copied === 'script'} onClick={() => onCopy(guionToText(g), 'script')} label="Copiar guion" />
      </div>

      <ol className="px-5 sm:px-6 py-4 space-y-4">
        {/* Gancho */}
        <li className="rounded-2xl p-4 bg-cherry text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">Gancho · primeros 3 segundos</p>
          <p className="mt-1.5 text-lg leading-snug" style={{ ...TITLE, fontWeight: 500 }}>{g.script.hook}</p>
          <div className="mt-3 grid sm:grid-cols-2 gap-2">
            {g.hookOnScreen && (
              <p className="flex items-start gap-1.5 text-xs bg-white/12 rounded-xl px-2.5 py-2"><Type size={13} className="mt-px flex-shrink-0 opacity-80" /><span><b>En pantalla:</b> {g.hookOnScreen}</span></p>
            )}
            {g.hookVisual && (
              <p className="flex items-start gap-1.5 text-xs bg-white/12 rounded-xl px-2.5 py-2"><Camera size={13} className="mt-px flex-shrink-0 opacity-80" /><span><b>Se ve:</b> {g.hookVisual}</span></p>
            )}
          </div>
        </li>

        {g.beats.map((b, i) => (
          <li key={`${b.label}-${i}`} className="relative pl-10">
            <span className="absolute left-0 top-0 w-7 h-7 rounded-full bg-buttermilk text-cherry-dark text-xs font-bold flex items-center justify-center">{i + 1}</span>
            {i < g.beats.length - 1 && <span className="absolute left-[13px] top-8 bottom-[-12px] w-0.5 bg-buttermilk" aria-hidden />}
            <p className="text-[11px] font-bold uppercase tracking-wider text-cherry">{b.label}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink">{b.text}</p>
            {b.shot && <p className="mt-1.5 flex items-start gap-1.5 text-xs text-cherry-dark/60"><Camera size={12} className="mt-0.5 flex-shrink-0" /> {b.shot}</p>}
          </li>
        ))}

        {/* CTA */}
        <li className="rounded-2xl p-4 bg-buttermilk/60 border border-buttermilk">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cherry-dark/70 flex items-center gap-1"><ArrowRight size={12} /> Cierre · invita a escribirte</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink font-medium">{g.script.cta}</p>
        </li>
      </ol>

      {/* Publicación */}
      <section className="px-5 sm:px-6 py-4 bg-warm-light border-t border-buttermilk/70">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cherry-dark/60">Texto para la publicación</p>
          <CopyBtn active={copied === 'caption'} onClick={() => onCopy(g.captionWithHashtags, 'caption')} label="Copiar" />
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-line text-ink/90">{g.captionWithHashtags}</p>
        {g.coverText && <p className="mt-3 text-xs text-cherry-dark/70">Portada del Reel: <b>{g.coverText}</b></p>}
      </section>
    </article>
  )
}

function CopyBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${active ? 'bg-cherry text-white' : 'bg-buttermilk text-cherry-dark hover:brightness-95'}`}
    >
      {active ? <Check size={12} /> : <Copy size={12} />}
      {active ? '¡Copiado!' : label}
    </button>
  )
}

function MockNotice() {
  return (
    <div className="rounded-2xl px-4 py-3 bg-warm-gray text-xs text-cherry-dark/80 border border-dashed border-cherry/25">
      <b>Estás viendo un ejemplo.</b> La IA no está conectada ahora mismo, así que no es un texto a medida. Vuelve a intentarlo en un momento.
    </div>
  )
}

function LoadingCards({ label, big = false }: { label: string; big?: boolean }) {
  return (
    <div className="space-y-2.5" aria-live="polite">
      <div className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-cherry-dark/80">
        <Loader2 size={16} className="animate-spin text-cherry" /> {label}
      </div>
      {(big ? [0] : [0, 1, 2]).map(i => (
        <div key={i} className={`rounded-3xl p-5 bg-white shadow-sm animate-pulse ${big ? 'h-80' : ''}`}>
          <div className="h-3 w-24 rounded-full bg-buttermilk" />
          <div className="h-4 w-11/12 rounded-full bg-warm-gray mt-3" />
          <div className="h-4 w-3/4 rounded-full bg-warm-gray mt-2" />
          {big && <div className="h-4 w-2/3 rounded-full bg-warm-gray mt-6" />}
        </div>
      ))}
    </div>
  )
}
