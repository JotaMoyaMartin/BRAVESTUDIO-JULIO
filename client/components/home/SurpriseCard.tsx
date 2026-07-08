'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Shuffle, Sparkles, ArrowRight, Loader2, ChevronDown, ChevronUp, Copy, Check, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateAIContent, extractJSON } from '@/lib/ai/client'
import { generateReel, ReelOutput, ContentObjective } from '@/lib/ai/prompts/reels'
import { generateCarousel, CarouselOutput } from '@/lib/ai/prompts/carousels'
import { saveToLibrary } from '@/lib/content-utils'

interface SurpriseIdea {
  type: 'reel' | 'carrusel' | 'story'
  service: string
  objective: string
  idea: string
}

const FALLBACK_POOL: SurpriseIdea[] = [
  { type: 'reel', service: 'Balayage', objective: 'Autoridad', idea: 'La verdad sobre el balayage que nadie te cuenta' },
  { type: 'reel', service: 'Canas', objective: 'Autoridad', idea: 'Por qué cada vez más mujeres abrazan sus canas' },
  { type: 'carrusel', service: 'Tratamientos', objective: 'Visibilidad', idea: '5 señales de que tu cabello necesita un tratamiento' },
  { type: 'reel', service: 'Rubios', objective: 'Reservas', idea: 'Antes y después: de rubio apagado a luminoso' },
  { type: 'carrusel', service: 'Alisados', objective: 'Autoridad', idea: 'Tipos de alisado: ¿cuál es el tuyo?' },
  { type: 'reel', service: 'Color', objective: 'Visibilidad', idea: 'Los colores que más piden mis clientas este otoño' },
  { type: 'carrusel', service: 'Corte', objective: 'Autoridad', idea: '3 cortes que favorecen a todas las caras' },
  { type: 'reel', service: 'Balayage', objective: 'Reservas', idea: 'Así quedó la clienta que llevaba 3 años posponiéndolo' },
  { type: 'carrusel', service: 'Rubios', objective: 'Autoridad', idea: 'Mitos y verdades sobre el cabello rubio' },
  { type: 'reel', service: 'Canas', objective: 'Reservas', idea: 'Cómo cambia el look de esta clienta con un color natural' },
  { type: 'carrusel', service: 'Tratamientos', objective: 'Educativo', idea: 'La diferencia entre hidratación y nutrición capilar' },
  { type: 'reel', service: 'Alisados', objective: 'Visibilidad', idea: '¿Cuánto dura realmente un alisado? La respuesta te sorprende' },
]

function mapObjective(obj: string): ContentObjective {
  const o = obj.toLowerCase()
  if (o.includes('reserv')) return 'reservas'
  if (o.includes('visib')) return 'visibilidad'
  if (o.includes('educ')) return 'educativo'
  if (o.includes('consej')) return 'consejos'
  if (o.includes('vent')) return 'venta'
  return 'autoridad'
}

interface SurpriseCardProps {
  brandContext?: string
  userId?: string
}

