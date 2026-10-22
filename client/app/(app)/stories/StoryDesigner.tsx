'use client'
/**
 * DISEÑA TUS STORIES: galería de plantillas 9:16 → editor (mismo que
 * Carruseles) con texto, letra, composición y fondo → descarga.
 */
import { useMemo } from 'react'
import { useSessionState } from '@/lib/session-store'
import ComposedSlide from '@/components/carruseles/ComposedSlide'
import ResultGallery from '@/components/carruseles/ResultGallery'
import { bankPhotoFor, type SlideDesign } from '@/lib/carruseles/composer'
import type { SlideResult } from '@/lib/carruseles/types'
import { STORY_TEMPLATES, storyTemplate, type StoryTemplate } from '@/lib/stories/templates'
import AddToPlanButton from '@/components/plan/AddToPlanButton'

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
  const template = storyTemplate(draft.templateId)

  // Muestras de la galería con fotos del banco (estables).
  const previews = useMemo(() => STORY_TEMPLATES.map(t => ({ t, stories: fromTemplate(t, `preview-${t.id}`) })), [])

  if (!template || !draft.stories.length) {
    return (
      <div className="space-y-4">
        <p className="text-[15px] text-tinta-2">Elige una plantilla. Luego cambias el texto, la letra, la composición y la foto (tuya, de BRÄVE o un color). Todo se respeta en las zonas que Instagram tapa.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {previews.map(({ t, stories }) => (
            <button key={t.id} onClick={() => setDraft({ templateId: t.id, stories: fromTemplate(t, `${t.id}-${Date.now()}`) })}
              className="group text-left space-y-2">
              <div className="relative rounded-2xl overflow-hidden shadow-[var(--shadow-soft)] transition-transform group-hover:-translate-y-0.5">
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
