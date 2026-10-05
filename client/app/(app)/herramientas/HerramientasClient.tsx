'use client'
import AppTile from '@/components/home/AppTile'
import { TILES_NORMAL, TILES_PREMIUM } from '@/components/home/tiles'

export default function HerramientasClient({ isPremium = false }: { isPremium?: boolean }) {
  const tiles = isPremium ? TILES_PREMIUM : TILES_NORMAL
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {tiles.map(tile => (
        <div key={tile.href} className={tile.image ? 'col-span-2 sm:col-span-3' : ''}>
          <AppTile {...tile} />
        </div>
      ))}
    </div>
  )
}