'use client'
// Chat con Bravi compartido por toda la app (22-oct-2026): la MISMA
// conversación se ve en Inicio (chat grande) y en el Bravi flotante de las
// demás secciones. Se guarda en este navegador (localStorage) como antes.
// Si la IA falla, la respuesta queda marcada como automática y se puede
// reintentar: nunca se presenta como si la hubiera escrito la IA.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { generateBraviReplyChecked, type BraviChatMessage } from '@/lib/ai/prompts/bravi-chat'
import type { BraviStep } from '@/lib/home-bravi'
import { braviSectionFor } from '@/lib/bravi-sections'
import { demoGetBrand } from '@/lib/demo-store'

export interface BraviChatMsg extends BraviChatMessage {
  /** true = la IA no respondió y es una respuesta automática de ayuda. */
  mock?: boolean
  cta?: { label: string; href: string } | null
}

/** Lo que Inicio sabe y comparte con el chat (checklist y recomendación de hoy). */
export interface BraviHomeContext {
  steps: BraviStep[]
  suggestionTitle: string | null
  suggestionHref: string | null
}

interface BraviChatValue {
  messages: BraviChatMsg[]
  busy: boolean
  send: (text: string) => Promise<void>
  /** Vuelve a preguntar la última duda cuya respuesta fue automática. */
  retryLast: () => Promise<void>
  clear: () => void
  open: boolean
  setOpen: (open: boolean) => void
  setHomeContext: (ctx: BraviHomeContext) => void
  homeContext: BraviHomeContext | null
}

const CHAT_KEY = 'brave_bravi_chat'
const CHAT_STORE_LIMIT = 40
const HISTORY_MAX = 6

const Ctx = createContext<BraviChatValue | null>(null)

function loadStored(): BraviChatMsg[] {
  try {
    const raw = window.localStorage.getItem(CHAT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as BraviChatMsg[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(m => m && typeof m.content === 'string' && m.content.trim() && (m.role === 'user' || m.role === 'bravi'))
  } catch {
    return []
  }
}

export function BraviChatProvider({
  children, brandContext = null, isDemo = false,
}: { children: ReactNode; brandContext?: string | null; isDemo?: boolean }) {
  const pathname = usePathname()
  const [messages, setMessages] = useState<BraviChatMsg[]>([])
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [homeContext, setHomeContext] = useState<BraviHomeContext | null>(null)
  const [demoBrand, setDemoBrand] = useState<string | null>(null)
  // Solo se guarda después de recuperar lo guardado (si no, se borraría al cargar).
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setMessages(loadStored())
    setLoaded(true)
    if (isDemo) {
      const b = demoGetBrand() as Record<string, unknown> | null
      setDemoBrand((b?.optimized_summary as string | undefined) ?? null)
    }
  }, [isDemo])

  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-CHAT_STORE_LIMIT)))
    } catch { /* storage lleno o bloqueado: el chat sigue en memoria */ }
  }, [messages, loaded])

  // Al cambiar de pantalla se cierra el panel (la conversación sigue).
  useEffect(() => { setOpen(false) }, [pathname])

  const ask = useCallback(async (question: string, history: BraviChatMsg[]) => {
    setBusy(true)
    try {
      const section = braviSectionFor(pathname)
      const res = await generateBraviReplyChecked({
        messages: history.slice(-HISTORY_MAX).map(m => ({ role: m.role, content: m.content })),
        question,
        brandContext: (brandContext ?? demoBrand) ?? undefined,
        steps: homeContext?.steps ?? [],
        suggestionLabel: homeContext?.suggestionTitle ?? null,
        suggestionHref: homeContext?.suggestionHref ?? null,
        currentSection: pathname === '/inicio' ? 'Inicio' : section.name,
      })
      setMessages(prev => [...prev, { role: 'bravi', content: res.reply, mock: res.mock, cta: res.cta }])
    } finally {
      setBusy(false)
    }
  }, [pathname, brandContext, demoBrand, homeContext])

  const send = useCallback(async (text: string) => {
    const question = text.trim()
    if (!question || busy) return
    const history = messages
    setMessages(prev => [...prev, { role: 'user', content: question }])
    await ask(question, history)
  }, [busy, messages, ask])

  const retryLast = useCallback(async () => {
    if (busy) return
    const last = messages[messages.length - 1]
    const prevUser = messages[messages.length - 2]
    if (!last || last.role !== 'bravi' || !last.mock || !prevUser || prevUser.role !== 'user') return
    const history = messages.slice(0, -2)
    setMessages(messages.slice(0, -1))
    await ask(prevUser.content, history)
  }, [busy, messages, ask])

  const clear = useCallback(() => setMessages([]), [])

  const value = useMemo<BraviChatValue>(() => ({
    messages, busy, send, retryLast, clear, open, setOpen, setHomeContext, homeContext,
  }), [messages, busy, send, retryLast, clear, open, homeContext])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useBraviChat(): BraviChatValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useBraviChat necesita <BraviChatProvider>')
  return v
}
