'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Sparkles, Film, LayoutGrid, Star, Shuffle, ArrowRight, Trophy, Flame, TrendingUp, Target, BookOpen, Calendar } from 'lucide-react'
import { Profile, BrandProfile, ContentItem } from '@/types/database'
import { demoGetPlan } from '@/lib/demo-store'
import BraviMascot from '@/components/bravi/BraviMascot'

const BRAVE_TIPS = [
  "Cada pregunta que respondes en Stories es una posible reserva.",
  "La constancia supera a la perfección.",
  "Una clienta no reserva solo porque vea un resultado bonito. Reserva cuando entiende que ese resultado también puede ser para ella.",
  "Tu trabajo no habla por sí solo. Tu contenido debe explicarlo.",
  "No busques hacerlo perfecto. Busca hacerlo constante.",
  "Tu contenido no tiene que gustarle a todo el mundo. Tiene que atraer a tu clienta ideal.",
  "Hablar de tus servicios no es vender. Es ayudar a tu clienta a entender qué necesita.",
  "El mejor momento para publicar era ayer. El segundo mejor, hoy.",
]

const SERVICES = ['Balayage', 'Rubios', 'Canas', 'Alisados', 'Tratamientos', 'Corte', 'Color']

const SURPRISE_POOL = [
  { type: 'reel' as const, service: 'Balayage', objective: 'Autoridad', idea: 'La verdad sobre el balayage que nadie te cuenta' },
  { type: 'reel' as const, service: 'Canas', objective: 'Autoridad', idea: 'Por qué cada vez más mujeres abrazan sus canas' },
  { type: 'carrusel' as const, service: 'Tratamientos', objective: 'Visibilidad', idea: '5 señales de que tu cabello necesita un tratamiento' },
  { type: 'reel' as const, service: 'Rubios', objective: 'Reservas', idea: 'Antes y después: de rubio apagado a luminoso' },
  { type: 'carrusel' as const, service: 'Alisados', objective: 'Autoridad', idea: 'Tipos de alisado: ¿cuál es el tuyo?' },
  { type: 'reel' as const, service: 'Color', objective: 'Visibilidad', idea: 'Los colores que más piden mis clientas este otoño' },
  { type: 'carrusel' as const, service: 'Corte', objective: 'Autoridad', idea: '3 cortes que favorecen a todas las caras' },
  { type: 'reel' as const, service: 'Balayage', objective: 'Reservas', idea: 'Así quedó la clienta que llevaba 3 años posponiéndolo' },
  { type: 'carrusel' as const, service: 'Rubios', objective: 'Autoridad', idea: 'Mitos y verdades sobre el cabello rubio' },
  { type: 'reel' as const, service: 'Canas', objective: 'Reservas', idea: 'Cómo cambia el look de esta clienta con un color natural' },
  { type: 'carrusel' as const, service: 'Tratamientos', objective: 'Educativo', idea: 'La diferencia entre hidratación y nutrición capilar' },
  { type: 'reel' as const, service: 'Alisados', objective: 'Visibilidad', idea: '¿Cuánto dura realmente un alisado? La respuesta te sorprende' },
]

// --- Gamification logic ---

const LEVELS = [
  { min: 0,  max: 2,  label: 'Empezando',       emoji: '🌱', color: '#7a6000', bg: '#FFF1B5' },
  { min: 3,  max: 7,  label: 'Creadora',         emoji: '✍️', color: '#2a5a6a', bg: '#C1DBE8' },
  { min: 8,  max: 14, label: 'Constante',        emoji: '⚡', color: '#591427', bg: '#fce8ee' },
  { min: 15, max: 24, label: 'Experta BRÄVE',    emoji: '🔥', color: '#7A1832', bg: '#f5d0d8' },
  { min: 25, max: 39, label: 'Maestra',          emoji: '💎', color: '#7A1832', bg: '#7A1832' },
  { min: 40, max: Infinity, label: 'BRÄVE Pro',  emoji: '👑', color: '#7A1832', bg: '#7A1832' },
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
  return Math.round((progress / range) * 100)
}

function getWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // start of week (Sunday)
  return d.toISOString().split('T')[0]
}

