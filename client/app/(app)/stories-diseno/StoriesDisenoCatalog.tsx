'use client'
import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Download, Lock, Package,
  Pencil, RefreshCw, Image as ImageIcon, X, Check, Sparkles, Wand2,
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'

import SlideCanvas, { CANVAS_W, CANVAS_H } from './SlideCanvas'
import { StoryPackSeedRow } from '@/lib/stories-diseno/samples'
import { StoryDesignElement, StoryDesignSlide } from '@/lib/stories-diseno/types'
import { rewriteWithAI } from '@/lib/ai/prompts/stories-design'
import { BrandFullContextInput } from '@/lib/ai/brand-context'

/**
 * Catálogo + editor de Stories Diseño (Fase 2). Estado en memoria: no se
 * guarda nada server-side todavía (Fase 3: guardar en biblioteca). Si la
 * usuaria recarga, pierde los cambios — se avisa en la parte inferior.
 */

interface CatalogTemplate {
  id: string
  slug: string
  title: string
  category: string
  description: string
  recommendedUse: string
  isLocked: boolean
  slides: StoryDesignSlide[]
}
export type CatalogPack = Omit<StoryPackSeedRow, 'templates'> & { id: string; templates: CatalogTemplate[] }

interface Props {
  packs: CatalogPack[]
  brand: BrandFullContextInput | null
  hasBrand: boolean
}

type TextKind = 'gancho' | 'cuerpo' | 'cierre' | 'opcion'

function kindOf(el: StoryDesignElement, slideIndex: number, total: number): TextKind {
  if (slideIndex === 0 && el.position.y < 800 && el.size.h >= 90) return 'gancho'
  if (slideIndex === total - 1 && el.position.y > 1000) return 'cierre'
  if (el.type === 'badge') return 'opcion'
  return 'cuerpo'
}

/** Escala de export: el frame tiene 320px de ancho → pixelRatio 1088/320. */
const EXPORT_RATIO = CANVAS_W / 320

const GOAL_LABEL: Record<string, string> = {
  vender: 'Para vender',
  captar: 'Para captar',
  educar: 'Para educar',
  fidelizar: 'Para fidelizar',
  autoridad: 'Para posicionar',
}

export default function StoriesDisenoCatalog({ packs, brand, hasBrand }: Props) {
  const toast = useToast()
  const [view, setView] = useState<'catalog' | 'pack'>('catalog')
  const [packId, setPackId] = useState<string | null>(null)
  const pack = packs.find(p => p.id === packId) ?? null

  return (
    <div className="pb-10">
      {view === 'catalog' && (
        <PackCatalogue
          packs={packs}
          onOpen={(id) => { setPackId(id); setView('pack') }}
        />
      )}
      {view === 'pack' && pack && (
        <PackView
          pack={pack}
          brand={brand}
          hasBrand={hasBrand}
          toast={toast}
          onBack={() => { setView('catalog'); setPackId(null) }}
        />
      )}
    </div>
  )
}

/* ────────────────────────── CATÁLOGO DE PACKS ────────────────────────── */

