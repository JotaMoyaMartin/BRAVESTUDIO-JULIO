'use client'
import type { PlanningPublication } from '@/lib/team/types'
import { Video, LayoutGrid } from 'lucide-react'

interface Props {
  publications: PlanningPublication[]
  onSelect?: (id: string) => void
  selectedId?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const DAY_SHORT: Record<string, string> = {
  Martes: 'Mar', Jueves: 'Jue', Domingo: 'Dom',
  Lunes: 'Lun', Miércoles: 'Mié', Viernes: 'Vie', Sábado: 'Sáb',
}

const SIZE_CLASS: Record<string, string> = {
  sm: 'text-[8px]',
  md: 'text-[10px]',
  lg: 'text-[11px]',
}

export default function InstagramFit({ publications, onSelect, selectedId, size = 'md' }: Props) {
  const sorted = [...publications].sort((a, b) => a.order - b.order)

  return (
    <div>
      <div className="grid grid-cols-3 gap-1">
        {sorted.map((pub, i) => {
          const isSelected = selectedId === pub.id
          const cover = pub.type === 'reel' ? pub.coverUrl : (pub.carouselImages[0] || null)
          return (
            <button
              key={pub.id}
              onClick={() => onSelect?.(pub.id)}
              className={`relative aspect-square overflow-hidden rounded-md border-2 transition-all ${
                isSelected ? 'border-[#7A1832] ring-2 ring-[#7A1832]/30' : 'border-transparent hover:border-[#FFF1B5]'
              } bg-[#FFFDF5]`}
            >
              {cover ? (
                <img src={cover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#d0cecb]">
                  {pub.type === 'reel' ? <Video size={size === 'sm' ? 14 : 20} /> : <LayoutGrid size={size === 'sm' ? 14 : 20} />}
                </div>
              )}
              {/* Day chip */}
              {pub.day && (
                <div className={`absolute top-1 left-1 bg-black/70 text-white ${SIZE_CLASS[size]} px-1.5 py-0.5 rounded font-medium uppercase tracking-wide`}>
                  {DAY_SHORT[pub.day] || pub.day.slice(0, 3)}
                </div>
              )}
              {/* Multiple images indicator */}
              {pub.type === 'carrusel' && pub.carouselImages.length > 1 && (
                <div className={`absolute top-1 right-1 bg-black/70 text-white ${SIZE_CLASS[size]} px-1 py-0.5 rounded flex items-center gap-0.5`}>
                  <LayoutGrid size={9} /> {pub.carouselImages.length}
                </div>
              )}
              {/* Type indicator */}
              <div className={`absolute bottom-1 right-1 ${SIZE_CLASS[size]} text-white opacity-90`}>
                {pub.type === 'reel' ? 'Reel' : 'Carr.'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}