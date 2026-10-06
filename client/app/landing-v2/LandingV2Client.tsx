'use client'
import '@/components/landing-v2/landing-v2.css'
import V2Header from '@/components/landing-v2/V2Header'
import V2Hero from '@/components/landing-v2/V2Hero'
import V2TrustStrip from '@/components/landing-v2/V2TrustStrip'
import V2Problem from '@/components/landing-v2/V2Problem'
import V2Vsl from '@/components/landing-v2/V2Vsl'
import V2HowItWorks from '@/components/landing-v2/V2HowItWorks'
import V2BusinessBrain from '@/components/landing-v2/V2BusinessBrain'
import V2Today from '@/components/landing-v2/V2Today'
import V2ToolsGrid from '@/components/landing-v2/V2ToolsGrid'
import V2CreateFlow from '@/components/landing-v2/V2CreateFlow'
import V2Inspiration from '@/components/landing-v2/V2Inspiration'
import V2Teleprompter from '@/components/landing-v2/V2Teleprompter'
import V2ComingSoon from '@/components/landing-v2/V2ComingSoon'
import V2SocialProof from '@/components/landing-v2/V2SocialProof'
import V2Community from '@/components/landing-v2/V2Community'
import V2Pricing from '@/components/landing-v2/V2Pricing'
import V2FAQ from '@/components/landing-v2/V2FAQ'
import V2FinalCTA from '@/components/landing-v2/V2FinalCTA'
import V2Footer from '@/components/landing-v2/V2Footer'
import V2StickyCTA from '@/components/landing-v2/V2StickyCTA'

/**
 * LANDING V2 — variante de test A/B (ruta independiente; `/` queda intacta).
 *
 * Narrativa:
 *   Hero (oscuro) → Trust → Problema/Transformación (claro) → VSL vídeo (arena) →
 *   Cómo funciona (oscuro) → Mi Marca (blush) → Plan para hoy (marfil) →
 *   Bento herramientas (blanco) → Crear contenido (oscuro) →
 *   Inspiración (marfil) → Teleprompter (oscuro) → Diagnóstico (arena) →
 *   Resultados (blanco) → Acompañamiento (blush) →
 *   Pricing (marfil) → FAQ (blanco) → CTA final (oscuro) → Footer (vino profundo)
 */
export default function LandingV2Client() {
  return (
    <div className="landing-v2 min-h-screen">
      <V2Header />
      <main id="top">
        <V2Hero />
        <V2TrustStrip />
        <V2Problem />
        <V2Vsl />
        <V2HowItWorks />
        <V2BusinessBrain />
        <V2Today />
        <V2ToolsGrid />
        <V2CreateFlow />
        <V2Inspiration />
        <V2Teleprompter />
        <V2ComingSoon />
        <V2SocialProof />
        <V2Community />
        <V2Pricing />
        <V2FAQ />
        <V2FinalCTA />
      </main>
      <V2Footer />
      <V2StickyCTA />
    </div>
  )
}