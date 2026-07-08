'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Check, Rocket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Reto10kConfig, Reto10kProgress } from '@/types/reto10k'
import { BrandProfile } from '@/types/database'

const OBJECTIVES = [
  { id: 'recomendado', label: 'Recomiéndame un mix equilibrado', desc: 'No estoy segura, guíame tú', emoji: '✨', recommended: true },
  { id: 'visibilidad', label: 'Ganar visibilidad', desc: 'Quiero que más gente conozca mi trabajo', emoji: '📈' },
  { id: 'reservas', label: 'Conseguir reservas', desc: 'Quiero más clientas en mi salón', emoji: '💼' },
  { id: 'autoridad', label: 'Posicionarme como experta', desc: 'Quiero que me vean como referente', emoji: '👑' },
  { id: 'comunidad', label: 'Crear comunidad', desc: 'Quiero conectar con mi audiencia', emoji: '👥' },
]

const SERVICES = ['Balayage', 'Rubios', 'Color', 'Canas', 'Tratamientos', 'Alisados', 'Corte']

const LEVELS = [
  { id: 'principiante', label: 'Principiante', desc: 'No tengo casi contenido en Instagram' },
  { id: 'intermedio', label: 'Intermedio', desc: 'Tengo algo de contenido pero no soy constante' },
  { id: 'avanzado', label: 'Avanzado', desc: 'Publico regularmente pero quiero crecer más' },
]

const POSTS_PER_WEEK = [
  { id: 3, label: '3', desc: 'Soy realista, empiezo suave' },
  { id: 4, label: '4', desc: 'Equilibrado, recomendado', recommended: true },
  { id: 5, label: '5', desc: 'Quiero acelerar' },
  { id: 7, label: '7', desc: 'Cada día, modo bestia' },
]

interface Props {
  userId: string
  progress: Reto10kProgress | null
  config: Reto10kConfig | null
  brand: Partial<BrandProfile> | null
  demoMode: boolean
}

