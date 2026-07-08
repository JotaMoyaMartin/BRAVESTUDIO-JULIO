'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Check, ChevronDown, RefreshCw, Map as MapIcon, Sparkles } from 'lucide-react'
import { Roadmap, RoadmapPhase, RoadmapColor, COLOR_MAP } from '@/lib/roadmap-types'
import RoadmapPremiumImage from './RoadmapPremiumImage'

interface Props {
  roadmap: Roadmap
  onRegenerate: () => void
  onTaskToggle: (phaseIndex: number, taskId: string) => void
}

// ── Estado visual de una fase ───────────────────────────────────────
function isLocked(phases: RoadmapPhase[], i: number) {
  if (phases[i].status !== 'pending') return false
  return phases.slice(0, i).some(p => p.status !== 'completed')
}

// ── Progreso de una fase (0-100) ────────────────────────────────────
function phaseProgress(phase: RoadmapPhase) {
  if (phase.tasks.length === 0) return phase.status === 'completed' ? 100 : 0
  const done = phase.tasks.filter(t => t.done).length
  return Math.round((done / phase.tasks.length) * 100)
}

// ── Componente principal ─────────────────────────────────────────────
export function RoadmapDisplay({ roadmap, onRegenerate, onTaskToggle }: Props) {
  const phases = roadmap.phases

  // Cálculos globales
  const totalTasks = phases.reduce((acc, p) => acc + p.tasks.length, 0)
  const doneTasks = phases.reduce((acc, p) => acc + p.tasks.filter(t => t.done).length, 0)
  const completedPhases = phases.filter(p => p.status === 'completed').length
  const globalPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const inProgressIndex = phases.findIndex(p => p.status === 'in_progress')
  const currentPhaseNumber = inProgressIndex >= 0 ? inProgressIndex + 1 : completedPhases + 1
  const nextPhase = phases.find(p => p.status === 'in_progress') || phases.find(p => p.status === 'pending') || null

  // Mensaje de Bravi según progreso
  const braviMessage = useMemo(() => {
    if (completedPhases === 0) {
      return 'Esta hoja de ruta te muestra el camino, pero lo importante es avanzar fase por fase.'
    }
    if (completedPhases === phases.length) {
      return '¡Has completado todas las fases! Tu marca está lista para escalar. 🚀'
    }
    if (completedPhases >= 1 && completedPhases <= 2) {
      return 'Ya tienes una buena base. Ahora toca convertir esa claridad en contenido constante.'
    }
    return 'Vas muy bien. Sigue avanzando fase por fase, sin prisa pero sin pausa.'
  }, [completedPhases, phases.length])

  return (
    <section className="space-y-8">
      {/* ── Header con título y acción ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold title-shine">Mi Hoja de Ruta BRÄVE</h2>
          <p className="text-sm text-cherry-dark opacity-75 mt-1">
            Tu camino ordenado para evolucionar como estilista. Completa cada fase y desbloquea la siguiente.
          </p>
        </div>
        <button
          onClick={onRegenerate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold text-cherry-dark hover:bg-warm-gray transition-colors"
          style={{ border: '1.5px solid rgba(122,24,50,0.2)' }}
        >
          <RefreshCw size={13} /> Regenerar hoja
        </button>
      </div>

      {/* ── BLOQUE 1: Imagen premium ── */}
      <RoadmapPremiumImage />

      {/* ── BLOQUE 2: Tarjeta resumen "Tu punto actual" ── */}
      <SummaryCard
        totalPhases={phases.length}
        currentPhaseNumber={currentPhaseNumber}
        nextPhaseName={nextPhase?.name ?? null}
        globalPct={globalPct}
        doneTasks={doneTasks}
        totalTasks={totalTasks}
        completedPhases={completedPhases}
      />

      {/* ── Bravi con consejo ── */}
      <BraviAdvice message={braviMessage} />

      {/* ── Roadmap interactivo: timeline vertical ordenado ── */}
      <div
        className="rounded-[var(--radius-lg)] bg-cream p-5 sm:p-7 shadow-soft"
        style={{ border: '1.5px solid var(--color-buttermilk)' }}
      >
        <div className="relative max-w-3xl mx-auto">
          {/* Línea vertical continua (a la izquierda de los círculos) */}
          <div
            className="absolute left-5 top-4 bottom-4 w-0.5"
            style={{
              background:
                'linear-gradient(180deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)',
              opacity: 0.25,
            }}
          />
          <div className="space-y-5">
            {phases.map((phase, i) => {
              const locked = isLocked(phases, i)
              return (
                <PhaseRow
                  key={i}
                  phase={phase}
                  index={i}
                  locked={locked}
                  isLast={i === phases.length - 1}
                  onTaskToggle={(taskId) => onTaskToggle(i, taskId)}
                />
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Tarjeta resumen "Tu punto actual" ───────────────────────────────
function SummaryCard({
  totalPhases,
  currentPhaseNumber,
  nextPhaseName,
  globalPct,
  doneTasks,
  totalTasks,
  completedPhases,
}: {
  totalPhases: number
  currentPhaseNumber: number
  nextPhaseName: string | null
  globalPct: number
  doneTasks: number
  totalTasks: number
  completedPhases: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="rounded-[var(--radius-lg)] p-6 bg-white shadow-soft"
      style={{ border: '1.5px solid var(--color-buttermilk)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <MapIcon size={18} style={{ color: 'var(--color-cherry)' }} />
        <h3 className="font-bold text-base text-cherry-dark">Tu punto actual</h3>
      </div>

      <div className="space-y-2 mb-5">
        <p className="text-sm text-cherry-dark">
          Estás en la <strong className="text-cherry">fase {Math.min(currentPhaseNumber, totalPhases)} de {totalPhases}</strong>.
        </p>
        <p className="text-sm text-cherry-dark opacity-80">
          {nextPhaseName
            ? <>Tu siguiente paso recomendado es: <strong className="text-cherry-dark">{nextPhaseName}</strong>.</>
            : <>Has completado todas las fases. ¡Felicidades!</>
          }
        </p>
      </div>

      {/* Progreso global */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs font-semibold text-cherry-dark mb-1.5">
          <span>Progreso global</span>
          <span>{globalPct}%</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-warm-gray)' }}>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${globalPct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)' }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <Stat label="Tareas completadas" value={`${doneTasks}/${totalTasks}`} />
        <Stat label="Fases completadas" value={`${completedPhases}/${totalPhases}`} />
        <Stat label="Progreso global" value={`${globalPct}%`} />
      </div>
    </motion.div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[var(--radius-sm)] px-3 py-2.5 text-center"
      style={{ background: 'var(--color-warm-light)', border: '1px solid var(--color-buttermilk)' }}
    >
      <div className="text-lg font-bold text-cherry">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-cherry-dark opacity-65 mt-0.5">{label}</div>
    </div>
  )
}

// ── Bravi con consejo ────────────────────────────────────────────────
function BraviAdvice({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="rounded-[var(--radius-md)] p-4 flex items-start gap-3 float-soft"
      style={{ background: 'var(--color-buttermilk)', border: '1.5px solid rgba(122,24,50,0.15)' }}
    >
      <img src="/bravi.png" alt="Bravi" className="flex-shrink-0 bravi-float" style={{ width: 32, height: 32, objectFit: 'contain' }} draggable={false} />
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-cherry opacity-70 mb-1">Bravi dice</p>
        <p className="text-sm text-cherry-dark">{message}</p>
      </div>
    </motion.div>
  )
}

// ── Fila de fase (timeline vertical) ────────────────────────────────
function PhaseRow({
  phase,
  index,
  locked,
  isLast,
  onTaskToggle,
}: {
  phase: RoadmapPhase
  index: number
  locked: boolean
  isLast: boolean
  onTaskToggle: (taskId: string) => void
}) {
  const colors = COLOR_MAP[phase.color]
  const progress = phaseProgress(phase)
  const done = phase.tasks.filter(t => t.done).length
  const inProgress = phase.status === 'in_progress'
  const completed = phase.status === 'completed'
  const [expanded, setExpanded] = useState(inProgress)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      className="relative pl-14"
    >
      {/* Círculo con número de fase */}
      <div
        className="absolute left-0 top-5 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-soft z-10"
        style={{
          background: locked ? '#cbb8a8' : colors.bg,
          border: '3px solid var(--color-cream)',
        }}
      >
        {completed ? <Check size={16} strokeWidth={4} /> : locked ? <Lock size={13} /> : phase.number}
      </div>

      {/* Card de la fase */}
      <div
        className="rounded-[var(--radius-md)] bg-white shadow-soft overflow-hidden transition-all"
        style={{
          border: inProgress
            ? `2px solid var(--color-cherry)`
            : `1.5px solid ${colors.border}`,
          opacity: locked ? 0.6 : 1,
          background: completed ? 'rgba(184,216,176,0.12)' : 'white',
        }}
      >
        {/* Barra de color superior */}
        <div className="h-1.5" style={{ background: colors.bg }} />

        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-[var(--radius-sm)] flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: colors.bgSoft }}
            >
              {locked ? <Lock size={18} style={{ color: colors.text }} /> : <span>{phase.icon}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.text, opacity: 0.75 }}>
                  Fase {phase.number}
                </span>
                <StatusBadge status={phase.status} color={phase.color} />
                {inProgress && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold glow-ready"
                    style={{ background: 'var(--color-cherry)', color: 'white' }}
                  >
                    <Sparkles size={9} /> Fase recomendada
                  </span>
                )}
              </div>
              <h4 className="font-bold text-base text-cherry-dark mt-0.5">{phase.name}</h4>
            </div>
          </div>

          {/* Descripción */}
          <p className="text-sm text-cherry-dark opacity-75 mb-3 leading-relaxed">{phase.description}</p>

          {/* Progreso */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-cherry-dark opacity-70">{done}/{phase.tasks.length} tareas</span>
              <span style={{ color: colors.text }}>{progress}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-warm-gray)' }}>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${progress}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: colors.bg }}
              />
            </div>
          </div>

          {/* Contenido según estado */}
          {locked ? (
            <div
              className="mt-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-center text-xs text-cherry-dark opacity-70"
              style={{ background: 'var(--color-warm-gray)' }}
            >
              🔒 Completa la fase anterior para avanzar
            </div>
          ) : (
            <>
              {/* Botón Ver tareas */}
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-cherry-dark hover:bg-warm-light transition-colors"
                style={{ border: '1px solid rgba(122,24,50,0.12)' }}
              >
                <span>Ver tareas{expanded ? '' : ` (${phase.tasks.length})`}</span>
                <ChevronDown
                  size={14}
                  className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'}
                />
              </button>

              {/* Checklist expandible */}
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2">
                      {/* Objetivo */}
                      <div
                        className="rounded-[var(--radius-sm)] px-3 py-2 text-xs italic text-cherry-dark opacity-80"
                        style={{ background: colors.bgSoft }}
                      >
                        🎯 {phase.goal}
                      </div>

                      {/* Tareas */}
                      <ul className="space-y-1.5">
                        {phase.tasks.map(t => (
                          <li key={t.id}>
                            <button
                              onClick={() => onTaskToggle(t.id)}
                              className="flex items-start gap-2.5 w-full text-left text-sm text-cherry-dark hover:bg-warm-light rounded-[var(--radius-sm)] p-2 -mx-1 transition-colors"
                            >
                              <span
                                className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                  background: t.done ? colors.bg : 'transparent',
                                  border: `2px solid ${colors.ring}`,
                                }}
                              >
                                {t.done && <Check size={11} className="text-white" strokeWidth={4} />}
                              </span>
                              <span className={t.done ? 'line-through opacity-55' : 'opacity-90'}>
                                {t.label}
                              </span>
                              {!t.done && (
                                <span className="ml-auto text-[10px] font-semibold text-cherry opacity-50 flex-shrink-0 mt-0.5">
                                  Marcar
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Badge de estado ──────────────────────────────────────────────────
function StatusBadge({ status, color }: { status: RoadmapPhase['status']; color: RoadmapColor }) {
  const colors = COLOR_MAP[color]
  const map = {
    completed: { label: 'Completada', bg: 'var(--color-pastel-green)', text: '#2a6a3a' },
    in_progress: { label: 'En progreso', bg: colors.bg, text: 'white' },
    pending: { label: 'Pendiente', bg: 'var(--color-warm-gray)', text: 'var(--color-cherry-dark)' },
  } as const
  const s = map[status]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: s.bg, color: s.text }}
    >
      {status === 'completed' && <Check size={10} strokeWidth={3} />}
      {status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      {s.label}
    </span>
  )
}