'use client'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { Target, ArrowRight } from 'lucide-react'
import { Profile } from '@/types/database'
import { ContentItem } from '@/types/database'
import { demoGetPlan, demoGetBrand } from '@/lib/demo-store'
import {
  decideToday,
  TodayInput,
  localISODate,
  getWeekKey,
  pickLastPendingItem,
  priorityDisplay,
  buildBraviLine,
} from '@/lib/home-today'
import Bravi from '@/components/bravi/Bravi'
import BraviHomeChat from '@/components/home/BraviHomeChat'
import NextStepsCard from '@/components/home/NextStepsCard'
import { buildBraviChecklist } from '@/lib/home-bravi'
import AppTile from '@/components/home/AppTile'
import { TILES_NORMAL, TILES_PREMIUM } from '@/components/home/tiles'
import ReelsViralesHero from '@/components/home/ReelsViralesHero'
import AssistantBar from '@/components/home/AssistantBar'
import { HomeHero } from '@/components/home/HomeVisual'
import PageHeader from '@/components/ui/PageHeader'
import InstagramHomeCard, { type InstagramHomeState, type InstagramHomeSummary } from '@/components/home/InstagramHomeCard'
import type { ReelInspiration, ReelTransition } from '@/types/database'

// HOME v2 — "BRÄVE me guía": una dirección, una señal de progreso, libertad debajo.
// Sin catálogo (los tiles viven en /herramientas), sin XP/niveles, sin banners duales.

