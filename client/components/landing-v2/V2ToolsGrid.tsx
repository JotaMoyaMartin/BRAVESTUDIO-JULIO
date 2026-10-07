'use client'
import Image from 'next/image'
import { Zap, LayoutGrid, Rocket, type LucideIcon } from 'lucide-react'
import Reveal from './Reveal'
import { TOOLS } from './content'

/** Iconos para las cards sin portada — mapear por nombre. */
const ICON_BY_NAME: Record<string, LucideIcon> = {
  'Banco de Ganchos': Zap,
  'Carruseles': LayoutGrid,
  'Reto 10K': Rocket,
}

const ICON_BG: Record<string, { bg: string; fg: string }> = {
  'Banco de Ganchos': { bg: 'var(--color-buttermilk)', fg: '#591427' },
  'Carruseles': { bg: 'var(--color-cherry)', fg: '#fff' },
  'Reto 10K': { bg: 'var(--v2-vino)', fg: 'var(--color-buttermilk)' },
}

/**
 * Bento grid del ecosistema (12 herramientas). Usa portadas REALES de los
 * tiles de la app (/public/tiles). Las cards `icon` no tienen portada aún:
 * [PLACEHOLDER] — al llegar su banner a /tiles, rellenar `asset` en content.ts.
 */
export default function V2ToolsGrid() {
  return (
    <section id="funciones" className="py-14 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <p className="v2-eyebrow" style={{ color: 'var(--color-cherry)' }}>{TOOLS.eyebrow}</p>
          <h2 className="v2-h2 text-[26px] sm:text-4xl mt-3" style={{ color: 'var(--v2-ink)' }}>
            {TOOLS.title}
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
          {TOOLS.tools.map((tool, i) => {
            const span =
              tool.size === 'banner3' ? 'md:col-span-3' : 'md:col-span-2'
            const icon = ICON_BY_NAME[tool.name]
            const Icon = icon
            const colors = ICON_BG[tool.name]

            return (
              <Reveal key={tool.name} delay={(i % 3) * 0.05} className={span}>
                <article
                  className="v2-tool h-full group"
                  style={
                    tool.size === 'icon'
                      ? {
                          background: 'var(--v2-sand)',
                          border: '1px solid var(--v2-border-light)',
                          minHeight: 216,
                        }
                      : undefined
                  }
                >
                  {tool.asset ? (
                    /* Portada real del tile (con su propio título artístico) */
                    <div className="relative w-full h-full overflow-hidden" aria-label={`${tool.name}: ${tool.copy}`}>
                      <Image
                        src={tool.asset}
                        alt={`${tool.name} — ${tool.copy}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 42%, rgba(46,8,18,0.82) 100%)' }} aria-hidden="true" />
                      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                        <p className="text-xs sm:text-[13px] font-medium max-w-[320px] leading-snug" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {tool.copy}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* [PLACEHOLDER] card sin portada — sustituir por banner real */
                    <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <span
                        className="inline-flex items-center justify-center w-14 h-14 rounded-2xl"
                        style={{ background: colors.bg, border: '1px solid var(--v2-border-light)' }}
                        aria-hidden="true"
                      >
                        <Icon size={24} strokeWidth={2.2} style={{ color: colors.fg }} />
                      </span>
                      <p className="font-extrabold text-base tracking-tight" style={{ color: 'var(--v2-ink)' }}>
                        {tool.name}
                      </p>
                      <p className="text-[13px] leading-snug max-w-[220px]" style={{ color: 'rgba(42,11,18,0.65)' }}>
                        {tool.copy}
                      </p>
                    </div>
                  )}
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}