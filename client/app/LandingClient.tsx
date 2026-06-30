'use client'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

const FEATURES = [
  'Planes de contenido semanal y mensual con IA',
  'Reels y Carruseles con la metodología BRÄVE',
  'Stories estratégicas + Caja de Preguntas',
  'Perfil de marca guiado por Bravi, tu asistente IA',
  'Calendario editorial visual',
  'Biblioteca de contenido guardado',
]

const PLANS = [
  {
    name: 'Mensual',
    price: '29€',
    period: 'por mes',
    features: ['3 días de prueba gratis', 'Sin permanencia', 'Todo el contenido de BRÄVE Studio'],
    highlighted: false,
  },
  {
    name: 'Anual',
    price: '199€',
    period: 'por año · ahorra 149€',
    features: ['3 días de prueba gratis', 'Mejor precio', 'Todo el contenido de BRÄVE Studio'],
    highlighted: true,
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
      <section className="max-w-3xl mx-auto px-6 pt-12 pb-8 text-center">
        <div className="text-5xl mb-4">🤖</div>
        <h1
          className="text-4xl font-bold mb-4"
          style={{ color: '#591427', letterSpacing: '-0.5px' }}
        >
          Crea contenido estratégico para tu salón en minutos
        </h1>
        <p className="text-base leading-relaxed mb-8" style={{ color: '#591427', opacity: 0.7 }}>
          Bravi, tu asistente de IA, te ayuda a planificar, crear y publicar contenido que atrae clientes y hace crecer tu marca. Sin bloqueo creativo, sin perder horas.
        </p>
        <Link
          href="/signup"
          className="inline-block px-8 py-3.5 rounded-2xl font-semibold text-sm"
          style={{ background: '#7A1832', color: 'white' }}
        >
          Crear cuenta gratis
        </Link>
        <p className="text-xs mt-3" style={{ color: '#591427', opacity: 0.5 }}>
          3 días de prueba gratis · sin permanencia
        </p>
      </section>

      {/* Features */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map(f => (
            <div
              key={f}
              className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.08)' }}
            >
              <CheckCircle size={18} style={{ color: '#2a8a4a', flexShrink: 0, marginTop: 1 }} />
              <p className="text-sm" style={{ color: '#591427', opacity: 0.85 }}>{f}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-center mb-8" style={{ color: '#591427' }}>
          Planes
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className="rounded-3xl p-6 flex flex-col gap-4 relative"
              style={{
                background: plan.highlighted ? '#7A1832' : 'white',
                border: plan.highlighted ? '1.5px solid #591427' : '1.5px solid rgba(122,24,50,0.12)',
              }}
            >
              {plan.highlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
                  style={{ background: '#FFF1B5', color: '#591427' }}
                >
                  Mejor precio
                </div>
              )}
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: plan.highlighted ? 'rgba(255,241,181,0.8)' : '#7A1832', opacity: plan.highlighted ? 1 : 0.6 }}
                >
                  {plan.name}
                </p>
                <p
                  className="text-3xl font-bold mt-1"
                  style={{ color: plan.highlighted ? 'white' : '#591427' }}
                >
                  {plan.price}
                </p>
                <p
                  className="text-xs"
                  style={{ color: plan.highlighted ? 'rgba(255,255,255,0.6)' : '#591427', opacity: plan.highlighted ? 1 : 0.5 }}
                >
                  {plan.period}
                </p>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: plan.highlighted ? 'rgba(255,255,255,0.9)' : '#591427', opacity: plan.highlighted ? 1 : 0.8 }}>
                    <CheckCircle size={14} style={{ color: plan.highlighted ? '#FFF1B5' : '#2a8a4a', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-center"
                style={{
                  background: plan.highlighted ? '#FFF1B5' : '#7A1832',
                  color: plan.highlighted ? '#591427' : 'white',
                }}
              >
                Empezar prueba de 3 días
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* School section */}
      <section className="max-w-3xl mx-auto px-6 py-8">
        <div
          className="rounded-3xl p-6 text-center"
          style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.12)' }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: '#591427' }}>
            ¿Eres miembro de School?
          </p>
          <p className="text-sm mb-4" style={{ color: '#591427', opacity: 0.7 }}>
            Los miembros de la comunidad BRÄVE en School tienen acceso gratuito. Crea tu cuenta y canjea tu código.
          </p>
          <Link
            href="/signup"
            className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#FFF1B5', color: '#591427', border: '1.5px solid rgba(122,24,50,0.2)' }}
          >
            Crear cuenta con código School
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-6 py-10 text-center">
        <p className="text-xs" style={{ color: '#591427', opacity: 0.4 }}>
          BRÄVE Studio · Contenido estratégico para estilistas y salones
        </p>
      </footer>
    </div>
  )
}