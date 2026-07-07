'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { IMacMockup } from '@/components/Mockups'
import {
  MacBookBiblioteca, IPadMiMarca, IPhoneCrearReel, IMacDashboard,
} from './DeviceShowcase'

type Feature = {
  device: 'imac' | 'macbook' | 'ipad' | 'iphone'
  badge: string
  title: string
  desc: string
  cta: string
  mockup: React.ReactNode
}

const FEATURES: Feature[] = [
  {
    device: 'imac',
    badge: 'Calendario',
    title: 'No vuelvas a pensar qué publicar.',
    desc: 'Planifica tu mes entero en 5 minutos. Reels, carruseles y Stories estratégicamente distribuidos para que cada día tengas algo listo para publicar.',
    cta: 'Crear mi planificación',
    mockup: <IMacMockup />,
  },
  {
    device: 'macbook',
    badge: 'Biblioteca',
    title: 'Una biblioteca infinita de ideas para tu salón.',
    desc: 'Cada idea guardada con guion, copy con hashtags, idea visual y lista para copiar. Nunca más te quedarás en blanco delante del móvil.',
    cta: 'Explorar la biblioteca',
    mockup: <MacBookBiblioteca />,
  },
  {
    device: 'ipad',
    badge: 'Mi Marca',
    title: 'Tu estrategia de marca, construida por IA.',
    desc: 'Bravi analiza tu salón y crea un documento estratégico completo: clienta ideal, pilares de contenido, estilo de comunicación y plan de acción.',
    cta: 'Crear mi estrategia',
    mockup: <IPadMiMarca />,
  },
  {
    device: 'iphone',
    badge: 'Crear Reel',
    title: 'Guiones que venden, listos para grabar.',
    desc: 'La metodología BRÄVE: gancho, contexto, solución y CTA conversacional. Copias el guion, grabas sin pensar y publicas con confianza.',
    cta: 'Crear un Reel',
    mockup: <IPhoneCrearReel />,
  },
  {
    device: 'imac',
    badge: 'Dashboard',
    title: 'Todo tu contenido en un solo lugar.',
    desc: 'Ideas guardadas, agenda, racha de publicación y nivel. BRÄVE hace que publicar con constancia sea un hábito que se siente como un juego.',
    cta: 'Empezar ahora',
    mockup: <IMacDashboard />,
  },
]

export default function LandingFeatures() {
  return (
    <section id="funciones" className="relative bg-warm-light py-16 lg:py-24 overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute pointer-events-none" style={{ top: '10%', right: '-5%', width: 280, height: 280, borderRadius: '50%', background: 'var(--color-pastel-blue)', opacity: 0.15, filter: 'blur(60px)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '5%', left: '-5%', width: 320, height: 320, borderRadius: '50%', background: 'var(--color-buttermilk)', opacity: 0.25, filter: 'blur(70px)' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-cherry-dark mb-3" style={{ letterSpacing: '-0.5px' }}>
            Todo lo que necesitas para dominar tu Instagram
          </h2>
          <p className="text-sm sm:text-base text-cherry-dark opacity-70 max-w-2xl mx-auto">
            No es una app más. Es tu sistema completo de contenido, diseñado para estilistas que quieren llenar su agenda.
          </p>
        </motion.div>

        <div className="space-y-16 lg:space-y-24">
          {FEATURES.map((f, i) => (
            <FeatureRow key={i} feature={f} index={i} reverse={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureRow({ feature, index, reverse }: { feature: Feature; index: number; reverse: boolean }) {
  return (
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      {/* Mockup */}
      <motion.div
        initial={{ opacity: 0, x: reverse ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`relative ${reverse ? 'lg:order-2' : 'lg:order-1'}`}
      >
        <div className="flex items-center justify-center">
          {feature.mockup}
        </div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={reverse ? 'lg:order-1' : 'lg:order-2'}
      >
        <span
          className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3"
          style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
        >
          {feature.badge}
        </span>
        <h3 className="text-2xl sm:text-3xl font-bold text-cherry-dark mb-3 leading-tight" style={{ letterSpacing: '-0.3px' }}>
          {feature.title}
        </h3>
        <p className="text-base leading-relaxed text-cherry-dark opacity-75 mb-5">
          {feature.desc}
        </p>
        <Link href="/signup" className="btn-primary">
          {feature.cta}
        </Link>
      </motion.div>
    </div>
  )
}