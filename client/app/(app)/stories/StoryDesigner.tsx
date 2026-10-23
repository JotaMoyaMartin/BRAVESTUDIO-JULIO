'use client'
/**
 * DISEÑA TUS STORIES: galería de plantillas 9:16 → editor (mismo que
 * Carruseles) con texto, letra, composición y fondo → descarga.
 */
import { useMemo, useState } from 'react'
import { useSessionState } from '@/lib/session-store'
import ComposedSlide from '@/components/carruseles/ComposedSlide'
import ResultGallery from '@/components/carruseles/ResultGallery'
import { bankPhotoFor, type SlideDesign } from '@/lib/carruseles/composer'
import type { SlideResult } from '@/lib/carruseles/types'
import { STORY_TEMPLATES, storyTemplate, type StoryTemplate } from '@/lib/stories/templates'
import AddToPlanButton from '@/components/plan/AddToPlanButton'
import MockupStory, { emptyMockupState } from '@/components/stories/MockupStory'
import MockupEditor from '@/components/stories/MockupEditor'
import { CLASSIC_CATEGORY, MOCKUP_TEMPLATES, STORY_CATEGORIES, mockupTemplate, type StoryCategory } from '@/lib/stories/mockups'

interface StoryDraft {
  templateId: string | null
  stories: Array<{ text: string; support?: string; visual: SlideResult['visual']; design: SlideDesign }>
}

const EMPTY: StoryDraft = { templateId: null, stories: [] }

/** Plantilla → stories con foto BRÄVE (por tema, sin repetir). */
function fromTemplate(t: StoryTemplate, seed: string): StoryDraft['stories'] {
  const used: string[] = []
  return t.stories.map((s, i) => {
    const bg = s.design.bg ?? { kind: 'photo' as const, src: bankPhotoFor(s.visual, i, { text: s.text, seed, avoid: used }), source: 'banco' as const }
    if (bg.kind === 'photo') used.push(bg.src)
    return { text: s.text, support: s.support, visual: s.visual, design: { ...s.design, bg } as SlideDesign }
  })
}

export default function StoryDesigner({ userId }: { userId: string }) {
  const [draft, setDraft] = useSessionState<StoryDraft>(`u:${userId}:story-designer`, EMPTY)
  const [mockupId, setMockupId] = useSessionState<string | null>(`u:${userId}:story-designer:mockupId`, null)
  const [cat, setCat] = useState<StoryCategory | 'todas'>('todas')
  const template = storyTemplate(draft.templateId)
  const mockup = mockupTemplate(mockupId)

  // Muestras de la galería con fotos del banco (estables).
  const previews = useMemo(() => STORY_TEMPLATES.map(t => ({ t, stories: fromTemplate(t, `preview-${t.id}`) })), [])
  const sample = useMemo(() => emptyMockupState(), [])

  if (mockup) return <MockupEditor userId={userId} tpl={mockup} onBack={() => setMockupId(null)} />

  if (!template || !draft.stories.length) {
    const mockups = MOCKUP_TEMPLATES.filter(m => cat === 'todas' || m.category === cat)
    const classics = previews.filter(({ t }) => cat === 'todas' || CLASSIC_CATEGORY[t.id] === cat)
    const card = 'group text-left space-y-2'
    const frame = 'relative rounded-2xl overflow-hidden shadow-[var(--shadow-soft)] transition-transform group-hover:-translate-y-0.5'
    return (
      <div className="space-y-4">
        <p className="text-[15px] text-tinta-2">Elige qué quieres contar. Pon tus fotos y tus textos y descárgala: lista para tus historias destacadas.</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Categorías">
          {[{ id: 'todas' as const, label: 'Todas' }, ...STORY_CATEGORIES].map(c => (
            <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold border transition-colors ${cat === c.id ? 'bg-burdeos text-crema border-burdeos' : 'bg-white text-ink border-borde hover:border-cereza'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {mockups.map(m => (
            <button key={m.id} onClick={() => setMockupId(m.id)} className={card}>
              <div className={frame}>
                <MockupStory tpl={m} state={sample} className="w-full" />
                {m.slots.length > 0 && <span className="absolute top-2 right-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/90 text-burdeos">Con tus fotos</span>}
              </div>
              <span className="block text-[15px] font-semibold text-ink leading-tight">{m.name}</span>
              <span className="block text-[13px] text-tinta-2 leading-snug">{m.hint}</span>
            </button>
          ))}
          {classics.map(({ t, stories }) => (
            <button key={t.id} onClick={() => setDraft({ templateId: t.id, stories: fromTemplate(t, `${t.id}-${Date.now()}`) })} className={card}>
              <div className={frame}>
                <ComposedSlide ratio="9:16" design={stories[0].design} title={stories[0].text} support={stories[0].support} index={0} total={stories.length} />
                {stories.length > 1 && <span className="absolute top-2 right-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/90 text-burdeos">{stories.length} stories</span>}
              </div>
              <span className="block text-[15px] font-semibold text-ink leading-tight">{t.name}</span>
              <span className="block text-[13px] text-tinta-2 leading-snug">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const results: SlideResult[] = draft.stories.map((s, i) => ({ index: i, text: s.text, support: s.support, visual: s.visual, status: 'ok' }))
  const designs = draft.stories.map(s => s.design)
  const patchStory = (i: number, patch: Partial<StoryDraft['stories'][number]>) =>
    setDraft(p => ({ ...p, stories: p.stories.map((s, j) => (j === i ? { ...s, ...patch } : s)) }))

  return (
    <ResultGallery
      format="story"
      aiImages={false}
      heading={draft.stories.length > 1 ? 'Tus stories' : 'Tu story'}
      newLabel="Otra plantilla"
      extraActions={<AddToPlanButton userId={userId} className="btn-secondary" getPayload={() => ({
        type: 'story',
        title: draft.stories[0]?.text.replace(/\*\*/g, '') || template.name,
        content_json: { stories: draft.stories.map((st, i) => ({ number: i + 1, role: draft.stories.length > 1 ? `Story ${i + 1}` : 'Story', text: st.text.replace(/\*\*/g, '') + (st.support ? ` — ${st.support}` : '') })), designs: draft.stories.map(st => st.design) },
        format: `Plantilla ${template.name}`,
      })} />}
      style={{ name: template.name }}
      topic={template.hint}
      results={results}
      designs={designs}
      busyIndex={null}
      saving={false}
      saved={false}
      onDesignChange={(i, patch) => patchStory(i, { design: { ...designs[i], ...patch } })}
      onDesignAll={patch => setDraft(p => ({ ...p, stories: p.stories.map(s => ({ ...s, design: { ...s.design, ...patch } })) }))}
      onTextChange={(i, text, support) => patchStory(i, { text, support })}
      onRegenerateImage={i => {
        const inUse = designs.flatMap(d => (d.bg.kind === 'photo' ? [d.bg.src] : []))
        const src = bankPhotoFor(results[i].visual, i, { text: results[i].text, seed: String(Date.now()), avoid: inUse })
        patchStory(i, { design: { ...designs[i], bg: { kind: 'photo', src, source: 'banco' }, overlay: designs[i].overlay || 0.3 } })
      }}
      onRegenerateAll={() => {}}
      onNew={() => setDraft(EMPTY)}
    />
  )
}
