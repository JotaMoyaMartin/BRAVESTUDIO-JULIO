'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { demoGetBrand, demoSaveBrand } from '@/lib/demo-store'
import { BrandProfile } from '@/types/database'
import { generateAIContent, extractJSON } from '@/lib/ai/client'
import { STRATEGY_PROMPT, ROADMAP_PROMPT } from '@/lib/ai/prompts/strategy'
import { buildProfile } from '@/lib/brand-extract'
import { StrategyDocument, EMPTY_STRATEGY, normalizeStrategy } from '@/lib/strategy-types'
import { Roadmap, EMPTY_ROADMAP, RoadmapPhase, normalizeRoadmap } from '@/lib/roadmap-types'
import { useSessionState, clearSectionState } from '@/lib/session-store'
import VoiceButton from '@/components/VoiceButton'
import { StrategyDisplay } from '@/components/mi-marca/StrategyDisplay'
import { RoadmapDisplay } from '@/components/mi-marca/RoadmapDisplay'
import BraviGuide from '@/components/bravi/BraviGuide'
import BraviTip from '@/components/bravi/BraviTip'
import {
  Sparkles, Store, Scissors, Heart, Target, MessageCircle,
  Eye, Clock, Palette, RefreshCw, Map as MapIcon,
} from 'lucide-react'

// ── 8 question blocks, 33 questions ──────────────────────────────────

const QUESTION_BLOCKS = [
  {
    title: 'Sobre tu salón',
    icon: Store,
    questions: [
      '¿Cómo se llama tu salón?',
      '¿En qué ciudad estás?',
      '¿Cuántos años llevas trabajando?',
      '¿Trabajas sola o tienes equipo?',
    ],
  },
  {
    title: 'Servicios',
    icon: Scissors,
    questions: [
      '¿Qué servicios realizas?',
      '¿Cuáles son tus 3 servicios principales?',
      '¿Qué servicio quieres potenciar?',
      '¿Qué servicio te deja más beneficio?',
    ],
  },
  {
    title: 'Clienta ideal',
    icon: Heart,
    questions: [
      '¿Qué tipo de clienta quieres atraer?',
      '¿Qué edad tiene tu clienta ideal?',
      '¿Qué problemas suele tener tu clienta?',
      '¿Qué desea conseguir cuando reserva contigo?',
      '¿Qué dudas te preguntan con frecuencia?',
    ],
  },
  {
    title: 'Contenido y objetivos',
    icon: Target,
    questions: [
      '¿Qué objetivo tienes ahora mismo?',
      '¿Sobre qué temas quieres crear más contenido?',
      '¿Qué te diferencia de otros salones?',
    ],
  },
  {
    title: 'Estilo y comunicación',
    icon: MessageCircle,
    questions: [
      '¿Cómo te comunicas con tus clientas? (formal/informal)',
      '¿Sales tú en tus contenidos o solo muestras el trabajo?',
      '¿Qué tono prefieres? (profesional/cercano/divertido)',
      '¿Qué valores quieres transmitir?',
    ],
  },
  {
    title: 'Competencia',
    icon: Eye,
    questions: [
      '¿Conoces a 3 salones o estilistas que admires en Instagram?',
      '¿Qué hacen ellos que tú no haces?',
      '¿Qué haces tú mejor que ellos?',
    ],
  },
  {
    title: 'Recursos y tiempo',
    icon: Clock,
    questions: [
      '¿Cuántas horas a la semana dedicas al contenido?',
      '¿Quién hace las fotos y vídeos?',
      '¿Tienes presupuesto para publicidad?',
      '¿Usas alguna herramienta de edición?',
    ],
  },
  {
    title: 'Imagen y estética',
    icon: Palette,
    questions: [
      '¿Qué colores representan tu salón?',
      '¿Cómo es la decoración de tu salón?',
      '¿Qué estilo visual prefieres? (minimalista/colorido/elegante)',
      '¿Tienes un logo o colores corporativos?',
      '¿Cómo quieres que se sienta una clienta al entrar?',
    ],
  },
]



// ── Component ───────────────────────────────────────────────────────

