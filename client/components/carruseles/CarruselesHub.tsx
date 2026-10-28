'use client'
/**
 * PORTADA DE CARRUSELES (28-oct-2026): los mismos 3 caminos que Stories.
 *   A · Elige un diseño   → carruseles ya escritos (sin IA, al momento)
 *   B · Cuéntame tu idea  → estilo → tema → textos con IA → imágenes
 *   C · Tengo mis fotos   → sube tus fotos y elige el carrusel donde van
 * Silencio de Autor es el estilo protagonista (favorito de Jota).
 */
import { useMemo, useRef } from 'react'
import { ArrowRight, ImagePlus, Mic, Sparkles, Wand2, X } from 'lucide-react'
import ComposedSlide from './ComposedSlide'
import PageHeader from '@/components/ui/PageHeader'
import { defaultDesign } from '@/lib/carruseles/composer'
import { READY_CAROUSELS, type ReadyCarousel } from '@/lib/carruseles/ready'
import { STYLE_REGISTRY } from '@/lib/carruseles/styles'

export type CarouselEntry = 'listos' | 'idea' | 'fotos'

/** Portada (slide 1) de un carrusel listo, con foto del banco estable. */
export function ReadyCover({ c, photo, className = '' }: { c: ReadyCarousel; photo?: string; className?: string }) {
  const first = c.slides[0]
  const design = useMemo(() => {
    const d = defaultDesign({ styleId: c.styleId, role: 'hook', index: 0, visual: first.visual, text: `${first.text} ${c.service}`, seed: `ready-${c.id}` })
    return photo ? { ...d, bg: { kind: 'photo' as const, src: photo, source: 'propia' as const }, overlay: d.overlay || 0.3 } : d
  }, [c, first, photo])
  return <ComposedSlide ratio="4:5" design={design} title={first.text} support={first.support} index={0} total={c.slides.length} className={className} />
}

