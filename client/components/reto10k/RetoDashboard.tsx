'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Profile, BrandProfile, ContentItem } from '@/types/database'
import { Reto10kConfig, Reto10kProgress } from '@/types/reto10k'
import { useSessionState } from '@/lib/session-store'
import RetoTabs, { RetoTabId } from './RetoTabs'
import RetoDashboardView from './RetoDashboardView'
import RetoCaminoView from './RetoCaminoView'
import RetoIdeasView from './RetoIdeasView'
import RetoCalendarioView from './RetoCalendarioView'
import RetoProgresoView from './RetoProgresoView'
import BraviGuide from '@/components/bravi/BraviGuide'

interface Props {
  profile: Profile | null
  progress: Reto10kProgress
  config: Reto10kConfig | null
  brand: Partial<BrandProfile> | null
  contentItems: ContentItem[]
  demoMode: boolean
}

export default function RetoDashboard({ profile, progress, config, brand, contentItems, demoMode }: Props) {
  const router = useRouter()
  const userId = profile?.id || 'demo'
  const [activeTab, setActiveTab] = useSessionState<RetoTabId>(`u:${userId}:reto10k:tab`, 'dashboard')

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const ideaCount = contentItems.filter(
    i => i.tag === 'reto-10k' && (i.reto_status || 'idea') === 'idea'
  ).length

  return (
    <div className="space-y-1">
      <div className="px-1 pt-2 pb-1">
        <BraviGuide section="reto-10k" size={56} context={{ retoActive: true, retoStatus: progress.status, retoDay: progress.current_day, retoItemsCount: contentItems.filter(i => i.tag === 'reto-10k').length }} />
      </div>
      <RetoTabs active={activeTab} onChange={setActiveTab} ideaCount={ideaCount} />

      {activeTab === 'dashboard' && (
        <RetoDashboardView
          profile={profile}
          progress={progress}
          config={config}
          brand={brand}
          contentItems={contentItems}
          demoMode={demoMode}
          onGoToTab={setActiveTab}
          onChanged={refresh}
        />
      )}
      {activeTab === 'camino' && (
        <RetoCaminoView progress={progress} config={config} onGoToTab={setActiveTab} />
      )}
      {activeTab === 'ideas' && (
        <RetoIdeasView
          profile={profile}
          progress={progress}
          config={config}
          brand={brand}
          contentItems={contentItems}
          demoMode={demoMode}
          onChanged={refresh}
        />
      )}
      {activeTab === 'calendario' && (
        <RetoCalendarioView
          profile={profile}
          progress={progress}
          config={config}
          brand={brand}
          contentItems={contentItems}
          demoMode={demoMode}
          onChanged={refresh}
        />
      )}
      {activeTab === 'progreso' && (
        <RetoProgresoView
          profile={profile}
          progress={progress}
          config={config}
          contentItems={contentItems}
        />
      )}
    </div>
  )
}