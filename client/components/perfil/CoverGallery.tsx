'use client'
/**
 * Galería de portadas para las destacadas: estilos ya hechos, con los nombres
 * de SUS destacadas. Se elige uno y se descargan todas (1080×1920) o una.
 */
import { useMemo, useRef, useState } from 'react'
import { BookHeart, CalendarHeart, Check, Download, Flower2, Gem, GraduationCap, Heart, Loader2, MapPin, Paintbrush, Palette, Ribbon, Scissors, Sparkles, Star, Sun, Users, Wind, type LucideIcon } from 'lucide-react'
import { useSessionState } from '@/lib/session-store'
import { COVER_SETS, coverFileName, coverIcon, coverPhotos, type CoverIcon, type CoverSet } from '@/lib/perfil/portadas'

const ICONS: Record<CoverIcon, LucideIcon> = {
  historia: BookHeart, resenas: Star, resultados: Sparkles, servicios: Scissors, ubicacion: MapPin,
  balayage: Paintbrush, rubios: Sun, novias: Gem, alisados: Wind, extensiones: Ribbon, canas: Flower2,
  color: Palette, equipo: Users, formacion: GraduationCap, reservar: CalendarHeart, otro: Heart,
}

/** Una portada. `w`×`h` en px; el dibujo va centrado en el cuadrado central (lo que recorta Instagram). */
function Cover({ set, nombre, photo, w, h = w }: { set: CoverSet; nombre: string; photo: string; w: number; h?: number }) {
  const s = Math.min(w, h)
  const Icon = ICONS[coverIcon(nombre)]
  return (
    <div style={{ width: w, height: h, background: set.bg, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {set.kind === 'foto' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: set.bn ? 'grayscale(1) contrast(1.05)' : undefined }} />
      )}
      {set.aro && <div style={{ position: 'absolute', width: s * 0.66, height: s * 0.66, borderRadius: '50%', border: `${Math.max(1, s * 0.006)}px solid ${set.fg}` }} />}
      {set.kind === 'icono' && <Icon size={s * 0.38} strokeWidth={1.1} color={set.fg} aria-hidden />}
      {set.kind === 'letra' && (
        <span style={{ fontFamily: 'var(--font-instrument), "Instrument Serif", Georgia, serif', fontSize: s * 0.36, lineHeight: 1, color: set.fg, position: 'relative', top: -s * 0.01 }}>
          {nombre.trim()[0]?.toUpperCase() ?? '•'}
        </span>
      )}
    </div>
  )
}

function Circle({ set, nombre, photo, size, ring }: { set: CoverSet; nombre: string; photo: string; size: number; ring?: boolean }) {
  return (
    <span className={`block rounded-full p-[2px] flex-shrink-0 ${ring ? 'bg-borde' : ''}`} style={{ width: size + 4, height: size + 4 }}>
      <span className="block rounded-full overflow-hidden border-2 border-white" style={{ width: size, height: size }}>
        <Cover set={set} nombre={nombre} photo={photo} w={size - 4} />
      </span>
    </span>
  )
}

