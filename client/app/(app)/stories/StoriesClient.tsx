'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { demoSavePlan } from '@/lib/demo-store'
import { openTeleprompter } from '@/lib/teleprompter/input'
import {
  generateStories,
  generateQuestions,
  generateQuestionAnswerChecked,
  type StoriesOutput,
} from '@/lib/ai/prompts/stories'
import {
  copyToClipboard,
  saveToLibrary,
  scheduleItem,
  formatContentForCopy,
} from '@/lib/content-utils'
import StoryMockup from '@/components/content/StoryMockup'
import QuestionCard from '@/components/content/QuestionCard'
import StoryDesignEditor from '@/components/editor/StoryDesignEditor'
import Link from 'next/link'
import { useSessionState, clearSectionState, setSessionValue } from '@/lib/session-store'
import { LabSlide } from '@/lib/lab/carousel'
import { ensureDesignSlides, seedStorySlide } from '@/lib/stories/design'
import { defaultStoryVisual, drawStoryCanvas, storyExportFileName } from '@/lib/stories/render'
import { ensureCanvasFont } from '@/lib/carousel/render'
import { StoryVisual } from '@/lib/editor/types'
import { BrandFullContextInput, buildBrandFullContext } from '@/lib/ai/brand-context'
import BraviGuide from '@/components/bravi/BraviGuide'
import BraviTip from '@/components/bravi/BraviTip'
import PageHeader from '@/components/ui/PageHeader'
import AIUnavailableNotice from '@/components/ui/AIUnavailableNotice'
import ReadySequences from './ReadySequences'
import StoryDesigner from './StoryDesigner'
import { SEQUENCE_TYPES, sequenceType, readyToStories, READY_SEQUENCES, type ReadySequence, type SequenceType } from '@/lib/stories/sequences'
import { BookMarked, Sparkles, ImagePlus, LayoutTemplate, ChevronDown as ChevronDownIcon } from 'lucide-react'
import {
  LayoutGrid,
  MessageSquare,
  Copy,
  BookOpen,
  Calendar,
  ArrowRight,
  RefreshCw,
  Check,
  Eye,
  FileText,
  Plus,
  Clapperboard,
  Mic,
  Palette,
  Download,
  Type, Video,
} from 'lucide-react'
import { useDictateText } from '@/lib/speech'
import type { ContentItem } from '@/types/database'

const SERVICES = [
  'Balayage', 'Morena iluminada', 'Alisado', 'Corrección de color',
  'Recuperación cabello dañado', 'Rubio', 'Mechas', 'Color global',
  'Corte', 'Peinado', 'Tratamiento hidratante', 'Keratina',
  'Decoloración', 'Baño de color', 'Extensiones', 'Permanente',
]

const QUESTION_TOPICS = ['Rubios', 'Balayage', 'Canas', 'Alisados', 'Tratamientos', 'Anticaída', 'Cuidado en casa', 'Color', 'General']

type StoriesTab = 'listas' | 'crear' | 'disena' | 'questions'

