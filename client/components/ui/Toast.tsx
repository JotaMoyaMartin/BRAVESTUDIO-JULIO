'use client'
import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'

interface Toast {
  id: number
  message: string
  tone?: 'success' | 'info'
}

interface ToastContextValue {
  show: (message: string, tone?: 'success' | 'info') => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, tone: 'success' | 'info' = 'success') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, tone }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-auto px-4 py-3 rounded-[var(--radius-md)] shadow-strong flex items-center gap-2 max-w-sm"
              style={{
                background: t.tone === 'info' ? 'var(--color-cherry-dark)' : 'var(--color-cherry)',
                color: 'white',
              }}
            >
              <Check size={16} className="flex-shrink-0" />
              <span className="text-sm font-medium">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}