export default function CoverGallery({ userId, nombres }: { userId: string; nombres: string[] }) {
  const [setId, setSetId] = useSessionState<string>(`u:${userId}:perfil:portadas`, COVER_SETS[0].id)
  const set = COVER_SETS.find(s => s.id === setId) ?? COVER_SETS[0]
  const photos = useMemo(() => coverPhotos(nombres), [nombres])
  const [busy, setBusy] = useState<number | 'all' | null>(null)
  const refs = useRef<Array<HTMLDivElement | null>>([])

  async function exportOne(i: number): Promise<File | null> {
    const node = refs.current[i]
    if (!node) return null
    const { toBlob } = await import('html-to-image')
    // Doble pasada: la primera carga fuentes e imágenes en el clon.
    await toBlob(node, { width: 1080, height: 1920, pixelRatio: 1, cacheBust: true }).catch(() => null)
    const blob = await toBlob(node, { width: 1080, height: 1920, pixelRatio: 1, cacheBust: true }).catch(() => null)
    return blob ? new File([blob], coverFileName(set.id, nombres[i], i), { type: 'image/png' }) : null
  }

  async function download(which: number | 'all') {
    if (busy !== null) return
    setBusy(which)
    try {
      const idx = which === 'all' ? nombres.map((_, i) => i) : [which]
      const files = (await Promise.all(idx.map(i => exportOne(i)))).filter(Boolean) as File[]
      if (!files.length) return
      const isMobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent)
      if (isMobile && navigator.canShare?.({ files })) {
        try { await navigator.share({ files }); return } catch (e) { if ((e as Error).name === 'AbortError') return }
      }
      for (const f of files) {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(f)
        a.download = f.name
        a.click()
        URL.revokeObjectURL(a.href)
        await new Promise(r => setTimeout(r, 300))
      }
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[17px] font-semibold text-ink">Portadas para tus destacadas</h3>
        <p className="text-[14px] text-tinta-2">Elige un estilo: ya llevan tus destacadas. Usa uno solo para todas, así tu perfil se ve ordenado.</p>
      </div>

      {/* Estilo elegido, como se verá en tu perfil */}
      <div className="rounded-2xl bg-warm-gray/50 p-4 space-y-3">
        <p className="text-[13px] font-semibold text-cereza">{set.nombre} · así se verá en tu perfil</p>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {nombres.map((n, i) => (
            <button key={n} onClick={() => download(i)} disabled={busy !== null} className="flex flex-col items-center gap-1.5 w-[70px] flex-shrink-0 group" aria-label={`Descargar portada ${n}`}>
              <span className="relative">
                <Circle set={set} nombre={n} photo={photos[i]} size={64} ring />
                <span className="absolute -right-0.5 -bottom-0.5 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center text-burdeos opacity-80 group-hover:opacity-100">
                  {busy === i ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Download size={13} aria-hidden />}
                </span>
              </span>
              <span className="text-[12px] text-ink text-center leading-tight truncate w-full">{n}</span>
            </button>
          ))}
        </div>
        <button onClick={() => download('all')} disabled={busy !== null} className="btn-primary w-full sm:w-auto justify-center">
          {busy === 'all' ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Download size={16} aria-hidden />} Descargar las {nombres.length}
        </button>
        <p className="text-[13px] text-tinta-2">Para ponerla: en tu perfil, mantén pulsada la destacada → Editar destacada → Editar portada → elige la imagen. Toca un círculo para bajar solo esa.</p>
      </div>

      {/* Todos los estilos */}
      <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Estilos de portada">
        {COVER_SETS.map(s => {
          const on = s.id === set.id
          return (
            <button key={s.id} role="radio" aria-checked={on} onClick={() => setSetId(s.id)}
              className={`text-left rounded-2xl border p-3 space-y-2.5 transition-colors ${on ? 'border-burdeos bg-rosa/40 ring-1 ring-burdeos' : 'border-borde bg-white hover:border-cereza'}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-semibold text-ink">{s.nombre}</span>
                {on && <span className="w-5 h-5 rounded-full bg-burdeos text-crema flex items-center justify-center"><Check size={12} aria-hidden /></span>}
              </span>
              <span className="flex gap-1.5 overflow-hidden">
                {nombres.slice(0, 7).map((n, i) => <Circle key={n} set={s} nombre={n} photo={photos[i]} size={36} />)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Lienzos a tamaño real para descargar (fuera de la pantalla) */}
      <div aria-hidden style={{ position: 'fixed', left: -12000, top: 0, pointerEvents: 'none' }}>
        {nombres.map((n, i) => (
          <div key={`${set.id}-${n}`} ref={el => { refs.current[i] = el }} style={{ width: 1080, height: 1920 }}>
            <Cover set={set} nombre={n} photo={photos[i]} w={1080} h={1920} />
          </div>
        ))}
      </div>
    </div>
  )
}
