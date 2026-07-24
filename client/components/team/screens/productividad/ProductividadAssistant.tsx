'use client'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import type { Goal, ProductivityTask, ProductivityColumn, ProductivityPriority } from '@/lib/team/types'
import type { ProductividadAction } from '@/lib/team/ai/productividad-prompt'
import { Sparkles, Loader2, ArrowUp, X, Zap, Check, AlertCircle } from 'lucide-react'
import VoiceButton from '@/components/VoiceButton'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

interface Props {
  goals: Goal[]
  tasks: ProductivityTask[]
  focusSessionsCount: number
  focusModeActive: boolean
  // Store actions for agentic execution
  onCreateTask: (input: { title: string; description?: string; column?: ProductivityColumn; priority?: ProductivityPriority; goalId?: string | null; estimatedMinutes?: number | null }) => ProductivityTask
  onMoveTask: (taskId: string, toColumn: ProductivityColumn) => void
  onUpdateTask: (taskId: string, patch: Partial<ProductivityTask>) => void
  onLinkGoal: (taskId: string, goalId: string | null) => void
  onDeleteTask: (taskId: string) => void
}

const QUICK_COMMANDS = [
  '¿Qué debería hacer hoy?',
  'Crea tareas para preparar el lanzamiento del webinar',
  'Organízame la semana según prioridades',
  '¿Voy bien con mis objetivos?',
]

const HISTORY_KEY = 'brave_content_productividad_chat_v2'

function loadHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) as ChatMessage[] : []
  } catch { return [] }
}

function saveHistory(msgs: ChatMessage[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs)) } catch { /* ignore */ }
}

function actionLabel(a: ProductividadAction): string {
  switch (a.type) {
    case 'create_task': return `Tarea creada: "${a.title}"`
    case 'move_task': return `Movida a ${a.column === 'ahora' ? 'Ahora' : a.column === 'esta_semana' ? 'Esta semana' : 'Hecho'}`
    case 'set_priority': return `Prioridad: ${a.priority}`
    case 'link_goal': return 'Vinculada a objetivo'
    case 'delete_task': return 'Tarea eliminada'
  }
}

