'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Lock, Search, Sparkles, Star, X } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

import SlideCanvas, { CANVAS_W, CANVAS_H } from './SlideCanvas'
import StoriesEditor from './StoriesEditor'
import { StoryPackSeedRow } from '@/lib/stories-diseno/samples'
import { StoryDesignSlide } from '@/lib/stories-diseno/types'
import { BrandFullContextInput } from '@/lib/ai/brand-context'

/**
 * GALERÍA DE STORIES DISEÑO (rework v2 — estilo Canva, no marketplace de packs).
 * Grid de previews visuales 9:16, buscador, chips de temática, badges
 * (nuevo/recomendado/IA), favoritos y modal de preview de la secuencia.
 * "Usar plantilla" monta el editor full-screen (StoriesEditor) — la usuaria
 * adapta textos/fotos allí y exporta. Favoritos: localStorage + DB
 * (GET/POST /api/stories-diseno/favorites, best-effort — degrada a local
 * hasta landear la migración de story_design_favorites).
 */

export type TextKind = 'gancho' | 'cuerpo' | 'cierre' | 'opcion'

export interface CatalogTemplate {
  id: string
  slug: string
  title: string
  category: string
  description: string
  recommendedUse: string
  isLocked: boolean
  /** Etiquetas editoriales: nuevo, recomendado, ia, venta, agenda… */
  tags?: string[]
  slides: StoryDesignSlide[]
}
export type CatalogPack = Omit<StoryPackSeedRow, 'templates'> & { id: string; templates: CatalogTemplate[] }

interface Props {
  packs: CatalogPack[]
  brand: BrandFullContextInput | null
  hasBrand: boolean
  /** Favoritos ya en DB (ids de plantilla); se mezclan con los de localStorage. */
  initialFavorites?: string[]
}

/* ── chips de temática → palabras clave (match sin acentos) ── */

const CHIPS: { key: string; label: string; words: string[] }[] = [
  { key: 'todos', label: 'Todos', words: [] },
  { key: 'vender', label: 'Para vender', words: ['vender', 'venta', 'servicio', 'promo', 'oferta'] },
  { key: 'agenda', label: 'Agenda', words: ['agenda', 'hueco', 'cita', 'reserva'] },
  { key: 'autoridad', label: 'Autoridad', words: ['autoridad', 'experto', 'criterio', 'posicionar'] },
  { key: 'resultados', label: 'Resultados', words: ['resultado', 'antes', 'despues', 'cambio', 'testigo', 'prueba'] },
  { key: 'tratamientos', label: 'Tratamientos', words: ['tratamiento', 'servicio', 'balayage', 'color', 'mechas'] },
  { key: 'antes', label: 'Antes y después', words: ['antes', 'despues', 'cambio', 'transformacion'] },
  { key: 'consejos', label: 'Consejos', words: ['consejo', 'tip', 'educacion', 'criterio'] },
  { key: 'promos', label: 'Promociones', words: ['promo', 'oferta', 'descuento'] },
  { key: 'interaccion', label: 'Interacción', words: ['interaccion', 'pregunta', 'encuesta', 'datos', 'conversacion'] },
]

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

interface Item { template: CatalogTemplate; packTitle: string; goal: string }

/** Metadatos (chips de temática): título, categoría, descripción, tags, pack. */
function metaHay(it: Item): string {
  return norm([
    it.template.title, it.template.category, it.template.description,
    it.template.recommendedUse, (it.template.tags ?? []).join(' '),
    it.goal, it.packTitle,
  ].join(' '))
}

/** Metadatos + contenido de los textos de la plantilla (buscador libre). */
function haystack(it: Item): string {
  const parts = [metaHay(it)]
  for (const s of it.template.slides) {
    for (const e of s.elements) {
      if (typeof e.content === 'string' && e.content) parts.push(e.content)
    }
  }
  return norm(parts.join(' '))
}

/** Badge score para orden (recomendado primero, luego nuevo/IA). */
function rankOf(it: Item): number {
  const tags = it.template.tags ?? []
  let r = 0
  if (tags.includes('recomendado')) r += 4
  if (tags.includes('nuevo')) r += 2
  if (tags.includes('ia')) r += 1
  return r
}

const FAV_KEY = 'brave_sd_favs'

function loadFavs(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(window.localStorage.getItem(FAV_KEY) || '{}') as Record<string, boolean> } catch { return {} }
}