export default function SurpriseCard({ brandContext, userId }: SurpriseCardProps) {
  const [idea, setIdea] = useState<SurpriseIdea | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [generatingScript, setGeneratingScript] = useState(false)
  const [script, setScript] = useState<ReelOutput | CarouselOutput | null>(null)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSaveLibrary() {
    if (!script || !idea || !userId) return
    setSaving(true)
    try {
      const objective = mapObjective(idea.objective)
      const payload: Record<string, unknown> = {
        type: idea.type,
        title: idea.idea,
        service: idea.service,
        objective,
        content_json: script as unknown as Record<string, unknown>,
        caption_with_hashtags: ('captionWithHashtags' in script ? script.captionWithHashtags : null) as string | null,
        format: idea.type,
        visual_idea: ('visualIdea' in script ? script.visualIdea : null) as string | null,
        scheduled_date: null,
      }
      await saveToLibrary(userId, payload, userId === 'demo')
      setSaved(true)
    } catch (e) {
      console.error('save to library failed:', e)
    }
    setSaving(false)
  }

  async function handleSurprise() {
    setLoading(true)
    setExpanded(false)
    setScript(null)
    setSaved(false)
    try {
      const prompt = `Eres un generador de ideas de contenido para una estilista profesional. Responde SOLO con un JSON válido, sin texto adicional.
${brandContext ? `Contexto de marca: ${brandContext}` : 'Contexto: estilista general'}

Genera UNA idea sorpresa de contenido para Instagram. El formato debe ser:
{"type": "reel" | "carrusel", "service": "uno de: Balayage, Rubios, Canas, Alisados, Tratamientos, Corte, Color", "objective": "uno de: Autoridad, Visibilidad, Reservas, Educativo", "idea": "título atractivo y concreto del contenido, máximo 12 palabras, en español"}

Sé creativa, específica y evita clichés.`
      const raw = await generateAIContent(prompt)
      const parsed = extractJSON<SurpriseIdea>(raw)
      if (parsed && parsed.idea && parsed.service) {
        setIdea(parsed)
      } else {
        throw new Error('bad json')
      }
    } catch {
      const pool = idea ? FALLBACK_POOL.filter(s => s.idea !== idea.idea) : FALLBACK_POOL
      setIdea(pool[Math.floor(Math.random() * pool.length)])
    }
    setLoading(false)
  }

  async function handleExpand() {
    if (!idea) return
    if (script) {
      setExpanded(!expanded)
      return
    }
    setGeneratingScript(true)
    setExpanded(true)
    try {
      const objective = mapObjective(idea.objective)
      if (idea.type === 'carrusel') {
        const result = await generateCarousel({
          service: idea.service,
          objective,
          freeText: idea.idea,
          brandContext,
          slideCount: 6,
        })
        setScript(result)
      } else {
        const result = await generateReel({
          service: idea.service,
          objective,
          freeText: idea.idea,
          brandContext,
        })
        setScript(result)
      }
    } catch {
      // Si falla, mantener la idea visible pero sin script
      setExpanded(true)
    }
    setGeneratingScript(false)
  }

  function copyScript() {
    if (!script) return
    let text = ''
    if ('script' in script && script.script) {
      const s = script.script
      text = `${idea?.idea || ''}\n\nGANCHO: ${s.hook}\nCONTEXTO: ${s.context}\nSOLUCIÓN: ${s.solution}\nCTA: ${s.cta}\n\nIDEA VISUAL: ${(script as ReelOutput).visualIdea}\n\nCAPTION:\n${(script as ReelOutput).captionWithHashtags}`
    } else if ('slides' in script) {
      const c = script as CarouselOutput
      text = `${idea?.idea || ''}\n\n${c.slides?.map((s, i) => `Slide ${i + 1}: ${s.role}\n${s.text}`).join('\n\n') || ''}\n\nCAPTION:\n${c.captionWithHashtags || ''}`
    }
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="rounded-[var(--radius-lg)] p-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)',
        color: 'white',
      }}
    >
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20"
        style={{ background: 'var(--color-buttermilk)' }}
      />

      <div className="relative flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-[var(--radius-sm)] flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Sorpréndeme</h2>
            <p className="text-xs opacity-80">No sabes qué publicar? Bravi te propone una idea</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSurprise}
        disabled={loading}
        className="w-full py-3 rounded-[var(--radius-sm)] font-semibold text-sm transition-all hover:scale-[1.01] disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2"
        style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Pensando…
          </>
        ) : (
          <>
            <Shuffle size={16} />
            {idea ? 'Otra idea' : 'Dame una idea'}
          </>
        )}
      </button>

      <AnimatePresence mode="wait">
        {idea && !loading && (
          <motion.div
            key={idea.idea}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-4 space-y-3"
          >
            {/* Idea card — clickable to expand and generate script */}
            <button
              onClick={handleExpand}
              className="w-full text-left p-4 rounded-[var(--radius-md)] transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>
                  {idea.type}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  {idea.service}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  {idea.objective}
                </span>
                <span className="ml-auto flex-shrink-0">
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </div>
              <p className="font-semibold text-sm leading-snug">{idea.idea}</p>
              <p className="text-xs opacity-60 mt-1.5">
                {expanded ? 'Toca para ocultar el guion' : 'Toca para ver el guion completo →'}
              </p>
            </button>

            {/* Expanded script */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  {generatingScript ? (
                    <div className="p-6 rounded-[var(--radius-md)] text-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                      <p className="text-sm opacity-80">Generando guion…</p>
                    </div>
                  ) : script ? (
                    <div className="p-4 rounded-[var(--radius-md)] space-y-3" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      {/* Reel script */}
                      {'script' in script && script.script && (
                        <>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Gancho</p>
                            <p className="text-sm leading-snug">{(script as ReelOutput).script.hook}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Contexto</p>
                            <p className="text-sm leading-snug">{(script as ReelOutput).script.context}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Solución</p>
                            <p className="text-sm leading-snug">{(script as ReelOutput).script.solution}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">CTA</p>
                            <p className="text-sm leading-snug">{(script as ReelOutput).script.cta}</p>
                          </div>
                          {(script as ReelOutput).visualIdea && (
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Idea visual</p>
                              <p className="text-sm leading-snug">{(script as ReelOutput).visualIdea}</p>
                            </div>
                          )}
                          {(script as ReelOutput).captionWithHashtags && (
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Caption + hashtags</p>
                              <p className="text-sm leading-snug whitespace-pre-wrap">{(script as ReelOutput).captionWithHashtags}</p>
                            </div>
                          )}
                        </>
                      )}
                      {/* Carousel slides */}
                      {'slides' in script && (script as CarouselOutput).slides && (
                        <>
                          {(script as CarouselOutput).slides.map((slide, i) => (
                            <div key={i}>
                              <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Slide {i + 1}: {slide.role}</p>
                              <p className="text-sm leading-snug">{slide.text}</p>
                            </div>
                          ))}
                          {(script as CarouselOutput).captionWithHashtags && (
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Caption + hashtags</p>
                              <p className="text-sm leading-snug whitespace-pre-wrap">{(script as CarouselOutput).captionWithHashtags}</p>
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={copyScript}
                          className="flex-1 py-2 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all hover:bg-white/10"
                          style={{ border: '1.5px solid rgba(255,255,255,0.25)' }}
                        >
                          {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                        </button>
                        <button
                          onClick={handleSaveLibrary}
                          disabled={saving || saved || !userId}
                          className="flex-1 py-2 rounded-[var(--radius-sm)] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all hover:bg-white/10 disabled:opacity-60"
                          style={{ border: '1.5px solid rgba(255,255,255,0.3)' }}
                        >
                          {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</>
                           : saved ? <><Check size={14} /> ¡Guardado!</>
                           : <><BookOpen size={14} /> Guardar en Biblioteca</>}
                        </button>
                      </div>

                      {saved && (
                        <Link
                          href="/biblioteca"
                          className="flex items-center justify-center gap-1.5 mt-2 text-xs font-semibold transition-all hover:underline"
                          style={{ color: 'var(--color-buttermilk)' }}
                        >
                          Ver en Biblioteca <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-[var(--radius-md)] text-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <p className="text-sm opacity-70">No se pudo generar el guion. Intenta con "Crear este contenido".</p>
                      <Link
                        href={`/crear-contenido?service=${encodeURIComponent(idea.service)}&type=${idea.type}&tema=${encodeURIComponent(idea.idea)}&contexto=${encodeURIComponent(idea.objective)}`}
                        className="inline-flex items-center gap-1.5 mt-3 py-2 px-4 rounded-[var(--radius-sm)] font-semibold text-xs transition-all hover:bg-white/10"
                        style={{ border: '1.5px solid rgba(255,255,255,0.3)' }}
                      >
                        Crear este contenido <ArrowRight size={14} />
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}