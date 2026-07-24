'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import type { ProductivityTask, FocusSession } from '@/lib/team/types'
import BraviMascot from '@/components/team/BraviMascot'
import { Target, Play, Pause, AlertCircle, Check, X, Square, CheckSquare } from 'lucide-react'

interface FocusModeProps {
  task: ProductivityTask | null
  defaultPreset: number
  presets: number[]
  onAddFocusSession: (session: FocusSession) => void
  onToggleSubtask: (subtaskId: string) => void
  onClose: () => void
}

function rid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const PREP_CHECKLIST = ['Dejar el móvil fuera de alcance', 'Cerrar redes sociales', 'Cerrar pestañas innecesarias']

export default function FocusMode({ task, defaultPreset, presets, onAddFocusSession, onToggleSubtask, onClose }: FocusModeProps) {
  const [phase, setPhase] = useState<1 | 2>(1)
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const [interruptions, setInterruptions] = useState(0)
  const [planned, setPlanned] = useState(defaultPreset)
  const [checked, setChecked] = useState<boolean[]>([false, false, false])
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!running) return
    const i = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(i)
          handleComplete('completada')
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  useEffect(() => {
    if (task) {
      setPhase(1)
      setChecked([false, false, false])
      setPlanned(defaultPreset)
      setRemaining(0)
      setRunning(false)
      setInterruptions(0)
    }
  }, [task?.id, defaultPreset])

  function handleComplete(status: FocusSession['status']) {
    if (!task) return
    const actualMinutes = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60000))
    const session: FocusSession = {
      id: rid('fs'),
      taskId: task.id,
      startedAt: new Date(startTimeRef.current).toISOString(),
      endedAt: new Date().toISOString(),
      plannedMinutes: planned,
      actualMinutes,
      interruptions,
      status,
    }
    onAddFocusSession(session)
    onClose()
  }

  function startFocus() {
    setPhase(2)
    startTimeRef.current = Date.now()
    setRemaining(planned * 60)
    setRunning(true)
  }

  function handleEarlyClose() {
    if (phase === 2 && Date.now() - startTimeRef.current > 5000) {
      handleComplete('interrumpida')
    } else {
      onClose()
    }
  }

  if (!task) return null

  return (
    <AnimatePresence>
      {phase === 1 ? (
        <motion.div
          key="prep"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md bg-[#FFFDF5] border border-[#FFF1B5] rounded-2xl p-6 space-y-4"
          >
            <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-md text-[#8a8680] hover:text-[#1a1a1a] hover:bg-[#FFF1B5]">
              <X size={16} />
            </button>

            <h3 className="text-[20px] font-bold text-[#1a1a1a] flex items-center gap-2">
              <Target size={20} className="text-[#7A1832]" /> ¿Listo para enfocarte?
            </h3>

            <div className="bg-white rounded-lg border border-[#FFF1B5] p-3">
              <p className="text-[14px] font-medium text-[#1a1a1a]">{task.title}</p>
              {task.description && <p className="text-[12px] text-[#8a8680] mt-1">{task.description}</p>}
            </div>

            <div className="space-y-2">
              <p className="text-[12px] font-medium text-[#3d3d3d]">Preparación:</p>
              {PREP_CHECKLIST.map((item, idx) => (
                <button key={idx} onClick={() => setChecked(prev => prev.map((v, i) => i === idx ? !v : v))} className="flex items-center gap-2 w-full text-left">
                  {checked[idx] ? <CheckSquare size={18} className="text-[#7A1832] shrink-0" /> : <Square size={18} className="text-[#8a8680] shrink-0" />}
                  <span className={`text-[13px] ${checked[idx] ? 'text-[#3d3d3d] line-through' : 'text-[#1a1a1a]'}`}>{item}</span>
                </button>
              ))}
            </div>

            <div>
              <p className="text-[12px] font-medium text-[#3d3d3d] mb-2">Duración:</p>
              <div className="flex flex-wrap gap-2 items-center">
                {presets.map(p => (
                  <button key={p} onClick={() => setPlanned(p)} className={`px-3 py-1.5 rounded-full text-[12px] font-medium ${planned === p ? 'bg-[#7A1832] text-white' : 'bg-white border border-[#e8e6e3] text-[#3d3d3d] hover:border-[#7A1832]'}`}>
                    {p} min
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <input type="number" value={planned} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) setPlanned(v) }} className="w-16 px-2 py-1.5 text-[12px] rounded-md border border-[#e8e6e3] bg-white" />
                  <span className="text-[11px] text-[#8a8680]">min</span>
                </div>
              </div>
            </div>

            <button onClick={startFocus} disabled={!checked.every(Boolean)} className="bg-[#7A1832] text-white text-[14px] font-medium px-4 py-2.5 rounded-lg w-full hover:bg-[#591427] disabled:opacity-40 disabled:cursor-not-allowed">
              Estoy listo
            </button>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="focus"
          className="fixed inset-0 z-50 bg-[#FFFDF5] flex flex-col items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button onClick={handleEarlyClose} className="absolute top-6 right-6 p-1.5 rounded-md text-[#8a8680] hover:text-[#1a1a1a] hover:bg-[#FFF1B5]">
            <X size={20} />
          </button>

          <p className="text-[18px] font-semibold text-[#1a1a1a] text-center mb-1">{task.title}</p>
          {task.description && (
            <div className="max-w-md text-center mb-8">
              <p className="text-[11px] uppercase tracking-wide text-[#8a8680] mb-1">Resultado esperado</p>
              <p className="text-[13px] text-[#3d3d3d]">{task.description}</p>
            </div>
          )}

          <div className="text-[64px] font-bold text-[#7A1832] tabular-nums leading-none mb-2">{fmtTime(remaining)}</div>

          <div className="flex items-center gap-1.5 text-[13px] text-[#e03131] mb-6">
            <AlertCircle size={14} /> Interrupciones: {interruptions}
          </div>

          {task.subtasks.length > 0 && (
            <div className="max-w-md w-full mb-6 space-y-1.5">
              {task.subtasks.map(st => (
                <button key={st.id} onClick={() => onToggleSubtask(st.id)} className="flex items-center gap-2 w-full text-left">
                  {st.done ? <CheckSquare size={16} className="text-[#2f9e44] shrink-0" /> : <Square size={16} className="text-[#8a8680] shrink-0" />}
                  <span className={`text-[13px] ${st.done ? 'text-[#8a8680] line-through' : 'text-[#1a1a1a]'}`}>{st.title}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={() => setRunning(r => !r)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e8e6e3] text-[#3d3d3d] text-[13px] font-medium hover:bg-white">
              {running ? <Pause size={15} /> : <Play size={15} />}
              {running ? 'Pausar' : 'Reanudar'}
            </button>
            <button onClick={() => setInterruptions(n => n + 1)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e03131] text-[#e03131] text-[13px] font-medium hover:bg-[#FFF5F5]">
              <AlertCircle size={15} /> Interrupción
            </button>
            <button onClick={() => handleComplete('completada')} className="flex items-center gap-1.5 bg-[#7A1832] text-white text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-[#591427]">
              <Check size={15} /> Terminar
            </button>
          </div>

          <div className="fixed bottom-6 left-6 z-50">
            <BraviMascot variant="inline" rotateMs={15000} messages={[
              { text: 'Mantén el foco. Una tarea a la vez.', mood: 'motivate' },
              { text: 'Si te distraes, anota y vuelve.', mood: 'tip' },
              { text: 'El tiempo pasa. Sigue.', mood: 'info' },
            ]} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}