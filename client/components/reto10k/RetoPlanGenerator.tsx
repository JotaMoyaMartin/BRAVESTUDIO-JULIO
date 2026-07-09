'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, X, Check, Calendar as CalendarIcon } from 'lucide-react'
import { Profile } from '@/types/database'
import { Reto10kConfig, Reto10kProgress, RetoFrequency } from '@/types/reto10k'
import { build30DayPlan, resolveStartDate } from '@/lib/reto-plan'
import { saveRetoPlanDay } from '@/lib/content-utils'
import { useToast } from '@/components/ui/Toast'

interface Props {
  profile: Profile | null
  progress: Reto10kProgress
  config: Reto10kConfig | null
  demoMode: boolean
  onDone: () => void
  onClose: () => void
}

const START_OPTIONS: { id: 'today' | 'next_week' | 'pick'; label: string; desc: string; emoji: string }[] = [
  { id: 'today', label: 'Hoy', desc: 'Empezar ahora mismo', emoji: '🔥' },
  { id: 'next_week', label: 'Próxima semana', desc: 'Empezar en 7 días', emoji: '📆' },
  { id: 'pick', label: 'Elegir fecha', desc: 'Yo decido el día', emoji: '🗓️' },
]

const FREQ_OPTIONS: { id: RetoFrequency; label: string; desc: string; days: string }[] = [
  { id: 3, label: '3 / semana', desc: 'Empiezo suave', days: 'Mar, Jue, Dom' },
  { id: 4, label: '4 / semana', desc: 'Equilibrado, recomendado', days: 'Mar, Mié, Jue, Dom' },
  { id: 5, label: '5 / semana', desc: 'Quiero acelerar', days: 'Mar, Mié, Jue, Vie, Dom' },
  { id: 7, label: 'Diario', desc: 'Modo bestia', days: 'Todos los días' },
]

export default function RetoPlanGenerator({ profile, progress, config, demoMode, onDone, onClose }: Props) {
  const toast = useToast()
  const userId = profile?.id || 'demo'
  const [step, setStep] = useState<1 | 2>(1)
  const [startOption, setStartOption] = useState<'today' | 'next_week' | 'pick'>('today')
  const [pickDate, setPickDate] = useState('')
  const [frequency, setFrequency] = useState<RetoFrequency>(4)
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    let startDate = resolveStartDate(startOption)
    if (startOption === 'pick') {
      if (!pickDate) { toast.show('Elige una fecha', 'info'); return }
      startDate = pickDate
    }
    setGenerating(true)
    try {
      const plan = build30DayPlan(config, startDate, frequency)
      for (const day of plan) {
        await saveRetoPlanDay(userId, day, demoMode)
      }
      toast.show(`Plan de 30 días creado · ${plan.length} misiones`, 'success')
      onDone()
    } catch {
      toast.show('No se pudo generar el plan. Inténtalo de nuevo.', 'info')
    } finally {
      setGenerating(false)
    }
  }

  const selectedStyle = { background: 'var(--color-cherry)', color: 'white', border: '2px solid var(--color-cherry)' as const }
  const unselectedStyle = { background: 'var(--color-warm-light)', color: 'var(--color-cherry-dark)', border: '1.5px solid var(--color-buttermilk)' as const }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg rounded-[var(--radius-lg)] overflow-hidden max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--color-cream)', border: '2px solid var(--color-cherry)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5" style={{ background: 'linear-gradient(135deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)' }}>
            <div className="flex items-center gap-2">
              <Rocket size={20} className="text-white" />
              <div>
                <h3 className="font-bold text-base text-white">Generar mi plan de 30 días</h3>
                <p className="text-xs text-white/80">Distribución estratégica · balance 40/40/20</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1"><X size={20} /></button>
          </div>

          <div className="p-5 space-y-5">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2">
              {[1, 2].map(s => (
                <div key={s} className="h-2 rounded-full transition-all" style={{ width: s === step ? 32 : 8, background: s <= step ? 'var(--color-cherry)' : 'var(--color-warm-gray)' }} />
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-cherry-dark">¿Cuándo quieres empezar?</p>
                {START_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setStartOption(opt.id)}
                    className="w-full px-4 py-3 rounded-[var(--radius-md)] text-left flex items-center gap-3 transition-all"
                    style={startOption === opt.id ? selectedStyle : unselectedStyle}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs opacity-70">{opt.desc}</p>
                    </div>
                    {startOption === opt.id && <Check size={16} />}
                  </button>
                ))}
                {startOption === 'pick' && (
                  <input
                    type="date"
                    value={pickDate}
                    onChange={e => setPickDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-[var(--radius-md)] text-sm outline-none"
                    style={{ border: '1.5px solid var(--color-cherry)', background: 'white' }}
                  />
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-cherry-dark">¿Cuántas publicaciones quieres hacer?</p>
                {FREQ_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setFrequency(opt.id)}
                    className="w-full px-4 py-3 rounded-[var(--radius-md)] text-left transition-all"
                    style={frequency === opt.id ? selectedStyle : unselectedStyle}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm flex items-baseline gap-1">
                          <span className="text-xl">{opt.label.split(' ')[0]}</span>
                          <span className="text-xs opacity-70">/sem</span>
                        </p>
                        <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase opacity-60">Días</p>
                        <p className="text-xs font-semibold">{opt.days}</p>
                      </div>
                    </div>
                    {frequency === opt.id && <Check size={16} className="mt-1" />}
                  </button>
                ))}
                <div className="rounded-[var(--radius-sm)] p-3 flex items-start gap-2" style={{ background: 'var(--color-buttermilk)' }}>
                  <CalendarIcon size={14} className="text-cherry mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-cherry-dark">
                    Distribuiremos tus publicaciones en días estratégicos (priorizando Mar, Mié, Jue, Dom) y balancearemos el contenido: <strong>40% autoridad · 40% resultados · 20% viralidad</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {step > 1 ? (
                <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold text-cherry-dark hover:bg-warm-gray transition-colors">
                  Atrás
                </button>
              ) : <div />}
              {step < 2 ? (
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold text-white"
                  style={{ background: 'var(--color-cherry)' }}
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-sm)] text-sm font-bold text-white glow-ready"
                  style={{ background: 'var(--color-cherry)', opacity: generating ? 0.6 : 1 }}
                >
                  {generating ? 'Generando...' : <>🚀 Generar mi plan</>}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}