export default function MiMarcaClient({ userId, brand }: { userId: string; brand: BrandProfile | null }) {
  const isDemoMode = userId === 'demo'
  const [text, setText] = useSessionState<string>(`u:${userId}:marca:text`, brand?.raw_input || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [strategy, setStrategy] = useSessionState<StrategyDocument | null>(`u:${userId}:marca:strategy`,
    brand?.strategy_json ? normalizeStrategy(brand.strategy_json) : null
  )
  const [roadmap, setRoadmap] = useSessionState<Roadmap | null>(`u:${userId}:marca:roadmap`,
    brand?.roadmap_json ? normalizeRoadmap(brand.roadmap_json) : null
  )
  const [justGenerated, setJustGenerated] = useState(false)
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false)
  const [roadmapError, setRoadmapError] = useState('')
  const strategyRef = useRef<HTMLDivElement>(null)
  const roadmapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isDemoMode) {
      const stored = demoGetBrand() as Record<string, unknown> | null
      if (stored) {
        // Only hydrate from demo store if session is empty (first load ever)
        const sessionText = typeof window !== 'undefined' ? localStorage.getItem('brave_session_u:demo:marca:text') : null
        if (!sessionText || sessionText === 'null' || sessionText === '""') {
          setText((stored.raw_input as string) || '')
        }
        if (stored.strategy_json && !strategy) {
          setStrategy(normalizeStrategy(stored.strategy_json))
        } else if (stored.optimized_summary && !strategy) {
          setStrategy({ ...EMPTY_STRATEGY, resumen_para_ia: stored.optimized_summary as string })
        }
        if (stored.roadmap_json && !roadmap) {
          setRoadmap(normalizeRoadmap(stored.roadmap_json))
        }
      }
    }
    // Defensively normalize whatever was loaded from the session (DB row or
    // stale localStorage). Older sessions may have partial shapes that crash
    // the display components on the very first render.
    setStrategy(prev => (prev ? normalizeStrategy(prev) : prev))
    setRoadmap(prev => (prev ? normalizeRoadmap(prev) : prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generateStrategy() {
    if (!text.trim()) return
    setSaving(true)
    setError('')

    const local = buildProfile(text)

    try {
      const raw = await generateAIContent(STRATEGY_PROMPT(text))
      const parsed = extractJSON<StrategyDocument>(raw)

      if (parsed && parsed.perfil_brave) {
        // Merge with local extraction for the DB fields
        const payload = {
          user_id: userId,
          raw_input: text,
          salon_name: parsed.perfil_brave.match(/([^,.]+)/)?.[0]?.trim() || local.salon_name || null,
          city: local.city,
          main_services: local.main_services,
          service_to_promote: local.service_to_promote,
          content_topics: local.content_topics,
          optimized_summary: parsed.resumen_para_ia || parsed.perfil_brave,
          strategy_json: parsed as unknown as Record<string, unknown>,
          completion_status: 'complete' as const,
          updated_at: new Date().toISOString(),
        }

        if (isDemoMode) {
          demoSaveBrand(payload)
        } else {
          const supabase = createClient()
          if (brand?.id) {
            await supabase.from('brand_profiles').update(payload).eq('id', brand.id)
          } else {
            await supabase.from('brand_profiles').insert(payload as unknown as BrandProfile)
          }
        }

        setStrategy(normalizeStrategy(parsed))
        setJustGenerated(true)
        // Lleva a la usuaria al principio de la página para que vea la estrategia nueva
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        })
      } else {
        throw new Error('Respuesta de IA incompleta')
      }
    } catch {
      setError('No se pudo generar la estrategia. Inténtalo de nuevo.')
    }
    setSaving(false)
  }

  // Apaga la bandera de "recién generado" después de la animación de palpitado
  useEffect(() => {
    if (!justGenerated) return
    const t = setTimeout(() => setJustGenerated(false), 2600)
    return () => clearTimeout(t)
  }, [justGenerated])

  // ── Hoja de Ruta BRÄVE ──

  function recomputeStatus(phase: RoadmapPhase): RoadmapPhase['status'] {
    const total = phase.tasks.length
    const done = phase.tasks.filter(t => t.done).length
    if (total > 0 && done === total) return 'completed'
    if (done > 0) return 'in_progress'
    return phase.status === 'completed' ? 'in_progress' : 'pending'
  }

  async function persistRoadmap(next: Roadmap) {
    if (isDemoMode) {
      const stored = (demoGetBrand() as Record<string, unknown> | null) || {}
      demoSaveBrand({ ...stored, roadmap_json: next as unknown as Record<string, unknown> })
      return
    }
    try {
      const supabase = createClient()
      const payload = { roadmap_json: next as unknown as Record<string, unknown>, updated_at: new Date().toISOString() }
      if (brand?.id) {
        await supabase.from('brand_profiles').update(payload).eq('id', brand.id)
      } else {
        // Si no existe brand, lo creamos con los datos mínimos + roadmap
        await supabase.from('brand_profiles').insert({
          user_id: userId,
          raw_input: text,
          roadmap_json: next as unknown as Record<string, unknown>,
          completion_status: 'partial',
        } as unknown as BrandProfile)
      }
    } catch {
      // No bloqueamos la UI por fallos de persistencia silenciosos
    }
  }

  async function generateRoadmap() {
    if (!strategy || !strategy.perfil_brave) return
    setGeneratingRoadmap(true)
    setRoadmapError('')
    try {
      const raw = await generateAIContent(
        ROADMAP_PROMPT(JSON.stringify(strategy), text)
      )
      const parsed = extractJSON<Roadmap>(raw)
      if (!parsed || !Array.isArray(parsed.phases) || parsed.phases.length < 3) {
        throw new Error('Respuesta de IA incompleta')
      }
      const next: Roadmap = {
        phases: parsed.phases.map((p, i) => ({
          number: p.number ?? i + 1,
          name: p.name,
          description: p.description,
          goal: p.goal,
          icon: p.icon || '✨',
          color: p.color || 'cherry',
          status: p.status || 'pending',
          tasks: (p.tasks || []).map((t, j) => ({
            id: t.id || `t${j + 1}`,
            label: t.label,
            done: !!t.done,
          })),
          bravi_message: p.bravi_message,
        })),
        generated_at: new Date().toISOString(),
      }
      setRoadmap(normalizeRoadmap(next) ?? next)
      await persistRoadmap(next)
      // Scroll suave a la hoja de ruta
      requestAnimationFrame(() => {
        roadmapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch {
      setRoadmapError('No se pudo generar la hoja de ruta. Inténtalo de nuevo.')
    }
    setGeneratingRoadmap(false)
  }

  async function toggleRoadmapTask(phaseIndex: number, taskId: string) {
    if (!roadmap) return
    const next: Roadmap = {
      ...roadmap,
      phases: roadmap.phases.map((p, i) => {
        if (i !== phaseIndex) return p
        const tasks = p.tasks.map(t => (t.id === taskId ? { ...t, done: !t.done } : t))
        return { ...p, tasks, status: recomputeStatus({ ...p, tasks }) }
      }),
    }
    setRoadmap(next)
    await persistRoadmap(next)
  }

  // ── Hoja de Ruta arriba para sentir progreso; estrategia debajo ──
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BraviGuide section="mi-marca" size={64} />
        <div>
          <h1 className="text-2xl font-bold title-shine">Mi Marca BRÄVE</h1>
          <p className="mt-1 text-sm text-cherry-dark opacity-80">
            Tu documento estratégico completo. La IA analiza tu salón y construye un plan profesional.
          </p>
        </div>
      </div>

      {/* ── Hoja de Ruta BRÄVE (parte alta, lo más atractivo) ── */}
      <div ref={roadmapRef} className="space-y-4">
        {roadmap && roadmap.phases.length > 0 ? (
          <RoadmapDisplay
            roadmap={roadmap}
            onRegenerate={() => setRoadmap(null)}
            onTaskToggle={toggleRoadmapTask}
          />
        ) : (
          <div
            className="rounded-[var(--radius-lg)] p-8 text-center bg-white shadow-soft"
            style={{ border: '1.5px solid var(--color-buttermilk)' }}
          >
            <div className="text-4xl mb-3 float-soft inline-block">🗺️</div>
            <h3 className="text-xl font-bold text-cherry-dark mb-2">Mi Hoja de Ruta BRÄVE</h3>
            <p className="text-sm text-cherry-dark opacity-70 max-w-md mx-auto mb-5">
              Cuando tengas tu estrategia lista, Bravi diseñará un camino visual personalizado de fases
              para que veas exactamente dónde estás y cuáles son tus siguientes pasos.
            </p>
            <button
              onClick={generateRoadmap}
              disabled={!strategy || generatingRoadmap}
              className={`btn-primary inline-flex items-center gap-2 px-6 py-3 ${strategy && !generatingRoadmap ? 'glow-ready' : ''}`}
              style={{ opacity: !strategy ? 0.5 : 1 }}
            >
              <MapIcon size={18} className={generatingRoadmap ? 'animate-spin' : ''} />
              {generatingRoadmap
                ? 'Diseñando tu hoja de ruta...'
                : strategy
                ? '✨ Crear mi Hoja de Ruta BRÄVE'
                : 'Primero genera tu estrategia'}
            </button>
            {!strategy && (
              <p className="text-xs text-cherry-dark opacity-50 mt-3">
                Genera tu estrategia BRÄVE más abajo para poder crear tu hoja de ruta.
              </p>
            )}
            {roadmapError && (
              <p className="text-xs text-danger mt-3">{roadmapError}</p>
            )}
          </div>
        )}
      </div>

      {/* Strategy display (debajo de la hoja de ruta) */}
      {strategy && strategy.perfil_brave && (
        <div ref={strategyRef} id="estrategia-generada">
          <StrategyDisplay
            strategy={strategy}
            onRegenerate={() => setStrategy(null)}
            justGenerated={justGenerated}
          />
        </div>
      )}

      {/* Input section */}
      <div className="rounded-[var(--radius-lg)] p-5 space-y-4 bg-white shadow-soft" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
        <div className="p-4 rounded-[var(--radius-md)]" style={{ background: 'var(--color-buttermilk)' }}>
          <BraviTip
            message={strategy ? '¿Quieres actualizar tu estrategia? Escribe cambios y regenera.' : 'Cuéntame sobre tu salón respondiendo las preguntas de abajo. No importa el orden ni el formato.'}
            size={48}
          />
        </div>

        <textarea
          rows={10}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribe aquí toda la información de tu salón. Responde las preguntas de abajo en el orden que prefieras…"
          className="w-full px-4 py-3 rounded-[var(--radius-md)] text-sm outline-none resize-none"
          style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: 'var(--color-cream)', lineHeight: 1.6 }}
        />
        <VoiceButton onTranscript={t => setText(prev => (prev ? prev + ' ' + t : t))} />
        <button
          onClick={generateStrategy}
          disabled={saving || !text.trim()}
          className={`btn-primary w-full justify-center text-base py-3.5 ${text.trim() && !saving ? 'glow-ready' : ''}`}
          style={{ opacity: !text.trim() ? 0.5 : 1 }}
        >
          <Sparkles size={18} className={saving ? 'animate-spin' : ''} />
          {saving ? 'Generando tu estrategia...' : strategy ? '✨ Regenerar Estrategia' : '✨ Generar Estrategia BRÄVE'}
        </button>
        {error && <p className="text-xs text-danger text-center">{error}</p>}
      </div>

      {/* Preguntas guía — todas visibles, sin desplegables */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-cherry-dark px-1">
          Preguntas guía — respóndelas en el cuadro de arriba:
        </p>
        <div className="rounded-[var(--radius-md)] bg-white shadow-soft p-4 space-y-4" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
          {QUESTION_BLOCKS.map((block) => {
            const Icon = block.icon
            return (
              <div key={block.title}>
                <div className="flex items-center gap-2 mb-2 pb-1.5" style={{ borderBottom: '1px solid rgba(255,241,181,0.5)' }}>
                  <Icon size={14} style={{ color: 'var(--color-cherry)' }} />
                  <span className="font-semibold text-sm text-ink">{block.title}</span>
                </div>
                <div className="space-y-1.5">
                  {block.questions.map(q => (
                    <div key={q} className="flex items-start gap-2 text-sm text-ink">
                      <span style={{ color: 'var(--color-cherry)', opacity: 0.5 }}>•</span>
                      <span style={{ lineHeight: 1.4 }}>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}