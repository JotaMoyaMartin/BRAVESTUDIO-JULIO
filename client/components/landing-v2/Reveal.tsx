'use client'
import { motion, useReducedMotion } from 'framer-motion'
import { ReactNode } from 'react'

/**
 * Fade+slide on scroll, respetando prefers-reduced-motion.
 * Animación de entrada única (once) para no penalizar scroll.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, y: 18 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}