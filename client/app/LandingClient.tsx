'use client'
import Link from 'next/link'
import BraviMascot from '../components/bravi/BraviMascot'
import { DeviceMockups } from '../components/Mockups'

const BENEFITS = [
  {
    emoji: '🤔',
    title: 'Nunca más te quedes sin ideas.',
    desc: 'Bravi te propone ganchos, temas y enfoques nuevos cada semana.',
  },
  {
    emoji: '🎬',
    title: 'Crea guiones para hablar a cámara.',
    desc: 'Reels con la metodología BRÄVE: gancho, contexto, solución y CTA listos para grabar.',
  },
  {
    emoji: '📅',
    title: 'Planifica tu contenido del mes.',
    desc: 'Un calendario entero en minutos, con ideas para cada día y formato.',
  },
  {
    emoji: '💬',
    title: 'Crea Stories que generan conversación.',
    desc: 'Secuencias estratégicas + caja de preguntas que conectan con tu clienta.',
  },
  {
    emoji: '✂️',
    title: 'Diseñado para estilistas y salones de belleza.',
    desc: 'Lenguaje, servicios y objetivos pensados para tu sector.',
  },
]

const STEPS = [
  {
    n: 1,
    title: 'Configura tu salón.',
    desc: 'Cuéntale a Bravi sobre tu marca una vez. Lo recordará para siempre.',
  },
  {
    n: 2,
    title: 'Elige qué quieres crear.',
    desc: 'Reels, carruseles, Stories o planificación mensual. Tú decides.',
  },
  {
    n: 3,
    title: 'Copia, graba y publica.',
    desc: 'Textos listos para copiar y pegar. Ideas visuales para grabar sin pensar.',
  },
]

export default function LandingClient() {
  return (
    <div className="min-h-screen" style={{ background: '#FFF8E7' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: '#7A1832' }}
          >
            <span className="text-white text-base">✦</span>
          </div>
          <span className="font-bold text-lg" style={{ color: '#591427' }}>BRÄVE Studio</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium px-4 py-2 rounded-xl"
          style={{ color: '#591427', opacity: 0.7 }}
        >
          Ya tengo cuenta
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-10 pb-12">
        <div
          className="relative rounded-3xl p-8 sm:p-12 text-center"
          style={{ background: '#FFFDF5', border: '1.5px solid rgba(255,241,181,0.8)' }}
        >
          {/* Bravi mascot floating top-right */}
          <div className="absolute top-4 right-4 hidden sm:block">
            <BraviMascot size={72} />
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold mb-4"
            style={{ color: '#591427', letterSpacing: '-0.5px' }}
          >
            BRÄVE Studio
          </h1>
          <p className="text-base sm:text-lg leading-relaxed mb-4 max-w-xl mx-auto" style={{ color: '#591427', opacity: 0.75 }}>
            Tu asistente de IA para crear contenido que atrae más clientas a tu salón.
          </p>
          <p className="text-base sm:text-lg font-bold mb-8 max-w-xl mx-auto" style={{ color: '#591427' }}>
            Crea un mes entero de contenido para Instagram en menos de 10 minutos.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Link
              href="/signup"
              className="inline-block px-8 py-3.5 rounded-2xl font-semibold text-sm transition-transform hover:-translate-y-0.5"
              style={{ background: '#7A1832', color: 'white' }}
            >
              Empieza gratis
            </Link>
            <Link
              href="/pricing"
              className="inline-block px-8 py-3.5 rounded-2xl font-semibold text-sm transition-transform hover:-translate-y-0.5"
              style={{ background: '#FFF1B5', color: '#591427' }}
            >
              Ver planes
            </Link>
          </div>
          <p className="text-xs" style={{ color: '#591427', opacity: 0.5 }}>
            Prueba gratuita de 3 días. Cancela cuando quieras.
          </p>
        </div>

        {/* Device mockups */}
        <div className="mt-12">
          <DeviceMockups />
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px" style={{ background: 'rgba(255,241,181,0.8)' }} />
      </div>

      {/* Benefits */}
      <section className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <div className="space-y-5">
          {BENEFITS.map((b, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-5 sm:p-6 rounded-2xl"
              style={{ background: '#FFFDF5', border: '1.5px solid rgba(255,241,181,0.8)' }}
            >
              <div className="text-3xl flex-shrink-0">{b.emoji}</div>
              <div>
                <p className="font-bold text-base mb-1" style={{ color: '#591427' }}>{b.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#591427', opacity: 0.7 }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px" style={{ background: 'rgba(255,241,181,0.8)' }} />
      </div>

      {/* Cómo funciona */}
      <section className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10" style={{ color: '#591427' }}>
          Cómo funciona
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl p-6 text-center"
              style={{ background: '#FFFDF5', border: '1.5px solid rgba(255,241,181,0.8)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4"
                style={{ background: '#7A1832', color: '#FFF1B5' }}
              >
                {s.n}
              </div>
              <p className="font-bold text-base mb-2" style={{ color: '#591427' }}>{s.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: '#591427', opacity: 0.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <div
          className="rounded-3xl p-8 sm:p-12 text-center"
          style={{ background: '#7A1832' }}
        >
          <p className="text-xl sm:text-2xl font-bold mb-6" style={{ color: '#FFF1B5' }}>
            Empieza gratis con 3 días de prueba.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-3.5 rounded-2xl font-semibold text-sm transition-transform hover:-translate-y-0.5"
            style={{ background: '#FFF1B5', color: '#591427' }}
          >
            Empeza gratis
          </Link>
          <p className="text-xs mt-4" style={{ color: 'rgba(255,241,181,0.6)' }}>
            Sin permanencia. Cancela cuando quieras.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px" style={{ background: 'rgba(255,241,181,0.8)' }} />
      </div>

      {/* Skool section */}
      <section className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <div
          className="rounded-3xl p-6 sm:p-8 text-center"
          style={{ background: '#FFFDF5', border: '1.5px solid rgba(255,241,181,0.8)' }}
        >
          <p className="text-base font-bold mb-2" style={{ color: '#591427' }}>
            ¿Eres miembro de BRÄVE en Skool?
          </p>
          <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: '#591427', opacity: 0.7 }}>
            Los miembros de la comunidad BRÄVE en Skool tienen acceso gratuito. Crea tu cuenta con tu email e introduce tu código de acceso.
          </p>
          <Link
            href="/skool-access"
            className="inline-block px-6 py-3 rounded-xl text-sm font-semibold"
            style={{ background: '#7A1832', color: 'white' }}
          >
            Activar acceso gratuito
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-10 text-center">
        <p className="text-xs mb-2" style={{ color: '#591427', opacity: 0.4 }}>
          BRÄVE Studio · Contenido estratégico para estilistas y salones
        </p>
        <a
          href="mailto:bravefourquarters@gmail.com"
          className="text-xs"
          style={{ color: '#591427', opacity: 0.5 }}
        >
          ¿Tienes dudas? Escríbenos a bravefourquarters@gmail.com
        </a>
      </footer>
    </div>
  )
}