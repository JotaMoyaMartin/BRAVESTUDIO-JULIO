'use client'
import { useState } from 'react'
import { Download, ImageIcon } from 'lucide-react'

const IMAGE_SRC = '/roadmaps/roadmap-brave-premium.png'

/**
 * Bloque 1 — Imagen estática tipo infografía premium.
 * Muestra /public/roadmaps/roadmap-brave-premium.png si existe.
 * Si no existe (o falla al cargar), muestra un placeholder elegante.
 */
export default function RoadmapPremiumImage() {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleDownload = () => {
    // Abrir la imagen en nueva pestaña — el usuario puede guardarla desde ahí
    window.open(IMAGE_SRC, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="space-y-4">
      {/* Título y subtítulo */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold title-shine">
          Tu Estrategia de Evolución
        </h2>
        <p className="text-sm sm:text-base text-cherry-dark opacity-75 mt-2 max-w-2xl mx-auto">
          Tu hoja de ruta personalizada para construir una marca profesional, atractiva y rentable.
        </p>
      </div>

      {/* Imagen o placeholder */}
      <div
        className="relative rounded-[var(--radius-lg)] overflow-hidden shadow-soft mx-auto"
        style={{
          border: '1.5px solid var(--color-buttermilk)',
          background: 'var(--color-cream)',
        }}
      >
        {!failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={IMAGE_SRC}
            alt="Hoja de ruta BRÄVE — Estrategia de evolución"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className="block w-full h-auto"
            style={{
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.4s ease',
              maxHeight: 'none',
            }}
          />
        ) : (
          <Placeholder />
        )}

        {/* Skeleton mientras carga */}
        {!failed && !loaded && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--color-warm-light)' }}>
            <div className="flex flex-col items-center gap-3">
              <ImageIcon size={36} className="text-cherry opacity-40" />
              <p className="text-xs text-cherry-dark opacity-60">Cargando…</p>
            </div>
          </div>
        )}
      </div>

      {/* Botón descargar */}
      <div className="flex justify-center">
        <button
          onClick={handleDownload}
          disabled={failed}
          className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
          style={{ opacity: failed ? 0.5 : 1, cursor: failed ? 'not-allowed' : 'pointer' }}
          title={failed ? 'Imagen pendiente de subir' : 'Descargar o abrir la imagen en nueva pestaña'}
        >
          <Download size={16} />
          {failed ? 'Imagen pendiente' : 'Descargar mi estrategia'}
        </button>
      </div>
    </section>
  )
}

// ── Placeholder elegante ─────────────────────────────────────────────
function Placeholder() {
  return (
    <div
      className="w-full flex flex-col items-center justify-center text-center px-6 py-16 sm:py-24"
      style={{
        background:
          'linear-gradient(135deg, var(--color-cream) 0%, var(--color-warm-light) 60%, var(--color-buttermilk) 100%)',
      }}
    >
      <div className="float-soft mb-4">
        <ImageIcon size={56} className="text-cherry opacity-50" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-cherry-dark opacity-80 max-w-sm">
        Imagen roadmap premium pendiente de subir
      </p>
      <p className="text-xs text-cherry-dark opacity-50 mt-2 max-w-xs">
        Coloca tu archivo en <code className="font-mono">/public/roadmaps/roadmap-brave-premium.png</code>
      </p>
    </div>
  )
}