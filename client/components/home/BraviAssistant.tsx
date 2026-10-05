'use client'
// ASISTENTE BRÄVE — el cuadro amarillo de Inicio es BRÄVE: se le escribe si hay
// dudas, responde (IA con fallback a mock), y debajo un checklist desplegable
// de próximos pasos que lleva directo a cada sección.
// Estética copiada de TodayCard (card buttermilk + borde cherry + Bravi).

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Send, ChevronDown, Circle, CheckCircle2 } from 'lucide-react'
import type { BraviStep } from '@/lib/home-bravi'
import { BRAVI_FAQ } from '@/lib/home-bravi'
import {
  generateBraviReplyChecked,
  BraviChatMessage,
} from '@/lib/ai/prompts/bravi-chat'
import { useToast } from '@/components/ui/Toast'

interface Props {
  profileName?: string | null
  steps: BraviStep[]
  suggestionTitle?: string | null
  suggestionHref?: string | null
  brandContext?: string | null
}

/** Mensaje de chat con extras de render (mock / cta) para BraviAssistant. */
interface ChatMsg extends BraviChatMessage {
  mock?: boolean
  cta?: { label: string; href: string } | null
}

// Persistencia del chat — patrón post-mount de Biblioteca/Ganchos (evita
// mismatch de hidratación SSR). Clave compartida del chat del asistente.
const CHAT_KEY = 'brave_bravi_chat'
const CHAT_STORE_LIMIT = 40
const HISTORY_MAX = 6 // lo que se envía a la IA

