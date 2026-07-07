'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: '¿Puedo cancelar cuando quiera?',
    a: 'Sí, sin permanencia. Cancelas desde tu cuenta en un clic y conservas el acceso hasta el final del periodo facturado.',
  },
  {
    q: '¿Tengo que saber de marketing para usarlo?',
    a: 'No. Bravi hace el trabajo estratégico por ti. Tú solo eliges qué quieres crear (Reels, Stories, planificación…) y copias los textos listos para publicar.',
  },
  {
    q: '¿La IA entiende mi salón y mi estilo?',
    a: 'Sí. La primera vez configuras tu marca con el cuestionario de Mi Marca. Bravi recuerda tus servicios, clienta ideal, tono y objetivo para personalizar todo el contenido.',
  },
  {
    q: '¿Y si me da vergüenza grabarme?',
    a: 'No hace falta salir en cámara. Los guiones funcionan mostrando el trabajo del salón, con voz en off o con texto en pantalla. Bravi te propone ideas visuales adaptadas a ti.',
  },
  {
    q: '¿Funciona desde el móvil?',
    a: 'Sí. BRÄVE Studio es web y está optimizada para móvil. Creas y copias contenido desde el navegador sin instalar nada.',
  },
]

export default function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-warm-light py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-cherry-dark" style={{ letterSpacing: '-0.5px' }}>
            Preguntas frecuentes
          </h2>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="card overflow-hidden"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="font-bold text-sm sm:text-base text-cherry">{item.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      color: 'var(--color-cherry)',
                      flexShrink: 0,
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-ink opacity-80">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}