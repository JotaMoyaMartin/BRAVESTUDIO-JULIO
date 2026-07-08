'use client'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { Sparkles, Film, LayoutGrid, Star, ArrowRight } from 'lucide-react'
import { Profile, BrandProfile, ContentItem, ReelInspiration, ReelTransition } from '@/types/database'
import { demoGetPlan } from '@/lib/demo-store'
import Bravi from '@/components/bravi/Bravi'
import QuickActionCard from '@/components/home/QuickActionCard'
import SurpriseCard from '@/components/home/SurpriseCard'
import ContinueCard from '@/components/home/ContinueCard'
import LevelBar from '@/components/home/LevelBar'
import AchievementsCarousel from '@/components/home/AchievementsCarousel'
import InspirationPreview from '@/components/home/InspirationPreview'
import TransitionsPreview from '@/components/home/TransitionsPreview'

const SERVICES = ['Balayage', 'Rubios', 'Canas', 'Alisados', 'Tratamientos', 'Corte', 'Color']

// --- Levels (persisted in profile.xp_total) ---

const LEVELS = [
  { min: 0, max: 2, label: 'Empezando', emoji: '🌱' },
  { min: 3, max: 7, label: 'Creadora', emoji: '✍️' },
  { min: 8, max: 14, label: 'Constante', emoji: '⚡' },
  { min: 15, max: 24, label: 'Experta BRÄVE', emoji: '🔥' },
  { min: 25, max: 39, label: 'Maestra', emoji: '💎' },
  { min: 40, max: Infinity, label: 'BRÄVE Pro', emoji: '👑' },
]

function getLevel(total: number) {
  return LEVELS.find(l => total >= l.min && total <= l.max) || LEVELS[0]
}

function getLevelProgress(total: number) {
  const level = getLevel(total)
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1]
  if (!nextLevel) return 100
  const range = level.max - level.min + 1
  const progress = total - level.min
  return Math.max(0, Math.round((progress / range) * 100))
}

function getWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

function getStreak(items: Partial<ContentItem>[]): number {
  if (items.length === 0) return 0
  const weekKeys = new Set(items.map(i => i.created_at ? getWeekKey(new Date(i.created_at)) : '').filter(Boolean))
  let streak = 0
  const now = new Date()
  let check = new Date(now)
  check.setDate(check.getDate() - check.getDay())
  while (weekKeys.has(check.toISOString().split('T')[0])) {
    streak++
    check.setDate(check.getDate() - 7)
  }
  return streak
}

const ACHIEVEMENTS = [
  { id: 'primera_idea', label: 'Primera idea', desc: 'Guardaste tu primer contenido', emoji: '🌟', req: (n: number) => n >= 1 },
  { id: 'cinco_ideas', label: '5 contenidos', desc: '5 piezas creadas', emoji: '🎯', req: (n: number) => n >= 5 },
  { id: 'diez_ideas', label: '10 contenidos', desc: '10 piezas creadas', emoji: '💪', req: (n: number) => n >= 10 },
  { id: 'racha_2', label: 'Racha x2', desc: '2 semanas seguidas', emoji: '🔥', req: (_n: number, s: number) => s >= 2 },
  { id: 'racha_4', label: 'Racha x4', desc: '4 semanas seguidas', emoji: '⚡', req: (_n: number, s: number) => s >= 4 },
  { id: 'veinte_ideas', label: '20 contenidos', desc: '20 piezas creadas', emoji: '🏆', req: (n: number) => n >= 20 },
]

