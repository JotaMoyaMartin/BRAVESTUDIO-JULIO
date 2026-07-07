'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Shuffle, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateAIContent, extractJSON } from '@/lib/ai/client'

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

interface SurpriseCardProps {
  brandContext?: string
}

export default function SurpriseCard({ brandContext }: SurpriseCardProps) {
  const [idea, setIdea] = useState<SurpriseIdea | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSurprise() {
    setLoading(true)
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
      // Fallback to pool
      const pool = idea ? FALLBACK_POOL.filter(s => s.idea !== idea.idea) : FALLBACK_POOL
      setIdea(pool[Math.floor(Math.random() * pool.length)])
    }
    setLoading(false)
  }

  return (
    <div
      className="rounded-[var(--radius-lg)] p-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)',
        color: 'white',
      }}
    >
      {/* Decorative glow */}
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
            <div
              className="p-4 rounded-[var(--radius-md)]"
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
              </div>
              <p className="font-semibold text-sm leading-snug">{idea.idea}</p>
            </div>
            <Link
              href={`/crear-contenido?service=${encodeURIComponent(idea.service)}&type=${idea.type}`}
              className="w-full py-2.5 rounded-[var(--radius-sm)] font-semibold text-sm text-center flex items-center justify-center gap-2 transition-all hover:bg-white/10"
              style={{ border: '1.5px solid rgba(255,255,255,0.3)' }}
            >
              Crear este contenido <ArrowRight size={14} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}