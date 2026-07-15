'use client'

import { useState } from 'react'
import { GraduationCap, PlayCircle, CheckCircle2, Circle, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { AcademiaModule, AcademiaLesson } from '@/types/database'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  modules: AcademiaModule[]
  lessons: AcademiaLesson[]
  progress: Pick<{ lesson_id: string; completed: boolean }, 'lesson_id' | 'completed'>[]
}

function extractLoomId(url: string): string | null {
  const match = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

export default function AcademiaClient({ modules, lessons, progress }: Props) {
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(modules.map(m => m.id)))
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>(
    Object.fromEntries(progress.map(p => [p.lesson_id, p.completed]))
  )
  const [autoMarked, setAutoMarked] = useState<Set<string>>(new Set())

  const totalLessons = lessons.length
  const completedCount = Object.values(progressMap).filter(Boolean).length
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  function toggleModule(id: string) {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openLesson(lesson: AcademiaLesson) {
    const id = lesson.id
    setExpandedLesson(id)
    // Auto-mark as completed when opening
    if (!progressMap[id] && !autoMarked.has(id)) {
      setAutoMarked(prev => new Set(prev).add(id))
      markProgress(id, true)
    }
  }

  function closeLesson() {
    setExpandedLesson(null)
  }

  async function markProgress(lessonId: string, completed: boolean) {
    setProgressMap(prev => ({ ...prev, [lessonId]: completed }))
    try {
      await fetch('/api/academia/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId, completed }),
      })
    } catch {
      // Revert on error
      setProgressMap(prev => ({ ...prev, [lessonId]: !completed }))
    }
  }

  if (totalLessons === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="text-center py-20">
          <GraduationCap size={48} className="mx-auto text-cherry opacity-30" />
          <p className="mt-4 text-sm text-cherry-dark opacity-50">
            Aún no hay clases disponibles. Vuelve pronto.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* Progress bar */}
      <div className="rounded-[var(--radius-md)] p-4 bg-white" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-cherry-dark">Tu progreso</span>
          <span className="text-sm font-bold text-cherry">{completedCount} / {totalLessons} clases · {pct}%</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-warm-gray)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--color-cherry) 0%, #b8860b 100%)' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        {modules.map(mod => {
          const modLessons = lessons.filter(l => l.module_id === mod.id)
          const modCompleted = modLessons.filter(l => progressMap[l.id]).length
          const isExpanded = expandedModules.has(mod.id)

          if (modLessons.length === 0) return null

          return (
            <div key={mod.id} className="rounded-[var(--radius-md)] overflow-hidden bg-white" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
              {/* Module header */}
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[rgba(122,24,50,0.02)]"
              >
                <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(122,24,50,0.08)' }}>
                  <GraduationCap size={18} className="text-cherry" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-cherry-dark">{mod.title}</p>
                  {mod.description && (
                    <p className="text-xs text-cherry-dark opacity-60 mt-0.5 line-clamp-1">{mod.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-semibold text-cherry-dark opacity-60">
                    {modCompleted}/{modLessons.length}
                  </span>
                  {isExpanded ? <ChevronUp size={18} className="text-cherry-dark opacity-40" /> : <ChevronDown size={18} className="text-cherry-dark opacity-40" />}
                </div>
              </button>

              {/* Lessons */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y" style={{ borderColor: 'var(--color-buttermilk)' }}>
                      {modLessons.map((lesson, idx) => {
                        const isCompleted = progressMap[lesson.id]
                        const isOpen = expandedLesson === lesson.id
                        const loomId = extractLoomId(lesson.loom_url)

                        return (
                          <div key={lesson.id}>
                            <button
                              onClick={() => isOpen ? closeLesson() : openLesson(lesson)}
                              className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[rgba(122,24,50,0.02)]"
                            >
                              {isCompleted ? (
                                <CheckCircle2 size={20} className="text-[#b8860b] flex-shrink-0" />
                              ) : (
                                <PlayCircle size={20} className="text-cherry opacity-40 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold ${isCompleted ? 'text-cherry-dark opacity-60' : 'text-cherry-dark'}`}>
                                  {idx + 1}. {lesson.title}
                                </p>
                                {lesson.description && (
                                  <p className="text-xs text-cherry-dark opacity-50 mt-0.5 line-clamp-1">{lesson.description}</p>
                                )}
                              </div>
                              <span className="text-xs text-cherry-dark opacity-40 flex-shrink-0">
                                {isCompleted ? 'Completada' : 'Ver'}
                              </span>
                            </button>

                            {/* Expanded video */}
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-5 pb-4 space-y-3">
                                    {lesson.description && (
                                      <p className="text-sm text-cherry-dark opacity-70 leading-relaxed">{lesson.description}</p>
                                    )}
                                    {loomId ? (
                                      <div className="relative w-full rounded-[var(--radius-sm)] overflow-hidden bg-black" style={{ aspectRatio: '16 / 9' }}>
                                        <iframe
                                          src={`https://www.loom.com/embed/${loomId}`}
                                          allowFullScreen
                                          className="absolute inset-0 w-full h-full"
                                          style={{ border: 'none' }}
                                        />
                                      </div>
                                    ) : (
                                      <a
                                        href={lesson.loom_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-semibold text-cherry hover:underline"
                                      >
                                        <PlayCircle size={16} /> Abrir video en Loom
                                      </a>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => markProgress(lesson.id, !isCompleted)}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-all ${
                                          isCompleted
                                            ? 'bg-[rgba(184,134,11,0.12)] text-[#b8860b]'
                                            : 'bg-cherry text-white'
                                        }`}
                                      >
                                        {isCompleted ? (
                                          <><CheckCircle2 size={14} /> Completada</>
                                        ) : (
                                          <><Circle size={14} /> Marcar como completada</>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {/* Lessons without module */}
        {(() => {
          const unassigned = lessons.filter(l => !l.module_id)
          if (unassigned.length === 0) return null
          return (
            <div className="rounded-[var(--radius-md)] overflow-hidden bg-white" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
              <div className="px-5 py-4 text-left">
                <p className="font-bold text-cherry-dark">Clases generales</p>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--color-buttermilk)' }}>
                {unassigned.map((lesson, idx) => {
                  const isCompleted = progressMap[lesson.id]
                  const isOpen = expandedLesson === lesson.id
                  const loomId = extractLoomId(lesson.loom_url)
                  return (
                    <div key={lesson.id}>
                      <button
                        onClick={() => isOpen ? closeLesson() : openLesson(lesson)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[rgba(122,24,50,0.02)]"
                      >
                        {isCompleted ? <CheckCircle2 size={20} className="text-[#b8860b] flex-shrink-0" /> : <PlayCircle size={20} className="text-cherry opacity-40 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${isCompleted ? 'text-cherry-dark opacity-60' : 'text-cherry-dark'}`}>{lesson.title}</p>
                          {lesson.description && <p className="text-xs text-cherry-dark opacity-50 mt-0.5 line-clamp-1">{lesson.description}</p>}
                        </div>
                        <span className="text-xs text-cherry-dark opacity-40 flex-shrink-0">{isCompleted ? 'Completada' : 'Ver'}</span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4 space-y-3">
                              {lesson.description && <p className="text-sm text-cherry-dark opacity-70 leading-relaxed">{lesson.description}</p>}
                              {loomId ? (
                                <div className="relative w-full rounded-[var(--radius-sm)] overflow-hidden bg-black" style={{ aspectRatio: '16 / 9' }}>
                                  <iframe src={`https://www.loom.com/embed/${loomId}`} allowFullScreen className="absolute inset-0 w-full h-full" style={{ border: 'none' }} />
                                </div>
                              ) : (
                                <a href={lesson.loom_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-cherry hover:underline">
                                  <PlayCircle size={16} /> Abrir video en Loom
                                </a>
                              )}
                              <button
                                onClick={() => markProgress(lesson.id, !isCompleted)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-all ${
                                  isCompleted ? 'bg-[rgba(184,134,11,0.12)] text-[#b8860b]' : 'bg-cherry text-white'
                                }`}
                              >
                                {isCompleted ? <><CheckCircle2 size={14} /> Completada</> : <><Circle size={14} /> Marcar como completada</>}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

function Header() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-[var(--radius-sm)] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-cherry) 0%, #b8860b 100%)' }}>
        <GraduationCap size={22} className="text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-cherry-dark">Academia BRÄVE</h1>
        <p className="text-sm text-cherry-dark opacity-60">Clases para crecer en redes y grabar mejor</p>
      </div>
    </div>
  )
}