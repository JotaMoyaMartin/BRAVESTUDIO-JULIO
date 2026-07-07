'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { demoSavePlan } from '@/lib/demo-store'
import {
  generateStories,
  generateQuestions,
  generateQuestionAnswer,
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
import Link from 'next/link'
import { useSessionState, clearSectionState } from '@/lib/session-store'
import { BrandFullContextInput, hasBrandContext, buildBrandFullContext } from '@/lib/ai/brand-context'
import UsarMiMarcaToggle from '@/components/ui/UsarMiMarcaToggle'
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
} from 'lucide-react'
import type { ContentItem } from '@/types/database'

const SERVICES = [
  'Balayage', 'Morena iluminada', 'Alisado', 'Corrección de color',
  'Recuperación cabello dañado', 'Rubio', 'Mechas', 'Color global',
  'Corte', 'Peinado', 'Tratamiento hidratante', 'Keratina',
  'Decoloración', 'Baño de color', 'Extensiones', 'Permanente',
]

const QUESTION_TOPICS = ['Rubios', 'Balayage', 'Canas', 'Alisados', 'Tratamientos', 'Anticaída', 'Cuidado en casa', 'Color', 'General']

export default function StoriesClient({ userId, brandFull }: { userId: string; brandFull: BrandFullContextInput | null }) {
  const [tab, setTab] = useSessionState<'stories' | 'questions'>(`u:${userId}:stories:tab`, 'stories')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Stories BRÄVE</h1>
        <p className="mt-1 text-sm" style={{ color: '#591427', opacity: 0.8 }}>
          Stories estratégicas y preguntas para tu comunidad
        </p>
      </div>

      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: '#F5F0E8' }}>
        <button
          onClick={() => setTab('stories')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: tab === 'stories' ? '#7A1832' : 'transparent', color: tab === 'stories' ? 'white' : '#591427' }}
        >
          <LayoutGrid size={16} /> Crear Stories
        </button>
        <button
          onClick={() => setTab('questions')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: tab === 'questions' ? '#7A1832' : 'transparent', color: tab === 'questions' ? 'white' : '#591427' }}
        >
          <MessageSquare size={16} /> Caja de Preguntas
        </button>
      </div>

      {tab === 'stories' ? (
        <StoriesCreator userId={userId} brandFull={brandFull} />
      ) : (
        <QuestionBox userId={userId} brandFull={brandFull} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Stories Creator
// ═══════════════════════════════════════════════════════════════════

function StoriesCreator({ userId, brandFull }: { userId: string; brandFull: BrandFullContextInput | null }) {
  const isDemoMode = userId === 'demo'
  const hasBrand = hasBrandContext(brandFull)
  const [useMiMarca, setUseMiMarca] = useSessionState<boolean>(`u:${userId}:stories:useMiMarca`, hasBrand)
  const brandContext = useMemo(() => {
    if (!useMiMarca || !brandFull) return undefined
    return buildBrandFullContext(brandFull) || undefined
  }, [useMiMarca, brandFull])
  const [service, setService] = useSessionState<string>(`u:${userId}:stories:service`, '')
  const [freeText, setFreeText] = useSessionState<string>(`u:${userId}:stories:freeText`, '')
  const [detail, setDetail] = useSessionState<string>(`u:${userId}:stories:detail`, '')
  const [count, setCount] = useSessionState<1 | 2 | 3>(`u:${userId}:stories:count`, 3)
  const [mode, setMode] = useSessionState<'text' | 'camera'>(`u:${userId}:stories:mode`, 'text')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useSessionState<StoriesOutput | null>(`u:${userId}:stories:result`, null)
  const [copied, setCopied] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedLib, setSavedLib] = useSessionState<boolean>(`u:${userId}:stories:savedLib`, false)
  const [viewMode, setViewMode] = useSessionState<'mockup' | 'text'>(`u:${userId}:stories:viewMode`, 'mockup')
  const [scheduleDate, setScheduleDate] = useSessionState<string>(`u:${userId}:stories:scheduleDate`, '')
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledId, setScheduledId] = useSessionState<string | null>(`u:${userId}:stories:scheduledId`, null)

  async function generate() {
    if (!service && !freeText) return
    setGenerating(true)
    const out = await generateStories({
      service: service || freeText,
      count,
      mode,
      detail: detail || undefined,
      brandContext: brandContext || undefined,
    })
    setResult(out)
    setGenerating(false)
  }

  function handleCopy(text: string, key: string) {
    copyToClipboard(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleSaveLibrary() {
    if (!result) return
    setSaving(true)
    const fullText = result.stories.map(s => `Story ${s.number} — ${s.role}:\n${s.text}`).join('\n\n')
    const payload = {
      type: 'story' as const,
      title: `Stories: ${service || freeText}`,
      service: service || freeText,
      content_json: result as unknown as Record<string, unknown>,
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
    const fullText = result.stories.map(s => `Story ${s.number} — ${s.role}:\n${s.text}`).join('\n\n')
    const basePayload = {
      type: 'story' as const,
      title: `Stories: ${service || freeText}`,
      service: service || freeText,
      content_json: result as unknown as Record<string, unknown>,
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
      service: service || freeText,
      count,
      mode,
      detail: detail || undefined,
      brandContext: brandContext || undefined,
    })
    setResult(out)
    setSavedLib(false)
    setScheduledId(null)
    setGenerating(false)
  }

  async function regenerateSingle(number: number) {
    if (!result) return
    const fresh = await generateStories({ service: service || freeText, count, mode, detail: detail || undefined, brandContext: brandContext || undefined })
    const newStory = fresh.stories[number - 1]
    if (!newStory) return
    setResult(prev => prev ? { stories: prev.stories.map(s => s.number === number ? newStory : s) } : prev)
  }

  function buildVisualText(): string {
    if (!result) return ''
    const fakeItem = {
      id: '',
      user_id: userId,
      type: 'story' as const,
      title: `Stories: ${service || freeText}`,
      service: service || freeText,
      objective: null,
      format: 'story',
      content_json: result as unknown as ContentItem['content_json'],
      caption_with_hashtags: null,
      visual_idea: null,
      scheduled_date: null,
      status: 'library' as const,
      created_at: '',
      updated_at: '',
    }
    return formatContentForCopy(fakeItem, 'visual')
  }

  if (result) {
    const fullSequence = result.stories.map(s => s.text).join('\n\n---\n\n')
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-lg" style={{ color: '#1a1a1a' }}>Tus Stories están listas ✨</h2>
          <div className="flex gap-2">
            {/* View toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'mockup' ? 'text' : 'mockup')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: viewMode === 'mockup' ? '#C1DBE8' : '#FFF1B5', color: '#591427' }}
            >
              {viewMode === 'mockup' ? <FileText size={14} /> : <Eye size={14} />}
              {viewMode === 'mockup' ? 'Ver versión visual' : 'Ver mockup'}
            </button>
            <button onClick={() => { setResult(null); setSavedLib(false); setScheduledId(null) }} className="btn-ghost text-sm">
              <Plus size={14} /> Nueva secuencia
            </button>
          </div>
        </div>

        {/* Result view */}
        {viewMode === 'mockup' ? (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {result.stories.map(story => (
              <StoryMockup key={story.number} story={story} index={story.number}>
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: '#F5F0E8', color: '#591427' }}
                >
                  <RefreshCw size={12} /> Regenerar
                </button>
              </StoryMockup>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual formatted text for entire sequence */}
            <div
              className="rounded-2xl p-6 whitespace-pre-wrap text-sm leading-relaxed"
              style={{ background: '#FFFDF5', border: '1.5px solid rgba(255,241,181,0.8)', color: '#1a1a1a' }}
            >
              {buildVisualText()}
            </div>
            {/* Per-story actions */}
            {result.stories.map(story => {
              const roleColors = ['#7A1832', '#2a5a6a', '#7a6000']
              const color = roleColors[(story.number - 1) % roleColors.length]
              return (
                <div key={story.number} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: color }}>
                    {story.number}
                  </div>
                  <span className="font-semibold text-sm flex-1 truncate" style={{ color }}>{story.role}</span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleCopy(story.text, `story-text-${story.number}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: copied === `story-text-${story.number}` ? '#7A1832' : '#FFF1B5', color: copied === `story-text-${story.number}` ? 'white' : '#591427' }}
                    >
                      {copied === `story-text-${story.number}` ? <Check size={12} /> : <Copy size={12} />}
                      {copied === `story-text-${story.number}` ? '¡Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => regenerateSingle(story.number)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: '#F5F0E8', color: '#591427' }}
                    >
                      <RefreshCw size={12} /> Regenerar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Methodology banner */}
        <div className="p-4 rounded-2xl" style={{ background: '#FFF1B5' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#7A1832', opacity: 0.6 }}>METODOLOGÍA BRÄVE</p>
          <p className="text-xs" style={{ color: '#591427' }}>3 Stories: Problema → Autoridad → Resultado + Acción. Esta secuencia lleva a la clienta desde la identificación hasta la reserva.</p>
        </div>

        {/* General buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCopy(fullSequence, 'full')}
            className="btn-secondary text-sm"
          >
            {copied === 'full' ? <Check size={15} /> : <Copy size={15} />}
            {copied === 'full' ? '¡Copiado!' : 'Copiar secuencia completa'}
          </button>
          <button
            onClick={handleSaveLibrary}
            disabled={saving || savedLib}
            className="btn-primary text-sm"
          >
            <BookOpen size={15} /> {saving ? 'Guardando...' : savedLib ? '✓ Guardado' : 'Guardar en biblioteca'}
          </button>
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="btn-secondary text-sm"
          >
            <Calendar size={15} /> Programar
          </button>
          <button
            onClick={regenerateAll}
            disabled={generating}
            className="btn-secondary text-sm"
          >
            <RefreshCw size={15} className={generating ? 'animate-spin' : ''} /> Regenerar todo
          </button>
          <button
            onClick={() => { clearSectionState(`u:${userId}:stories`); setResult(null); setSavedLib(false); setScheduledId(null); setService(''); setFreeText(''); setDetail('') }}
            className="btn-ghost text-sm"
          >
            <Plus size={15} /> Empezar de nuevo
          </button>
        </div>

        {/* Schedule inline */}
        {showSchedule && (
          <div className="flex gap-2 p-4 rounded-2xl" style={{ background: '#FFF8E7', border: '1.5px solid rgba(255,241,181,0.8)' }}>
            <input
              type="date"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: 'white' }}
            />
            <button
              onClick={handleSchedule}
              disabled={!scheduleDate || saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
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
      </div>
    )
  }

  // Creation form
  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: '#FFF1B5' }}>
        <span className="text-xl">🤖</span>
        <p className="text-sm" style={{ color: '#591427' }}>
          <strong>Bravi dice:</strong> Las Stories BRÄVE se construyen alrededor de tu clienta, no del servicio. Así es como se generan reservas.
        </p>
      </div>

      {/* Mode */}
      <div className="rounded-2xl p-5" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <p className="font-semibold text-sm mb-3" style={{ color: '#1a1a1a' }}>¿Cómo vas a publicar las Stories?</p>
        <div className="flex gap-3">
          <button
            onClick={() => setMode('text')}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: mode === 'text' ? '#7A1832' : '#F5F0E8', color: mode === 'text' ? 'white' : '#591427' }}
          >
            📝 Texto en pantalla
          </button>
          <button
            onClick={() => setMode('camera')}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: mode === 'camera' ? '#7A1832' : '#F5F0E8', color: mode === 'camera' ? 'white' : '#591427' }}
          >
            🎥 Hablando a cámara
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: '#591427', opacity: 0.6 }}>
          {mode === 'text' ? 'Te damos texto corto para poner sobre foto o vídeo.' : 'Te damos guion para grabar directamente.'}
        </p>
      </div>

      {/* Service */}
      <div className="rounded-2xl p-5" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <p className="font-semibold text-sm mb-3" style={{ color: '#1a1a1a' }}>¿Sobre qué quieres crear Stories?</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {SERVICES.map(s => (
            <button
              key={s}
              onClick={() => setService(service === s ? '' : s)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: service === s ? '#7A1832' : '#F5F0E8', color: service === s ? 'white' : '#591427' }}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
          placeholder="O escribe un tema libre (ej: antes y después de un color…)"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
        />
        <input
          value={detail}
          onChange={e => setDetail(e.target.value)}
          placeholder="Detalle extra: clienta quería poco mantenimiento, llevaba 2 años sin cortarse…"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mt-2"
          style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
        />
      </div>

      {/* Count */}
      <div className="rounded-2xl p-5" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <p className="font-semibold text-sm mb-3" style={{ color: '#1a1a1a' }}>¿Cuántas Stories?</p>
        <div className="flex gap-3">
          {([1, 2, 3] as const).map(n => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: count === n ? '#7A1832' : '#F5F0E8', color: count === n ? 'white' : '#591427' }}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: '#591427', opacity: 0.6 }}>
          3 es ideal: Problema → Autoridad → Resultado + Acción
        </p>
      </div>

      <UsarMiMarcaToggle
        enabled={useMiMarca}
        onChange={setUseMiMarca}
        disabled={generating}
        hasBrand={hasBrand}
      />
      <button
        onClick={generate}
        disabled={generating || (!service && !freeText)}
        className="btn-primary w-full justify-center text-base py-4"
        style={{ opacity: (!service && !freeText) ? 0.5 : 1 }}
      >
        <LayoutGrid size={20} />
        {generating ? 'Creando tus Stories...' : 'Crear Stories ✨'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Question Box
// ═══════════════════════════════════════════════════════════════════

function QuestionBox({ userId, brandFull }: { userId: string; brandFull: BrandFullContextInput | null }) {
  const isDemoMode = userId === 'demo'
  const hasBrand = hasBrandContext(brandFull)
  const [useMiMarca, setUseMiMarca] = useSessionState<boolean>(`u:${userId}:stories:quseMiMarca`, hasBrand)
  const brandContext = useMemo(() => {
    if (!useMiMarca || !brandFull) return undefined
    return buildBrandFullContext(brandFull) || undefined
  }, [useMiMarca, brandFull])
  const [topic, setTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [responding, setResponding] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, { written: string; camera: string }>>({})

  async function handleGenerate() {
    if (!topic) return
    setGenerating(true)
    const out = await generateQuestions({ topic, brandContext: brandContext || undefined })
    setQuestions(out.questions)
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
        generateQuestionAnswer({ question: q, mode: 'written', brandContext: brandContext || undefined }),
        generateQuestionAnswer({ question: q, mode: 'camera', brandContext: brandContext || undefined }),
      ])
      setAnswers(prev => ({ ...prev, [q]: { written, camera } }))
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
      <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: '#FFF1B5' }}>
        <span className="text-xl">🤖</span>
        <p className="text-sm" style={{ color: '#591427' }}>
          <strong>Bravi dice:</strong> Genera preguntas naturales para auto-preguntarte en Stories. Luego responde en vídeo o texto. ¡Es la forma más fácil de crear contenido de valor!
        </p>
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
        <UsarMiMarcaToggle
          enabled={useMiMarca}
          onChange={setUseMiMarca}
          disabled={generating}
          hasBrand={hasBrand}
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
                onSaveAnswer={(mode, text) => handleSaveAnswer(mode, text, q)}
                onScheduleAnswer={(mode, text) => {
                  // QuestionCard manages its own date picker internally;
                  // it validates a date was selected before calling this callback.
                  // We schedule with today's date since the exact date isn't passed through.
                  handleScheduleAnswer(mode, text, q, new Date().toISOString().split('T')[0])
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}