function greeting(hour: number): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function InicioClient({
  profile,
  brand,
  contentItems,
  inspirations,
  transitions,
}: {
  profile: Profile | null
  brand: Partial<BrandProfile> | null
  contentItems: Partial<ContentItem>[]
  inspirations: Pick<ReelInspiration, 'id' | 'title' | 'short_description' | 'cover_image'>[]
  transitions: Pick<ReelTransition, 'id' | 'title' | 'short_description' | 'cover_image'>[]
}) {
  const [items, setItems] = useState<Partial<ContentItem>[]>(contentItems)
  const isDemo = profile?.id === 'demo'

  useEffect(() => {
    if (isDemo) {
      const stored = demoGetPlan() as unknown as Partial<ContentItem>[]
      setItems(stored)
    }
  }, [isDemo])

  // Use persisted XP if available, else fall back to item count
  const xpTotal = profile?.xp_total ?? items.length
  const level = getLevel(xpTotal)
  const levelProgress = getLevelProgress(xpTotal)
  const streak = getStreak(items)
  const firstName = profile?.full_name?.split(' ')[0] || 'guapa'
  const brandComplete = brand?.completion_status === 'complete' || brand?.completion_status === 'partial'
  const hour = new Date().getHours()

  // Items created today
  const todayStr = new Date().toDateString()
  const itemsToday = items.filter(i => i.created_at && new Date(i.created_at).toDateString() === todayStr).length
  const hasScheduled = items.some(i => i.scheduled_date && i.status === 'scheduled')

  // Last content item for "continue"
  const lastItem = useMemo(() => {
    if (!items.length) return null
    const sorted = [...items].sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0
      return tb - ta
    })
    return sorted[0]
  }, [items])

  const braviContext = {
    lastSection: profile?.last_visited_section ?? null,
    streak,
    itemsToday,
    hasScheduled,
    hour,
  }

  const brandContext = brand?.optimized_summary || brand?.salon_name || undefined

  const achievements = ACHIEVEMENTS.map(a => ({
    id: a.id,
    label: a.label,
    desc: a.desc,
    emoji: a.emoji,
    unlocked: a.req(xpTotal, streak),
  }))

  return (
    <div className="space-y-6">
      {/* 1. Saludo + Bravi */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink" style={{ letterSpacing: '-0.5px' }}>
            {greeting(hour)}, {firstName}
          </h1>
          <p className="mt-1 text-base text-cherry-dark opacity-80">¿Qué creamos hoy?</p>
        </div>
        <Bravi size={88} context={braviContext} showMessage={false} />
      </div>

      {/* Bravi speech bubble — contextual message */}
      <div
        className="flex items-center gap-3 p-4 rounded-[var(--radius-md)]"
        style={{ background: 'var(--color-buttermilk)', border: '1.5px solid rgba(122,24,50,0.12)' }}
      >
        <Bravi size={44} context={braviContext} showMessage={false} className="flex-shrink-0" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-0.5 text-cherry opacity-60">Bravi dice</p>
          <BraviMessage context={braviContext} />
        </div>
      </div>

      {/* Brand warning */}
      {!brandComplete && (
        <div
          className="p-4 rounded-[var(--radius-md)] flex items-start gap-3"
          style={{ background: 'var(--color-buttermilk)', border: '1.5px solid rgba(122,24,50,0.15)' }}
        >
          <Bravi size={44} context={{ ...braviContext, lastSection: 'mi-marca' }} showMessage={false} className="flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-cherry-dark">Bravi recomienda completar Tu Marca</p>
            <p className="text-sm mt-0.5 text-cherry-dark opacity-80">
              Rellénalo una vez y todo el contenido será mucho más personalizado para tu salón.
            </p>
            <Link href="/mi-marca" className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-cherry hover:underline">
              Completar Mi Marca <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* 2. Continuar donde lo dejaste */}
      {lastItem && (
        <ContinueCard item={lastItem} section={profile?.last_visited_section ?? null} />
      )}

      {/* 3. 4 tarjetas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuickActionCard href="/planificar" icon={Sparkles} label="Planificación" desc="Genera ideas para el mes" tone="cherry" />
        <QuickActionCard href="/crear-contenido" icon={Film} label="Crear Contenido" desc="Reel o carrusel ahora" tone="pink" />
        <QuickActionCard href="/stories" icon={LayoutGrid} label="Stories BRÄVE" desc="Stories y preguntas" tone="blue" />
        <QuickActionCard href="/mi-marca" icon={Star} label="Mi Marca" desc="Perfil de tu salón" tone="buttermilk" />
      </div>

      {/* 3.5 Inspiración de Reels — portadas visuales rotativas */}
      <InspirationPreview inspirations={inspirations} />

      {/* 3.6 Transiciones de Reels — portadas visuales rotativas */}
      <TransitionsPreview transitions={transitions} />

      {/* 4. Sorpréndeme protagonista */}
      <SurpriseCard brandContext={brandContext} userId={profile?.id} />

      {/* 5. Nivel BRÄVE compacto */}
      <LevelBar
        level={LEVELS.indexOf(level) + 1}
        levelLabel={level.label}
        emoji={level.emoji}
        total={xpTotal}
        progress={levelProgress}
      />

      {/* 6. Logros carrusel horizontal */}
      <div
        className="rounded-[var(--radius-md)] p-5"
        style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
      >
        <AchievementsCarousel achievements={achievements} />
      </div>

      {/* 7. Atajos de servicio */}
      <div>
        <h2 className="font-semibold text-sm mb-3 text-cherry-dark opacity-80">Crear Reel rápido sobre…</h2>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map(s => (
            <Link
              key={s}
              href={`/crear-contenido?service=${encodeURIComponent(s)}&type=reel`}
              className="px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-all hover:scale-105"
              style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.1)' }}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// Render Bravi's contextual message as text
function BraviMessage({ context }: { context: { lastSection?: string | null; streak: number; itemsToday: number; hasScheduled: boolean; hour: number } }) {
  // Use the same logic as Bravi but render only the text (SSR-safe via state)
  const [text, setText] = useState('¡Hola! ¿Qué creamos hoy?')
  useEffect(() => {
    import('@/lib/bravi-messages').then(({ pickMessage }) => {
      setText(pickMessage(context).text)
    })
  }, [context])
  return <p className="text-sm font-medium text-cherry-dark" style={{ lineHeight: 1.5 }}>{text}</p>
}