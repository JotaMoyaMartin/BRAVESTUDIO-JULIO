'use client'
// Bravi flotante (22-oct-2026): la mascota vive abajo a la derecha en todas
// las secciones (menos Inicio, que ya tiene el chat dentro, y el teleprompter).
// La primera vez que entras en una sección asoma un bocadillo con algo útil
// para ESA pantalla; al tocar a Bravi se abre el chat (la misma conversación
// que en Inicio). En móvil es una hoja que sube desde abajo.

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Trash2, X } from 'lucide-react'
import { useBraviChat } from './BraviChatProvider'
import BraviChatThread, { BraviAvatar } from './BraviChatThread'
import { braviFabHidden, braviSectionFor } from '@/lib/bravi-sections'

const NUDGE_KEY = 'brave_bravi_nudged'

function nudgedSections(): string[] {
  try { return JSON.parse(window.sessionStorage.getItem(NUDGE_KEY) || '[]') as string[] } catch { return [] }
}
function markNudged(name: string) {
  try { window.sessionStorage.setItem(NUDGE_KEY, JSON.stringify([...nudgedSections(), name])) } catch { /* sin storage: no pasa nada */ }
}

/** En móvil, si la pantalla tiene una barra fija abajo (p. ej. Crear guiones), Bravi sube. */
function useBottomBarOffset(pathname: string | null): boolean {
  const [hasBar, setHasBar] = useState(false)
  useEffect(() => {
    const check = () => setHasBar(!!document.querySelector('[data-bottom-bar]'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.body, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [pathname])
  return hasBar
}

export default function BraviFab() {
  const pathname = usePathname()
  const { open, setOpen, messages, clear } = useBraviChat()
  const reduce = useReducedMotion()
  const section = braviSectionFor(pathname)
  const hidden = braviFabHidden(pathname)
  const raised = useBottomBarOffset(pathname)
  const [nudge, setNudge] = useState(false)

  // Bocadillo: una vez por sección y sesión, a los 1,2 s; se va solo a los 8 s.
  useEffect(() => {
    setNudge(false)
    if (hidden) return
    if (nudgedSections().includes(section.name)) return
    const show = setTimeout(() => { setNudge(true); markNudged(section.name) }, 1200)
    const hide = setTimeout(() => setNudge(false), 9200)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [pathname, hidden, section.name])

  useEffect(() => {
    if (!open) return
    setNudge(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (hidden) return null

  return (
    <>
      {/* Botón + bocadillo */}
      <div
        className={`fixed right-4 md:right-8 z-[35] flex items-end gap-2 transition-[bottom] duration-300 ${raised ? 'bottom-24 md:bottom-8' : 'bottom-5 md:bottom-8'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <AnimatePresence>
          {nudge && !open && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.95 }}
              className="relative mb-3 max-w-[230px] rounded-[18px] rounded-br-[6px] bg-white pl-4 pr-8 py-3 text-[14px] font-semibold text-cherry-dark"
              style={{ boxShadow: 'var(--shadow-medium)', lineHeight: 1.35 }}
            >
              <button onClick={() => setOpen(true)} className="text-left">{section.nudge}</button>
              <button
                onClick={() => setNudge(false)}
                aria-label="Cerrar el mensaje de Bravi"
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-tinta-2 hover:bg-[var(--color-warm-gray)]"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Cerrar el chat con Bravi' : 'Hablar con Bravi'}
          aria-expanded={open}
          className="relative w-16 h-16 rounded-full flex items-center justify-center focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cherry"
          style={{ background: 'var(--color-mantequilla)', boxShadow: '0 0 0 3px white, 0 10px 26px -8px rgba(89,20,39,0.55)' }}
          whileHover={reduce ? undefined : { scale: 1.07 }}
          whileTap={{ scale: 0.94 }}
        >
          <motion.img
            src="/bravi2.png"
            alt=""
            draggable={false}
            className="w-[74px] h-[74px] max-w-none object-contain -mt-4 pointer-events-none"
            style={{ filter: 'drop-shadow(0 4px 6px rgba(89,20,39,0.25))' }}
            animate={reduce ? undefined : { y: [0, -4, 0], rotate: [0, -6, 4, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2.5 }}
          />
          {messages.length === 0 && !open && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full" style={{ background: 'var(--color-cereza)', boxShadow: '0 0 0 2px white' }} aria-hidden />
          )}
        </motion.button>
      </div>

      {/* Panel del chat */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[45] bg-black/25 md:bg-transparent md:pointer-events-none"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.section
              role="dialog"
              aria-label="Chat con Bravi"
              className="fixed z-50 inset-x-0 bottom-0 max-h-[88dvh] h-[88dvh] rounded-t-[28px] md:inset-x-auto md:right-8 md:bottom-28 md:w-[400px] md:h-[min(640px,calc(100vh-150px))] md:rounded-[28px] flex flex-col"
              style={{ background: 'var(--color-crema)', boxShadow: '0 30px 60px -20px rgba(89,20,39,0.45)' }}
              initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <div className="md:hidden mx-auto mt-2.5 w-10 h-1.5 rounded-full" style={{ background: 'rgba(89,20,39,0.18)' }} aria-hidden />
              <header className="flex items-center gap-3 px-5 pt-3 pb-3 md:pt-5">
                <BraviAvatar size={44} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-cherry-dark leading-tight">Bravi</p>
                  <p className="text-[13px] text-tinta-2 leading-tight">Tu directora de marketing · {section.name}</p>
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={() => { if (window.confirm('¿Borrar la conversación con Bravi?')) clear() }}
                    aria-label="Borrar la conversación"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-tinta-2 hover:bg-[var(--color-warm-gray)]"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar el chat"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-cherry-dark hover:bg-[var(--color-warm-gray)]"
                >
                  <X size={20} />
                </button>
              </header>
              <div className="flex-1 min-h-0 flex flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <BraviChatThread
                  welcome={`Estás en ${section.name}. Pregúntame lo que quieras y te ayudo aquí mismo.`}
                  questions={section.questions}
                  threadClassName="flex-1 min-h-0"
                  autoFocus
                />
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
