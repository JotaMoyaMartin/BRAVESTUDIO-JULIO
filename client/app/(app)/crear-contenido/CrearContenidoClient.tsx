'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { saveToLibrary } from '@/lib/content-utils'
import { generateReel, ReelOutput, ContentObjective } from '@/lib/ai/prompts/reels'
import { generateCarousel, CarouselOutput } from '@/lib/ai/prompts/carousels'
import { useSessionState, clearSectionState } from '@/lib/session-store'
import { buildBrandFullContext, hasBrandContext, BrandFullContextInput } from '@/lib/ai/brand-context'
import UsarMiMarcaToggle from '@/components/ui/UsarMiMarcaToggle'
import { Film, LayoutGrid, Copy, BookOpen, Calendar, RefreshCw, Trash2, Check, ArrowRight } from 'lucide-react'

const SERVICES = ['Balayage', 'Rubios', 'Canas', 'Alisados', 'Tratamientos', 'Corte', 'Color', 'General']

type ContentType = 'reel' | 'carrusel'
type Objective = ContentObjective

export default function CrearContenidoClient({
  userId,
  brandFull,
  initialService,
  initialType,
  initialTema,
  initialContexto,
}: {
  userId: string
  brandFull: BrandFullContextInput | null
  initialService?: string | null
  initialType?: 'reel' | 'carrusel' | null
  initialTema?: string | null
  initialContexto?: string | null
}) {
  const isDemoMode = userId === 'demo'
  const hasBrand = hasBrandContext(brandFull)
  const [useMiMarca, setUseMiMarca] = useSessionState<boolean>(`u:${userId}:crear:useMiMarca`, hasBrand)

  // Contexto efectivo que se pasa a los prompts
  const brandContext = useMemo(() => {
    if (!useMiMarca || !brandFull) return undefined
    return buildBrandFullContext(brandFull) || undefined
  }, [useMiMarca, brandFull])

  // If a service or tema was passed via URL, jump directly to objective step
  const skipToObjective = !!(initialService || initialTema)
  const [step, setStep] = useSessionState<'type' | 'topic' | 'objective' | 'result'>(`u:${userId}:crear:step`,
    skipToObjective ? 'objective' : 'type'
  )
  const [contentType, setContentType] = useSessionState<ContentType>(`u:${userId}:crear:contentType`, initialType || 'reel')
  const [service, setService] = useSessionState<string>(`u:${userId}:crear:service`, initialService || '')
  const [freeText, setFreeText] = useSessionState<string>(`u:${userId}:crear:freeText`, initialTema || '')
  const [objective, setObjective] = useSessionState<Objective>(`u:${userId}:crear:objective`, 'autoridad')
  const [slideCount, setSlideCount] = useSessionState<number>(`u:${userId}:crear:slideCount`, 5)
  const [generating, setGenerating] = useState(false)
  const [reelResult, setReelResult] = useSessionState<ReelOutput | null>(`u:${userId}:crear:reelResult`, null)
  const [carouselResult, setCarouselResult] = useSessionState<CarouselOutput | null>(`u:${userId}:crear:carouselResult`, null)
  const [copied, setCopied] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedPlan, setSavedPlan] = useSessionState<boolean>(`u:${userId}:crear:savedPlan`, false)
  const [scheduling, setScheduling] = useState(false)
  const [scheduledDate, setScheduledDate] = useSessionState<string>(`u:${userId}:crear:scheduledDate`, '')
  const [savedScheduled, setSavedScheduled] = useSessionState<boolean>(`u:${userId}:crear:savedScheduled`, false)

  async function generate() {
    setGenerating(true)
    const topicService = service || freeText || 'General'

    if (contentType === 'reel') {
      const result = await generateReel({ service: topicService, objective, brandContext, freeText })
      setReelResult(result)
    } else {
      const result = await generateCarousel({ service: topicService, objective, slideCount, brandContext, freeText })
      setCarouselResult(result)
    }
    setGenerating(false)
    setStep('result')
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function buildPayload(overrides?: Partial<Record<string, unknown>>) {
    return {
      type: contentType,
      title: reelResult?.title || carouselResult?.title || '',
      service: service || freeText,
      objective,
      content_json: (reelResult || carouselResult) as unknown as Record<string, unknown>,
      caption_with_hashtags: reelResult?.captionWithHashtags || carouselResult?.captionWithHashtags || null,
      visual_idea: reelResult?.visualIdea || carouselResult?.visualIdea || null,
      status: 'library' as const,
      format: contentType,
      scheduled_date: null,
      ...overrides,
    }
  }

  async function saveToLibraryHandler() {
    setSaving(true)
    const payload = buildPayload()
    await saveToLibrary(userId, payload, isDemoMode)
    setSaving(false)
    setSavedPlan(true)
  }

  async function scheduleHandler() {
    if (!scheduledDate) return
    setSaving(true)
    const payload = buildPayload({ status: 'scheduled', scheduled_date: scheduledDate })
    await saveToLibrary(userId, payload, isDemoMode)
    setSaving(false)
    setSavedScheduled(true)
    setSavedPlan(true)
    setScheduling(false)
  }

  function reset() {
    clearSectionState(`u:${userId}:crear`)
    setStep(skipToObjective ? 'objective' : 'type')
    setReelResult(null)
    setCarouselResult(null)
    setService(initialService || '')
    setFreeText(initialTema || '')
    setSavedPlan(false)
    setSavedScheduled(false)
    setScheduling(false)
    setScheduledDate('')
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Crear Contenido</h1>
        <p className="mt-1 text-sm" style={{ color: '#591427', opacity: 0.8 }}>Reels y carruseles listos para publicar</p>
      </div>

      {step !== 'result' && (
        <div className="flex items-center gap-2">
          {(skipToObjective
            ? [['objective', 'Objetivo']]
            : [['type', 'Tipo'], ['topic', 'Tema'], ['objective', 'Objetivo']]
          ).map(([id, label], i) => {
            const allSteps = skipToObjective ? ['objective'] : ['type', 'topic', 'objective']
            const current = allSteps.indexOf(step)
            return (
              <div key={id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: i <= current ? '#7A1832' : '#F5F0E8',
                      color: i <= current ? 'white' : '#591427',
                    }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-xs hidden sm:block" style={{ color: i <= current ? '#7A1832' : '#591427', opacity: i <= current ? 1 : 0.5 }}>{label}</span>
                </div>
                {i < allSteps.length - 1 && <div className="w-6 h-0.5" style={{ background: i < current ? '#7A1832' : '#F5F0E8' }} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Step 1: Type */}
      {step === 'type' && (
        <div className="space-y-4">
          <p className="font-semibold" style={{ color: '#1a1a1a' }}>¿Qué quieres crear?</p>
          <div className="grid grid-cols-2 gap-4">
            {([
              ['reel', 'Reel', Film, 'Guion de 40-50 segundos'],
              ['carrusel', 'Carrusel', LayoutGrid, 'Slides listos para diseñar'],
            ] as const).map(([val, lbl, Icon, desc]) => (
              <button
                key={val}
                onClick={() => { setContentType(val); setStep('topic') }}
                className="p-6 rounded-2xl text-left transition-all hover:scale-105"
                style={{ background: 'white', border: '2px solid rgba(255,241,181,0.8)', boxShadow: '0 2px 12px rgba(90,20,39,0.07)' }}
              >
                <Icon size={28} style={{ color: '#7A1832' }} />
                <p className="font-bold mt-3" style={{ color: '#1a1a1a' }}>{lbl}</p>
                <p className="text-xs mt-1" style={{ color: '#591427', opacity: 0.7 }}>{desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Topic */}
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
                  style={{
                    background: service === s ? '#7A1832' : '#F5F0E8',
                    color: service === s ? 'white' : '#591427',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm mb-2" style={{ color: '#591427', opacity: 0.7 }}>O escribe tu idea:</p>
            <input
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder="Ej: por qué el protector térmico es importante..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(initialService ? 'objective' : 'type')} className="btn-ghost">Atrás</button>
            <button
              onClick={() => setStep('objective')}
              disabled={!service && !freeText}
              className="btn-primary flex-1 justify-center"
              style={{ opacity: !service && !freeText ? 0.5 : 1 }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Objective */}
      {step === 'objective' && (
        <div className="space-y-4">
          {service && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>Sobre:</span>
              <span className="px-3 py-1 rounded-xl text-sm font-semibold" style={{ background: '#7A1832', color: 'white' }}>{service}</span>
              <span className="px-3 py-1 rounded-xl text-sm font-semibold" style={{ background: '#F5F0E8', color: '#591427' }}>{contentType === 'reel' ? 'Reel' : 'Carrusel'}</span>
              {!skipToObjective && (
                <button onClick={() => setStep('topic')} className="text-xs underline" style={{ color: '#7A1832', opacity: 0.7 }}>Cambiar</button>
              )}
            </div>
          )}
          {freeText && !service && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>Idea:</span>
              <span className="px-3 py-1 rounded-xl text-sm font-semibold" style={{ background: '#7A1832', color: 'white' }}>{freeText}</span>
              <span className="px-3 py-1 rounded-xl text-sm font-semibold" style={{ background: '#F5F0E8', color: '#591427' }}>Reel</span>
            </div>
          )}
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
                style={{
                  background: objective === val ? '#7A1832' : '#F5F0E8',
                  color: objective === val ? 'white' : '#591427',
                }}
              >
                <p className="font-semibold">{lbl}</p>
                <p className="text-xs mt-0.5 opacity-80">{desc}</p>
              </button>
            ))}
          </div>

          {contentType === 'carrusel' && (
            <div className="rounded-2xl p-4" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: '#1a1a1a' }}>¿Cuántas slides quieres?</p>
              <div className="flex gap-2">
                {[3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setSlideCount(n)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                    style={{ background: slideCount === n ? '#7A1832' : '#F5F0E8', color: slideCount === n ? 'white' : '#591427' }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <UsarMiMarcaToggle
            enabled={useMiMarca}
            onChange={setUseMiMarca}
            disabled={generating}
            hasBrand={hasBrand}
          />

          <div className="flex gap-3">
            {!skipToObjective && (
              <button onClick={() => setStep('topic')} className="btn-ghost">Atrás</button>
            )}
            <button onClick={generate} disabled={generating} className="btn-primary flex-1 justify-center">
              {generating ? 'Creando contenido...' : 'Crear contenido ✨'}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {step === 'result' && reelResult && (
        <ReelResult
          result={reelResult}
          onRegenerate={generate}
          onSave={saveToLibraryHandler}
          onSchedule={scheduleHandler}
          onNew={reset}
          saving={saving}
          savedPlan={savedPlan}
          scheduling={scheduling}
          setScheduling={setScheduling}
          scheduledDate={scheduledDate}
          setScheduledDate={setScheduledDate}
          savedScheduled={savedScheduled}
          CopyBtn={CopyBtn}
          generating={generating}
        />
      )}

      {step === 'result' && carouselResult && (
        <CarouselResult
          result={carouselResult}
          onRegenerate={generate}
          onSave={saveToLibraryHandler}
          onSchedule={scheduleHandler}
          onNew={reset}
          saving={saving}
          savedPlan={savedPlan}
          scheduling={scheduling}
          setScheduling={setScheduling}
          scheduledDate={scheduledDate}
          setScheduledDate={setScheduledDate}
          savedScheduled={savedScheduled}
          CopyBtn={CopyBtn}
          generating={generating}
        />
      )}
    </div>
  )
}

function ReelResult({ result, onRegenerate, onSave, onSchedule, onNew, saving, savedPlan, scheduling, setScheduling, scheduledDate, setScheduledDate, savedScheduled, CopyBtn, generating }: {
  result: ReelOutput
  onRegenerate: () => void
  onSave: () => void
  onSchedule: () => void
  onNew: () => void
  saving: boolean
  savedPlan: boolean
  scheduling: boolean
  setScheduling: (v: boolean) => void
  scheduledDate: string
  setScheduledDate: (v: string) => void
  savedScheduled: boolean
  CopyBtn: React.ComponentType<{ text: string; id: string; label?: string }>
  generating: boolean
}) {
  const fullScript = `GANCHO:\n${result.script.hook}\n\nCONTEXTO:\n${result.script.context}\n\nSOLUCIÓN:\n${result.script.solution}\n\nCTA:\n${result.script.cta}`

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Film size={20} style={{ color: '#7A1832' }} />
          <h2 className="font-bold text-lg" style={{ color: '#1a1a1a' }}>Tu Reel está listo ✨</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onRegenerate} disabled={generating} className="btn-ghost text-sm">
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} /> Regenerar
          </button>
          <button onClick={onNew} className="btn-ghost text-sm">
            <Trash2 size={14} /> Nuevo
          </button>
        </div>
      </div>

      {/* Title + cover */}
      <div className="p-5 rounded-2xl" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#7A1832', opacity: 0.6 }}>TÍTULO</p>
        <p className="font-bold text-lg" style={{ color: '#1a1a1a' }}>{result.title}</p>
        <p className="text-sm mt-2" style={{ color: '#591427', opacity: 0.7 }}>
          <strong>Portada:</strong> {result.coverText}
        </p>
      </div>

      {/* Script */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,241,181,0.5)' }}>
          <p className="font-semibold" style={{ color: '#1a1a1a' }}>Guion BRÄVE</p>
          <CopyBtn text={fullScript} id="script" label="Copiar guion" />
        </div>
        {([
          ['GANCHO', result.script.hook, '#7A1832'],
          ['CONTEXTO', result.script.context, '#591427'],
          ['SOLUCIÓN', result.script.solution, '#2a5a6a'],
          ['CTA', result.script.cta, '#7a6000'],
        ] as const).map(([label, text, color]) => (
          <div key={label} className="px-5 py-4 border-b last:border-0" style={{ borderColor: 'rgba(255,241,181,0.3)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(122,24,50,0.08)', color }}>
                  {label}
                </span>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: '#1a1a1a' }}>{text}</p>
              </div>
              <CopyBtn text={text} id={label} />
            </div>
          </div>
        ))}
      </div>

      {/* Visual idea */}
      <div className="p-4 rounded-2xl" style={{ background: '#C1DBE8' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#2a5a6a', opacity: 0.7 }}>💡 IDEA VISUAL</p>
        <p className="text-sm" style={{ color: '#1a3a4a' }}>{result.visualIdea}</p>
      </div>

      {/* Caption */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,241,181,0.5)' }}>
          <p className="font-semibold" style={{ color: '#1a1a1a' }}>Publicación para Instagram</p>
          <CopyBtn text={result.captionWithHashtags} id="caption" label="Copiar publicación" />
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#1a1a1a' }}>{result.captionWithHashtags}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={onSave} disabled={saving || savedPlan} className="btn-primary text-sm">
          <BookOpen size={15} /> {saving ? 'Guardando...' : savedPlan ? '✓ Guardado' : 'Guardar en biblioteca'}
        </button>
        {!savedPlan && (
          <button onClick={() => setScheduling(!scheduling)} disabled={saving} className="btn-ghost text-sm">
            <Calendar size={15} /> Programar
          </button>
        )}
        {scheduling && !savedScheduled && (
          <div className="flex items-center gap-2 w-full mt-1">
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5', color: '#591427' }}
            />
            <button
              onClick={onSchedule}
              disabled={saving || !scheduledDate}
              className="btn-primary text-sm"
              style={{ opacity: !scheduledDate ? 0.5 : 1 }}
            >
              {saving ? 'Guardando...' : 'Confirmar fecha'}
            </button>
          </div>
        )}
        {savedScheduled && (
          <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#7A1832' }}>
            <Check size={14} /> Programado para {scheduledDate}
          </span>
        )}
        {savedPlan && !savedScheduled && (
          <Link href="/biblioteca" className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#7A1832' }}>
            Ver en biblioteca <ArrowRight size={14} />
          </Link>
        )}
        {savedScheduled && (
          <Link href="/calendario" className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#7A1832' }}>
            Ver en calendario <ArrowRight size={14} />
          </Link>
        )}
        <button onClick={onNew} className="btn-ghost text-sm">
          <Trash2 size={15} /> Nuevo
        </button>
      </div>
    </div>
  )
}

function CarouselResult({ result, onRegenerate, onSave, onSchedule, onNew, saving, savedPlan, scheduling, setScheduling, scheduledDate, setScheduledDate, savedScheduled, CopyBtn, generating }: {
  result: CarouselOutput
  onRegenerate: () => void
  onSave: () => void
  onSchedule: () => void
  onNew: () => void
  saving: boolean
  savedPlan: boolean
  scheduling: boolean
  setScheduling: (v: boolean) => void
  scheduledDate: string
  setScheduledDate: (v: string) => void
  savedScheduled: boolean
  CopyBtn: React.ComponentType<{ text: string; id: string; label?: string }>
  generating: boolean
}) {
  const allSlides = result.slides.map(s => `SLIDE ${s.number} — ${s.role}:\n${s.text}`).join('\n\n')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutGrid size={20} style={{ color: '#7A1832' }} />
          <h2 className="font-bold text-lg" style={{ color: '#1a1a1a' }}>Tu Carrusel está listo ✨</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onRegenerate} disabled={generating} className="btn-ghost text-sm">
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} /> Regenerar
          </button>
          <button onClick={onNew} className="btn-ghost text-sm">
            <Trash2 size={14} /> Nuevo
          </button>
        </div>
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <p className="font-bold text-lg" style={{ color: '#1a1a1a' }}>{result.title}</p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,241,181,0.5)' }}>
          <p className="font-semibold" style={{ color: '#1a1a1a' }}>Slides del carrusel</p>
          <CopyBtn text={allSlides} id="slides" label="Copiar todo" />
        </div>
        {result.slides.map(slide => (
          <div key={slide.number} className="px-5 py-4 border-b last:border-0 flex items-start gap-4" style={{ borderColor: 'rgba(255,241,181,0.3)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: '#7A1832', color: 'white' }}>
              {slide.number}
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold" style={{ color: '#7A1832' }}>{slide.role}</span>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: '#1a1a1a' }}>{slide.text}</p>
            </div>
            <CopyBtn text={slide.text} id={`slide-${slide.number}`} />
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl" style={{ background: '#C1DBE8' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#2a5a6a', opacity: 0.7 }}>💡 IDEA VISUAL</p>
        <p className="text-sm" style={{ color: '#1a3a4a' }}>{result.visualIdea}</p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,241,181,0.5)' }}>
          <p className="font-semibold" style={{ color: '#1a1a1a' }}>Publicación para Instagram</p>
          <CopyBtn text={result.captionWithHashtags} id="caption" label="Copiar publicación" />
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#1a1a1a' }}>{result.captionWithHashtags}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={onSave} disabled={saving || savedPlan} className="btn-primary text-sm">
          <BookOpen size={15} /> {saving ? 'Guardando...' : savedPlan ? '✓ Guardado' : 'Guardar en biblioteca'}
        </button>
        {!savedPlan && (
          <button onClick={() => setScheduling(!scheduling)} disabled={saving} className="btn-ghost text-sm">
            <Calendar size={15} /> Programar
          </button>
        )}
        {scheduling && !savedScheduled && (
          <div className="flex items-center gap-2 w-full mt-1">
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5', color: '#591427' }}
            />
            <button
              onClick={onSchedule}
              disabled={saving || !scheduledDate}
              className="btn-primary text-sm"
              style={{ opacity: !scheduledDate ? 0.5 : 1 }}
            >
              {saving ? 'Guardando...' : 'Confirmar fecha'}
            </button>
          </div>
        )}
        {savedScheduled && (
          <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#7A1832' }}>
            <Check size={14} /> Programado para {scheduledDate}
          </span>
        )}
        {savedPlan && !savedScheduled && (
          <Link href="/biblioteca" className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#7A1832' }}>
            Ver en biblioteca <ArrowRight size={14} />
          </Link>
        )}
        {savedScheduled && (
          <Link href="/calendario" className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#7A1832' }}>
            Ver en calendario <ArrowRight size={14} />
          </Link>
        )}
        <button onClick={onNew} className="btn-ghost text-sm">
          <Trash2 size={15} /> Nuevo
        </button>
      </div>
    </div>
  )
}