export default function ProductividadAssistant({ goals, tasks, focusSessionsCount, focusModeActive, onCreateTask, onMoveTask, onUpdateTask, onLinkGoal, onDeleteTask }: Props) {
  const { user } = useAuth()
  const actorId = user!.id
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLog, setActionLog] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) setMessages(loadHistory())
  }, [open, messages.length])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, sending, open, actionLog])

  function executeActions(actions: ProductividadAction[]): string[] {
    const log: string[] = []
    for (const a of actions) {
      try {
        if (a.type === 'create_task') {
          const t = onCreateTask({
            title: a.title,
            description: a.description,
            column: a.column,
            priority: a.priority,
            goalId: a.goalId,
            estimatedMinutes: a.estimatedMinutes,
          })
          log.push(`✅ Tarea creada: "${t.title}"`)
        } else if (a.type === 'move_task') {
          // If moving to "ahora", first move existing "ahora" task to "esta_semana"
          if (a.column === 'ahora') {
            const ahoraTask = tasks.find(t => t.column === 'ahora' && t.id !== a.taskId)
            if (ahoraTask) {
              onMoveTask(ahoraTask.id, 'esta_semana')
              log.push(`↩️ "${ahoraTask.title}" movida a Esta semana`)
            }
          }
          onMoveTask(a.taskId, a.column)
          const colLabel = a.column === 'ahora' ? 'Ahora' : a.column === 'esta_semana' ? 'Esta semana' : 'Hecho'
          log.push(`→ Movida a ${colLabel}`)
        } else if (a.type === 'set_priority') {
          onUpdateTask(a.taskId, { priority: a.priority })
          log.push(`🎯 Prioridad ${a.priority}`)
        } else if (a.type === 'link_goal') {
          onLinkGoal(a.taskId, a.goalId)
          const goal = goals.find(g => g.id === a.goalId)
          log.push(`🔗 Vinculada a "${goal?.title ?? 'objetivo'}"`)
        } else if (a.type === 'delete_task') {
          onDeleteTask(a.taskId)
          log.push(`🗑️ Eliminada`)
        }
      } catch (e) {
        log.push(`⚠️ Error: ${actionLabel(a)}`)
      }
    }
    return log
  }

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || sending) return
    setSending(true)
    setError(null)
    setInput('')
    setActionLog([])
    const userMsg: ChatMessage = { role: 'user', content: msg }
    const next = [...messages, userMsg]
    setMessages(next)
    saveHistory(next)
    try {
      const res = await fetch('/team/api/productividad/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId,
          message: msg,
          context: { goals, tasks, focusSessionsCount, focusModeActive },
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error al enviar')

      // Execute actions if present
      let actionResults: string[] = []
      if (j.actions && Array.isArray(j.actions) && j.actions.length > 0) {
        actionResults = executeActions(j.actions)
        if (actionResults.length > 0) {
          setActionLog(actionResults)
        }
      }

      const replyMsg: ChatMessage = { role: 'assistant', content: j.reply }
      const withReply = [...next, replyMsg]
      setMessages(withReply)
      saveHistory(withReply)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      const fallback: ChatMessage = { role: 'assistant', content: 'No he podido responder. Reintenta en un momento.' }
      const withFallback = [...next, fallback]
      setMessages(withFallback)
      saveHistory(withFallback)
    } finally {
      setSending(false)
    }
  }

  function clearHistory() {
    setMessages([])
    saveHistory([])
    setActionLog([])
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#7A1832] text-white shadow-lg flex items-center justify-center hover:bg-[#591427] transition-all hover:scale-105"
          title="Abrir asistente"
        >
          <Sparkles size={22} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#9c36b5] rounded-full border-2 border-white" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl border border-[#FFF1B5] shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#FFF1B5] flex items-center gap-2 bg-[#FFFDF5]">
            <div className="w-8 h-8 rounded-lg bg-[#7A1832] flex items-center justify-center text-white shrink-0">
              <Sparkles size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[#1a1a1a] truncate flex items-center gap-1.5">
                Asesora de productividad
                <Zap size={11} className="text-[#9c36b5]" />
              </div>
              <div className="text-[10.5px] text-[#8a8680]">Crea tareas, organiza y prioriza por ti</div>
            </div>
            <button onClick={clearHistory} className="p-1.5 rounded-md hover:bg-[#FFF1B5] text-[#8a8680] text-[10px]">Limpiar</button>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-[#FFF1B5] text-[#8a8680]"><X size={16} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#FFFDF5]">
            {messages.length === 0 ? (
              <div className="text-center text-[#8a8680] text-[12px] py-6 px-3">
                <Sparkles className="mx-auto mb-2 text-[#7A1832]" />
                Soy tu asesora de productividad. Explicame lo que quieres lograr y creo las tareas, las organizo por prioridad y te recomiendo en qué enfocarte.
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-[#7A1832] flex items-center justify-center text-white shrink-0 mr-1.5 mt-0.5">
                      <Sparkles size={11} />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-[12px] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-[#7A1832] text-white rounded-br-sm' : 'bg-[#FFF1B5] text-[#1a1a1a] rounded-bl-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {/* Action log — shows what actions were executed */}
            {actionLog.length > 0 && (
              <div className="bg-[#EBFBEE] border border-[#2f9e44]/30 rounded-lg p-2.5 space-y-1">
                <div className="text-[10.5px] font-semibold text-[#2f9e44] flex items-center gap-1">
                  <Check size={11} /> Acciones ejecutadas:
                </div>
                {actionLog.map((log, i) => (
                  <div key={i} className="text-[11px] text-[#1a1a1a]">{log}</div>
                ))}
              </div>
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-[#7A1832] flex items-center justify-center text-white shrink-0 mr-1.5 mt-0.5"><Sparkles size={11} /></div>
                <div className="bg-[#FFF1B5] text-[#8a8680] px-3 py-2 rounded-2xl rounded-bl-sm text-[12px] flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" /> Pensando…
                </div>
              </div>
            )}
          </div>

          {error && <div className="px-3 py-1.5 text-[11px] text-[#e03131] border-t border-[#FFF5F5] bg-[#FFF5F5] flex items-center gap-1"><AlertCircle size={12} /> {error}</div>}

          {messages.length === 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 border-t border-[#FFF1B5] bg-white pt-2">
              {QUICK_COMMANDS.map(cmd => (
                <button key={cmd} onClick={() => send(cmd)} className="text-[11px] px-2.5 py-1.5 rounded-full bg-[#FFF1B5] text-[#7A1832] hover:bg-[#7A1832] hover:text-white transition-colors">
                  {cmd}
                </button>
              ))}
            </div>
          )}

          <div className="p-2.5 border-t border-[#FFF1B5] bg-white">
            <div className="flex items-end gap-1.5">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                rows={1}
                placeholder="Explícame qué quieres hacer…"
                className="flex-1 px-2.5 py-2 text-[12px] rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832] resize-none max-h-28"
                style={{ minHeight: 36 }}
              />
              <VoiceButton
                onTranscript={t => setInput(prev => (prev ? prev + ' ' + t : t))}
                label=""
                listeningLabel="Parar"
                className="!px-2 !py-2 !rounded-lg !text-[11px]"
              />
              <button
                onClick={() => send()}
                disabled={sending || !input.trim()}
                className="w-9 h-9 rounded-lg bg-[#7A1832] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#591427] shrink-0"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}