export default function RetoOnboarding({ userId, progress, config, brand, demoMode }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [objective, setObjective] = useState('recomendado')
  const [services, setServices] = useState<string[]>([])
  const [level, setLevel] = useState('')
  const [postsPerWeek, setPostsPerWeek] = useState<number>(4)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleService(s: string) {
    setServices(prev => {
      if (prev.includes(s)) return prev.filter(x => x !== s)
      if (prev.length >= 3) return prev
      return [...prev, s]
    })
  }

  async function handleFinish() {
    setError('')
    if (!objective) { setError('Selecciona tu objetivo para continuar.'); return }
    if (!level) { setError('Selecciona tu nivel para continuar.'); return }
    setLoading(true)
    try {
      if (demoMode) {
        // En demo mode, no podemos insertar
        setLoading(false)
        return
      }
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('reto_10k_progress')
        .update({
          started_at: new Date().toISOString(),
          status: 'active',
          current_day: 1,
          current_phase: 1,
          objective,
          services,
          level,
          posts_per_week: postsPerWeek,
        })
        .eq('user_id', userId)
      if (updateError) throw updateError
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  const fieldStyle = 'w-full px-4 py-3 rounded-[var(--radius-md)] text-sm outline-none transition-colors'
  const selectedStyle = { background: 'var(--color-cherry)', color: 'white', border: '2px solid var(--color-cherry)' as const }
  const unselectedStyle = { background: 'var(--color-warm-light)', color: 'var(--color-cherry-dark)', border: '1.5px solid var(--color-buttermilk)' as const }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-cherry-dark">Configura tu Reto 10K</h1>
        <p className="text-sm text-cherry-dark opacity-70">Personaliza tu experiencia en 3 pasos</p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map(s => (
          <div
            key={s}
            className="h-2 rounded-full transition-all"
            style={{
              width: s === step ? 32 : 8,
              background: s <= step ? 'var(--color-cherry)' : 'var(--color-warm-gray)',
            }}
          />
        ))}
      </div>

      {/* Bravi */}
      <div
        className="rounded-[var(--radius-md)] p-4 flex items-start gap-3"
        style={{ background: 'var(--color-buttermilk)', border: '1.5px solid rgba(122,24,50,0.15)' }}
      >
        <img
          src="/bravi2.png"
          alt="Bravi"
          className="flex-shrink-0 bravi-float"
          style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 2px 3px rgba(89,20,39,0.15))' }}
          draggable={false}
        />
        <p className="text-sm text-cherry-dark">
          {step === 1 && '¿Qué te gustaría conseguir con tu contenido? Si no lo tienes claro, elige "Recomiéndame" y yo diseño un mix equilibrado para ti.'}
          {step === 2 && 'Ahora dime: ¿cuáles son tus servicios estrella?'}
          {step === 3 && '¿En qué nivel estás ahora mismo?'}
          {step === 4 && 'Por último: ¿cuántas veces a la semana te comprometes a publicar?'}
        </p>
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            {OBJECTIVES.map(obj => (
              <button
                key={obj.id}
                onClick={() => setObjective(obj.id)}
                className={`${fieldStyle} text-left relative`}
                style={objective === obj.id ? selectedStyle : unselectedStyle}
              >
                {obj.recommended && (
                  <span
                    className="absolute top-2.5 right-3 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      background: objective === obj.id ? 'var(--color-buttermilk)' : 'var(--color-cherry)',
                      color: objective === obj.id ? 'var(--color-cherry)' : 'white',
                    }}
                  >
                    Recomendado
                  </span>
                )}
                <p className="font-semibold flex items-center gap-2">
                  <span className="text-lg">{obj.emoji}</span>
                  {obj.label}
                </p>
                <p className="text-xs opacity-70 mt-0.5">{obj.desc}</p>
              </button>
            ))}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            <p className="text-xs text-cherry-dark opacity-60 text-center">
              Selecciona hasta 3 servicios ({services.length}/3)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SERVICES.map(s => (
                <button
                  key={s}
                  onClick={() => toggleService(s)}
                  disabled={!services.includes(s) && services.length >= 3}
                  className={`${fieldStyle} text-center`}
                  style={services.includes(s) ? selectedStyle : { ...unselectedStyle, opacity: !services.includes(s) && services.length >= 3 ? 0.4 : 1 }}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {services.includes(s) && <Check size={14} />}
                    {s}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            {LEVELS.map(l => (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={`${fieldStyle} text-left`}
                style={level === l.id ? selectedStyle : unselectedStyle}
              >
                <p className="font-semibold">{l.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{l.desc}</p>
              </button>
            ))}
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            <p className="text-xs text-cherry-dark opacity-60 text-center">
              Sé realista: mejor 3 constantes que 7 que no cumples
            </p>
            <div className="grid grid-cols-2 gap-3">
              {POSTS_PER_WEEK.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPostsPerWeek(p.id)}
                  className={`${fieldStyle} text-left relative`}
                  style={postsPerWeek === p.id ? selectedStyle : unselectedStyle}
                >
                  {p.recommended && (
                    <span
                      className="absolute top-2.5 right-3 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        background: postsPerWeek === p.id ? 'var(--color-buttermilk)' : 'var(--color-cherry)',
                        color: postsPerWeek === p.id ? 'var(--color-cherry)' : 'white',
                      }}
                    >
                      Recomendado
                    </span>
                  )}
                  <p className="font-semibold flex items-baseline gap-1.5">
                    <span className="text-2xl">{p.label}</span>
                    <span className="text-xs opacity-70">/sem</span>
                  </p>
                  <p className="text-xs opacity-70 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        {step > 1 ? (
          <button
            onClick={() => setStep(s => (s - 1) as 1 | 2 | 3 | 4)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold text-cherry-dark hover:bg-warm-gray transition-colors"
          >
            <ArrowLeft size={15} /> Atrás
          </button>
        ) : <div />}

        {step < 4 ? (
          <button
            onClick={() => {
              if (step === 1 && !objective) { setError('Selecciona tu objetivo.'); return }
              if (step === 2 && services.length === 0) { setError('Selecciona al menos un servicio.'); return }
              if (step === 3 && !level) { setError('Selecciona tu nivel.'); return }
              setError('')
              setStep(s => (s + 1) as 1 | 2 | 3 | 4)
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold text-white transition-all"
            style={{ background: 'var(--color-cherry)' }}
          >
            Siguiente <ArrowRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all glow-ready"
            style={{ background: 'var(--color-cherry)', opacity: loading ? 0.65 : 1 }}
          >
            {loading ? 'Iniciando...' : 'Empezar Reto 10K'} <Rocket size={15} />
          </button>
        )}
      </div>
    </div>
  )
}

