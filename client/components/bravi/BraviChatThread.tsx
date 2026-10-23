'use client'
// Conversación con Bravi: burbujas, Bravi «escribiendo», preguntas rápidas y
// caja para escribir (o dictar). La usan el chat de Inicio y el panel flotante.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Mic, RefreshCw, Send, Square } from 'lucide-react'
import { useBraviChat, type BraviChatMsg } from './BraviChatProvider'
import { useDictateText } from '@/lib/speech'

export function BraviAvatar({ size = 32, thinking = false }: { size?: number; thinking?: boolean }) {
  const reduce = useReducedMotion()
  return (
    <motion.span
      aria-hidden
      className="flex-shrink-0 rounded-full flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size, background: 'var(--color-mantequilla)', boxShadow: 'inset 0 0 0 1.5px rgba(122,24,50,0.12)' }}
      animate={thinking && !reduce ? { rotate: [0, -10, 8, 0] } : undefined}
      transition={thinking ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      <img src="/bravi2.png" alt="" draggable={false} style={{ width: '86%', height: '86%', objectFit: 'contain', marginTop: '8%' }} />
    </motion.span>
  )
}

function BraviBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <BraviAvatar size={30} />
      <div
        className="max-w-[86%] px-4 py-3 rounded-[20px] rounded-bl-[6px] text-[15px] text-ink"
        style={{ background: 'white', boxShadow: '0 1px 2px rgba(89,20,39,0.06), 0 6px 18px -10px rgba(89,20,39,0.25)', lineHeight: 1.5 }}
      >
        {children}
      </div>
    </div>
  )
}

function CtaLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition-colors"
      style={{ background: 'var(--color-mantequilla)', color: 'var(--color-burdeos)' }}
    >
      {label}
      <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}

function Message({ m, isLast, onRetry, busy }: { m: BraviChatMsg; isLast: boolean; onRetry: () => void; busy: boolean }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] px-4 py-3 rounded-[20px] rounded-br-[6px] text-[15px] text-white" style={{ background: 'var(--color-cereza)', lineHeight: 1.5 }}>
          {m.content}
        </div>
      </div>
    )
  }
  return (
    <BraviBubble>
      <p style={{ whiteSpace: 'pre-line' }}>{m.content}</p>
      {m.cta && <CtaLink href={m.cta.href} label={m.cta.label} />}
      {m.mock && (
        <div className="mt-3 pt-2.5 flex flex-wrap items-center gap-2 text-[12px]" style={{ borderTop: '1px dashed rgba(122,24,50,0.18)', color: '#6b3d00' }}>
          <span>Respuesta automática: la IA no está disponible ahora mismo.</span>
          {isLast && (
            <button
              onClick={onRetry}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold disabled:opacity-50"
              style={{ background: '#fff4e5', border: '1px solid #f1c27d' }}
            >
              <RefreshCw size={12} className={busy ? 'animate-spin' : ''} aria-hidden /> Reintentar
            </button>
          )}
        </div>
      )}
    </BraviBubble>
  )
}

function Typing() {
  const reduce = useReducedMotion()
  return (
    <div className="flex items-end gap-2" aria-live="polite" aria-label="Bravi está escribiendo">
      <BraviAvatar size={30} thinking />
      <div className="px-4 py-3.5 rounded-[20px] rounded-bl-[6px] flex items-center gap-1.5" style={{ background: 'white', boxShadow: '0 6px 18px -10px rgba(89,20,39,0.25)' }}>
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--color-cereza)' }}
            animate={reduce ? { opacity: 0.6 } : { y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}

export interface BraviChatThreadProps {
  /** Saludo fijo de Bravi al empezar (texto de la app, no de la IA). */
  welcome: string
  /** Recomendación de hoy (Inicio): burbuja con botón. */
  today?: { title: string; href: string } | null
  questions: string[]
  /** Altura del hilo (scroll interno). */
  threadClassName?: string
  autoFocus?: boolean
  /** Inicio: el saludo se queda arriba aunque haya conversación. */
  alwaysWelcome?: boolean
}

export default function BraviChatThread({ welcome, today, questions, threadClassName = 'max-h-[420px]', autoFocus = false, alwaysWelcome = false }: BraviChatThreadProps) {
  const { messages, busy, send, retryLast } = useBraviChat()
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const dictate = useDictateText()

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true })
  }, [autoFocus])

  // Autoajuste de la caja de texto (hasta 4 líneas).
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [draft])

  function submit(text: string) {
    if (!text.trim() || busy) return
    if (dictate.listening) dictate.stop()
    setDraft('')
    void send(text)
  }

  function toggleDictate() {
    if (dictate.listening) { dictate.stop(); return }
    dictate.start(chunk => setDraft(prev => (prev ? `${prev} ${chunk}` : chunk)))
  }

  const empty = messages.length === 0

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div ref={listRef} className={`space-y-3 overflow-y-auto overscroll-contain px-1 pb-1 ${threadClassName}`}>
        {(empty || alwaysWelcome) && <BraviBubble><p>{welcome}</p></BraviBubble>}
        {today && (
          <BraviBubble>
            <p>Hoy te recomiendo esto:</p>
            <CtaLink href={today.href} label={today.title} />
          </BraviBubble>
        )}
        {messages.map((m, i) => (
          <Message key={i} m={m} isLast={i === messages.length - 1} onRetry={() => void retryLast()} busy={busy} />
        ))}
        {busy && <Typing />}
      </div>

      {/* Preguntas rápidas */}
      <div className={`mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto no-scrollbar ${empty ? 'sm:flex-wrap sm:overflow-visible' : ''}`}>
        {questions.map(q => (
          <button
            key={q}
            onClick={() => submit(q)}
            disabled={busy}
            className="flex-shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold text-cherry-dark bg-white transition-colors hover:bg-[var(--color-mantequilla)] disabled:opacity-50"
            style={{ border: '1.5px solid var(--color-borde)' }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Caja para escribir */}
      <form
        onSubmit={e => { e.preventDefault(); submit(draft) }}
        className="mt-3 flex items-end gap-2 rounded-[22px] bg-white p-1.5 pl-4 focus-within:shadow-[0_0_0_3px_rgba(122,24,50,0.16)] transition-shadow"
        style={{ border: '1.5px solid var(--color-borde)' }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(draft) }
          }}
          placeholder={dictate.listening ? 'Te escucho…' : 'Escribe a Bravi…'}
          aria-label="Escribir a Bravi"
          className="flex-1 resize-none bg-transparent py-2.5 text-[15px] text-ink placeholder:text-tinta-2"
          // El anillo de foco lo pinta la caja entera (focus-within), no el texto.
          style={{ outline: 'none', boxShadow: 'none' }}
        />
        {dictate.supported && (
          <button
            type="button"
            onClick={toggleDictate}
            aria-label={dictate.listening ? 'Parar el dictado' : 'Dictar por voz'}
            aria-pressed={dictate.listening}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            style={dictate.listening ? { background: '#B42340', color: 'white' } : { background: 'var(--color-warm-gray)', color: 'var(--color-cereza)' }}
          >
            {dictate.listening ? <Square size={14} fill="currentColor" /> : <Mic size={18} />}
          </button>
        )}
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          aria-label="Enviar"
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white transition-opacity disabled:opacity-35"
          style={{ background: 'var(--color-cereza)' }}
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  )
}
