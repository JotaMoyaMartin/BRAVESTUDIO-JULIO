'use client'
/**
 * PANTALLA 1 — Picker de estilos visuales (sin formularios: solo dirección creativa).
 * Los estilos son DATA (lib/carruseles/styles.ts); esta pantalla no sabe nada de
 * "Editorial Hair Luxe": pinta cualquier config. Las imágenes de referencia
 * son protagonistas; al tocarlas se agrandan en un lightbox.
 */
import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import Image from 'next/image'
import { ArrowRight, Check, Sparkles, X } from 'lucide-react'
import type { StyleConfig } from '@/lib/carruseles/types'
import { liveStyles, soonStyles } from '@/lib/carruseles/styles'

interface Props {
  onPick: (style: StyleConfig) => void
}

export default function StylePicker({ onPick }: Props) {
  const [zoom, setZoom] = useState<{ style: StyleConfig; src: string } | null>(null)
  const live = liveStyles()
  const soon = soonStyles()

  return (
    <div className="relative">
      {/* Cabecera única de la app (dirección visual 21-oct-2026) */}
      <div className="mb-8">
        <PageHeader
          title="Carruseles"
          subtitle="Elige un estilo. Después me cuentas de qué quieres hablar y hacemos el carrusel juntas: primero los textos, luego las imágenes."
        />
      </div>

      {/* Estilos activos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
        {live.map(style => (
          <article
            key={style.id}
            className="group relative bg-warm-light rounded-[var(--radius-md)] overflow-hidden border border-[rgba(122,24,50,0.08)] transition-all duration-300 hover:shadow-[0_18px_44px_rgba(74,52,40,0.16)] hover:-translate-y-1 cursor-pointer"
            onMouseEnter={e => { e.currentTarget.classList.add('is-hovered') }}
            onMouseLeave={e => { e.currentTarget.classList.remove('is-hovered') }}
            onClick={() => onPick(style)}
          >
            {/* Collage editorial: 1 grande + 2 pequeñas */}
            <div className="relative grid grid-cols-2 gap-0.5">
              <button
                type="button"
                className="relative aspect-[4/5] col-span-2 overflow-hidden"
                onClick={e => { e.stopPropagation(); setZoom({ style, src: style.referenceImages[0] }) }}
                aria-label="Ver ejemplo más grande"
              >
                <Image
                  src={style.referenceImages[0]}
                  alt={`Ejemplo del estilo ${style.name}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  priority
                />
              </button>
              {style.referenceImages.slice(1, 3).map((src, i) => (
                <button
                  type="button"
                  key={src}
                  className="relative aspect-[4/5] overflow-hidden"
                  onClick={e => { e.stopPropagation(); setZoom({ style, src }) }}
                  aria-label="Ver ejemplo más grande"
                >
                  <Image
                    src={src}
                    alt={`Ejemplo ${i + 2} del estilo ${style.name}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 200px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </button>
              ))}
            </div>

            {/* Info + acción */}
            <div className="p-5 md:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-xl text-cherry-dark" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 600 }}>
                  {style.name}
                </h3>
                <span className="text-[10px] uppercase tracking-[0.18em] text-cherry/50 shrink-0">
                  {style.mood[0]}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-ink/60 leading-relaxed">{style.tagline}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {style.mood.slice(1, 4).map(m => (
                  <span
                    key={m}
                    className="text-[10px] uppercase tracking-[0.14em] text-ink/50 border border-ink/10 rounded-full px-2.5 py-1"
                  >
                    {m}
                  </span>
                ))}
              </div>

              {/* Siempre visible: en el móvil no hay «hover» */}
              <div className="mt-5 btn-primary w-full justify-center">
                <Check className="w-4 h-4" aria-hidden />
                Usar este estilo
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Próximamente — la escala del sistema, sin inventar imágenes */}
      {soon.length > 0 && (
        <section className="mt-10">
          <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40 mb-4">Próximamente</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {soon.map(style => (
              <article
                key={style.id}
                className="flex gap-4 p-4 rounded-[var(--radius-md)] border border-ink/10 bg-cream cursor-not-allowed opacity-70"
                title="Todavía no está disponible"
              >
                <div
                  className="w-16 h-16 rounded-[var(--radius-sm)] shrink-0 flex items-center justify-center"
                  style={{ background: style.palette.tokens[0]?.hex ?? '#eee' }}
                >
                  <Sparkles className="w-5 h-5 text-white/90" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-ink/80">{style.name}</h4>
                  <p className="text-xs text-ink/50 mt-1 leading-relaxed">{style.tagline}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox — "las imágenes deben poder verse más grandes" */}
      {zoom && (
        <div
          className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4 md:p-10"
          onClick={() => setZoom(null)}
          role="dialog"
          aria-modal="true"
        >
          <button className="absolute top-5 right-5 text-white/80 hover:text-white" aria-label="Cerrar">
            <X className="w-6 h-6" />
          </button>
          <figure
            className="relative max-h-full w-auto max-w-full"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={zoom.src}
              alt={`Ejemplo grande del estilo ${zoom.style.name}`}
              width={1080}
              height={1350}
              className="max-h-[85vh] w-auto rounded-[var(--radius-sm)]"
            />
            <figcaption className="mt-3 text-center text-xs uppercase tracking-[0.2em] text-white/60">
              {zoom.style.name}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  )
}