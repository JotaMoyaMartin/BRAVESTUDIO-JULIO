'use client'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import type { Goal, ProductivityTask } from '@/lib/team/types'
import { Sparkles, Loader2, ArrowUp, X } from 'lucide-react'
import VoiceButton from '@/components/VoiceButton'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

interface Props {
  goals: Goal[]
  tasks: ProductivityTask[]
  focusSessionsCount: number
  focusModeActive: boolean
}

const QUICK_COMMANDS = [
  '¿Voy bien con mis objetivos?',
  'Organízame la semana',
  '¿Qué bloquea mi progreso?',
  '¿Qué tarea debería hacer ahora?',
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

export default function ProductividadAssistant({ goals, tasks, focusSessionsCount, focusModeActive }: Props) {
  const { user } = useAuth()
  const actorId = user!.id
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) setMessages(loadHistory())
  }, [open, messages.length])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, sending, open])

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || sending) return
    setSending(true)
    setError(null)
    setInput('')
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
              <div className="text-[13px] font-semibold text-[#1a1a1a] truncate">Asistente de productividad</div>
              <div className="text-[10.5px] text-[#8a8680]">Conoce tus objetivos y tareas</div>
            </div>
            <button onClick={clearHistory} className="p-1.5 rounded-md hover:bg-[#FFF1B5] text-[#8a8680] text-[10px]">Limpiar</button>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-[#FFF1B5] text-[#8a8680]"><X size={16} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#FFFDF5]">
            {messages.length === 0 ? (
              <div className="text-center text-[#8a8680] text-[12px] py-6 px-3">
                <Sparkles className="mx-auto mb-2 text-[#7A1832]" />
                Soy tu asistente. Puedo ayudarte con tus objetivos, organizar tu semana o detectar bloqueos.
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
            {sending && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-[#7A1832] flex items-center justify-center text-white shrink-0 mr-1.5 mt-0.5"><Sparkles size={11} /></div>
                <div className="bg-[#FFF1B5] text-[#8a8680] px-3 py-2 rounded-2xl rounded-bl-sm text-[12px] flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" /> Pensando…
                </div>
              </div>
            )}
          </div>

          {error && <div className="px-3 py-1.5 text-[11px] text-[#e03131] border-t border-[#FFF5F5] bg-[#FFF5F5]">{error}</div>}

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
                placeholder="Escribe o dicta…"
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