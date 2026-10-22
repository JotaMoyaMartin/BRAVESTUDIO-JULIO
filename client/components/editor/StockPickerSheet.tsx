'use client'
// StockPickerSheet — bottom-sheet modal con el catálogo curado de fotos de la
// app (lib/editor/catalog.ts). Chips de categoría + GRID VISUAL 4:5 (redsign
// 13-oct: cards con el ratio final del carrusel, valorables a la vista, antes
// eran franjas horizontales ilegibles). 2 col móvil / 3-4 escritorio.
// Patrón visual de los sheets existentes (fondo fijo + panel inferior).

import { useMemo, useState } from 'react'
import { StockFilterId, STOCK_FILTERS, stockByFilter } from '@/lib/editor/catalog'
import type { EditorPhotoItem } from '@/lib/editor/catalog'
import { Images, X } from 'lucide-react'
import { useMyPhotos } from '@/components/estudio/MyPhotos'
import { photoSrc } from '@/lib/estudio/my-photos'

interface StockPickerSheetProps {
  open: boolean
  onClose: () => void
  /** src del item elegido (ruta pública) — null = "sin foto". */
  onPick: (src: string) => void
  /** Título del sheet (p.ej. "Foto del slide 2" / "Foto de fondo"). */
  title?: string
}

export default function StockPickerSheet({ open, onClose, onPick, title = 'Catálogo de fotos' }: StockPickerSheetProps) {
  const [filterId, setFilterId] = useState<StockFilterId | 'mis'>('todas')
  // «Mis fotos»: el banco de la estilista (Estudio de fotos), guardado en su cuenta.
  const { photos: mine } = useMyPhotos()

  const items = useMemo<EditorPhotoItem[]>(
    () => (filterId === 'mis' ? mine.map(p => ({ id: p.id, categoryId: 'mis', src: p.url, title: 'Mi foto' })) : stockByFilter(filterId)),
    [filterId, mine],
  )
  // La URL de la lista se libera al cerrar: la elegida recibe una propia.
  const pick = (src: string) => {
    const own = filterId === 'mis' ? mine.find(p => p.url === src) : null
    onPick(own ? photoSrc(own) : src)
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(10,6,8,0.55)' }} onClick={onClose}>
      <div
        className="w-full max-h-[86vh] overflow-y-auto rounded-t-2xl mx-auto"
        style={{ background: 'white', maxWidth: '42rem' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 pt-4 pb-3" style={{ background: 'white', borderBottom: '1.5px solid rgba(122,24,50,0.08)', zIndex: 1 }}>
          <div className="flex items-center gap-2">
            <Images size={15} style={{ color: 'var(--color-cherry)' }} />
            <p className="text-sm font-bold text-ink">{title}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full" style={{ background: 'var(--color-warm-gray)' }}>
            <X size={15} style={{ color: 'var(--color-cherry-dark)' }} />
          </button>
        </div>

        {/* Chips de filtro (Todas / Retratos / En el salón / Color / Resultados / Detalles) */}
        <div className="flex gap-2 overflow-x-auto px-5 py-3" style={{ WebkitOverflowScrolling: 'touch' }}>
          {(
            <button
              onClick={() => setFilterId('mis')}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: filterId === 'mis' ? 'var(--color-cherry)' : 'var(--color-buttermilk)', color: filterId === 'mis' ? 'white' : 'var(--color-cherry-dark)' }}
            >
              Mis fotos ({mine.length})
            </button>
          )}
          {STOCK_FILTERS.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterId(cat.id)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: filterId === cat.id ? 'var(--color-cherry)' : 'var(--color-warm-gray)',
                color: filterId === cat.id ? 'white' : 'var(--color-cherry-dark)',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grid visual 4:5 — cada foto valorable antes de elegir */}
        {filterId === 'mis' && mine.length === 0 && (
          <div className="mx-5 mb-5 rounded-xl p-4 text-sm" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>
            Aún no tienes fotos en tu banco. Súbelas o edítalas en el <a href="/estudio?paso=mis-fotos" className="font-bold underline">Estudio de fotos</a> y aparecerán aquí.
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 px-5 pb-5">
          {items.map(item => (
            <StockThumb key={item.id} item={item} onPick={pick} />
          ))}
        </div>
      </div>
    </div>
  )
}

function StockThumb({ item, onPick }: { item: EditorPhotoItem; onPick: (src: string) => void }) {
  return (
    <button
      onClick={() => onPick(item.src)}
      className="group text-left active:scale-[0.98] transition-transform"
      aria-label={item.title || 'Foto del catálogo'}
    >
      <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '4 / 5', border: '1.5px solid rgba(122,24,50,0.1)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.src} alt={item.title || 'Foto del catálogo'} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      </div>
      {item.title && (
        <p className="truncate text-[10px] font-semibold mt-1" style={{ color: 'var(--color-cherry-dark)', opacity: 0.65 }}>
          {item.title}
        </p>
      )}
    </button>
  )
}