export default function CarruselesHub({ onOpen, onReady }: { onOpen: (e: CarouselEntry) => void; onReady: (id: string) => void }) {
  const silencio = STYLE_REGISTRY[0]
  const paths: Array<{ e: CarouselEntry; ask: string; title: string; desc: string; meta: string; icon: React.ReactNode; tone: string; fan: React.ReactNode[] }> = [
    {
      e: 'listos', ask: '¿Tienes prisa?', title: 'Elige un diseño',
      desc: 'Carruseles ya escritos sobre lo que más preguntan en el salón. Cambia lo que quieras y descarga.',
      meta: `${READY_CAROUSELS.length} carruseles · sin escribir nada`, icon: <Wand2 size={20} aria-hidden />, tone: 'bg-burdeos text-crema',
      fan: READY_CAROUSELS.slice(0, 3).map(c => <ReadyCover key={c.id} c={c} />),
    },
    {
      e: 'idea', ask: '¿Tienes un tema en mente?', title: 'Cuéntame tu idea',
      desc: 'Elige el estilo, dime de qué quieres hablar (por voz o escrito) y la IA te escribe el carrusel.',
      meta: 'Con IA · adaptado a tu marca', icon: <Mic size={20} aria-hidden />, tone: 'bg-mantequilla text-burdeos',
      // eslint-disable-next-line @next/next/no-img-element
      fan: STYLE_REGISTRY.slice(0, 3).map(st => <img key={st.id} src={st.referenceImages[0]} alt="" className="w-full aspect-[4/5] object-cover" />),
    },
    {
      e: 'fotos', ask: '¿Tienes fotos de tus trabajos?', title: 'Tengo mis fotos',
      desc: 'Sube tus fotos (antes y después, tu salón, tus resultados) y elige el carrusel donde lucen.',
      meta: 'Con tus fotos · tus resultados reales', icon: <ImagePlus size={20} aria-hidden />, tone: 'bg-rosa text-burdeos',
      fan: READY_CAROUSELS.slice(3, 6).map(c => <ReadyCover key={c.id} c={c} />),
    },
  ]

  return (
    <div className="space-y-7">
      <PageHeader title="Carruseles" subtitle="¿Qué tienes hoy? Elige y en unos minutos tienes tu carrusel listo para publicar." />

      <section aria-labelledby="inspira-c" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="inspira-c" className="text-[17px] font-semibold text-burdeos flex items-center gap-2"><Sparkles size={16} aria-hidden /> Toca uno y hazlo tuyo</h2>
          <span className="hidden sm:inline text-[13px] text-tinta-2">Estilo {silencio.name}</span>
        </div>
        <div className="-mx-5 px-5 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto no-scrollbar snap-x pb-2">
          {READY_CAROUSELS.map(c => (
            <button key={c.id} type="button" onClick={() => onReady(c.id)} aria-label={`Abrir el carrusel ${c.name}`}
              className="group snap-start flex-shrink-0 w-[150px] sm:w-[180px] text-left space-y-1.5">
              <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-soft)] transition-transform group-hover:-translate-y-1 group-focus-visible:ring-[3px] group-focus-visible:ring-cereza">
                <ReadyCover c={c} />
              </div>
              <span className="block text-[13px] font-semibold text-ink leading-tight">{c.name}</span>
              <span className="block text-[12px] text-tinta-2 leading-tight">{c.slides.length} slides · {c.service}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="caminos-c" className="space-y-3">
        <h2 id="caminos-c" className="text-[17px] font-semibold text-burdeos">O empieza por lo que tienes</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {paths.map(p => (
            <button key={p.e} type="button" onClick={() => onOpen(p.e)}
              className={`group relative overflow-hidden text-left rounded-[var(--radius-lg)] p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5 shadow-[var(--shadow-soft)] ${p.tone}`}>
              <span className="relative h-[112px] md:h-[140px] flex items-end justify-center" aria-hidden>
                {p.fan.map((node, i) => (
                  <span key={i} className="absolute bottom-0 w-[74px] md:w-[92px] rounded-xl overflow-hidden shadow-[var(--shadow-medium)]"
                    style={{ transform: `translateX(${(i - 1) * 70}%) rotate(${(i - 1) * 8}deg)`, zIndex: i === 1 ? 2 : 1 }}>
                    {node}
                  </span>
                ))}
              </span>
              <span className="text-[13px] font-semibold opacity-80 flex items-center gap-1.5">{p.icon} {p.ask}</span>
              <span className="text-[22px] font-semibold leading-tight">{p.title}</span>
              <span className="text-[15px] leading-snug opacity-85">{p.desc}</span>
              <span className="mt-auto flex items-center justify-between text-[13px] font-semibold">
                {p.meta}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

/** Caminos A y C: galería de carruseles listos (con sus fotos si las subió). */
export function ReadyGallery({ photos, onPhotos, onPick, onBack }: {
  photos: string[] | null
  onPhotos?: (urls: string[]) => void
  onPick: (id: string) => void
  onBack: () => void
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const withPhotos = photos !== null
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-[14px] font-semibold text-cereza hover:underline">
        <ArrowRight size={15} className="rotate-180" aria-hidden /> Carruseles
      </button>
      <div className={`rounded-[var(--radius-lg)] p-4 md:p-5 flex items-center gap-3.5 ${withPhotos ? 'bg-rosa text-burdeos' : 'bg-burdeos text-crema'}`} data-tone={withPhotos ? undefined : 'dark'}>
        <span className={`w-11 h-11 flex-shrink-0 rounded-2xl flex items-center justify-center ${withPhotos ? 'bg-white/70' : 'bg-white/15'}`}>
          {withPhotos ? <ImagePlus size={22} aria-hidden /> : <Wand2 size={22} aria-hidden />}
        </span>
        <div className="min-w-0">
          <h1>{withPhotos ? 'Tengo mis fotos' : 'Elige un diseño'}</h1>
          <p className="text-[14px] leading-snug opacity-85">{withPhotos
            ? 'Sube tus fotos y toca el carrusel donde quieres que vayan. Van en el orden en que las eliges.'
            : 'Toca uno: se abre ya hecho y puedes cambiar textos, letra, diseño y fotos.'}</p>
        </div>
      </div>

      {withPhotos && (
        <div className="card p-4 space-y-3">
          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only"
            onChange={e => { const fs = Array.from(e.target.files ?? []).slice(0, 8); if (fs.length) onPhotos?.([...photos, ...fs.map(f => URL.createObjectURL(f))].slice(0, 8)); e.target.value = '' }} />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-semibold text-ink">Tus fotos <span className="text-tinta-2 font-normal">({photos.length} de 8)</span></p>
            <button onClick={() => fileRef.current?.click()} className="btn-primary text-sm"><ImagePlus size={15} aria-hidden /> {photos.length ? 'Añadir más' : 'Subir fotos'}</button>
          </div>
          {photos.length === 0
            ? <p className="text-[14px] text-tinta-2">Elige de 1 a 8 fotos de tu móvil: tus resultados, un antes y después o tu salón.</p>
            : (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {photos.map((src, i) => (
                  <div key={src} className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Tu foto ${i + 1}`} className="w-16 h-20 rounded-xl object-cover" />
                    <span className="absolute top-1 left-1 text-[11px] font-bold bg-white/90 text-burdeos rounded-full w-5 h-5 flex items-center justify-center">{i + 1}</span>
                    <button onClick={() => onPhotos?.(photos.filter(p => p !== src))} aria-label={`Quitar la foto ${i + 1}`}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-borde flex items-center justify-center text-burdeos"><X size={13} aria-hidden /></button>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 ${withPhotos && photos.length === 0 ? 'opacity-50 pointer-events-none' : ''}`} aria-disabled={withPhotos && photos.length === 0}>
        {READY_CAROUSELS.map(c => (
          <button key={c.id} type="button" onClick={() => onPick(c.id)} className="group text-left space-y-2">
            <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-soft)] transition-transform group-hover:-translate-y-0.5">
              <ReadyCover c={c} photo={withPhotos ? photos[0] : undefined} />
            </div>
            <span className="block text-[15px] font-semibold text-ink leading-tight">{c.name}</span>
            <span className="block text-[13px] text-tinta-2 leading-snug">{c.hint}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