export default function StoriesClient({ userId, brandFull }: { userId: string; brandFull: BrandFullContextInput | null }) {
  // null = portada de la sección con las 3 entradas grandes.
  const [tab, setTab] = useSessionState<StoriesTab | null>(`u:${userId}:stories:tab3`, null)
  const [focusDesign, setFocusDesign] = useState(false)
  // Lo guardado (localStorage) solo existe en el navegador: se pinta tras montar
  // para que servidor y navegador no discrepen (error de hidratación).
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // Desde Mi plan: /stories?secuencia=ID abre el diseñador con esa secuencia.
    // Se aplica ANTES de pintar «Crea la tuya» para que lea la secuencia nueva.
    const id = new URLSearchParams(window.location.search).get('secuencia')
    const seq = id ? READY_SEQUENCES.find(s => s.id === id) : null
    if (id) window.history.replaceState(null, '', '/stories')
    if (seq) designReady(seq)
    setMounted(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Al cambiar de entrada se empieza arriba (salvo si vamos directos al diseñador).
  useEffect(() => {
    if (!focusDesign) document.querySelector('main')?.scrollTo({ top: 0 })
  }, [tab, focusDesign])

  /** Secuencia lista → diseñador con la secuencia cargada (foto + texto + descarga). */
  function designReady(seq: ReadySequence) {
    const stories = readyToStories(seq)
    setSessionValue(`u:${userId}:stories:result`, { stories })
    setSessionValue(`u:${userId}:stories:service`, seq.service)
    setSessionValue(`u:${userId}:stories:freeText`, '')
    setSessionValue(`u:${userId}:stories:seqType`, seq.type)
    setSessionValue(`u:${userId}:stories:savedLib`, false)
    setSessionValue(`u:${userId}:stories-designer:slides`, ensureDesignSlides(stories, {}))
    setSessionValue(`u:${userId}:stories-editor:visuals`, {})
    setFocusDesign(true)
    setTab('crear')
  }

  /** Secuencia lista → «Crea la tuya» con la idea para adaptarla a su salón. */
  function adaptReady(seq: ReadySequence) {
    setSessionValue(`u:${userId}:stories:result`, null)
    setSessionValue(`u:${userId}:stories:service`, seq.service)
    setSessionValue(`u:${userId}:stories:seqType`, seq.type)
    setSessionValue(`u:${userId}:stories:freeText`, `Adapta a mi salón esta secuencia «${seq.title}»: ${seq.stories.map(st => st.text).join(' / ')}`)
    setSessionValue(`u:${userId}:stories-designer:slides`, {})
    setFocusDesign(false)
    setTab('crear')
  }

  if (!mounted) {
    return (
      <div className="space-y-6" aria-busy="true">
        <h1>Stories</h1>
        <div className="h-40 rounded-[var(--radius-lg)] bg-white/60 animate-pulse" />
      </div>
    )
  }

  const tabs: Array<{ id: StoriesTab; label: string; desc: string; meta: string; icon: React.ReactNode; tone: 'burdeos' | 'mantequilla' | 'rosa' | 'crema' }> = [
    {
      id: 'listas', label: 'Secuencias listas', tone: 'burdeos',
      desc: 'Elige una secuencia ya escrita para tu servicio, ponle tu foto o clip y descárgala.',
      meta: '30 secuencias · la forma más rápida', icon: <BookMarked size={22} aria-hidden />,
    },
    {
      id: 'crear', label: 'Crea la tuya', tone: 'mantequilla',
      desc: 'Cuéntame lo que ha pasado hoy en el salón (escrito o por voz) y la convierto en stories.',
      meta: 'Con IA · tu historia real', icon: <Sparkles size={22} aria-hidden />,
    },
    {
      id: 'disena', label: 'Diseña tus stories', tone: 'crema',
      desc: 'Plantillas elegantes con fotos bonitas: cambia el texto, la letra y la foto, y descarga.',
      meta: 'Sin IA · listas en 1 minuto', icon: <Palette size={22} aria-hidden />,
    },
    {
      id: 'questions', label: 'Caja de preguntas', tone: 'rosa',
      desc: 'Preguntas para el sticker de Instagram y respuestas listas para contestarlas en vídeo.',
      meta: 'Para que te escriban', icon: <MessageSquare size={22} aria-hidden />,
    },
  ]
  const toneClass = {
    burdeos: 'bg-burdeos text-crema',
    mantequilla: 'bg-mantequilla text-burdeos',
    rosa: 'bg-rosa text-burdeos',
    crema: 'bg-white text-burdeos border border-borde',
  } as const

  // ── Portada: 3 entradas grandes, cada una con su color ──
  if (tab === null) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Stories"
          subtitle="Secuencias de hasta 3 stories que van al grano. ¿Cómo quieres empezar hoy?"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setFocusDesign(false) }}
              className={`group relative overflow-hidden text-left rounded-[var(--radius-lg)] p-5 md:p-6 flex flex-col gap-3 min-h-[150px] md:min-h-[230px] transition-transform hover:-translate-y-0.5 ${toneClass[t.tone]}`}
              style={{ boxShadow: i === 0 ? 'var(--shadow-strong)' : 'var(--shadow-soft)' }}
            >
              <span className="flex items-center justify-between">
                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${t.tone === 'burdeos' ? 'bg-white/15' : 'bg-white/70'}`}>{t.icon}</span>
                {i === 0 && <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-mantequilla text-burdeos">Recomendado</span>}
              </span>
              <span className="text-[22px] font-semibold leading-tight">{t.label}</span>
              <span className={`text-[15px] leading-snug ${t.tone === 'burdeos' ? 'text-crema/85' : 'text-burdeos/80'}`}>{t.desc}</span>
              <span className={`mt-auto flex items-center justify-between text-[13px] font-semibold ${t.tone === 'burdeos' ? 'text-mantequilla' : 'text-cereza'}`}>
                {t.meta}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const current = tabs.find(t => t.id === tab) ?? tabs[0]

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <button onClick={() => setTab(null)} className="flex items-center gap-1 text-[14px] font-semibold text-cereza hover:underline">
          <ArrowRight size={15} className="rotate-180" aria-hidden /> Stories
        </button>
        <div data-tone={current.tone === 'burdeos' ? 'dark' : undefined} className={`rounded-[var(--radius-lg)] p-4 md:p-5 flex items-center gap-3.5 ${toneClass[current.tone]}`}>
          <span className={`w-11 h-11 flex-shrink-0 rounded-2xl flex items-center justify-center ${current.tone === 'burdeos' ? 'bg-white/15' : 'bg-white/70'}`}>{current.icon}</span>
          <div className="min-w-0">
            <h1>{current.label}</h1>
            <p className={`text-[14px] leading-snug ${current.tone === 'burdeos' ? 'text-crema/85' : 'text-burdeos/80'}`}>{current.desc}</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Cambiar a">
          {tabs.filter(t => t.id !== tab).map(t => (
            <button key={t.id} role="tab" aria-selected={false} onClick={() => { setTab(t.id); setFocusDesign(false) }} className="chip flex-shrink-0 [&_svg]:w-4 [&_svg]:h-4">
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'listas' && <ReadySequences onDesign={designReady} onAdapt={adaptReady} />}
      {tab === 'crear' && <StoriesCreator userId={userId} brandFull={brandFull} focusDesign={focusDesign} />}
      {tab === 'disena' && <StoryDesigner userId={userId} />}
      {tab === 'questions' && <QuestionBox userId={userId} brandFull={brandFull} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Stories Creator
// ═══════════════════════════════════════════════════════════════════

/** Visuales serializables para content_json: la foto de memoria (blob de
 * cámara/subida) no sobrevive al recargar y se quita; las URLs estables
 * (catálogo de la app) se conservan. El fondo queda en 'photo' para que el
 * editor vuelva a pedir la foto en vez de perder el modo en silencio. */
function serializeVisuals(visuals: Record<number, StoryVisual>): Record<number, StoryVisual> {
  const out: Record<number, StoryVisual> = {}
  for (const [num, v] of Object.entries(visuals)) {
    const src = v.photo?.src ?? ''
    const stable = /^https?:\/\//.test(src) || src.startsWith('/')
    out[Number(num)] = stable ? v : { ...v, photo: null }
  }
  return out
}

export function preloadStoryImage(visual: StoryVisual): Promise<HTMLImageElement | null> {
  const src = visual.background === 'photo' ? visual.photo?.src : null
  if (!src) return Promise.resolve(null)
  return new Promise(resolve => {
    const img = new Image()
    // crossOrigin: URLs firmadas de Storage (cross-origin) manchan el canvas
    // → toBlob lanzaría SecurityError. Supabase Storage sirve CORS *.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'AbortError'
}

function StoriesCreator({ userId, brandFull, focusDesign = false }: { userId: string; brandFull: BrandFullContextInput | null; focusDesign?: boolean }) {
  const isDemoMode = userId === 'demo'
  const router = useRouter()
  // Sin toggle "Usar mi marca" (quitado por saturación): si hay marca,
  // SIEMPRE informa la generación — la app decide, no pregunta.
  const brandContext = useMemo(() => {
    if (!brandFull) return undefined
    return buildBrandFullContext(brandFull) || undefined
  }, [brandFull])
  const [service, setService] = useSessionState<string>(`u:${userId}:stories:service`, '')
  const [freeText, setFreeText] = useSessionState<string>(`u:${userId}:stories:freeText`, '')
  const [detail, setDetail] = useSessionState<string>(`u:${userId}:stories:detail`, '')
  // El TIPO de secuencia manda (cuántas stories y qué dice cada una): máx. 3.
  const [seqType, setSeqType] = useSessionState<SequenceType>(`u:${userId}:stories:seqType`, 'vender')
  const count = Math.min(3, sequenceType(seqType).beats.length) as 1 | 2 | 3
  const [mode, setMode] = useSessionState<'text' | 'camera'>(`u:${userId}:stories:mode`, 'text')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useSessionState<StoriesOutput | null>(`u:${userId}:stories:result`, null)
  // Story que no se pudo regenerar porque la IA no respondió (aviso + reintentar).
  const [singleFailed, setSingleFailed] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedLib, setSavedLib] = useSessionState<boolean>(`u:${userId}:stories:savedLib`, false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadedAll, setDownloadedAll] = useState(false)
  const [viewMode, setViewMode] = useSessionState<'mockup' | 'text'>(`u:${userId}:stories:viewMode`, 'mockup')
  const [scheduleDate, setScheduleDate] = useSessionState<string>(`u:${userId}:stories:scheduleDate`, '')
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledId, setScheduledId] = useSessionState<string | null>(`u:${userId}:stories:scheduledId`, null)

  // Resultados ABAJO del formulario (sin pantalla nueva): al generar se baja
  // solo hasta la secuencia. pendingScroll evita saltar antes del render.
  const resultsRef = useRef<HTMLDivElement | null>(null)
  const pendingScrollRef = useRef(false)
  useEffect(() => {
    if (pendingScrollRef.current && result && resultsRef.current) {
      pendingScrollRef.current = false
      const t = setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
      return () => clearTimeout(t)
    }
  }, [result])

  // Editor visual de stories (canvas 9:16, JPG bulk): visual por número —
  // degradado/foto, texto movible. Persiste por number; la foto es memory-only
  // tras reload (la descarga JPG vuelve a pedir la foto si el blob murió).
  const [visuals, setVisuals] = useSessionState<Record<number, StoryVisual>>(`u:${userId}:stories-editor:visuals`, {})

  // Diseño inline (editor estilo carrusel): slide por nº de story, sembrado
  // desde result.stories (degradado de rol + texto IA). Persiste en
  // session-store; la story EDITADA no (recargar cierra el foco, igual que
  // antes con el overlay). Fase 1: los diseños NO van a content_json.
  const [designSlides, setDesignSlides] = useSessionState<Record<number, LabSlide>>(`u:${userId}:stories-designer:slides`, {})
  const [designNumber, setDesignNumber] = useState<number>(1)
  // Con el diseñador abierto, las miniaturas de arriba se ocultan (no repetir lo mismo dos veces).
  const [showPreviews, setShowPreviews] = useState(false)
  const designOpen = Object.keys(designSlides).length > 0
  const designScrollRef = useRef<HTMLDivElement | null>(null)
  // Llega desde «Secuencias listas»: baja directo al diseñador.
  const pendingDesignScrollRef = useRef(focusDesign)
  useEffect(() => {
    if (pendingDesignScrollRef.current && designOpen && designScrollRef.current) {
      // El aviso se apaga DENTRO del temporizador: si el efecto se repite
      // (modo desarrollo) y se cancela el primero, el segundo sigue bajando.
      const t = setTimeout(() => {
        pendingDesignScrollRef.current = false
        designScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 250)
      return () => clearTimeout(t)
    }
  }, [designOpen])

  /** Botón "Diseñar": siembra (idempotente) y baja al editor inline. */
  function openDesigner(n: number) {
    if (!result) return
    setShowPreviews(false)
    setDesignSlides(prev => ensureDesignSlides(result.stories, prev))
    setDesignNumber(n)
    pendingDesignScrollRef.current = true
  }

  // Dictado por voz del tema libre (igual que Guiones: chunks finales se acumulan).
  const dictate = useDictateText()
  const toggleDictate = () => {
    if (dictate.listening) {
      dictate.stop()
      return
    }
    dictate.start(chunk => setFreeText(prev => (prev ? `${prev} ${chunk}` : chunk)))
  }

  async function generate() {
    if (!service && !freeText) return
    setGenerating(true)
    const out = await generateStories({
      service: service || 'General',
      idea: freeText || undefined,
      count,
      sequenceType: seqType,
      mode,
      detail: detail || undefined,
      brandContext: brandContext || undefined,
    })
    setResult(out)
    setSingleFailed(null)
    // Secuencia nueva: el diseño y lo guardado de la anterior ya no valen.
    setDesignSlides({})
    setVisuals({})
    setSavedLib(false)
    setScheduledId(null)
    setGenerating(false)
    pendingScrollRef.current = true
  }

  // Teleprompter con SOLO el texto de esa story (nunca la secuencia fusionada).
  // La secuencia completa viaja en el payload para "Continuar con Story N+1".
  function openStoryInTeleprompter(storyNumber: number) {
    if (!result) return
    const idx = result.stories.findIndex(s => s.number === storyNumber)
    if (idx < 0) return
    const items = result.stories.map(s => ({ label: `Story ${s.number} de ${result.stories.length}`, text: s.text }))
    openTeleprompter(
      {
        script: items[idx].text,
        title: items[idx].label,
        source: 'stories',
        returnUrl: '/stories',
        sequence: { current: idx, total: items.length, items },
      },
      router,
    )
  }

  function handleCopy(text: string, key: string) {
    copyToClipboard(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleSaveLibrary() {
    if (!result) return
    setSaving(true)
    const fullText = result.stories.map(s => {
      const stickerLabel = s.sticker?.label || s.stickerSuggestion || ''
      return `Story ${s.number} — ${s.role}:\n${s.text}${stickerLabel ? `\nSticker: ${stickerLabel}` : ''}\nVisual: ${s.visualIdea}`
    }).join('\n\n')
    const payload = {
      type: 'story' as const,
      title: `Stories: ${service || freeText}`,
      service: service || 'General',
      idea: freeText || undefined,
      content_json: {
        ...result,
        // Diseños visuales por story (serializables; las blobs se quitan).
        ...(Object.keys(visuals).length > 0 ? { visuals: serializeVisuals(visuals) } : {}),
      } as unknown as Record<string, unknown>,
      caption_with_hashtags: fullText,
      status: 'library' as const,
      format: 'story',
      scheduled_date: null,
      visual_idea: null,
      objective: null,
    }
    await saveToLibrary(userId, payload, isDemoMode)
    setSaving(false)
    setSavedLib(true)
  }

  async function handleSchedule() {
    if (!result || !scheduleDate) return
    setSaving(true)
    const fullText = result.stories.map(s => {
      const stickerLabel = s.sticker?.label || s.stickerSuggestion || ''
      return `Story ${s.number} — ${s.role}:\n${s.text}${stickerLabel ? `\nSticker: ${stickerLabel}` : ''}\nVisual: ${s.visualIdea}`
    }).join('\n\n')
    const basePayload = {
      type: 'story' as const,
      title: `Stories: ${service || freeText}`,
      service: service || 'General',
      idea: freeText || undefined,
      content_json: {
        ...result,
        ...(Object.keys(visuals).length > 0 ? { visuals: serializeVisuals(visuals) } : {}),
      } as unknown as Record<string, unknown>,
      caption_with_hashtags: fullText,
      format: 'story',
      visual_idea: null,
      objective: null,
    }
    // Save to library first, then schedule via scheduleItem
    if (isDemoMode) {
      const saved = demoSavePlan({ ...basePayload, user_id: 'demo', status: 'library' })
      await scheduleItem(userId, saved.id, scheduleDate, isDemoMode)
      setScheduledId(saved.id)
    } else {
      const supabase = createClient()
      const { data } = await supabase
        .from('content_items')
        .insert({ user_id: userId, ...basePayload, status: 'library' })
        .select()
        .single()
      if (data) {
        await scheduleItem(userId, data.id, scheduleDate, isDemoMode)
        setScheduledId(data.id)
      }
    }
    setSaving(false)
    setShowSchedule(false)
  }

  async function regenerateAll() {
    if (!result) return
    setGenerating(true)
    const out = await generateStories({
      service: service || 'General',
      idea: freeText || undefined,
      count,
      sequenceType: seqType,
      mode,
      detail: detail || undefined,
      brandContext: brandContext || undefined,
    })
    setResult(out)
    setSingleFailed(null)
    setSavedLib(false)
    setScheduledId(null)
    setVisuals({}) // el texto cambió entero: los visuales quedan obsoletos
    setDesignSlides({}) // y los diseños también (se re-siembrán al abrir)
    setGenerating(false)
    pendingScrollRef.current = true
  }

  async function regenerateSingle(number: number) {
    if (!result || regenerating !== null) return
    setRegenerating(number)
    setSingleFailed(null)
    try {
      const fresh = await generateStories({ service: service || 'General',
      idea: freeText || undefined, count, sequenceType: seqType, mode, detail: detail || undefined, brandContext: brandContext || undefined })
      // La IA falló: no cambiamos una story escrita por la IA por una plantilla.
      if (fresh.mock && !result.mock) {
        setSingleFailed(number)
        return
      }
      const newStory = fresh.stories[number - 1]
      if (newStory) {
        setResult(prev => prev ? { ...prev, stories: prev.stories.map(s => s.number === number ? newStory : s) } : prev)
        setVisuals(prev => { const next = { ...prev }; delete next[number]; return next })
        // Diseño de esa story: re-siembra con el texto NUEVO (si estaba diseñada).
        setDesignSlides(prev => {
          if (!prev[number]) return prev
          return { ...prev, [number]: seedStorySlide(newStory) }
        })
      }
    } finally {
      setRegenerating(null)
    }
  }

  // Descarga en lote de la secuencia completa: la misma drawStoryCanvas del
  // editor (WYSIWYG). iPhone → share sheet con todas las imágenes de una vez
  // ("Guardar N imágenes"); resto → descarga secuencial con pausa (bloqueo
  // de descargas múltiples en algunos navegadores).
  async function downloadAllStories() {
    if (!result || downloadingAll) return
    setDownloadingAll(true)
    try {
      const fam = await ensureCanvasFont()
      const total = result.stories.length
      const files: File[] = []
      for (const s of result.stories) {
        const visual = visuals[s.number] ?? defaultStoryVisual()
        const imgEl = await preloadStoryImage(visual)
        const canvas = document.createElement('canvas')
        drawStoryCanvas(canvas, { text: s.text, visual, imageEl: imgEl, fontFamily: fam })
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
        if (blob) files.push(new File([blob], storyExportFileName(s.number, total), { type: 'image/jpeg' }))
      }
      if (files.length === 0) return
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const canShareFiles =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files })
      if (isIOS && canShareFiles) {
        try {
          await navigator.share({ files })
          setDownloadedAll(true)
          setTimeout(() => setDownloadedAll(false), 2500)
          return
        } catch (err) {
          // Cancelar la hoja no es un error: no duplicar la descarga.
          if (isAbortError(err)) return
        }
      }
      for (const f of files) {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(f)
        a.download = f.name
        a.click()
        URL.revokeObjectURL(a.href)
        await new Promise(r => setTimeout(r, 350))
      }
      setDownloadedAll(true)
      setTimeout(() => setDownloadedAll(false), 2500)
    } finally {
      setDownloadingAll(false)
    }
  }

  function buildVisualText(): string {
    if (!result) return ''
    const fakeItem = {
      id: '',
      user_id: userId,
      type: 'story' as const,
      title: `Stories: ${service || freeText}`,
      service: service || 'General',
      idea: freeText || undefined,
      objective: null,
      format: 'story',
      content_json: result as unknown as ContentItem['content_json'],
      caption_with_hashtags: null,
      visual_idea: null,
      scheduled_date: null,
      status: 'library' as const,
      tag: null as string | null,
      reto_status: null,
      done_at: null,
      created_at: '',
      updated_at: '',
    }
    return formatContentForCopy(fakeItem, 'visual')
  }

  const fullSequence = result ? result.stories.map(s => {
    const stickerLabel = s.sticker?.label || s.stickerSuggestion || ''
    return `Story ${s.number} — ${s.role}:
