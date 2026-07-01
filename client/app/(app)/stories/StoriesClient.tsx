'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { demoSavePlan } from '@/lib/demo-store'
import { generateStories, getMockQuestions, StoriesOutput, SingleStory } from '@/lib/ai/prompts/stories'
import { LayoutGrid, MessageSquare, Copy, BookOpen, Calendar, RefreshCw, Check } from 'lucide-react'

const SERVICES = [
  'Balayage', 'Morena iluminada', 'Alisado', 'Corrección de color',
  'Recuperación cabello dañado', 'Rubio', 'Mechas', 'Color global',
  'Corte', 'Peinado', 'Tratamiento hidratante', 'Keratina',
  'Decoloración', 'Baño de color', 'Extensiones', 'Permanente',
]

const QUESTION_TOPICS = ['Rubios', 'Balayage', 'Canas', 'Alisados', 'Tratamientos', 'Anticaída', 'Cuidado en casa', 'Color', 'General']

export default function StoriesClient({ userId, brandContext }: { userId: string; brandContext: string | null }) {
  const [tab, setTab] = useState<'stories' | 'questions'>('stories')

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
        <StoriesCreator userId={userId} brandContext={brandContext} />
      ) : (
        <QuestionBox userId={userId} />
      )}
    </div>
  )
}

function StoriesCreator({ userId, brandContext }: { userId: string; brandContext: string | null }) {
  const [service, setService] = useState('')
  const [freeText, setFreeText] = useState('')
  const [detail, setDetail] = useState('')
  const [count, setCount] = useState<1 | 2 | 3>(3)
  const [mode, setMode] = useState<'text' | 'camera'>('text')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<StoriesOutput | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedLib, setSavedLib] = useState(false)

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

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function saveToLibrary() {
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
    if (userId !== 'demo') {
      const supabase = createClient()
      await supabase.from('content_items').insert({ user_id: userId, ...payload })
    } else {
      demoSavePlan(payload)
    }
    setSaving(false)
    setSavedLib(true)
  }

  function CopyBtn({ text, id, label = 'Copiar' }: { text: string; id: string; label?: string }) {
    return (
      <button
        onClick={() => copyText(text, id)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{ background: copied === id ? '#7A1832' : '#FFF1B5', color: copied === id ? 'white' : '#591427' }}
      >
        {copied === id ? <Check size={12} /> : <Copy size={12} />}
        {copied === id ? '¡Copiado!' : label}
      </button>
    )
  }

  async function regenerateSingle(number: number) {
    if (!result) return
    const fresh = await generateStories({ service: service || freeText, count, mode, detail: detail || undefined })
    const newStory = fresh.stories[number - 1]
    if (!newStory) return
    setResult(prev => prev ? { stories: prev.stories.map(s => s.number === number ? newStory : s) } : prev)
  }

  if (result) {
    const fullSequence = result.stories.map(s => s.text).join('\n\n---\n\n')
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-lg" style={{ color: '#1a1a1a' }}>Tus Stories están listas ✨</h2>
          <div className="flex gap-2">
            <button onClick={() => setResult(null)} className="btn-ghost text-sm">Nueva secuencia</button>
            <button onClick={generate} disabled={generating} className="btn-ghost text-sm">
              <RefreshCw size={14} className={generating ? 'animate-spin' : ''} /> Regenerar
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {result.stories.map(story => (
            <StoryCard key={story.number} story={story} CopyBtn={CopyBtn} onRegenerate={() => regenerateSingle(story.number)} />
          ))}
        </div>

        <div className="p-4 rounded-2xl" style={{ background: '#FFF1B5' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#7A1832', opacity: 0.6 }}>METODOLOGÍA BRÄVE</p>
          <p className="text-xs" style={{ color: '#591427' }}>3 Stories: Problema → Autoridad → Resultado + Acción. Esta secuencia lleva a la clienta desde la identificación hasta la reserva.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => copyText(fullSequence, 'full')} className="btn-secondary text-sm">
            {copied === 'full' ? <Check size={15} /> : <Copy size={15} />}
            {copied === 'full' ? '¡Copiado!' : 'Copiar secuencia completa'}
          </button>
          <button onClick={saveToLibrary} disabled={saving || savedLib} className="btn-primary text-sm">
            <BookOpen size={15} /> {saving ? 'Guardando...' : savedLib ? '✓ Guardado en planificación' : 'Guardar en planificación'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: '#FFF1B5' }}>
        <span className="text-xl">🤖</span>
        <p className="text-sm" style={{ color: '#591427' }}>
          <strong>Bravi dice:</strong> Las Stories BRÄVE se construyen alrededor de tu clienta, no del servicio. Así es como se generan reservas.
        </p>
      </div>

      {/* Mode — primer paso */}
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

function StoryCard({ story, CopyBtn, onRegenerate }: { story: SingleStory; CopyBtn: React.ComponentType<{ text: string; id: string; label?: string }>; onRegenerate: () => void }) {
  const roleColors = ['#7A1832', '#2a5a6a', '#7a6000']
  const color = roleColors[(story.number - 1) % roleColors.length]

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1.5px solid rgba(255,241,181,0.5)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: color }}>
            {story.number}
          </div>
          <span className="font-semibold text-sm" style={{ color }}>Story {story.number}: {story.role}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onRegenerate} className="p-1.5 rounded-lg hover:bg-gray-50">
            <RefreshCw size={14} style={{ color: '#7A1832' }} />
          </button>
          <CopyBtn text={story.text} id={`story-${story.number}`} />
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm leading-relaxed" style={{ color: '#1a1a1a' }}>{story.text}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {story.stickerSuggestion && (
            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: '#FFF1B5', color: '#591427' }}>
              🏷️ {story.stickerSuggestion}
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: '#591427', opacity: 0.7 }}>
          📸 {story.visualIdea}
        </p>
      </div>
    </div>
  )
}