function buildWeeklyActivity(items: Partial<ContentItem>[]): { label: string; count: number; isThisWeek: boolean }[] {
  const now = new Date()
  const weeks: { label: string; count: number; isThisWeek: boolean }[] = []
  for (let w = 4; w >= 0; w--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() - w * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const count = items.filter(item => {
      if (!item.created_at) return false
      const d = new Date(item.created_at)
      return d >= weekStart && d <= weekEnd
    }).length
    const label = w === 0 ? 'Esta sem.' : w === 1 ? 'Sem. pasada' : `Hace ${w} sem.`
    weeks.push({ label, count, isThisWeek: w === 0 })
  }
  return weeks
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
  { id: 'primera_idea',    label: 'Primera idea',         desc: 'Guardaste tu primer contenido',    emoji: '🌟', req: (n: number) => n >= 1 },
  { id: 'cinco_ideas',     label: '5 contenidos',         desc: '5 piezas creadas',                 emoji: '🎯', req: (n: number) => n >= 5 },
  { id: 'diez_ideas',      label: '10 contenidos',        desc: '10 piezas creadas',                emoji: '💪', req: (n: number) => n >= 10 },
  { id: 'racha_2',         label: 'Racha x2',             desc: '2 semanas seguidas creando',       emoji: '🔥', req: (_n: number, s: number) => s >= 2 },
  { id: 'racha_4',         label: 'Racha x4',             desc: '4 semanas seguidas creando',       emoji: '⚡', req: (_n: number, s: number) => s >= 4 },
  { id: 'veinte_ideas',    label: '20 contenidos',        desc: '20 piezas creadas',                emoji: '🏆', req: (n: number) => n >= 20 },
]

// Simulated reach: each piece reaches ~600-1200 accounts on average
function estimatedReach(total: number): string {
  const reach = total * 850
  if (reach < 1000) return `${reach}`
  return `${(reach / 1000).toFixed(1)}k`
}