${s.text}
${stickerLabel ? `Sticker: ${stickerLabel}` : ''}
Visual: ${s.visualIdea}`
  }).join('\n\n---\n\n') : ''

  // Resultados ABAJO del formulario, nunca en otra pantalla: el form queda
  // siempre a mano y al generar la página baja sola hasta la secuencia.
  const resultsSection = result ? (
    <div ref={resultsRef} className="scroll-mt-24 space-y-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-burdeos">Tus stories están listas</h2>
            <p className="text-[14px] text-tinta-2">{sequenceType(seqType).name}: {sequenceType(seqType).goal.toLowerCase()}.</p>
          </div>
          <button onClick={() => { setResult(null); setSavedLib(false); setScheduledId(null); setVisuals({}); setDesignSlides({}) }} className="btn-ghost text-sm">
            <Plus size={14} aria-hidden /> Nueva secuencia
          </button>
        </div>

        {result.mock && (
          <AIUnavailableNotice demo={isDemoMode} onRetry={regenerateAll} retrying={generating} />
        )}
        {singleFailed !== null && !result.mock && (
          <AIUnavailableNotice
            showsExample={false}
            onRetry={() => regenerateSingle(singleFailed)}
            retrying={regenerating !== null}
          />
        )}

        {/* Result view */}
        {/* Una sola vista (la de texto duplicaba información) */}
        {designOpen && !showPreviews ? (
          <button onClick={() => setShowPreviews(true)} className="btn-ghost text-sm">
            <Eye size={15} aria-hidden /> Ver la secuencia completa
          </button>
        ) : viewMode === 'mockup' || viewMode === 'text' ? (
          <div
            className="flex gap-5 overflow-x-auto snap-x snap-mandatory no-scrollbar xl:justify-center items-start rounded-[var(--radius-lg)] bg-warm-gray/70 px-4 py-6"
            aria-label="Tus stories (desliza para ver todas)"
          >
            {result.stories.map(story => (
              <StoryMockup key={story.number} story={story} index={story.number}>
                {mode === 'camera' && (
                  <button
                    onClick={() => openStoryInTeleprompter(story.number)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold bg-cereza text-white"
                  >
                    <Clapperboard size={14} aria-hidden /> Grabar
                  </button>
                )}
                <button
                  onClick={() => handleCopy(story.text, `story-${story.number}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: copied === `story-${story.number}` ? '#7A1832' : '#FFF1B5', color: copied === `story-${story.number}` ? 'white' : '#591427' }}
                >
                  {copied === `story-${story.number}` ? <Check size={12} /> : <Copy size={12} />}
                  {copied === `story-${story.number}` ? '¡Copiado!' : 'Copiar'}
                </button>
                <button
                  onClick={() => regenerateSingle(story.number)}
                  disabled={regenerating === story.number}
                  aria-label={`Escribir otra versión de la story ${story.number}`}
                  title="Otra versión"
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-warm-gray text-cherry-dark"
                >
                  <RefreshCw size={14} className={regenerating === story.number ? 'animate-spin' : ''} aria-hidden />
                </button>
              </StoryMockup>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual formatted text for entire sequence */}
            <div
              className="rounded-[var(--radius-md)] p-6 whitespace-pre-wrap text-sm leading-relaxed"
              style={{ background: '#FFFDF5', border: '1.5px solid rgba(255,241,181,0.8)', color: '#1a1a1a' }}
            >
              {buildVisualText()}
            </div>
            {/* Per-story cards with clean layout */}
            {result.stories.map(story => {
              const roleColors = ['#7A1832', '#2a5a6a', '#7a6000']
              const roleEmojis = ['🔴', '🔵', '🟡']
              const color = roleColors[(story.number - 1) % roleColors.length]
              const emoji = roleEmojis[(story.number - 1) % roleEmojis.length]
              const stickerLabel = story.sticker?.label || story.stickerSuggestion || ''
              const stickerType = story.sticker?.type
              const stickerTypeLabel = stickerType === 'poll' ? 'Encuesta' : stickerType === 'question' ? 'Caja de preguntas' : stickerType === 'emoji-slider' ? 'Slider de emoji' : stickerType === 'mention' ? 'Mención' : stickerType === 'hashtag' ? 'Hashtag' : stickerType === 'location' ? 'Ubicación' : 'Sticker'
              return (
                <div key={story.number} className="p-4 rounded-[var(--radius-md)]" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: color }}>
                      {story.number}
                    </div>
                    <span className="font-bold text-sm" style={{ color }}>{emoji} {story.role}</span>
                  </div>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: '#1a1a1a' }}>{story.text}</p>
                  {stickerLabel && (
                    <div
                      className="mb-3 px-3 py-2 rounded-lg flex items-start gap-2"
                      style={{ background: 'rgba(193,219,232,0.3)', border: '1px solid rgba(74,122,138,0.2)' }}
                    >
                      <span className="text-sm flex-shrink-0">🏷️</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#2a5a6a', opacity: 0.8 }}>
                          {stickerTypeLabel} recomendada
                        </p>
                        <p className="text-xs leading-snug" style={{ color: '#1a3a4a' }}>
                          {stickerLabel}
                          {story.sticker?.options ? ` — ${story.sticker.options.join(' / ')}` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                  {story.visualIdea && (
                    <p className="text-xs italic mb-3" style={{ color: '#591427', opacity: 0.55 }}>
                      📸 {story.visualIdea}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openStoryInTeleprompter(story.number)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: '#7A1832', color: 'white' }}
                    >
                      <Clapperboard size={12} /> Grabar con Teleprompter
                    </button>
                    <button
                      onClick={() => handleCopy(story.text, `story-text-${story.number}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: copied === `story-text-${story.number}` ? '#7A1832' : '#FFF1B5', color: copied === `story-text-${story.number}` ? 'white' : '#591427' }}
                    >
                      {copied === `story-text-${story.number}` ? <Check size={12} /> : <Copy size={12} />}
                      {copied === `story-text-${story.number}` ? '¡Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => openDesigner(story.number)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: '#FFF1B5', color: '#591427' }}
                    >
                      <Palette size={12} /> Diseñar
                    </button>
                    <button
                      onClick={() => regenerateSingle(story.number)}
                      disabled={regenerating === story.number}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: regenerating === story.number ? '#E8D8C8' : '#F5F0E8', color: '#591427', opacity: regenerating === story.number ? 0.7 : 1 }}
                    >
                      <RefreshCw size={12} className={regenerating === story.number ? 'animate-spin' : ''} /> {regenerating === story.number ? 'Regenerando...' : 'Regenerar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Acción principal: ponerle foto y descargar. Luego copiar y guardar. */}
        <div className="space-y-2.5">
          {!designOpen && (
            <button onClick={() => openDesigner(1)} className="btn-primary w-full justify-center py-3.5 text-base">
              <ImagePlus size={18} aria-hidden /> Ponle tu foto o clip y descarga
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleCopy(fullSequence, 'full')} className="btn-secondary justify-center">
              {copied === 'full' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied === 'full' ? 'Copiadas' : 'Copiar las stories'}
            </button>
            <button onClick={handleSaveLibrary} disabled={saving || savedLib} className="btn-ghost justify-center">
              <BookOpen size={16} aria-hidden /> {saving ? 'Guardando…' : savedLib ? 'Guardado' : 'Guardar'}
            </button>
          </div>
          <p className="text-[13px] text-tinta-2">Las encuestas se añaden en Instagram al subir cada story: te indicamos cuál en cada una.</p>
          <details className="group">
            <summary className="cursor-pointer list-none text-[14px] font-semibold text-cereza py-1 inline-flex items-center gap-1">Más opciones <ChevronDownIcon size={15} className="transition-transform group-open:rotate-180" aria-hidden /></summary>
            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={() => setShowSchedule(!showSchedule)} className="btn-ghost text-sm"><Calendar size={15} aria-hidden /> Programar</button>
              <button onClick={() => void downloadAllStories()} disabled={downloadingAll} className="btn-ghost text-sm">
                <Download size={15} aria-hidden /> {downloadingAll ? 'Descargando…' : downloadedAll ? 'Descargadas' : 'Descargar sin foto'}
              </button>
              <Link href="/stories-diseno" className="btn-ghost text-sm"><LayoutTemplate size={15} aria-hidden /> Usar una plantilla de diseño</Link>
              <button onClick={regenerateAll} disabled={generating} className="btn-ghost text-sm"><RefreshCw size={15} aria-hidden /> Escribir otra versión</button>
              <button
                onClick={() => { clearSectionState(`u:${userId}:stories`); setVisuals({}); setDesignSlides({}); setResult(null); setSavedLib(false); setScheduledId(null); setService(''); setFreeText(''); setDetail('') }}
                className="btn-ghost text-sm"
              >
                <Plus size={15} aria-hidden /> Empezar de nuevo
              </button>
            </div>
          </details>
        </div>

        {/* Schedule inline */}
        {showSchedule && (
          <div className="flex flex-col sm:flex-row gap-3 p-5 rounded-[var(--radius-md)]" style={{ background: '#FFF8E7', border: '1.5px solid rgba(255,241,181,0.8)' }}>
            <input
              type="date"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: 'white' }}
            />
            <button
              onClick={handleSchedule}
              disabled={!scheduleDate || saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: '#7A1832', opacity: !scheduleDate || saving ? 0.5 : 1 }}
            >
              {saving ? 'Programando...' : 'Confirmar'}
            </button>
          </div>
        )}

        {scheduledId && (
          <div className="flex items-center justify-center gap-4">
            <p className="text-xs" style={{ color: '#591427', opacity: 0.7 }}>
              ✓ Stories programadas para {scheduleDate}
            </p>
            <Link href="/calendario" className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: '#7A1832' }}>
              Ver en calendario <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* Editor de diseño inline (estilo carrusel, extendido hacia abajo):
            degradados de rol propuestos, foto opcional, PNG 1080×1920 */}
        {designOpen && (
          <div ref={designScrollRef} className="scroll-mt-24">
            <StoryDesignEditor
              stories={result.stories}
              slides={designSlides}
              onChange={setDesignSlides}
              activeNumber={designNumber}
              onActiveNumberChange={setDesignNumber}
            />
          </div>
        )}
      </div>
    ) : null

  // Creation form
  return (
    <div className="space-y-6">
      {/* BLOQUE 1 — modo de publicación */}
      <div className="rounded-2xl p-5" style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.14)', boxShadow: 'var(--shadow-soft)' }}>
        <div className="mb-3.5 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: '#7A1832' }}>1</span>
          <p className="font-semibold text-sm" style={{ color: '#1a1a1a' }}>¿Cómo vas a publicar las stories?</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setMode('text')}
            aria-pressed={mode === 'text'}
            className="flex flex-1 flex-col items-center gap-1 py-3.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: mode === 'text' ? '#7A1832' : 'white',
              color: mode === 'text' ? 'white' : '#591427',
              border: mode === 'text' ? '1.5px solid #7A1832' : '1.5px solid rgba(122,24,50,0.28)',
            }}
          >
            <Type size={18} aria-hidden="true" /> Texto en pantalla
            <span className="text-[10px] font-semibold" style={{ opacity: 0.7 }}>Texto corto sobre foto o vídeo</span>
          </button>
          <button
            onClick={() => setMode('camera')}
            aria-pressed={mode === 'camera'}
            className="flex flex-1 flex-col items-center gap-1 py-3.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: mode === 'camera' ? '#7A1832' : 'white',
              color: mode === 'camera' ? 'white' : '#591427',
              border: mode === 'camera' ? '1.5px solid #7A1832' : '1.5px solid rgba(122,24,50,0.28)',
            }}
          >
            <Video size={18} aria-hidden="true" /> Hablando a cámara
            <span className="text-[10px] font-semibold" style={{ opacity: 0.7 }}>Guion para grabar directamente</span>
          </button>
        </div>
      </div>

      {/* BLOQUE 2 — de qué hablar (dos vías bien separadas) */}
      <div className="rounded-2xl p-5" style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.14)', boxShadow: 'var(--shadow-soft)' }}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: '#7A1832' }}>2</span>
          <p className="font-semibold text-sm" style={{ color: '#1a1a1a' }}>¿De qué quieres hablar?</p>
        </div>
        <p className="text-xs mt-1" style={{ color: '#591427', opacity: 0.6 }}>
          Vía recomendada: cuenta tu historia del día a día
        </p>
        <div className="flex items-stretch gap-2 mt-3">
          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            rows={4}
            placeholder={
              dictate.listening
                ? 'Escuchando… toca de nuevo para terminar.'
                : 'Dale al micro y cuenta: "Hoy me vino Carmen con el pelo destrozado…" — la IA lo asimila y crea la secuencia con TU historia.'
            }
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
          />
          {dictate.supported && (
            <button
              onClick={toggleDictate}
              aria-pressed={dictate.listening}
              aria-label={dictate.listening ? 'Parar dictado por voz' : 'Dictar historia por voz'}
              className="shrink-0 w-12 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: dictate.listening ? '#7A1832' : '#F5F0E8',
                color: dictate.listening ? 'white' : '#591427',
              }}
            >
              <Mic size={18} className={dictate.listening ? 'animate-pulse' : ''} />
            </button>
          )}
        </div>
        {dictate.listening && (
          <p className="text-xs mt-2" style={{ color: '#7A1832' }}>
            Escuchando… toca de nuevo para terminar.
          </p>
        )}
        <input
          value={detail}
          onChange={e => setDetail(e.target.value)}
          placeholder="Detalle extra: clienta quería poco mantenimiento, llevaba 2 años sin cortarse…"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mt-2"
          style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
        />

        <div className="mt-5 rounded-xl p-3.5" style={{ background: '#F5F0E8' }}>
          <p className="mb-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(89,20,39,0.6)' }}>O elige un servicio</p>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map(s => (
              <button
                key={s}
                onClick={() => setService(service === s ? '' : s)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: service === s ? '#7A1832' : 'white',
                  color: service === s ? 'white' : '#591427',
                  border: service === s ? '1.5px solid #7A1832' : '1.5px solid rgba(122,24,50,0.24)',
                  boxShadow: service === s ? 'var(--shadow-soft)' : undefined,
                }}
              >
                {service === s && <Check size={13} />}
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BLOQUE 3 — para qué (el tipo decide las stories, máx. 3) */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold text-white bg-cereza">3</span>
          <p className="font-semibold text-[15px] text-ink">¿Para qué es esta secuencia?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SEQUENCE_TYPES.map(t => {
            const on = seqType === t.id
            return (
              <button
                key={t.id}
                onClick={() => setSeqType(t.id)}
                aria-pressed={on}
                className={`text-left rounded-2xl px-3.5 py-3 border-[1.5px] transition-colors ${on ? 'bg-mantequilla border-cereza' : 'bg-white border-borde hover:border-cereza'}`}
              >
                <span className="flex items-center gap-1.5 text-[15px] font-semibold text-burdeos">{on && <Check size={15} aria-hidden />}{t.name}</span>
                <span className="block text-[13px] text-tinta-2 mt-0.5">{t.goal}</span>
              </button>
            )
          })}
        </div>
        <p className="text-[13px] text-tinta-2">{sequenceType(seqType).beats.length} stories: {sequenceType(seqType).beats.map(b => b.role).join(' → ')}</p>
      </div>

      {freeText.trim() && (
        <div
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: '#FFF1B5', color: '#591427' }}
        >
          <Check size={14} />
          Personalizaremos la secuencia con tu historia
        </div>
      )}
      <button
        onClick={generate}
        disabled={generating || (!service && !freeText)}
        className="btn-primary w-full justify-center text-base py-4"
        style={{ opacity: (!service && !freeText) ? 0.5 : 1 }}
      >
        <LayoutGrid size={20} />
        {generating ? 'Generando secuencia…' : 'Generar secuencia de stories'}
      </button>

      {/* ABAJO: la secuencia generada — el formulario no desaparece */}
      {resultsSection}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Question Box
// ═══════════════════════════════════════════════════════════════════

function QuestionBox({ userId, brandFull }: { userId: string; brandFull: BrandFullContextInput | null }) {
  const isDemoMode = userId === 'demo'
  const router = useRouter()
  // Sin toggle "Usar mi marca": si hay marca, SIEMPRE informa la generación
  // (misma regla que Crear Stories — la app decide, no pregunta).
  const brandContext = useMemo(() => {
    if (!brandFull) return undefined
    return buildBrandFullContext(brandFull) || undefined
  }, [brandFull])
  const [topic, setTopic] = useState('')
  // Cuadro opcional: si quiere hablar de algo específico dentro del tema.
  const [detail, setDetail] = useSessionState<string>(`u:${userId}:stories:qdetail`, '')
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [responding, setResponding] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, { written: string; camera: string; mock?: boolean }>>({})
  const [questionsMock, setQuestionsMock] = useState(false)

  async function handleGenerate() {
    if (!topic) return
    setGenerating(true)
    const out = await generateQuestions({
      topic,
      detail: detail.trim() || undefined,
      brandContext: brandContext || undefined,
    })
    setQuestions(out.questions)
    setQuestionsMock(!!out.mock)
    setGenerating(false)
  }

  function handleCopy(text: string, key: string) {
    copyToClipboard(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleSaveQuestion(q: string) {
    const payload = {
      type: 'story' as const,
      title: q,
      service: topic,
      content_json: { question: q, topic } as unknown as Record<string, unknown>,
      status: 'library' as const,
    }
    if (isDemoMode) {
      demoSavePlan({ ...payload, user_id: 'demo' })
    } else {
      const supabase = createClient()
      await supabase.from('content_items').insert({ user_id: userId, ...payload })
    }
    setSaved(prev => { const s = new Set(Array.from(prev)); s.add(q); return s })
  }

  async function handleRespond(q: string) {
    setResponding(q)
    try {
      const [written, camera] = await Promise.all([
        generateQuestionAnswerChecked({ question: q, mode: 'written', brandContext: brandContext || undefined }),
        generateQuestionAnswerChecked({ question: q, mode: 'camera', brandContext: brandContext || undefined }),
      ])
      setAnswers(prev => ({
        ...prev,
        [q]: { written: written.answer, camera: camera.answer, mock: written.mock || camera.mock },
      }))
    } catch {
      setAnswers(prev => ({
        ...prev,
        [q]: {
          written: 'No se pudo generar la respuesta. Inténtalo de nuevo.',
          camera: 'No se pudo generar el guion. Inténtalo de nuevo.',
        },
      }))
    }
    setResponding(null)
  }

  async function handleSaveAnswer(mode: 'written' | 'camera', text: string, q: string) {
    const payload = {
      type: 'story' as const,
      title: `Respuesta: ${q}`,
      service: topic,
      content_json: { question: q, answer: text, mode, topic } as unknown as Record<string, unknown>,
      caption_with_hashtags: text,
      status: 'library' as const,
      format: mode === 'written' ? 'story-text' : 'story-camera',
    }
    if (isDemoMode) {
      demoSavePlan({ ...payload, user_id: 'demo' })
    } else {
      const supabase = createClient()
      await supabase.from('content_items').insert({ user_id: userId, ...payload })
    }
  }

  async function handleScheduleAnswer(mode: 'written' | 'camera', text: string, q: string, date: string) {
    const basePayload = {
      type: 'story' as const,
      title: `Respuesta: ${q}`,
      service: topic,
      content_json: { question: q, answer: text, mode, topic } as unknown as Record<string, unknown>,
      caption_with_hashtags: text,
      format: mode === 'written' ? 'story-text' : 'story-camera',
    }
    // Save to library first, then schedule via scheduleItem
    if (isDemoMode) {
      const saved = demoSavePlan({ ...basePayload, user_id: 'demo', status: 'library' })
      await scheduleItem(userId, saved.id, date, isDemoMode)
    } else {
      const supabase = createClient()
      const { data } = await supabase
        .from('content_items')
        .insert({ user_id: userId, ...basePayload, status: 'library' })
        .select()
        .single()
      if (data) {
        await scheduleItem(userId, data.id, date, isDemoMode)
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl" style={{ background: '#FFF1B5' }}>
        <BraviTip message="Genera preguntas naturales para auto-preguntarte en Stories. Luego responde en vídeo o texto. ¡Es la forma más fácil de crear contenido de valor!" size={48} />
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <p className="font-semibold text-sm mb-3" style={{ color: '#1a1a1a' }}>¿Sobre qué temática?</p>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TOPICS.map(t => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: topic === t ? '#7A1832' : '#F5F0E8', color: topic === t ? 'white' : '#591427' }}
            >
              {t}
            </button>
          ))}
        </div>
        <textarea
          value={detail}
          onChange={e => setDetail(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="¿Quieres hablar de algo específico? (opcional) — Ej. cómo evitar el amarillo en las rubias…"
          className="w-full mt-4 px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
          aria-label="Detalle específico para las preguntas"
        />
        <button
          onClick={handleGenerate}
          disabled={!topic || generating}
          className="btn-primary w-full justify-center mt-4"
          style={{ opacity: !topic || generating ? 0.5 : 1 }}
        >
          <MessageSquare size={16} />
          {generating ? 'Generando preguntas...' : 'Generar preguntas'}
        </button>
      </div>

      {questions.length > 0 && (
        <div className="space-y-3">
          {questionsMock && (
            <AIUnavailableNotice demo={isDemoMode} onRetry={handleGenerate} retrying={generating} />
          )}
          <p className="font-semibold" style={{ color: '#1a1a1a' }}>
            {questions.length} preguntas sobre {topic}
          </p>
          {questions.map((q, i) => {
            const qAnswers = answers[q]
            return (
              <QuestionCard
                key={i}
                question={q}
                topic={topic}
                index={i}
                copied={copied}
                onCopy={handleCopy}
                onSave={() => handleSaveQuestion(q)}
                saved={saved.has(q)}
                onRespond={() => handleRespond(q)}
                responding={responding === q}
                answerWritten={qAnswers?.written ?? null}
                answerCamera={qAnswers?.camera ?? null}
                answerIsExample={!!qAnswers?.mock}
                isDemoMode={isDemoMode}
                onSaveAnswer={(mode, text) => handleSaveAnswer(mode, text, q)}
                onScheduleAnswer={(mode, text) => {
                  // QuestionCard manages its own date picker internally;
                  // it validates a date was selected before calling this callback.
                  // We schedule with today's date since the exact date isn't passed through.
                  handleScheduleAnswer(mode, text, q, new Date().toISOString().split('T')[0])
                }}
                onTeleprompter={(text) => {
                  // SOLO el texto que debe decir (la respuesta a cámara) — nunca la pregunta ni instrucciones.
                  openTeleprompter(
                    {
                      script: text,
                      title: `Respuesta: ${q.length > 50 ? `${q.slice(0, 50)}…` : q}`,
                      source: 'stories',
                      returnUrl: '/stories',
                    },
                    router,
                  )
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}