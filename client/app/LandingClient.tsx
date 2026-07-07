'use client'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingHero from '@/components/landing/LandingHero'
import LandingBenefits from '@/components/landing/LandingBenefits'
import LandingPricing from '@/components/landing/LandingPricing'
import LandingHowItWorks from '@/components/landing/LandingHowItWorks'
import LandingFeatures from '@/components/landing/LandingFeatures'
import LandingStoriesReal from '@/components/landing/LandingStoriesReal'
import LandingResults from '@/components/landing/LandingResults'
import LandingTestimonials from '@/components/landing/LandingTestimonials'
import LandingFAQ from '@/components/landing/LandingFAQ'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingSkool from '@/components/landing/LandingSkool'
import LandingFooter from '@/components/landing/LandingFooter'
import BraviFloating from '@/components/landing/BraviFloating'

export default function LandingClient() {
  return (
    <div className="min-h-screen bg-cream">
      <LandingHeader />
      <main>
        <LandingHero />

        <div className="relative">
          <LandingBenefits />
          <BraviFloating
            message="¿Te cuesta publicar cada semana? Yo te lo pongo fácil."
            size={64}
            position="absolute"
            className="right-4 top-10"
          />
        </div>

        <LandingPricing />

        <div className="relative">
          <LandingHowItWorks />
          <BraviFloating
            message="En menos de 10 minutos tienes contenido para todo el mes."
            size={64}
            position="absolute"
            className="left-4 top-20"
          />
        </div>

        <LandingFeatures />

        <div className="relative">
          <LandingStoriesReal />
          <BraviFloating
            message="Yo te escribo las 3 Stories. Tú solo las publicas."
            size={64}
            position="absolute"
            className="right-4 top-16"
          />
        </div>

        <LandingResults />

        <div className="relative">
          <LandingTestimonials />
          <BraviFloating
            message="Ellas ya lo consiguieron. Te toca a ti."
            size={60}
            position="absolute"
            className="left-4 bottom-10"
          />
        </div>

        <LandingFAQ />

        <LandingCTA />
        <LandingSkool />
      </main>
      <LandingFooter />
    </div>
  )
}