export default function InicioClient({
  profile,
  brand,
  contentItems,
}: {
  profile: Profile | null
  brand: Partial<BrandProfile> | null
  contentItems: Partial<ContentItem>[]
}) {
  const tip = BRAVE_TIPS[new Date().getDay() % BRAVE_TIPS.length]
  const firstName = profile?.full_name?.split(' ')[0] || 'guapa'
  const brandComplete = brand?.completion_status === 'complete' || brand?.completion_status === 'partial'
  const [surpriseResult, setSurpriseResult] = useState<typeof SURPRISE_POOL[0] | null>(null)

  // Load demo items from localStorage on client
  const [items, setItems] = useState<Partial<ContentItem>[]>(contentItems)
  useEffect(() => {
    if (profile?.id === 'demo') {
      const stored = demoGetPlan() as unknown as Partial<ContentItem>[]
      setItems(stored)
    }
  }, [])

  const total = items.length
  const level = getLevel(total)
  const levelProgress = getLevelProgress(total)
  const streak = getStreak(items)
  const weeklyActivity = buildWeeklyActivity(items)
  const thisWeekCount = weeklyActivity[4]?.count || 0

  // Bravi messages based on real stats
  const braviMessages = [
    total === 0 ? '¡Hola! Soy Bravi. Vamos a crear tu primer contenido 🚀' : null,
    total > 0 && total < 5 ? `¡Llevas ${total} idea${total > 1 ? 's' : ''}! Sigue así 💪` : null,
    total >= 5 && total < 15 ? `¡${total} contenidos! Vas cogiendo ritmo 🔥` : null,
    total >= 15 ? `¡${total} contenidos! Eres una máquina de contenido 👑` : null,
    streak >= 2 ? `¡${streak} semanas seguidas! Eso es constancia real ⚡` : null,
    thisWeekCount > 0 ? `Esta semana ya llevas ${thisWeekCount} idea${thisWeekCount > 1 ? 's' : ''}. ¡A por más!` : null,
  ].filter(Boolean) as string[]

  const braviMessage = braviMessages[new Date().getMinutes() % Math.max(braviMessages.length, 1)] || '¡Hola! Soy Bravi. ¿Qué creamos hoy? ✨'
  const braviMood = total === 0 ? 'waving' : streak >= 3 ? 'excited' : total >= 10 ? 'excited' : 'happy'
  const maxBar = Math.max(...weeklyActivity.map(w => w.count), 1)
  const unlockedAchievements = ACHIEVEMENTS.filter(a => a.req(total, streak))

  function handleSurprise() {
    const pool = surpriseResult ? SURPRISE_POOL.filter(s => s !== surpriseResult) : SURPRISE_POOL
    setSurpriseResult(pool[Math.floor(Math.random() * pool.length)])
  }

  return (
    <div className="space-y-6">
      {/* Header + Bravi hero */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#1a1a1a', letterSpacing: '-0.5px' }}>
            Hola, {firstName} ✨
          </h1>
          <p className="mt-1 text-base" style={{ color: '#591427', opacity: 0.8 }}>¿Qué quieres crear hoy?</p>
        </div>
        <BraviMascot
          size={90}
          mood={braviMood as 'happy' | 'excited' | 'thinking' | 'waving'}
          message={braviMessage}
          showMessage={false}
        />
      </div>

      {/* Bravi speech bubble */}
      <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: '#FFF1B5', border: '1.5px solid rgba(122,24,50,0.12)' }}>
        <BraviMascot size={48} mood={braviMood as 'happy' | 'excited' | 'thinking' | 'waving'} showMessage={false} className="flex-shrink-0" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: '#7A1832', opacity: 0.6 }}>Bravi dice</p>
          <p className="text-sm font-medium" style={{ color: '#591427', lineHeight: 1.5 }}>{braviMessage}</p>
        </div>
      </div>

      {/* Brand warning */}
      {!brandComplete && (
        <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: '#FFF1B5', border: '1.5px solid rgba(122,24,50,0.15)' }}>
          <BraviMascot size={44} mood="thinking" showMessage={false} className="flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#591427' }}>Bravi recomienda completar Tu Marca</p>
            <p className="text-sm mt-0.5" style={{ color: '#591427', opacity: 0.8 }}>
              Rellénalo una vez y todo el contenido será mucho más personalizado para tu salón.
            </p>
            <Link href="/mi-marca" className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold" style={{ color: '#7A1832' }}>
              Completar Mi Marca <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { href: '/planificar', icon: Sparkles, label: 'Planificación', desc: 'Genera ideas para el mes', dark: true, color: '#7A1832' },
          { href: '/crear-contenido', icon: Film, label: 'Crear Contenido', desc: 'Reel o carrusel ahora', dark: true, color: '#591427' },
          { href: '/stories', icon: LayoutGrid, label: 'Stories', desc: 'Stories y preguntas', dark: false, color: '#2a5a6a', bg: '#C1DBE8' },
          { href: '/mi-marca', icon: Star, label: 'Mi Marca', desc: 'Perfil de tu salón', dark: false, color: '#7a6000', bg: '#FFF1B5' },
          { href: '/biblioteca', icon: BookOpen, label: 'Biblioteca', desc: 'Tu contenido guardado', dark: false, color: '#591427', bg: '#fce8ee' },
          { href: '/calendario', icon: Calendar, label: 'Calendario', desc: 'Contenido programado', dark: false, color: '#2a5a6a', bg: '#d8e8f0' },
        ].map(({ href, icon: Icon, label, desc, dark, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-md"
            style={{
              background: dark ? color : (bg || 'white'),
              border: dark ? 'none' : '1.5px solid rgba(0,0,0,0.07)',
              color: dark ? 'white' : color,
            }}
          >
            <Icon size={22} />
            <div>
              <p className="text-sm font-bold leading-tight">{label}</p>
              <p className="text-xs mt-0.5 opacity-70">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── GAMIFICATION ── */}
      <div className="space-y-3">

        {/* Level + XP bar */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)', boxShadow: '0 2px 12px rgba(90,20,39,0.06)' }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: level.bg === '#7A1832' ? '#7A1832' : level.bg }}>
                  <span>{level.emoji}</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>Nivel BRÄVE</p>
                  <p className="font-bold text-lg" style={{ color: '#1a1a1a' }}>{level.label}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ color: '#7A1832' }}>{total}</p>
                <p className="text-xs" style={{ color: '#591427', opacity: 0.6 }}>contenidos</p>
              </div>
            </div>

            {/* XP progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: '#591427', opacity: 0.6 }}>
                <span>Progreso al siguiente nivel</span>
                <span>{levelProgress}%</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#F5F0E8' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${levelProgress}%`, background: 'linear-gradient(90deg, #7A1832, #c0394e)' }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <StatPill icon={<Flame size={14} />} value={streak > 0 ? `${streak} sem.` : '—'} label="Racha" color="#c0394e" />
              <StatPill icon={<Target size={14} />} value={`${thisWeekCount}`} label="Esta semana" color="#2a5a6a" />
              <StatPill icon={<TrendingUp size={14} />} value={total > 0 ? `~${estimatedReach(total)}` : '—'} label="Alcance est." color="#7a6000" />
            </div>
          </div>
        </div>

        {/* Activity chart */}
        <div className="rounded-3xl p-5" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: '#1a1a1a' }}>Actividad últimas 5 semanas</p>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-6" style={{ color: '#591427', opacity: 0.4 }}>
              <TrendingUp size={32} />
              <p className="text-sm mt-2">Empieza a crear contenido para ver tu actividad</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-24">
              {weeklyActivity.map((week, i) => {
                const pct = maxBar > 0 ? (week.count / maxBar) * 100 : 0
                const minH = week.count > 0 ? 8 : 2
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs font-bold" style={{ color: week.isThisWeek ? '#7A1832' : '#591427', opacity: week.isThisWeek ? 1 : 0.4 }}>
                      {week.count > 0 ? week.count : ''}
                    </span>
                    <div className="w-full rounded-lg transition-all" style={{
                      height: `${Math.max(minH, pct * 0.72)}px`,
                      background: week.isThisWeek
                        ? 'linear-gradient(180deg, #c0394e, #7A1832)'
                        : week.count > 0 ? 'rgba(122,24,50,0.2)' : '#F5F0E8',
                      minHeight: `${minH}px`,
                    }} />
                    <span className="text-xs text-center leading-tight" style={{ color: '#591427', opacity: week.isThisWeek ? 0.8 : 0.4, fontSize: '10px' }}>
                      {week.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Achievements */}
        {ACHIEVEMENTS.length > 0 && (
          <div className="rounded-3xl p-5" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} style={{ color: '#7A1832' }} />
              <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
                Logros — {unlockedAchievements.length}/{ACHIEVEMENTS.length}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {ACHIEVEMENTS.map(a => {
                const unlocked = a.req(total, streak)
                return (
                  <div key={a.id} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl text-center"
                    style={{ background: unlocked ? '#FFF1B5' : '#F5F0E8', opacity: unlocked ? 1 : 0.45 }}>
                    <span className="text-2xl">{a.emoji}</span>
                    <p className="text-xs font-semibold leading-tight" style={{ color: unlocked ? '#7A1832' : '#591427' }}>{a.label}</p>
                    <p className="text-xs leading-tight" style={{ color: '#591427', opacity: 0.6, fontSize: '10px' }}>{a.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sorpréndeme */}
      <div className="rounded-3xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)', boxShadow: '0 2px 16px rgba(90,20,39,0.07)' }}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FFF1B5' }}>
                <Shuffle size={18} style={{ color: '#7A1832' }} />
              </div>
              <div>
                <h2 className="font-bold text-sm" style={{ color: '#1a1a1a' }}>Sorpréndeme</h2>
                <p className="text-xs" style={{ color: '#591427', opacity: 0.7 }}>Bravi te propone una idea al instante</p>
              </div>
            </div>
            <button
              onClick={handleSurprise}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: '#7A1832', color: 'white' }}
            >
              <Shuffle size={14} />
              {surpriseResult ? 'Otra idea' : 'Dame una idea'}
            </button>
          </div>

          {surpriseResult && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl" style={{ background: '#FFFDF5', border: '1.5px solid rgba(255,241,181,0.8)' }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: '#7A1832', color: 'white' }}>{surpriseResult.type}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFF1B5', color: '#591427' }}>{surpriseResult.service}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#C1DBE8', color: '#2a5a6a' }}>{surpriseResult.objective}</span>
                </div>
                <p className="font-semibold text-sm" style={{ color: '#1a1a1a' }}>{surpriseResult.idea}</p>
              </div>
              <Link
                href={`/crear-contenido?service=${encodeURIComponent(surpriseResult.service)}&type=${surpriseResult.type}`}
                className="btn-primary w-full justify-center text-sm"
              >
                Crear este contenido <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick service shortcuts */}
      <div>
        <h2 className="font-semibold text-sm mb-3" style={{ color: '#591427', opacity: 0.8 }}>Crear Reel rápido sobre…</h2>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map(s => (
            <Link
              key={s}
              href={`/crear-contenido?service=${encodeURIComponent(s)}&type=reel`}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
              style={{ background: '#FFF1B5', color: '#591427', border: '1.5px solid rgba(122,24,50,0.1)' }}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* BRÄVE tip + big Bravi */}
      <div className="flex items-center gap-5 p-5 rounded-3xl" style={{ background: 'linear-gradient(135deg, #FFF1B5, #fff8d6)', border: '1.5px solid rgba(122,24,50,0.12)' }}>
        <BraviMascot size={72} mood="thinking" showMessage={false} className="flex-shrink-0" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#7A1832', opacity: 0.6 }}>Consejo BRÄVE del día</p>
          <p className="text-sm font-medium" style={{ color: '#591427', lineHeight: 1.6 }}>"{tip}"</p>
        </div>
      </div>
    </div>
  )
}

function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-2xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
      <div style={{ color }}>{icon}</div>
      <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>{value}</p>
      <p className="text-xs" style={{ color: '#591427', opacity: 0.6 }}>{label}</p>
    </div>
  )
}

