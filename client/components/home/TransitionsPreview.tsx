'use client'
import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, Wand2 } from 'lucide-react'
import { ReelTransition } from '@/types/database'

type PreviewItem = Pick<ReelTransition, 'id' | 'title' | 'short_description' | 'cover_image'>

interface Props {
  transitions: PreviewItem[]
}

export default function TransitionsPreview({ transitions }: Props) {
  // Rotación: mezcla aleatoria en cada mount → diferentes ejemplos cada visita
  const previewItems = useMemo(() => {
    const shuffled = [...transitions].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 6)
  }, [transitions])

  if (previewItems.length === 0) return null

  return (
    <section
      className="rounded-[var(--radius-md)] p-5"
      style={{ background: 'var(--color-buttermilk)', border: '1.5px solid rgba(122,24,50,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wand2 size={18} className="text-cherry" />
          <div>
            <p className="font-bold text-sm text-cherry-dark">Transiciones de Reels</p>
            <p className="text-xs" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>
              Ideas de transiciones listas para adaptar
            </p>
          </div>
        </div>
        <Link
          href="/transiciones-reels"
          className="flex items-center gap-1 text-xs font-semibold text-cherry hover:underline flex-shrink-0"
        >
          Ver todas <ArrowRight size={12} />
        </Link>
      </div>

      {/* Horizontal scroll de portadas 9:16 */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {previewItems.map(item => (
          <Link
            key={item.id}
            href="/transiciones-reels"
            className="group flex-shrink-0 w-28 sm:w-36 rounded-[var(--radius-sm)] overflow-hidden transition-all hover:scale-[1.03]"
            style={{
              background: 'white',
              border: '1.5px solid var(--color-buttermilk)',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            {/* Portada 9:16 */}
            <div className="relative aspect-[9/16] overflow-hidden bg-cream">
              <img
                src={item.cover_image}
                alt={item.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {/* Gradiente + título overlay */}
              <div
                className="absolute inset-x-0 bottom-0 p-2.5 pt-8"
                style={{ background: 'linear-gradient(to top, rgba(89,20,39,0.85) 0%, rgba(89,20,39,0) 100%)' }}
              >
                <p
                  className="text-xs font-bold leading-tight"
                  style={{ color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
                >
                  {item.title}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <Link
        href="/transiciones-reels"
        className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold transition-all hover:scale-[1.01]"
        style={{ background: 'white', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.12)' }}
      >
        <Wand2 size={14} />
        Explorar transiciones
      </Link>
    </section>
  )
}