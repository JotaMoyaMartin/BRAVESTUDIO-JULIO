'use client'
/**
 * Barra del asistente en Inicio (22-oct-2026): una línea para pedir lo que
 * sea. Lleva a la herramienta correcta con la idea ya puesta; si no encaja
 * en ninguna, Bravi responde en /asistente.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, Mic } from 'lucide-react'
import Bravi from '@/components/bravi/Bravi'
import { useBraviChat } from '@/components/bravi/BraviChatProvider'
import { useToast } from '@/components/ui/Toast'
import { useDictateText } from '@/lib/speech'
import { routeIntent } from '@/lib/assistant/route-intent'

const HINTS = [
  'Pídeme una idea…',
  'Una story para vender balayage',
  'Un reel sobre canas',
  'Un carrusel de cuidados en casa',
  '¿Cómo subo mis precios?',
  'Planifícame el mes',
]

const CHIPS: Array<{ label: string; text: string }> = [
  { label: 'Idea de reel', text: 'Dame una idea de reel para mi salón' },
  { label: 'Story de hoy', text: 'Una story para hoy en mi salón' },
  { label: 'Carrusel', text: 'Hazme un carrusel sobre cómo cuidar el color en casa' },
  { label: 'Planificar mi mes', text: 'Planifícame el mes' },
  { label: 'Pregúntale a Bravi', text: '¿Por dónde empiezo hoy?' },
]

export default function AssistantBar({ userId }: { userId: string }) {
  const router = useRouter()
  const toast = useToast()
  const { send } = useBraviChat()
  const dictate = useDictateText()
  const [text, setText] = useState('')
  // El ejemplo del cuadro va cambiando para inspirar (se para al escribir).
  const [hint, setHint] = useState(0)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (text || focused) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setHint(h => (h + 1) % HINTS.length), 3200)
    return () => clearInterval(t)
  }, [text, focused])

  function go(raw: string) {
    const value = raw.trim()
    if (!value) return
    const r = routeIntent(value, userId)
    if (r.tool === 'asistente') {
      void send(value)
    } else {
      toast.show(`Te llevo a ${r.label} con tu idea`, 'success')
    }
    setText('')
    router.push(r.href)
  }

  return (
    <section className="rounded-[var(--radius-lg)] bg-white border border-borde p-3 sm:p-4 space-y-3 shadow-[var(--shadow-soft)]" aria-label="Pídeselo a Bravi">
      <form onSubmit={e => { e.preventDefault(); go(text) }} className="flex items-center gap-2">
        <Bravi size={34} showMessage={false} className="flex-shrink-0 hidden sm:block" />
        <label className="sr-only" htmlFor="asistente-input">Pídeme una idea</label>
        <input
          id="asistente-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={HINTS[hint]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 min-w-0 rounded-full bg-crema border border-borde px-4 py-3 text-[15px] outline-none focus:border-cereza"
          enterKeyHint="send"
        />
        {dictate.supported && (
          <button type="button"
            onClick={() => (dictate.listening ? dictate.stop() : dictate.start(t => setText(prev => (prev ? `${prev} ${t}` : t))))}
            className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center ${dictate.listening ? 'bg-cereza text-white animate-pulse' : 'bg-warm-gray text-cherry-dark'}`}
            aria-label={dictate.listening ? 'Parar el dictado' : 'Dictar por voz'}>
            <Mic size={18} aria-hidden />
          </button>
        )}
        <button type="submit" disabled={!text.trim()} className="w-11 h-11 flex-shrink-0 rounded-full bg-burdeos text-crema flex items-center justify-center disabled:opacity-40" aria-label="Enviar">
          <ArrowUp size={18} aria-hidden />
        </button>
      </form>
      <div className="-mx-3 px-3 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto no-scrollbar">
        {CHIPS.map(c => (
          <button key={c.label} onClick={() => go(c.text)} className="chip flex-shrink-0">{c.label}</button>
        ))}
      </div>
    </section>
  )
}
