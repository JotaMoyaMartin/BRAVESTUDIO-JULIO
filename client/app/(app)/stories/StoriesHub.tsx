'use client'
/**
 * PORTADA DE STORIES (28-oct-2026, Jota): que entre por los ojos.
 * Arriba, diseños reales que se pueden tocar; debajo, los 3 caminos según lo
 * que tenga la estilista hoy (prisa, una idea o sus fotos) y 2 extras.
 * Los mismos 3 caminos que Carruseles: una sola forma de explicarlo en clase.
 */
import { useMemo } from 'react'
import { ArrowRight, BookMarked, ImagePlus, MessageSquare, Mic, Sparkles, Wand2 } from 'lucide-react'
import ComposedSlide from '@/components/carruseles/ComposedSlide'
import MockupStory, { emptyMockupState } from '@/components/stories/MockupStory'
import PageHeader from '@/components/ui/PageHeader'
import { setSessionValue } from '@/lib/session-store'
import { STORY_TEMPLATES } from '@/lib/stories/templates'
import { MOCKUP_TEMPLATES } from '@/lib/stories/mockups'
import { designerKey, fromTemplate, mockupKey } from './StoryDesigner'

export type HubTab = 'disena' | 'crear' | 'fotos' | 'listas' | 'questions'

export default function StoriesHub({ userId, onOpen }: { userId: string; onOpen: (tab: HubTab) => void }) {
  const sample = useMemo(() => emptyMockupState(), [])
  const classics = useMemo(() => STORY_TEMPLATES.map(t => ({ t, stories: fromTemplate(t, `preview-${t.id}`) })), [])
  const photoMockups = MOCKUP_TEMPLATES.filter(m => m.slots.length > 0)

  // Tira de inspiración: intercala plantillas con foto y diseños con sus fotos.
  const strip = useMemo(() => {
    const out: Array<{ key: string; kind: 'tpl' | 'mock'; id: string; name: string }> = []
    const n = Math.max(classics.length, MOCKUP_TEMPLATES.length)
    for (let i = 0; i < n && out.length < 12; i++) {
      if (classics[i]) out.push({ key: `t-${classics[i].t.id}`, kind: 'tpl', id: classics[i].t.id, name: classics[i].t.name })
      if (MOCKUP_TEMPLATES[i]) out.push({ key: `m-${MOCKUP_TEMPLATES[i].id}`, kind: 'mock', id: MOCKUP_TEMPLATES[i].id, name: MOCKUP_TEMPLATES[i].name })
    }
    return out
  }, [classics])

  function openTemplate(id: string) {
    const t = STORY_TEMPLATES.find(x => x.id === id)
    if (!t) return
    setSessionValue(mockupKey(userId), null)
    setSessionValue(designerKey(userId), { templateId: t.id, stories: fromTemplate(t, `${t.id}-${Date.now()}`) })
    onOpen('disena')
  }
  function openMockup(id: string) {
    const m = MOCKUP_TEMPLATES.find(x => x.id === id)
    if (!m) return
    setSessionValue(mockupKey(userId), m.id)
    onOpen(m.slots.length > 0 ? 'fotos' : 'disena')
  }

  const thumb = (item: { kind: 'tpl' | 'mock'; id: string }, cls = '') => {
    if (item.kind === 'tpl') {
      const c = classics.find(x => x.t.id === item.id)
      if (!c) return null
      const s = c.stories[0]
      return <ComposedSlide ratio="9:16" design={s.design} title={s.text} support={s.support} index={0} total={c.stories.length} className={cls} />
    }
    const m = MOCKUP_TEMPLATES.find(x => x.id === item.id)
    return m ? <MockupStory tpl={m} state={sample} className={`w-full ${cls}`} /> : null
  }

  const paths: Array<{
    tab: HubTab; ask: string; title: string; desc: string; meta: string; icon: React.ReactNode
    tone: string; thumbs: Array<{ kind: 'tpl' | 'mock'; id: string }>
  }> = [
    {
      tab: 'disena', ask: '¿Tienes prisa?', title: 'Elige un diseño',
      desc: 'Diseños terminados con fotos de salón. Cambias el texto o la foto y la descargas.',
      meta: 'Sin escribir nada · 1 minuto', icon: <Wand2 size={20} aria-hidden />, tone: 'bg-burdeos text-crema',
      thumbs: classics.slice(0, 3).map(c => ({ kind: 'tpl' as const, id: c.t.id })),
    },
    {
      tab: 'crear', ask: '¿Te ha pasado algo hoy?', title: 'Cuéntame tu idea',
      desc: 'Dímelo por voz o escrito (una clienta, un cambio, una duda) y lo convierto en stories.',
      meta: 'Con IA · tu historia real', icon: <Mic size={20} aria-hidden />, tone: 'bg-mantequilla text-burdeos',
      thumbs: classics.slice(3, 6).map(c => ({ kind: 'tpl' as const, id: c.t.id })),
    },
    {
      tab: 'fotos', ask: '¿Acabas de terminar un trabajo?', title: 'Tengo mis fotos',
      desc: 'Sube tu antes y después o tu reseña y elige dónde lucen: polaroids, móvil, marcos.',
      meta: 'Con tus fotos · lista para destacadas', icon: <ImagePlus size={20} aria-hidden />, tone: 'bg-rosa text-burdeos',
      thumbs: photoMockups.slice(0, 3).map(m => ({ kind: 'mock' as const, id: m.id })),
    },
  ]

  return (
    <div className="space-y-7">
      <PageHeader title="Stories" subtitle="¿Qué tienes hoy? Elige y en un par de minutos la tienes lista para subir." />

      {/* Inspiración: diseños reales, se tocan y se abren */}
      <section aria-labelledby="inspira" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="inspira" className="text-[17px] font-semibold text-burdeos flex items-center gap-2"><Sparkles size={16} aria-hidden /> Toca uno y hazlo tuyo</h2>
          <span className="text-[13px] text-tinta-2">{STORY_TEMPLATES.length + MOCKUP_TEMPLATES.length} diseños</span>
        </div>
        <div className="-mx-5 px-5 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto no-scrollbar snap-x pb-2">
          {strip.map(item => (
            <button key={item.key} type="button" onClick={() => (item.kind === 'tpl' ? openTemplate(item.id) : openMockup(item.id))}
              className="group snap-start flex-shrink-0 w-[124px] sm:w-[150px] text-left space-y-1.5" aria-label={`Abrir el diseño ${item.name}`}>
              <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-soft)] transition-transform group-hover:-translate-y-1 group-focus-visible:ring-[3px] group-focus-visible:ring-cereza">
                {thumb(item)}
              </div>
              <span className="block text-[13px] font-semibold text-ink leading-tight truncate">{item.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Los 3 caminos */}
      <section aria-labelledby="caminos" className="space-y-3">
        <h2 id="caminos" className="text-[17px] font-semibold text-burdeos">O empieza por lo que tienes</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {paths.map(p => (
            <button key={p.tab} type="button" onClick={() => onOpen(p.tab)}
              className={`group relative overflow-hidden text-left rounded-[var(--radius-lg)] p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5 shadow-[var(--shadow-soft)] ${p.tone}`}>
              {/* Abanico de 3 miniaturas: lo que sale al final */}
              <span className="relative h-[118px] md:h-[150px] flex items-end justify-center" aria-hidden>
                {p.thumbs.map((t, i) => (
                  <span key={t.id} className="absolute bottom-0 w-[62px] md:w-[80px] rounded-xl overflow-hidden shadow-[var(--shadow-medium)] transition-transform duration-300"
                    style={{ transform: `translateX(${(i - 1) * 72}%) rotate(${(i - 1) * 8}deg)`, zIndex: i === 1 ? 2 : 1 }}>
                    {thumb(t)}
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

      {/* Extras */}
      <section aria-label="Más formas" className="grid gap-3 sm:grid-cols-2">
        {([
          { tab: 'listas' as const, title: 'Textos ya escritos', desc: '30 secuencias por servicio: elige una, ponle tu foto y listo.', icon: <BookMarked size={20} aria-hidden /> },
          { tab: 'questions' as const, title: 'Caja de preguntas', desc: 'Preguntas para el sticker y respuestas para contestar en vídeo.', icon: <MessageSquare size={20} aria-hidden /> },
        ]).map(x => (
          <button key={x.tab} type="button" onClick={() => onOpen(x.tab)}
            className="group flex items-center gap-3.5 text-left rounded-[var(--radius-lg)] bg-white border border-borde p-4 hover:border-cereza transition-colors">
            <span className="w-11 h-11 flex-shrink-0 rounded-2xl bg-crema flex items-center justify-center text-burdeos">{x.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold text-burdeos">{x.title}</span>
              <span className="block text-[14px] text-tinta-2 leading-snug">{x.desc}</span>
            </span>
            <ArrowRight size={18} className="text-cereza flex-shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
          </button>
        ))}
      </section>
    </div>
  )
}
