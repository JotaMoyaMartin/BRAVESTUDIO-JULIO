'use client'
import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { ContentItem } from '@/types/database'

interface ContinueCardProps {
  item: Partial<ContentItem>
  section?: string | null
}

const TYPE_LABELS: Record<string, string> = {
  reel: 'Reel',
  carrusel: 'Carrusel',
  story: 'Story',
}

const SECTION_LINKS: Record<string, string> = {
  planificar: '/planificar',
  'crear-contenido': '/crear-contenido',
  stories: '/stories',
  'mi-marca': '/mi-marca',
  biblioteca: '/biblioteca',
  calendario: '/calendario',
}

export default function ContinueCard({ item, section }: ContinueCardProps) {
  const href = section ? (SECTION_LINKS[section] || '/inicio') : '/biblioteca'
  const sectionLabel = section
    ? section === 'planificar' ? 'Planificación'
    : section === 'crear-contenido' ? 'Crear Contenido'
    : section === 'stories' ? 'Stories'
    : section === 'mi-marca' ? 'Mi Marca'
    : 'Biblioteca'
    : 'Biblioteca'

  const title = item.title || 'Sin título'
  const type = item.type ? TYPE_LABELS[item.type] || 'Contenido' : 'Contenido'

  return (
    <Link href={href} className="block">
      <motion.div
        whileHover={{ y: -2 }}
        className="rounded-[var(--radius-md)] p-4 flex items-center gap-4"
        style={{
          background: 'white',
          border: '1.5px solid var(--color-buttermilk)',
        }}
      >
        <div
          className="w-12 h-12 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-buttermilk)' }}
        >
          <Clock size={20} style={{ color: 'var(--color-cherry)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-60">
            Continuar en {sectionLabel}
          </p>
          <p className="text-sm font-semibold text-ink truncate mt-0.5">{title}</p>
          <p className="text-xs text-cherry-dark opacity-60 mt-0.5">{type}</p>
        </div>
        <ArrowRight size={18} style={{ color: 'var(--color-cherry)' }} className="flex-shrink-0" />
      </motion.div>
    </Link>
  )
}