export default function StoriesDisenoCatalog({ packs, brand, hasBrand, initialFavorites }: Props) {
  const [editing, setEditing] = useState<{ template: CatalogTemplate; packTitle: string } | null>(null)

  const items = useMemo<Item[]>(
    () => packs.flatMap(p => p.templates.map(t => ({ template: t, packTitle: p.title, goal: p.goal as string }))),
    [packs],
  )

  return (
    <div className="pb-10">
      <Gallery
        items={items}
        initialFavorites={initialFavorites}
        onUse={(template, packTitle) => setEditing({ template, packTitle })}
      />
      {editing && (
        <StoriesEditor
          template={editing.template}
          packTitle={editing.packTitle}
          brand={brand}
          hasBrand={hasBrand}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

/* ────────────────────────── GALERÍA ────────────────────────── */

function Gallery({ items, initialFavorites, onUse }: { items: Item[]; initialFavorites?: string[]; onUse: (t: CatalogTemplate, packTitle: string) => void }) {
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState('todos')
  const [preview, setPreview] = useState<Item | null>(null)
  const [favs, setFavs] = useState<Record<string, boolean>>(() => ({
    ...loadFavs(),
    ...Object.fromEntries((initialFavorites ?? []).map(id => [id, true])),
  }))

  function toggleFav(id: string) {
    setFavs(prev => {
      const next = { ...prev, [id]: !prev[id] }
      try { window.localStorage.setItem(FAV_KEY, JSON.stringify(next)) } catch { /* demo ok */ }
      return next
    })
    // Persistencia en DB best-effort: error/401 (demo, migración sin landear) = silencio.
    fetch('/api/stories-diseno/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: id }),
    }).catch(() => {})
  }

  const list = useMemo(() => {
    const q = norm(query.trim())
    return items
      .filter(it => {
        if (chip !== 'todos') {
          const words = CHIPS.find(c => c.key === chip)?.words ?? []
          const h = metaHay(it)
          if (!words.some(w => h.includes(w))) return false
        }
        if (q && !haystack(it).includes(q)) return false
        return true
      })
      .sort((a, b) => rankOf(b) - rankOf(a) || a.template.title.localeCompare(b.template.title))
  }, [items, query, chip])

  return (
    <div className="py-7">
      {/* Header */}
      <div className="text-center mb-5">
        <p className="text-[11px] font-extrabold tracking-[4px]" style={{ color: 'var(--color-cherry)', textTransform: 'uppercase' }}>
          Biblioteca de stories
        </p>
        <h1 className="text-[28px] sm:text-[34px] font-extrabold text-cherry-dark leading-tight mt-2" style={{ letterSpacing: '-0.8px' }}>
          Diseños listos para tu salón
        </h1>
        <p className="mt-2 text-sm text-cherry-dark opacity-70 max-w-lg mx-auto leading-relaxed">
          Elige un diseño, BRÄVE adapta los textos a tu salón y tú pones las fotos. Descarga la secuencia en PNG y súbelas a Instagram por orden.
        </p>
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cherry-dark opacity-40" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar diseños o temáticas…"
          className="w-full text-[14px] py-3 pl-10 pr-9 rounded-full focus:outline-none"
          style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.14)', color: 'var(--color-ink)' }}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={15} className="text-cherry-dark opacity-45" />
          </button>
        )}
      </div>

      {/* Chips de temática */}
      <div className="flex gap-2 overflow-x-auto pb-2.5 mb-4" style={{ scrollbarWidth: 'none' }}>
        {CHIPS.map(c => {
          const active = chip === c.key
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setChip(c.key)}
              className="flex-shrink-0 px-3.5 py-2 rounded-full text-[12px] font-bold cursor-pointer"
              style={active
                ? { background: 'var(--color-cherry)', color: 'white', border: '1px solid var(--color-cherry)' }
                : { background: 'white', color: 'var(--color-cherry-dark)', border: '1px solid rgba(122,24,50,0.18)' }}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Grid de diseños */}
      {list.length === 0 ? (
        <p className="text-center text-sm text-cherry-dark opacity-60 py-14">
          Nada con esa búsqueda — prueba otra palabra o el chip «Todos».
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {list.map(it => (
            <TemplateCard
              key={it.template.id}
              item={it}
              fav={!!favs[it.template.id]}
              onFav={() => toggleFav(it.template.id)}
              onPreview={() => setPreview(it)}
              onUse={() => onUse(it.template, it.packTitle)}
            />
          ))}
        </div>
      )}

      {/* Modal de preview de la secuencia */}
      {preview && (
        <PreviewModal
          item={preview}
          fav={!!favs[preview.template.id]}
          onFav={() => toggleFav(preview.template.id)}
          onClose={() => setPreview(null)}
          onUse={() => { setPreview(null); onUse(preview.template, preview.packTitle) }}
        />
      )}
    </div>
  )
}

/* ────────────────────────── CARD ────────────────────────── */

function TemplateCard({
  item, fav, onFav, onPreview, onUse,
}: { item: Item; fav: boolean; onFav: () => void; onPreview: () => void; onUse: () => void }) {
  const t = item.template
  const tags = t.tags ?? []
  // UN badge por card por prioridad (el resto en el modal de preview)
  const isRec = tags.includes('recomendado')
  const isNew = tags.includes('nuevo')
  const isAI = tags.includes('ia')
  const badge = isRec ? { tone: 'cherry' as const, label: 'Recomendado' }
    : isNew ? { tone: 'buttermilk' as const, label: 'Nuevo' }
    : isAI ? null
    : null

  return (
    <div
      className="group flex flex-col rounded-[18px] overflow-hidden"
      style={{ background: 'white', boxShadow: '0 6px 18px rgba(42,11,18,0.08)' }}
    >
      {/* Cover 9:16 */}
      <button
        type="button"
        onClick={onPreview}
        className="relative block p-0 border-none cursor-pointer"
        aria-label={`Previsualizar ${t.title}`}
      >
        <LiveCover slide={t.slides[0]} />
        {badge && null}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onFav() }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onFav() } }}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.9)' }}
          aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          aria-pressed={fav}
        >
          <Star size={13} style={fav ? { color: 'var(--color-cherry)', fill: 'var(--color-cherry)' } : { color: 'var(--color-cherry-dark)', opacity: 0.55 }} />
        </span>
        {t.isLocked && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(42,11,18,0.45)' }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'white', color: 'var(--color-cherry-dark)' }}>
              <Lock size={12} aria-hidden="true" /> Próximamente
            </span>
          </div>
        )}
      </button>

      {/* Info + acciones */}
      <div className="px-2.5 py-2.5 space-y-2 min-w-0">
        <p className="text-[13px] sm:text-[14px] font-bold text-cherry-dark leading-snug line-clamp-2">{t.title}</p>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span className="text-[10px] font-semibold text-cherry-dark opacity-55 truncate min-w-0">
            {t.slides.length} {t.slides.length === 1 ? 'story' : 'stories'} · {t.category}
          </span>
          {badge && <span className="hidden sm:block"><Badge tone={badge.tone}>{badge.label}</Badge></span>}
          <Button size="sm" disabled={t.isLocked} onClick={onUse}>Usar</Button>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────── COVER LIVE 9:16 ────────────────────────── */

