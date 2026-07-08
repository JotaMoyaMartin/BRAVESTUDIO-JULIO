'use client'

import { Profile, BrandProfile, ContentItem } from '@/types/database'
import { Reto10kConfig, Reto10kProgress } from '@/types/reto10k'
import { useSessionState } from '@/lib/session-store'
import RetoLanding from '@/components/reto10k/RetoLanding'
import RetoOnboarding from '@/components/reto10k/RetoOnboarding'
import RetoDashboard from '@/components/reto10k/RetoDashboard'

interface Props {
  profile: Profile | null
  progress: Reto10kProgress | null
  config: Reto10kConfig | null
  brand: Partial<BrandProfile> | null
  contentItems: ContentItem[]
  demoMode: boolean
}

export default function Reto10kClient({ profile, progress, config, brand, contentItems, demoMode }: Props) {
  const userId = profile?.id || 'demo'
  const [generating] = useSessionState(`u:${userId}:reto10k:generating`, false)

  // Determinar vista
  if (!progress || progress.status === 'not_started') {
    if (progress && progress.status === 'not_started') {
      return (
        <RetoOnboarding
          userId={userId}
          progress={progress}
          config={config}
          brand={brand}
          demoMode={demoMode}
        />
      )
    }
    return <RetoLanding userId={userId} demoMode={demoMode} />
  }

  if (progress.status === 'active' || progress.status === 'paused' || progress.status === 'completed') {
    return (
      <RetoDashboard
        profile={profile}
        progress={progress}
        config={config}
        brand={brand}
        contentItems={contentItems}
        demoMode={demoMode}
      />
    )
  }

  return <RetoLanding userId={userId} demoMode={demoMode} />
}