function loadStoredMessages(): ChatMsg[] {
  try {
    const raw = window.localStorage.getItem(CHAT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMsg[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      m =>
        m &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0 &&
        (m.role === 'user' || m.role === 'bravi'),
    )
  } catch {
    return []
  }
}

export default function BraviAssistant({
  profileName,
  steps,
  suggestionTitle,
  suggestionHref,
  brandContext,
}: Props) {
  const router = useRouter()
  const toast = useToast()
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(true)
  const hydrated = useRef(false)
  const mockToasted = useRef(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  // Hidratación del historial post-mount (server siempre pinta vacío).
  useEffect(() => {
    setMessages(loadStoredMessages())
    hydrated.current = true
  }, [])

  // Guardado — como los favoritos de Ganchos: post-mount, silencioso.
  useEffect(() => {
    if (!hydrated.current) return
    try {
      window.localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-CHAT_STORE_LIMIT)))
    } catch {
      // storage lleno o bloqueado: el chat sigue en memoria
    }
  }, [messages])

  // El chat siempre termina abajo (nuevo mensaje o dots de carga).
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  const nombre = profileName?.split(' ')[0] ?? null
  const suggestion =
    suggestionTitle && suggestionHref ? { title: suggestionTitle, href: suggestionHref } : null

  const primerPendiente = steps.find(s => !s.done) ?? null
  const pendientes = steps.filter(s => !s.done).length

  async function send(text: string) {
    const question = text.trim()
    if (!question || busy) return
    setDraft('')
    const history: BraviChatMessage[] = messages
      .slice(-HISTORY_MAX)
      .map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setBusy(true)
    try {
      const res = await generateBraviReplyChecked({
        messages: history,
        question,
        brandContext: brandContext ?? undefined,
        steps,
        suggestionLabel: suggestionTitle ?? null,
        suggestionHref: suggestionHref ?? null,
      })
      setMessages(prev => [
        ...prev,
        { role: 'bravi', content: res.reply, mock: res.mock, cta: res.cta },
      ])
      // Error de red / IA no disponible: chip en la burbuja + aviso una vez.
      if (res.mock && !mockToasted.current) {
        mockToasted.current = true
        toast.show('No puede contestar ahora — inténtalo en un rato', 'info')
      }
    } catch {
      // Nunca borramos el mensaje de la usuaria.
      toast.show('No puede contestar ahora — inténtalo en un rato', 'info')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="rounded-[var(--radius-lg)] p-6 sm:p-8"
      style={{
        background: 'var(--color-buttermilk)',
        border: '2px solid var(--color-cherry)',
        boxShadow: '0 10px 30px -18px rgba(122,24,50,0.35)',
      }}
    >
      {/* Cabecera: etiqueta + Bravi flotando */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-cherry opacity-60 pt-3">
          Tu asistente
        </p>
        <motion.img
          src="/bravi2.png"
          alt="Bravi"
          draggable={false}
          aria-hidden
          animate={{ y: [0, -7, 0], rotate: [0, -6, 3, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-14 h-14 sm:w-16 sm:h-16 object-contain flex-shrink-0 -mt-4 -mb-2"
          style={{ filter: 'drop-shadow(0 3px 6px rgba(89,20,39,0.22))' }}
        />
      </div>

      <div className="-mt-5">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink" style={{ letterSpacing: '-0.5px' }}>
          Hola{nombre ? `, ${nombre}` : ''}
        </h2>
        <p className="text-sm text-cherry-dark opacity-70 mt-1.5">
          Soy Bravi, tu directora de marketing. Escríbeme si dudas — y abajo te marco los próximos
          pasos.
        </p>
      </div>

      {/* Recomendado para hoy — la decisión de hoy, en un chip de la propia tarjeta */}
      {suggestion && (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-cherry opacity-60 mb-1.5">
            Recomendado para hoy
          </p>
          <Link
            href={suggestion.href}
            className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-transform hover:scale-[1.02]"
            style={{
              background: 'white',
              color: 'var(--color-cherry-dark)',
              border: '1.5px solid rgba(122,24,50,0.12)',
            }}
          >
            {suggestion.title}
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
              style={{ color: 'var(--color-cherry)' }}
            />
          </Link>
        </div>
      )}

      {/* CHAT */}
      <div className="mt-4">
        {messages.length === 0 && !busy ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-cherry opacity-60">
              Preguntas frecuentes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {BRAVI_FAQ.map(f => (
                <button
                  key={f.q}
                  onClick={() => send(f.q)}
                  title={f.hint}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-transform hover:scale-[1.03] cursor-pointer"
                  style={{
                    background: 'white',
                    color: 'var(--color-cherry-dark)',
                    border: '1.5px solid rgba(122,24,50,0.12)',
                  }}
                >
                  {f.q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div ref={listRef} className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div
                    className="max-w-[85%] px-3.5 py-2 rounded-[var(--radius-md)] rounded-br-sm text-sm text-white"
                    style={{ background: 'var(--color-cherry)' }}
                  >
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start gap-1.5">
                  <img
                    src="/bravi2.png"
                    alt=""
                    aria-hidden
                    className="w-5 h-5 object-contain flex-shrink-0 mt-1"
                    draggable={false}
                  />
                  <div
                    className="max-w-[85%] px-3.5 py-2 rounded-[var(--radius-md)] rounded-bl-sm text-sm"
                    style={{
                      background: 'white',
                      color: 'var(--color-ink)',
                      border: '1.5px solid rgba(122,24,50,0.12)',
                    }}
                  >
                    <p style={{ whiteSpace: 'pre-line' }}>{m.content}</p>
                    {m.mock && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1.5"
                        style={{ background: 'rgba(122,24,50,0.08)', color: 'var(--color-cherry-dark)' }}
                      >
                        Ejemplo — IA no disponible
                      </span>
                    )}
                    {m.cta && (
                      <Link
                        href={m.cta.href}
                        className="group inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-xs font-bold transition-transform hover:scale-[1.03]"
                        style={{
                          background: 'var(--color-cream)',
                          color: 'var(--color-cherry-dark)',
                          border: '1.5px solid rgba(122,24,50,0.15)',
                        }}
                      >
                        {m.cta.label}
                        <ArrowRight
                          size={12}
                          className="transition-transform group-hover:translate-x-0.5"
                          style={{ color: 'var(--color-cherry)' }}
                        />
                      </Link>
                    )}
                  </div>
                </div>
              ),
            )}
            {busy && (
              <div className="flex justify-start gap-1.5">
                <img
                  src="/bravi2.png"
                  alt=""
                  aria-hidden
                  className="w-5 h-5 object-contain flex-shrink-0 mt-1"
                  draggable={false}
                />
                <div
                  className="px-3.5 py-2.5 rounded-[var(--radius-md)] rounded-bl-sm flex items-center gap-1"
                  style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.12)' }}
                >
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: 'rgba(122,24,50,0.55)' }}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Re-consulta rápida: una fila scrolleable encima del input, siempre */}
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {BRAVI_FAQ.map(f => (
            <button
              key={'row' + f.q}
              onClick={() => send(f.q)}
              title={f.hint}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.55)',
                color: 'var(--color-cherry-dark)',
                border: '1.5px solid rgba(122,24,50,0.10)',
              }}
            >
              {f.q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="mt-2 flex items-end gap-2">
          <textarea
            rows={1}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(draft)
              }
            }}
            placeholder="Escribe a Bravi lo que te ronda la cabeza…"
            aria-label="Escribir a Bravi"
            className="flex-1 resize-none px-3.5 py-2.5 rounded-[var(--radius-sm)] text-sm outline-none"
            style={{
              background: 'white',
              color: 'var(--color-ink)',
              border: '1.5px solid rgba(122,24,50,0.12)',
            }}
          />
          <button
            onClick={() => send(draft)}
            disabled={busy || !draft.trim()}
            aria-label="Enviar"
            className="p-2.5 rounded-[var(--radius-sm)] text-white transition-transform hover:scale-105 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
            style={{ background: 'var(--color-cherry)' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* CHECKLIST DESPLEGABLE */}
      <div
        className="mt-3 rounded-[var(--radius-md)]"
        style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.12)' }}
      >
        <button
          onClick={() => setChecklistOpen(o => !o)}
          aria-expanded={checklistOpen}
          className="w-full flex items-center gap-2 px-4 py-3 text-left cursor-pointer"
        >
          <motion.div
            animate={{ rotate: checklistOpen ? 0 : -90 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronDown size={16} style={{ color: 'var(--color-cherry)' }} />
          </motion.div>
          <p className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--color-ink)' }}>
            Próximos pasos · {pendientes} de {steps.length}
            {primerPendiente && (
              <span className="font-bold" style={{ color: 'var(--color-cherry-dark)' }}>
                {' '}
                · {primerPendiente.label}
              </span>
            )}
            {!primerPendiente && <span className="font-bold"> · Todo listo</span>}
          </p>
        </button>

        {checklistOpen && (
          <div className="px-2 pb-2 space-y-1">
            {steps.map(s => {
              const destacado = primerPendiente?.id === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => router.push(s.href)}
                  title={`Ir a ${s.label}`}
                  aria-label={`Ir a ${s.label}`}
                  className="w-full flex items-start gap-2.5 text-left px-3 py-2.5 rounded-[var(--radius-sm)] cursor-pointer transition-colors hover:bg-cream"
                  style={
                    destacado
                      ? {
                          background: 'white',
                          border: '1.5px solid rgba(122,24,50,0.18)',
                          boxShadow: '0 4px 14px -8px rgba(122,24,50,0.30)',
                        }
                      : { border: '1.5px solid transparent', opacity: s.done ? 0.6 : 1 }
                  }
                >
                  {s.done ? (
                    <CheckCircle2
                      size={18}
                      className="flex-shrink-0 mt-0.5"
                      style={{ color: 'var(--color-cherry)', opacity: 0.35 }}
                    />
                  ) : (
                    <Circle
                      size={18}
                      strokeWidth={2.2}
                      className="flex-shrink-0 mt-0.5"
                      style={{ color: 'rgba(122,24,50,0.45)' }}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-sm font-semibold"
                      style={{
                        color: 'var(--color-ink)',
                        opacity: s.done ? 0.5 : destacado ? 1 : 0.8,
                      }}
                    >
                      {s.label}
                    </span>
                    <span
                      className="block text-[11px] mt-0.5"
                      style={{ color: 'var(--color-cherry-dark)', opacity: 0.55 }}
                    >
                      {s.desc}
                    </span>
                  </span>
                  <ArrowRight
                    size={14}
                    className="flex-shrink-0 self-center"
                    style={{ color: 'var(--color-cherry)', opacity: 0.4 }}
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}