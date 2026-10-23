'use client'
// Inicio · chat con Bravi (22-oct-2026): un espacio para hablar de verdad,
// como un chat. Comparte la conversación con el Bravi flotante del resto de
// la app. Los próximos pasos viven aparte (NextStepsCard).

import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { BraviStep } from '@/lib/home-bravi'
import { BRAVI_FAQ } from '@/lib/home-bravi'
import { useBraviChat } from '@/components/bravi/BraviChatProvider'
import BraviChatThread from '@/components/bravi/BraviChatThread'

interface Props {
  profileName?: string | null
  steps: BraviStep[]
  suggestionTitle?: string | null
  suggestionHref?: string | null
}

export default function BraviHomeChat({ profileName, steps, suggestionTitle = null, suggestionHref = null }: Props) {
  const { setHomeContext, messages, clear } = useBraviChat()
  const reduce = useReducedMotion()
  const nombre = profileName?.split(' ')[0] ?? null

  // Inicio le cuenta al chat el checklist y la recomendación de hoy.
  useEffect(() => {
    setHomeContext({ steps, suggestionTitle, suggestionHref })
  }, [setHomeContext, steps, suggestionTitle, suggestionHref])

  const today = suggestionTitle && suggestionHref ? { title: suggestionTitle, href: suggestionHref } : null

  return (
    <section
      aria-label="Chat con Bravi"
      className="relative rounded-[28px] pt-5 px-4 pb-4 sm:px-6 sm:pb-6"
      style={{ background: 'linear-gradient(180deg, #FFF1B5 0px, #FFF6D6 120px, #FFF9F3 260px)', boxShadow: 'var(--shadow-medium)' }}
    >
      <header className="flex items-center gap-3 sm:gap-4 pr-1">
        <motion.img
          src="/bravi2.png"
          alt=""
          aria-hidden
          draggable={false}
          className="w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] object-contain flex-shrink-0 -my-2"
          style={{ filter: 'drop-shadow(0 8px 12px rgba(89,20,39,0.25))' }}
          animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, -5, 3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-[22px] sm:text-[26px] font-extrabold text-cherry-dark leading-tight" style={{ letterSpacing: '-0.5px' }}>
            Habla con Bravi
          </h2>
          <p className="text-[14px] text-tinta-2 leading-snug mt-0.5">
            Tu directora de marketing. También la tienes abajo a la derecha en cada sección.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { if (window.confirm('¿Empezar una conversación nueva con Bravi?')) clear() }}
            className="hidden sm:inline-flex flex-shrink-0 rounded-full px-3 py-2 text-[13px] font-semibold text-cherry-dark hover:bg-white/70"
          >
            Nueva conversación
          </button>
        )}
      </header>

      <div className="mt-4">
        <BraviChatThread
          welcome={`¡Hola${nombre ? `, ${nombre}` : ''}! Pregúntame lo que quieras sobre tu contenido, tu Instagram o la app.`}
          today={today}
          questions={BRAVI_FAQ.map(f => f.q)}
          threadClassName="max-h-[360px] sm:max-h-[420px]"
          alwaysWelcome
        />
      </div>
    </section>
  )
}
