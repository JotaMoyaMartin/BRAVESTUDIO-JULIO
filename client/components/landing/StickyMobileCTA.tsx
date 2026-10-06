'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * Barra CTA fija inferior — solo móvil. Aparece tras pasar el hero
 * para que el CTA esté siempre a un pulso de distancia.
 */
export default function StickyMobileCTA() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const nearBottom = window.innerHeight + y > document.body.scrollHeight - 400
      setVisible(y > 600 && !nearBottom)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 90 }}
          animate={{ y: 0 }}
          exit={{ y: 90 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed bottom-0 inset-x-0 z-50 lg:hidden"
          style={{
            padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
            background: 'rgba(255,253,245,0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderTop: '1.5px solid rgba(122,24,50,0.12)',
          }}
        >
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-cherry-dark leading-tight truncate">
                Prueba 7 días gratis 🎁
              </p>
              <p className="text-[10px] text-cherry-dark opacity-60 leading-tight">
                Sin permanencia · Cancela cuando quieras
              </p>
            </div>
            <Link
              href="/signup"
              className="btn-primary glow-ready shrink-0 text-sm px-5 py-3"
            >
              Empieza gratis
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}