function greeting(hour: number): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function InicioClient({
  profile,
  todayInput,
  isPremium = false,
  brandSummary = null,
  inspirations = [],
  transitions = [],
  instagram = { state: 'preparing' },
  view = 'inicio',
}: {
  profile: Profile | null
  todayInput: TodayInput | null
  isPremium?: boolean
  brandSummary?: string | null
  inspirations?: ReelInspiration[]
  transitions?: ReelTransition[]
  instagram?: { state: InstagramHomeState; username?: string | null; summary?: InstagramHomeSummary | null }
  /** 'asistente' = /asistente (chat completo y pasos); 'inicio' = portada visual. */
  view?: 'inicio' | 'asistente'
}) {
  const [demoPlan, setDemoPlan] = useState<Partial<ContentItem>[]>([])
  const [demoBrand, setDemoBrand] = useState<Record<string, unknown> | null>(null)
  const isDemo = profile?.id === 'demo'

  useEffect(() => {
    if (isDemo) {
      setDemoPlan(demoGetPlan() as unknown as Partial<ContentItem>[])
      setDemoBrand(demoGetBrand() as Record<string, unknown> | null)
    }
  }, [isDemo])

  const demoTodayInput: TodayInput | null = useMemo(() => {
    if (!isDemo) return null
    const todayISO = localISODate(new Date())
    const wk = getWeekKey(new Date())
    return {
      brandState: (demoBrand?.completion_status as string | undefined) ?? null,
      isPremium: false,
      retoActive: false,
      retoDay: 0,
      retoMissionTitle: null,
      retoTodayItemStatus: null,
      scheduledToday: demoPlan
        .filter(i => i.scheduled_date === todayISO && i.status === 'scheduled')
        .map(i => ({ id: String(i.id), title: i.title ?? null, type: i.type ?? null })),
      lastPendingItem: pickLastPendingItem(demoPlan, profile?.last_visited_section ?? null),
      mainPriority: (demoBrand?.main_priority as string | undefined) ?? null,
      starService: (demoBrand?.service_to_promote as string | undefined) ?? null,
      todayISO,
      weekCreated: demoPlan.filter(i => i.created_at && getWeekKey(new Date(i.created_at)) === wk).length,
      weekPublished: demoPlan.filter(
        i =>
          (i.reto_status === 'publicado' || i.status === 'done') &&
          i.updated_at &&
          getWeekKey(new Date(i.updated_at)) === wk,
      ).length,
      weeklyTarget: null,
      totalItems: demoPlan.length,
      storiesCount: demoPlan.filter(i => i.type === 'story').length,
    }
  }, [isDemo, demoPlan, demoBrand, profile?.last_visited_section])

  const effectiveInput = isDemo ? demoTodayInput : todayInput
  const plan = effectiveInput ? decideToday(effectiveInput) : null
  const priority = plan ? priorityDisplay(effectiveInput!.mainPriority, effectiveInput!.starService) : null
  const braviLine = plan && effectiveInput ? buildBraviLine(effectiveInput.mainPriority, effectiveInput.starService, plan.primary.kind) : null

  // Señal única de progreso (sin XP/niveles): real, nunca inventada.
  const progressLine = useMemo(() => {
    if (!effectiveInput) return null
    if (effectiveInput.retoActive && effectiveInput.weeklyTarget) {
      return `Esta semana · ${effectiveInput.weekPublished} de ${effectiveInput.weeklyTarget} acciones de tu reto`
    }
    if (effectiveInput.weekCreated > 0) {
      return `Esta semana · ${effectiveInput.weekCreated} ${effectiveInput.weekCreated === 1 ? 'contenido creado' : 'contenidos creados'}`
    }
    return null
  }, [effectiveInput])

  const firstName = profile?.full_name?.split(' ')[0] || 'guapa'
  const hour = new Date().getHours()
  const brainIncomplete = plan?.primary.kind === 'marca'

  // Asistente BRÄVE: checklist determinista con los contadores reales +
  // contexto de marca (optimized_summary) para que Bravi hable del salón.
  const braviSteps = useMemo(() => buildBraviChecklist({
    brandState: effectiveInput?.brandState ?? null,
    isPremium,
    totalItems: effectiveInput?.totalItems ?? 0,
    storiesCount: effectiveInput?.storiesCount ?? 0,
    weekCreated: effectiveInput?.weekCreated ?? 0,
    weekPublished: effectiveInput?.weekPublished ?? 0,
    instagramConnected: instagram.state === 'connected',
  }), [effectiveInput, isPremium, instagram.state])

  const tiles = isPremium ? TILES_PREMIUM : TILES_NORMAL
  const userId = profile?.id ?? 'demo'

  // --- ASISTENTE (/asistente): chat completo de Bravi + tus pasos ---
  if (view === 'asistente') {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader
          title="Asistente"
          subtitle="Bravi, tu directora de marketing: pregúntale lo que quieras y sigue tus próximos pasos."
        />
        {priority && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-buttermilk)' }}>
              <Target size={17} style={{ color: 'var(--color-cherry)' }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-cereza">Tu prioridad</p>
              <p className="text-[15px] font-semibold text-cherry-dark">{priority}</p>
            </div>
          </div>
        )}
        <BraviHomeChat
          profileName={profile?.full_name ?? null}
          steps={braviSteps}
          suggestionTitle={plan?.primary.title ?? null}
          suggestionHref={plan?.primary.ctaHref ?? null}
        />
        <NextStepsCard steps={braviSteps} />
        {plan && plan.after.length > 0 && (
          <div className="card p-4 space-y-2">
            <p className="text-[14px] font-semibold text-ink">Después</p>
            <ul className="space-y-2">
              {plan.after.map(a => (
                <li key={a.href + a.label}>
                  <Link href={a.href} className="group inline-flex items-center gap-2.5 text-[15px] font-medium text-cherry-dark hover:text-cherry">
                    <ArrowRight size={14} aria-hidden /> {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {progressLine && <p className="text-sm text-cherry-dark opacity-70">{progressLine}</p>}
      </div>
    )
  }

  // --- INICIO: visual y directo (cabecera con foto, barra del asistente, herramientas) ---
  return (
    <div className="max-w-5xl space-y-6">
      <HomeHero
        userId={userId}
        greeting={`Bienvenida, ${firstName} · ${greeting(hour).toLowerCase()}`}
        brandCta={brainIncomplete && plan ? { title: plan.primary.title, href: plan.primary.ctaHref } : null}
      />

      <AssistantBar userId={userId} />

      {/* Tus herramientas: los banners de BRÄVE (horizontales, como los diseñó Jota) */}
      <section className="space-y-4" aria-label="Tus herramientas">
        <h2 className="text-lg font-semibold text-ink">Tus herramientas</h2>
        <ReelsViralesHero inspirations={inspirations} transitions={transitions} userId={userId} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {tiles.filter(t => t.href !== '/inspiracion-reels').map(t => (
            <AppTile key={t.href} {...t} />
          ))}
        </div>
      </section>

      <InstagramHomeCard {...instagram} />

      <Link href="/asistente" className="card p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-transform">
        <Bravi size={40} showMessage={false} className="flex-shrink-0" />
        <span>
          <span className="block text-[16px] font-semibold text-ink">Asistente</span>
          <span className="block text-[14px] text-tinta-2">Habla con Bravi y sigue tus próximos pasos</span>
        </span>
      </Link>
    </div>
  )
}
