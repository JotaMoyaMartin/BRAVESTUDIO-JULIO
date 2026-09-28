'use client'
import { motion } from 'framer-motion'

/**
 * Galería tipo marquee: dos filas de fotos de salón con scroll horizontal
 * infinito (CSS animation) y captions estilo Instagram. Muy gráfico.
 */

type Pic = { src: string; caption: string; tag: string }

const ROW_A: Pic[] = [
  { src: '/landing/color.jpg', caption: 'Mechas balayage', tag: 'Color' },
  { src: '/landing/cutting.jpg', caption: 'Blow out perfecto', tag: 'Peinados' },
  { src: '/landing/salon2.jpg', caption: 'Tu salón, tu templo', tag: 'Negocio' },
  { src: '/landing/haircolor.jpg', caption: 'Rubio fantasía', tag: 'Tendencia' },
]

const ROW_B: Pic[] = [
  { src: '/landing/blonde.jpg', caption: 'Ritual de lavado', tag: 'Experiencia' },
  { src: '/landing/transform.jpg', caption: 'Antes / Después', tag: 'Resultado' },
  { src: '/landing/salon.jpg', caption: 'Agenda llena', tag: 'Clientas' },
  { src: '/landing/hairblonde.jpg', caption: 'Melena de ensueño', tag: 'Cuidado' },
]

function PicCard({ pic, tall }: { pic: Pic; tall?: boolean }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden group"
      style={{
        width: tall ? 240 : 210,
        height: tall ? 300 : 260,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-medium)',
        border: '2px solid rgba(255,255,255,0.7)',
      }}
    >
      <img
        src={pic.src}
        alt={pic.caption}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        draggable={false}
        loading="lazy"
      />
      {/* Gradient overlay + caption */}
      <div
        className="absolute inset-x-0 bottom-0 pt-8 pb-2.5 px-3"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(89,20,39,0.82))' }}
      >
        <p className="text-white text-xs font-bold leading-tight">{pic.caption}</p>
        <span
          className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
        >
          {pic.tag}
        </span>
      </div>
    </div>
  )
}

function MarqueeRow({ pics, reverse, duration, tall }: { pics: Pic[]; reverse?: boolean; duration: number; tall?: boolean }) {
  // Duplicamos la lista para el loop infinito seamless
  const doubled = [...pics, ...pics, ...pics]
  return (
    <div className="marquee-mask overflow-hidden">
      <div
        className="flex gap-4 w-max marquee-track"
        style={{
          animation: `marquee-scroll ${duration}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {doubled.map((p, i) => (
          <PicCard key={i} pic={p} tall={tall && i % 2 === 0} />
        ))}
      </div>
    </div>
  )
}

export default function LandingGallery() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6 }}
      className="relative bg-cream py-14 lg:py-20 overflow-hidden"
      aria-label="Trabajos de salones de belleza"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center mb-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl font-bold text-cherry-dark mb-3"
          style={{ letterSpacing: '-0.5px' }}
        >
          El contenido que Bravi crea para ti
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-sm sm:text-base text-cherry-dark opacity-70"
        >
          Ideas inspiradas en el mundo de la belleza. Tú solo copias, grabas y publicas.
        </motion.p>
      </div>

      <div className="space-y-4 -rotate-1 scale-[1.02]">
        <MarqueeRow pics={ROW_A} duration={38} tall />
        <MarqueeRow pics={ROW_B} duration={45} reverse />
      </div>
    </motion.section>
  )
}