function PackCatalogue({ packs, onOpen }: { packs: CatalogPack[]; onOpen: (id: string) => void }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center">
        <p className="text-[11px] font-extrabold tracking-[4px]" style={{ color: 'var(--color-cherry)', textTransform: 'uppercase' }}>
          Packs listos
        </p>
        <h1 className="text-[28px] sm:text-[34px] font-extrabold text-cherry-dark leading-tight mt-2" style={{ letterSpacing: '-0.8px' }}>
          Elige tu pack de stories
        </h1>
        <p className="mt-2 text-sm text-cherry-dark opacity-70 max-w-lg mx-auto leading-relaxed">
          Cada pack trae las plantillas con el diseño hecho: tú elijas la que cuadre con tu semana y BRÄVE adapta los textos a tu salón.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packs.map(p => (
          <Card key={p.id} className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <span className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center" style={{ background: 'rgba(122,24,50,0.10)' }}>
                <Package size={20} className="text-cherry" aria-hidden="true" />
              </span>
              <Badge tone="cherry">{GOAL_LABEL[p.goal] ?? p.goal}</Badge>
            </div>
            <p className="text-[17px] font-bold text-cherry-dark leading-snug">{p.title}</p>
            <p className="text-[13px] text-cherry-dark opacity-65 leading-relaxed flex-1">{p.description}</p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-xs font-semibold text-cherry-dark opacity-60">{p.templates.length} plantillas · {p.templates.reduce((n, t) => n + t.slides.length, 0)} stories</span>
              <Button size="sm" onClick={() => onOpen(p.id)} icon={<Pencil size={13} />}>Usar pack</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────── PACK → PLANTILLAS ────────────────────────── */

function PackView({
  pack, brand, hasBrand, toast, onBack,
}: {
  pack: CatalogPack
  brand: BrandFullContextInput | null
  hasBrand: boolean
  toast: ReturnType<typeof useToast>
  onBack: () => void
}) {
  const [templateSlug, setTemplateSlug] = useState<string | null>(null)
  const template = pack.templates.find(t => t.slug === templateSlug) ?? null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <button type="button" onClick={onBack} className="text-[13px] font-bold text-cherry inline-flex items-center gap-1.5" style={{ background: 'none', border: 'none', padding: 0 }}>
        <ArrowLeft size={15} aria-hidden="true" /> Todos los packs
      </button>
      <div>
        <h1 className="text-[26px] sm:text-[32px] font-extrabold text-cherry-dark leading-tight" style={{ letterSpacing: '-0.8px' }}>{pack.title}</h1>
        <p className="text-sm text-cherry-dark opacity-70 mt-1.5 leading-relaxed max-w-2xl">{pack.description}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pack.templates.map(t => (
          <Card key={t.id} className="overflow-hidden">
            <div className="relative flex justify-center overflow-hidden" style={{ background: 'var(--color-warm-gray)', padding: '16px 0' }}>
              <div className="rounded-[22px] overflow-hidden" style={{ boxShadow: '0 12px 28px rgba(42,11,18,0.16)' }}>
                <MiniCover slide={t.slides[0]} />
              </div>
              {t.isLocked && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(42,11,18,0.45)' }}>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'white', color: 'var(--color-cherry-dark)' }}>
                    <Lock size={12} aria-hidden="true" /> Próximamente
                  </span>
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge tone="buttermilk">{t.category}</Badge>
                <span className="text-[11px] font-semibold text-cherry-dark opacity-50">{t.slides.length} stories</span>
              </div>
              <p className="text-[15px] font-bold text-cherry-dark leading-snug">{t.title}</p>
              <p className="text-xs text-cherry-dark opacity-65 leading-relaxed">{t.recommendedUse || t.description}</p>
              <Button size="sm" fullWidth disabled={t.isLocked} onClick={() => setTemplateSlug(t.slug)}>
                {t.isLocked ? 'Disponible próximamente' : 'Diseñar secuencias'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {template && !template.isLocked && (
        <TemplateEditorModal
          template={template}
          packTitle={pack.title}
          brand={brand}
          hasBrand={hasBrand}
          toast={toast}
          onClose={() => setTemplateSlug(null)}
        />
      )}
    </div>
  )
}

/* ────────────────────────── MINI PORTADA (slide 1) ────────────────────────── */

function MiniCover({ slide }: { slide?: CatalogTemplate['slides'][number] }) {
  if (!slide) return null
  const scale = 190 / CANVAS_W
  return (
    <div style={{ width: 190, height: CANVAS_H * scale, flexShrink: 0 }}>
      <SlideCanvas slide={slide} scale={scale} />
    </div>
  )
}

/* ────────────────────────── EDITOR ────────────────────────── */

interface EditState {
  /** Contenido por elemento id: texto o dataURL de foto. */
  contents: Record<string, string>
}

function TemplateEditorModal({
  template, packTitle, brand, hasBrand, toast, onClose,
}: {
  template: CatalogTemplate
  packTitle: string
  brand: BrandFullContextInput | null
  hasBrand: boolean
  toast: ReturnType<typeof useToast>
  onClose: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [edits, setEdits] = useState<Record<string, EditState['contents']>>(() =>
    Object.fromEntries(template.slides.map(s => [String(s.order), {}]))
  )
  const [selected, setSelected] = useState<StoryDesignElement | null>(null)
  const [draft, setDraft] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const exportRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const slide = template.slides[idx]
  const contents = edits[String(slide.order)] ?? {}
  const scale = 320 / CANVAS_W

  function setElement(el: StoryDesignElement, content: string) {
    setEdits(prev => ({ ...prev, [String(slide.order)]: { ...prev[String(slide.order)], [el.id]: content } }))
  }

  function openElement(el: StoryDesignElement) {
    setSelected(el)
    setDraft((edits[String(slide.order)]?.[el.id]) ?? el.content ?? '')
  }

  async function runAI(el: StoryDesignElement) {
    const kind = kindOf(el, idx, template.slides.length)
    setAiBusy(true)
    const out = await rewriteWithAI({
      text: draft || el.content || '',
      maxLength: el.maxLength ?? 200,
      kind,
      brand,
    })
    setAiBusy(false)
    if (out) {
      setDraft(out)
      toast.show('He reescrito el texto para tu salón — revísalo y ajusta lo que quieras.', 'success')
    } else {
      toast.show('La IA no está disponible ahora. Ajusta el texto a mano — el esbozo ya sirve tal cual.', 'info')
    }
  }

  function saveEdit() {
    if (selected) {
      setElement(selected, draft.trim().slice(0, selected.maxLength ?? 400))
      setSelected(null)
    }
  }

  async function exportSlide(order: number) {
    const node = exportRefs.current[String(order)]
    if (!node) return
    return toPng(node, { pixelRatio: EXPORT_RATIO, skipFonts: false })
  }

  function download(png: string, name: string) {
    const a = document.createElement('a')
    a.href = png
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function exportOne() {
    setExportBusy(true)
    try {
      const png = await exportSlide(slide.order)
      if (png) download(png, `brave-${template.slug}-${slide.order}.png`)
      toast.show('Historia exportada a PNG (1080×1920). Súbelas por orden a Instagram.', 'success')
    } catch {
      toast.show('No se pudo exportar la historia. Prueba de nuevo.', 'info')
    }
    setExportBusy(false)
  }

  async function exportAll() {
    setExportBusy(true)
    try {
      for (const s of template.slides) {
        const png = await exportSlide(s.order)
        if (png) download(png, `brave-${template.slug}-${s.order}.png`)
        await new Promise(r => setTimeout(r, 350))
      }
      toast.show(`Secuencia completa (${template.slides.length} historias) descargada. Súbelas por orden.`, 'success')
    } catch {
      toast.show('No se pudo terminar la exportación. Prueba de nuevo.', 'info')
    }
    setExportBusy(false)
  }

  const isPhoto = selected?.type === 'image'
  const isText = selected && (selected.role === 'editable' || selected.role === 'ai') && selected.type === 'text'

  async function onPhotoPick(el: StoryDesignElement, file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setElement(el, String(reader.result))
      setSelected(null)
      toast.show('Foto puesta. Puedes cambiarla cuando quieras tocándola de nuevo.', 'success')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(42,11,18,0.55)' }}>
      <div className="flex-1 overflow-y-auto">
        <div className="bg-cream min-h-full">
          <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
            {/* Barra superior */}
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="text-[13px] font-bold text-cherry inline-flex items-center gap-1.5" style={{ background: 'none', border: 'none', padding: 0 }}>
                <ArrowLeft size={15} aria-hidden="true" /> {packTitle}
              </button>
              <span className="ml-auto text-xs font-semibold text-cherry-dark opacity-50">
                Story {idx + 1} de {template.slides.length} · 1080×1920
              </span>
            </div>

            {/* Slide actual */}
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-[28px] overflow-hidden" style={{ boxShadow: '0 30px 70px rgba(46,8,18,0.35)' }}>
                <SlideCanvas
                  key={`${template.slug}-${slide.order}`}
                  slide={slide}
                  scale={scale}
                  contents={contents}
                  interactive
                  selectedId={selected?.id}
                  onElementClick={openElement}
                />
              </div>

              {/* Navegación de slides */}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="px-3 py-2 rounded-full disabled:opacity-30" style={{ background: 'var(--color-buttermilk)' }} aria-label="Anterior">
                  <ChevronLeft size={16} className="text-cherry-dark" />
                </button>
                <span className="text-xs font-bold text-cherry-dark">Historia {idx + 1}</span>
                <button type="button" onClick={() => setIdx(i => Math.min(template.slides.length - 1, i + 1))} disabled={idx === template.slides.length - 1} className="px-3 py-2 rounded-full disabled:opacity-30" style={{ background: 'var(--color-buttermilk)' }} aria-label="Siguiente">
                  <ChevronRight size={16} className="text-cherry-dark" />
                </button>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                <Button variant="primary" onClick={() => exportOne()} loading={exportBusy} icon={<Download size={14} />}>
                  Descargar esta historia
                </Button>
                {template.slides.length > 1 && (
                  <Button variant="secondary" onClick={() => exportAll()} loading={exportBusy} icon={<Download size={14} />}>
                    Descargar las {template.slides.length}
                  </Button>
                )}
                <Button variant="ghost" onClick={onClose}>Terminar</Button>
              </div>
              <p className="text-[11px] text-cherry-dark opacity-55 text-center max-w-sm leading-relaxed">
                Toca los textos marcados para cambiarlos — los de IA se reescriben con tu salón. Los cambios viven en esta sesión: descarga antes de salir.
              </p>
            </div>

            {/* Panel de edición (elemento seleccionado) */}
            {selected && (
              <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4 pointer-events-none">
                <div className="max-w-xl mx-auto rounded-[var(--radius-md)] p-4 pointer-events-auto" style={{ background: 'white', boxShadow: '0 -10px 40px rgba(42,11,18,0.25)' }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[13px] font-bold text-cherry-dark flex items-center gap-2">
                      {isPhoto ? <ImageIcon size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
                      {isPhoto ? 'Foto del hueco' : selected.role === 'ai' ? 'Texto que BRÄVE adapta con IA' : 'Texto editable'}
                    </p>
                    <button type="button" onClick={() => setSelected(null)} aria-label="Cerrar" style={{ background: 'transparent', border: 'none' }}>
                      <X size={16} className="text-cherry-dark opacity-60" />
                    </button>
                  </div>

                  {isPhoto ? (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onPhotoPick(selected as StoryDesignElement, e.target.files?.[0] ?? null)}
                      />
                      <span className="inline-flex items-center gap-2 text-[13px] font-bold cursor-pointer" style={{ color: 'var(--color-cherry)' }}>
                        <ImageIcon size={16} aria-hidden="true" /> Elegir foto de mi teléfono o carpetas
                      </span>
                    </label>
                  ) : (
                    <>
                      <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value.slice(0, selected.maxLength ?? 400))}
                        rows={3}
                        maxLength={selected.maxLength ?? 400}
                        className="w-full text-[14px] p-3 rounded-[var(--radius-sm)] resize-none focus:outline-none"
                        style={{ background: 'var(--color-cream)', border: '1.5px solid rgba(122,24,50,0.15)', color: 'var(--color-ink)', fontFamily: 'inherit' }}
                        autoFocus
                      />
                      <div className="flex items-center justify-between gap-2 mt-2.5">
                        <span className="text-[11px] font-semibold text-cherry-dark opacity-50">
                          {draft.length}/{selected.maxLength ?? 400}
                        </span>
                        <div className="flex items-center gap-2">
                          {selected.role === 'ai' && (
                            <Button size="sm" variant="secondary" onClick={() => runAI(selected)} loading={aiBusy} icon={<Wand2 size={13} />}>
                              Reescribir con mi marca
                            </Button>
                          )}
                          <Button size="sm" onClick={saveEdit} icon={<Check size={13} />}>Guardar</Button>
                        </div>
                      </div>
                      {!hasBrand && selected.role === 'ai' && (
                        <p className="mt-2 text-[11px] text-cherry-dark opacity-55 leading-snug">
                          Complete tu marca en <strong>Mi Marca</strong> para que la IA escriba con tu tono y servicios. El esbozo actual ya es utilizable.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slides ocultos para exportall — mismo tamaño de frame (320) que el visible */}
      <div style={{ position: 'fixed', left: -99999, top: 0 }} aria-hidden="true">
        {template.slides.map(s => (
          <SlideCanvas
            key={`export-${s.order}`}
            slide={s}
            scale={scale}
            contents={edits[String(s.order)] ?? {}}
            frameRef={node => { exportRefs.current[String(s.order)] = node }}
          />
        ))}
      </div>

    </div>
  )
}