/** Preview del slide 1 renderizado por SlideCanvas, ajustado a la celda. */
function LiveCover({ slide }: { slide?: StoryDesignSlide }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [w, setW] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const ro = new ResizeObserver(() => {
      const r = node.getBoundingClientRect()
      if (r.width > 0) setW(r.width)
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, position: 'relative', overflow: 'hidden', background: 'var(--color-warm-gray)' }}>
      {w > 0 && slide && <SlideCanvas slide={slide} scale={w / CANVAS_W} />}
      {!slide && (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-cherry-dark opacity-40">
          Sin vista previa
        </span>
      )}
    </div>
  )
}

/* ────────────────────────── MODAL DE PREVIEW ────────────────────────── */

function PreviewModal({
  item, fav, onFav, onClose, onUse,
}: { item: Item; fav: boolean; onFav: () => void; onClose: () => void; onUse: () => void }) {
  const t = item.template
  const tags = t.tags ?? []
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: 'rgba(42,11,18,0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto rounded-t-[26px] sm:rounded-[26px] p-4 sm:p-6 space-y-4"
        style={{ background: 'white', boxShadow: '0 30px 70px rgba(46,8,18,0.4)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="buttermilk">{t.category}</Badge>
              {tags.includes('recomendado') && <Badge tone="cherry">Recomendado</Badge>}
              {tags.includes('nuevo') && <Badge tone="buttermilk">Nuevo</Badge>}
              {tags.includes('ia') && <Badge tone="blue">Adaptable con IA</Badge>}
            </div>
            <h2 className="text-[20px] sm:text-[24px] font-extrabold text-cherry-dark leading-tight mt-1.5">{t.title}</h2>
            <p className="text-[12px] font-semibold text-cherry-dark opacity-55 mt-0.5">
              {t.slides.length} {t.slides.length === 1 ? 'historia' : 'historias'} · del pack {item.packTitle}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex-shrink-0" style={{ background: 'transparent', border: 'none' }}>
            <X size={18} className="text-cherry-dark opacity-60" />
          </button>
        </div>

        <p className="text-[13px] text-cherry-dark opacity-75 leading-relaxed">{t.recommendedUse || t.description}</p>

        {/* Secuencia entera en scroll horizontal */}
        <div className="flex gap-2.5 overflow-x-auto py-1" style={{ scrollbarWidth: 'none' }}>
          {t.slides.map(s => (
            <div key={s.id} className="flex-shrink-0 rounded-[14px] overflow-hidden" style={{ boxShadow: '0 8px 20px rgba(42,11,18,0.14)', width: 118 }}>
              <SlideCanvas slide={s} scale={118 / CANVAS_W} />
            </div>
          ))}
        </div>

        {!t.isLocked && (
          <div className="flex items-center gap-2 pt-1">
            <Button variant="primary" fullWidth onClick={onUse}>Usar plantilla</Button>
            <Button
              variant="secondary"
              onClick={onFav}
              icon={<Star size={14} style={fav ? { color: 'var(--color-cherry)', fill: 'var(--color-cherry)' } : undefined} />}
              aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            >
              {fav ? 'Favorito' : 'Guardar'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}