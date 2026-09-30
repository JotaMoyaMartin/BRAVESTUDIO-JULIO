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
import TodayCard from '@/components/home/TodayCard'
import AppTile, { AppTileProps } from '@/components/home/AppTile'
import { TILES_NORMAL, TILES_PREMIUM } from '@/components/home/tiles'
import InspirationPreview from '@/components/home/InspirationPreview'
import TransitionsPreview from '@/components/home/TransitionsPreview'
import type { ReelInspiration, ReelTransition } from '@/types/database'

// HOME v2 — "BRÄVE me guía": una dirección, una señal de progreso, libertad debajo.
// Sin catálogo (los tiles viven en /herramientas), sin XP/niveles, sin banners duales.

function greeting(hour: number): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

// Exploración: todo lo que BRÄVE sabe hacer, a la vista. Portadas reales
// (Inspiración/Transiciones) + tarjetas grandes con las herramientas.
// Reutiliza tiles.ts / AppTile / previews de la Home anterior — sin duplicar.
function ToolsSection({
  tiles,
  inspirations,
  transitions,
}: {
  tiles: AppTileProps[]
  inspirations: ReelInspiration[]
  transitions: ReelTransition[]
}) {
  // Tiles VIVOS: los de Inspiración/Transiciones muestran portadas reales de
  // la base de datos (rotan solas) — presencia de banner sin imagen estática.
  const liveCovers = useMemo(() => {
    const coversOf = (rows: Array<{ cover_image?: string | null }> | null | undefined) =>
      (rows ?? []).map(r => r?.cover_image).filter((v): v is string => !!v).slice(0, 12)
    const insp = coversOf(inspirations)
    const tr = coversOf(transitions)
    return {
      '/inspiracion-reels': insp,
      '/transiciones-reels': tr,
    } as Record<string, string[]>
  }, [inspirations, transitions])

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-ink" style={{ letterSpacing: '-0.3px' }}>Todas tus herramientas</h2>
      <InspirationPreview inspirations={inspirations} />
      <TransitionsPreview transitions={transitions} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {tiles.map(t => {
          const covers = liveCovers[t.href]
          const live = covers && covers.length > 0 && t.liveCaption
            ? { covers, caption: t.liveCaption, noun: t.liveNoun ?? 'ideas' }
            : undefined
          return (
            <div key={t.href} className={t.image || live ? 'col-span-2' : ''}>
              <AppTile {...t} live={live} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function InicioClient({
  profile,
  todayInput,
  isPremium = false,
  inspirations = [],
  transitions = [],
}: {
  profile: Profile | null
  todayInput: TodayInput | null
  isPremium?: boolean
  inspirations?: ReelInspiration[]
  transitions?: ReelTransition[]
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

  // --- Estado Brain incompleto: dirección clara + herramientas visibles ---
  if (brainIncomplete && plan && effectiveInput) {
    return (
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-ink" style={{ letterSpacing: '-0.5px' }}>
            {greeting(hour)}, {firstName} 👋
          </h1>
          <p className="mt-1 text-base text-cherry-dark opacity-80">Tu plan para hoy</p>
        </div>

        <TodayCard decision={plan.primary} />

        <ToolsSection tiles={TILES_NORMAL} inspirations={inspirations} transitions={transitions} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-7">
      {/* 1. Cabecera — BRÄVE dirige primero */}
      <div>
        <h1 className="text-3xl font-bold text-ink" style={{ letterSpacing: '-0.5px' }}>
          {greeting(hour)}, {firstName} 👋
        </h1>
        <p className="mt-1 text-base text-cherry-dark opacity-80">Tu plan para hoy</p>
      </div>

      {/* 2. Bravi — una línea con contexto real (o nada) */}
      {braviLine && (
        <div className="flex items-center gap-2.5">
          <Bravi size={30} context={{ lastSection: profile?.last_visited_section ?? null, streak: 0, itemsToday: 0, hasScheduled: false, hour }} showMessage={false} className="flex-shrink-0" />
          <p className="text-sm font-medium text-cherry-dark" style={{ lineHeight: 1.5 }}>{braviLine}</p>
        </div>
      )}

      {/* 3. 🎯 Tu prioridad — solo con datos reales del Brain */}
      {priority && (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-buttermilk)' }}
          >
            <Target size={17} style={{ color: 'var(--color-cherry)' }} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-cherry opacity-60">Tu prioridad</p>
            <p className="text-sm font-semibold text-cherry-dark">{priority}</p>
          </div>
        </div>
      )}

      {/* 4. Acción principal — domina la página */}
      {plan && <TodayCard decision={plan.primary} retoNote={plan.retoNote} />}

      {/* 5. Después — máximo 2, solo reales */}
      {plan && plan.after.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-cherry opacity-60 mb-2">Después</p>
          <ul className="space-y-2">
            {plan.after.map(a => (
              <li key={a.href + a.label}>
                <Link href={a.href} className="group inline-flex items-center gap-2.5 text-sm font-medium text-cherry-dark hover:text-cherry">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ border: '1.5px solid var(--color-cherry)', opacity: 0.45 }} />
                  {a.label}
                  <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Progreso — una sola señal */}
      {progressLine && (
        <p className="text-sm text-cherry-dark opacity-60">{progressLine}</p>
      )}

      {/* 7. Exploración — todas las herramientas a la vista (portadas reales + tarjetas grandes) */}
      <ToolsSection
        tiles={isPremium ? TILES_PREMIUM : TILES_NORMAL}
        inspirations={inspirations}
        transitions={transitions}
      />
    </div>
  )
}