function QuestionBox({ userId }: { userId: string }) {
  const [topic, setTopic] = useState('')
  const [questions, setQuestions] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [activeResponse, setActiveResponse] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())

  function generate() {
    if (!topic) return
    setQuestions(getMockQuestions(topic).questions)
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function saveQuestion(q: string) {
    if (userId !== 'demo') {
      const supabase = createClient()
      await supabase.from('content_items').insert({
        user_id: userId,
        type: 'story' as const,
        title: q,
        service: topic,
        content_json: { question: q, topic },
        status: 'library' as const,
      })
    }
    setSaved(prev => { const s = new Set(Array.from(prev)); s.add(q); return s })
  }

  const mockResponse = (q: string) =>
    `Buena pregunta. ${q.replace('¿', '').replace('?', '')} es algo que me preguntan mucho. La clave está en entender tu tipo de cabello y sus necesidades específicas. En mi salón siempre hago un diagnóstico previo para darte la recomendación más adecuada para ti. Si quieres que hablemos sobre tu caso concreto, escríbeme. 💌`

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
        <button
          onClick={generate}
          disabled={!topic}
          className="btn-primary w-full justify-center mt-4"
          style={{ opacity: !topic ? 0.5 : 1 }}
        >
          <MessageSquare size={16} />
          Generar preguntas
        </button>
      </div>

      {questions.length > 0 && (
        <div className="space-y-3">
          <p className="font-semibold" style={{ color: '#1a1a1a' }}>
            {questions.length} preguntas sobre {topic}
          </p>
          {questions.map((q, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
              <div className="px-4 py-3 flex items-start justify-between gap-3">
                <p className="text-sm font-medium flex-1" style={{ color: '#1a1a1a' }}>{q}</p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => copyText(q, `q-${i}`)}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: copied === `q-${i}` ? '#7A1832' : '#FFF1B5' }}
                  >
                    {copied === `q-${i}` ? <Check size={13} style={{ color: 'white' }} /> : <Copy size={13} style={{ color: '#591427' }} />}
                  </button>
                  <button
                    onClick={() => setActiveResponse(activeResponse === q ? null : q)}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: activeResponse === q ? '#7A1832' : '#F5F0E8' }}
                  >
                    <MessageSquare size={13} style={{ color: activeResponse === q ? 'white' : '#591427' }} />
                  </button>
                  <button
                    onClick={() => saveQuestion(q)}
                    disabled={saved.has(q)}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: saved.has(q) ? '#7A1832' : '#F5F0E8' }}
                  >
                    <BookOpen size={13} style={{ color: saved.has(q) ? 'white' : '#591427' }} />
                  </button>
                </div>
              </div>
              {activeResponse === q && (
                <div className="px-4 pb-4 pt-0 space-y-3 border-t" style={{ borderColor: 'rgba(255,241,181,0.5)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider pt-3" style={{ color: '#7A1832', opacity: 0.6 }}>RESPUESTA SUGERIDA</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#1a1a1a' }}>{mockResponse(q)}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyText(mockResponse(q), `resp-${i}`)}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      {copied === `resp-${i}` ? <Check size={12} /> : <Copy size={12} />}
                      {copied === `resp-${i}` ? '¡Copiado!' : 'Copiar respuesta'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
