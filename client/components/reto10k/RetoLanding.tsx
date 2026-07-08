'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Rocket, ArrowRight, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Reto10kConfig } from '@/types/reto10k'

const PHASES = [
  { emoji: '🌱', title: 'Pierde el miedo y empieza a mostrarte', desc: 'Crear confianza delante de cámara' },
  { emoji: '✨', title: 'Construye tu autoridad', desc: 'Demostrar conocimiento' },
  { emoji: '🔥', title: 'Genera deseo con resultados', desc: 'Mostrar el valor del trabajo' },
  { emoji: '🚀', title: 'Conviértete en referente', desc: 'Crear comunidad' },
]

interface Props {
  userId: string
  demoMode: boolean
}

export default function RetoLanding({ userId, demoMode }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStart() {
    setError('')
    setLoading(true)
    try {
      if (demoMode) {
        // En demo mode, no podemos insertar en Supabase
        setLoading(false)
        return
      }
      const supabase = createClient()
      const { error: insertError } = await supabase
        .from('reto_10k_progress')
        .insert({
          user_id: userId,
          status: 'not_started',
          services: [],
          current_day: 1,
          current_phase: 1,
        })
      if (insertError) throw insertError
      // Recargar la pagina para mostrar el onboarding
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar el Reto')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-4 py-6"
      >
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-[var(--radius-lg)] mx-auto"
          style={{ background: 'var(--color-cherry)' }}
        >
          <Rocket size={32} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-cherry-dark" style={{ letterSpacing: '-1px' }}>
          RETO 10K
        </h1>
        <p className="text-lg text-cherry opacity-80 font-semibold">De Estilista a Referente</p>
        <p className="text-sm text-cherry-dark opacity-70 max-w-md mx-auto leading-relaxed">
          30 días de misiones guiadas para transformar tu presencia en Instagram.
          De perder el miedo a cámara a convertirte en referente de tu sector.
        </p>
      </motion.div>

      {/* Bravi */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
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
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cherry opacity-70 mb-0.5">Bravi dice</p>
          <p className="text-sm text-cherry-dark">Hoy empieza tu transformación. 30 días, una misión cada día, yo te guío en cada paso.</p>
        </div>
      </motion.div>

      {/* Fases preview */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-cherry-dark opacity-70">Las 4 fases del Reto</h2>
        {PHASES.map((phase, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 + i * 0.06 }}
            className="rounded-[var(--radius-md)] p-4 flex items-center gap-4"
            style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
          >
            <div
              className="w-12 h-12 rounded-[var(--radius-sm)] flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: 'var(--color-warm-light)' }}
            >
              {phase.emoji}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-cherry-dark">
                <span className="text-cherry opacity-60 mr-1.5">Fase {i + 1}</span>
                {phase.title}
              </p>
              <p className="text-xs text-cherry-dark opacity-60 mt-0.5">{phase.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      {error && (
        <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
      )}
      <div className="flex flex-col items-center gap-3 pb-6">
        <button
          onClick={handleStart}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[var(--radius-md)] font-bold text-sm transition-all glow-ready"
          style={{
            background: 'var(--color-cherry)',
            color: 'white',
            opacity: loading ? 0.65 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? (
            <>Iniciando...</>
          ) : (
            <>
              <Sparkles size={16} /> Empezar mi transformación
              <ArrowRight size={16} />
            </>
          )}
        </button>
        {demoMode && (
          <p className="text-xs text-cherry-dark opacity-50">Modo demo: configura Supabase para participar en el Reto.</p>
        )}
      </div>
    </div>
  )
}