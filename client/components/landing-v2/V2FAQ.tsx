'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Reveal from './Reveal'
import { FAQ } from './content'

/**
 * FAQ — accordion con <details>/<summary> nativo (accesible por teclado, sin JS).
 */
export default function V2FAQ() {
  const [openByName, setOpenByName] = useState<Record<string, boolean>>({})

  return (
    <section id="faq" className="py-16 sm:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center mb-10">
          <h2 className="v2-h2 text-[26px] sm:text-4xl" style={{ color: 'var(--v2-ink)' }}>
            {FAQ.title}
          </h2>
        </Reveal>

        <div className="v2-faq flex flex-col gap-2.5">
          {FAQ.items.map((item, i) => {
            // id estable para el control details/summary controlado por React
            const name = `faq-${i}`
            const isOpen = !!openByName[name]
            return (
              <Reveal key={item.q} delay={Math.min(i * 0.03, 0.2)}>
                <details open={isOpen} onToggle={(e) => setOpenByName((prev) => ({ ...prev, [name]: (e.target as HTMLDetailsElement).open }))}>
                  <summary
                    className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4.5"
                    style={{ padding: '1.1rem 1.4rem' }}
                    aria-expanded={isOpen}
                  >
                    <span className="font-bold text-[15px] leading-snug" style={{ color: 'var(--v2-ink)' }}>
                      {item.q}
                    </span>
                    <span
                      className="v2-faq-chevron inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0"
                      style={{ background: 'var(--v2-blush)' }}
                      aria-hidden="true"
                    >
                      <ChevronDown size={14} strokeWidth={2.6} style={{ color: 'var(--color-cherry)' }} />
                    </span>
                  </summary>
                  <div className="px-5 sm:px-6" style={{ padding: '0 1.4rem 1.2rem' }}>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(42,11,18,0.72)' }}>
                      {item.a}
                    </p>
                  </div>
                </details>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}