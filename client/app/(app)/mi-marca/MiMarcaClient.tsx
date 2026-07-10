'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { demoGetBrand, demoSaveBrand } from '@/lib/demo-store'
import { BrandProfile } from '@/types/database'
import { generateAIContent, extractJSON } from '@/lib/ai/client'
import { buildProfile } from '@/lib/brand-extract'
import { StrategyDocument, EMPTY_STRATEGY } from '@/lib/strategy-types'
import { Roadmap, EMPTY_ROADMAP, RoadmapPhase } from '@/lib/roadmap-types'
import { useSessionState, clearSectionState } from '@/lib/session-store'
import VoiceButton from '@/components/VoiceButton'
import { StrategyDisplay } from '@/components/mi-marca/StrategyDisplay'
import { RoadmapDisplay } from '@/components/mi-marca/RoadmapDisplay'
import BraviGuide from '@/components/bravi/BraviGuide'
import {
  Sparkles, Store, Scissors, Heart, Target, MessageCircle,
  Eye, Clock, Palette, ChevronDown, ChevronUp, RefreshCw, Map as MapIcon,
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

// ── AI prompt for 13-section strategy ───────────────────────────────

const STRATEGY_PROMPT = (text: string) => `Eres un estratega de marketing experto para salones de belleza y peluquería en España. Analiza el texto que una estilista ha escrito sobre su salón y genera un documento estratégico completo y profesional.

Texto de la estilista:
"""
${text}
"""

Responde SOLO con un JSON válido, sin texto adicional ni explicaciones, con esta estructura EXACTA:
{
  "perfil_brave": "descripción de la marca en 2-3 frases potentes",
  "resumen_ejecutivo": "resumen ejecutivo de 4-6 líneas describiendo la situación actual, oportunidades y plan de acción",
  "clienta_ideal": {
    "descripcion": "descripción de la clienta ideal en 2-3 frases",
    "edad": "rango de edad",
    "problemas": ["problema 1", "problema 2", "problema 3"],
    "deseos": ["deseo 1", "deseo 2", "deseo 3"],
    "objeciones": ["objeción o duda 1", "objeción o duda 2", "objeción o duda 3"]
  },
  "servicios": [
    {"name": "nombre del servicio", "priority": "alta|media|baja", "reason": "por qué esta prioridad en 1 frase"}
  ],
  "objetivos": [
    {"timeframe": "1 mes", "goal": "objetivo concreto", "action": "acción para lograrlo"},
    {"timeframe": "3 meses", "goal": "objetivo concreto", "action": "acción para lograrlo"},
    {"timeframe": "6 meses", "goal": "objetivo concreto", "action": "acción para lograrlo"}
  ],
  "estrategia_contenido": [
    {"type": "Reels educativos", "percentage": 30, "reason": "por qué"},
    {"type": "Transformaciones", "percentage": 25, "reason": "por qué"},
    {"type": "Carruseles", "percentage": 20, "reason": "por qué"},
    {"type": "Stories interactivas", "percentage": 15, "reason": "por qué"},
    {"type": "Contenido personal", "percentage": 10, "reason": "por qué"}
  ],
  "pilares_contenido": [
    {"name": "nombre del pilar", "description": "descripción en 1 frase", "examples": ["ejemplo 1", "ejemplo 2"]}
  ],
  "estilo_comunicacion": {
    "tono": "descripción del tono recomendado",
    "voz": "descripción de la voz de la marca",
    "ejemplos": ["ejemplo de frase 1", "ejemplo de frase 2", "ejemplo de frase 3"]
  },
  "imagen_personal": {
    "descripcion": "cómo debe proyectarse la estilista en sus contenidos",
    "consejos": ["consejo 1", "consejo 2", "consejo 3"]
  },
  "recomendaciones_visuales": ["recomendación visual 1", "recomendación visual 2", "recomendación visual 3", "recomendación visual 4"],
  "errores_detectados": ["error 1 que está cometiendo o cometiendo la industria", "error 2", "error 3"],
  "plan_accion": [
    {"text": "acción concreta y ejecutable", "done": false}
  ],
  "resumen_para_ia": "resumen compacto de 5-8 líneas en segunda persona que servirá como contexto permanente para generar todo el contenido. Debe incluir: nombre del salón, ciudad, servicios clave, clienta ideal, tono, diferenciación y objetivo principal."
}

Reglas:
- Los porcentajes de estrategia_contenido deben sumar 100.
- Incluye al menos 4 servicios, 3 objetivos, 5 items en estrategia_contenido, 4 pilares, 5 acciones.
- Todo en español, profesional, concreto y accionable.
- Si un dato no está en el texto, infiérelo del contexto del sector o pon un valor razonable por defecto.
- El resumen_para_ia es CRÍTICO: será usado como contexto para todas las generaciones de contenido.`

// ── AI prompt para Hoja de Ruta BRÄVE ─────────────────────────────────

const ROADMAP_PROMPT = (strategyJson: string, rawInput: string) => `Eres un mentor estratégico para estilistas y salones de belleza en España. Analiza la estrategia de marca ya generada y el texto original de la estilista, y diseña una HOJA DE RUTA personalizada en forma de camino ascendente de 5 a 7 fases.

Estrategia de marca (JSON):
"""
${strategyJson}
"""

Texto original de la estilista:
"""
${rawInput}
"""

Responde SOLO con un JSON válido, sin texto adicional, con esta estructura EXACTA:
{
  "phases": [
    {
      "number": 1,
      "name": "Bases Claras",
      "description": "1-2 frases describiendo la fase",
      "goal": "1 frase con el objetivo concreto de esta fase",
      "icon": "emoji representativo",
      "color": "cherry|cherry-dark|buttermilk|pastel-blue|pastel-green|warm-gray",
      "status": "completed|in_progress|pending",
      "tasks": [
        {"id": "t1", "label": "tarea concreta y accionable", "done": false}
      ],
      "bravi_message": "mensaje breve de Bravi como mentor para esta fase (opcional)"
    }
  ]
}

Reglas CRÍTICAS de personalización:
- Adapta las fases y tareas a lo que detectes en el texto de la estilista. NO uses fases genéricas.
- Si detecta que NO habla a cámara → añade una tarea específica en la fase correspondiente.
- Si no tiene diferenciación clara → añade una fase/tarea de posicionamiento.
- Si vende solo por precio → añade tareas de percepción de valor.
- Si no publica con frecuencia → añade tareas de planificación y frecuencia.
- Si no tiene testimonios → añade una tarea de casos reales.
- Asigna el estado según la información detectada:
  - "completed" si la estilista ya cumple esa fase según lo que escribió.
  - "in_progress" a UNA sola fase que sea el siguiente paso natural (la prioridad #1 ahora mismo).
  - "pending" al resto, en orden lógico ascendente.
- La primera fase debe ser siempre la base (Bases Claras / Posicionamiento) y la última la cima (Escala / Marca personal consolidada).
- Entre 5 y 7 fases. Entre 3 y 6 tareas por fase.
- Cada tarea debe ser concreta, accionable y verificable (que la estilista pueda marcarla como hecha).
- Los "id" de tareas deben ser únicos dentro de su fase (t1, t2, t3...).
- "color" debe variar entre fases para dar ritmo visual, rotando entre los 6 colores disponibles.
- "bravi_message" solo en 1-2 fases clave (la primera y la fase "in_progress" son buenas candidatas). Mensaje corto, en segunda persona, tono mentor cercano.
- Todo en español, profesional, motivador y concreto.`

// ── Component ───────────────────────────────────────────────────────

export default function MiMarcaClient({ userId, brand }: { userId: string; brand: BrandProfile | null }) {
  const isDemoMode = userId === 'demo'
  const [text, setText] = useSessionState<string>(`u:${userId}:marca:text`, brand?.raw_input || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [strategy, setStrategy] = useSessionState<StrategyDocument | null>(`u:${userId}:marca:strategy`,
    brand?.strategy_json ? (brand.strategy_json as unknown as StrategyDocument) : null
  )
  const [roadmap, setRoadmap] = useSessionState<Roadmap | null>(`u:${userId}:marca:roadmap`,
    brand?.roadmap_json ? (brand.roadmap_json as unknown as Roadmap) : null
  )
  const [expandedBlock, setExpandedBlock] = useState<number | null>(0)
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
          setStrategy(stored.strategy_json as unknown as StrategyDocument)
        } else if (stored.optimized_summary && !strategy) {
          setStrategy({ ...EMPTY_STRATEGY, resumen_para_ia: stored.optimized_summary as string })
        }
        if (stored.roadmap_json && !roadmap) {
          setRoadmap(stored.roadmap_json as unknown as Roadmap)
        }
      }
    }
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

        setStrategy(parsed)
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
      setRoadmap(next)
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
        <div className="float-soft flex items-start gap-3 p-4 rounded-[var(--radius-md)]" style={{ background: 'var(--color-buttermilk)' }}>
          <BraviGuide section="mi-marca" size={40} />
          <p className="text-sm text-cherry-dark">
            <strong>Bravi dice:</strong> {strategy ? '¿Quieres actualizar tu estrategia? Escribe cambios y regenera.' : 'Cuéntame sobre tu salón respondiendo las preguntas de abajo. No importa el orden ni el formato.'}
          </p>
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

      {/* Question blocks */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-cherry-dark px-1">
          Preguntas guía — respóndelas en el cuadro de arriba:
        </p>
        {QUESTION_BLOCKS.map((block, i) => {
          const Icon = block.icon
          const isExpanded = expandedBlock === i
          return (
            <div key={block.title} className="rounded-[var(--radius-md)] bg-white shadow-soft overflow-hidden" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
              <button
                onClick={() => setExpandedBlock(isExpanded ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center" style={{ background: 'var(--color-buttermilk)' }}>
                    <Icon size={16} style={{ color: 'var(--color-cherry)' }} />
                  </div>
                  <span className="font-semibold text-sm text-ink">{block.title}</span>
                  <span className="text-xs text-cherry-dark opacity-50">{block.questions.length} preguntas</span>
                </div>
                {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--color-cherry)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-cherry)' }} />}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 space-y-2" style={{ borderTop: '1px solid rgba(255,241,181,0.5)' }}>
                  {block.questions.map(q => (
                    <div key={q} className="flex items-start gap-2 text-sm text-ink py-1">
                      <span style={{ color: 'var(--color-cherry)', opacity: 0.5 }}>•</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}