'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Upload } from 'lucide-react'
import { isTemplateAssetPath } from '@/lib/integrations/canva/sanitize'

/**
 * Editor de zonas (calibración para la clienta) — subsistema del spike
 * canva-test. El admin dibuja cajas sobre el preview de cada página y las
 * asigna a campos del dataset; queda guardado en el binding como `zone`:
 *   zone: { page: 1-based, x, y, w, h } — x/y/w/h en % de la página.
 *
 * Además calibra el RESTO de lo que consume el editor de la clienta:
 *   zoneStyle     (texto real estilizado sobre el PNG: color, tamaño cqw,
 *                  peso, alineación, fondo, interlineado),
 *   defaultText   (texto original del diseño, prefill),
 *   defaultPhotoPath (PNG default de los campos foto, subida manual),
 *   source.bg_paths (PNG "bare" por página, subida manual → /api/canva/upload-asset).
 *
 * Cambios de bindings = PATCH COMPLETO de la columna (se reemplaza entera) —
 * los toques de estilo usan debounce. La UI clienta que consume esto existe en
 * /(app)/disenos/[id].
 */

export type ZoneBehavior = 'user_text' | 'ai_text' | 'brand_text' | 'user_image' | 'keep_default'

export interface ZoneRect {
  page: number // 1-based
  x: number
  y: number
  w: number
  h: number
}

export interface ZoneBinding {
  behavior: ZoneBehavior
  label?: string
  purpose?: string
  maxLength?: number
  instructions?: string
  zone?: ZoneRect
  zoneStyle?: Record<string, unknown>
  defaultText?: string
  defaultPhotoPath?: string
}

export type ZoneBindingMap = Record<string, ZoneBinding>

export interface SavedTemplateRow {
  id: string
  name: string
  category: string | null
  kind: 'story' | 'carousel'
  page_count: number
  status: 'draft' | 'published' | 'archived'
  provider_design_id: string
  dataset?: Record<string, string> | null
  bindings?: ZoneBindingMap | null
  preview_url?: string | null
  preview_urls?: string[] | null
  /** URLs firmadas (24h) por campo, de las fotos default (defaultPhotoPath). */
  photo_urls?: Record<string, string> | null
  /** source JSONB: bg_paths (posicional, '' = hueco) + aspect. */
  source?: { bg_paths?: unknown; aspect?: unknown } | null
  updated_at: string
}

interface ZonesEditorProps {
  row: SavedTemplateRow
  onClose: () => void
  /** Tras el PATCH exitoso, la lista padre refresca su copia de bindings. */
  onBindingsSaved: (id: string, bindings: ZoneBindingMap) => void
}

/** Borde por tipo de campo (texto = cereza, imagen = azul del Badge blue). */
const TEXT_COLOR: string = 'rgba(89,20,39,0.55)'
const IMAGE_COLOR: string = 'rgba(43,92,140,0.55)'

const SELECT_STYLE = {
  borderColor: 'rgba(59,16,26,0.25)',
  background: 'white',
  color: 'var(--color-cherry-dark)',
} as const

const INPUT_STYLE = {
  ...SELECT_STYLE,
} as const

// <input type="color"> exige un #rrggbb — fallback con el VALOR del token
// --color-cherry (no es un color nuevo, es el valor del propio design system).
const COLOR_PICKER_FALLBACK = '#7A1832'

/** Hex #rrggbb renderizable por <input type="color">; expande #rgb; sino null. */
function hexPicker(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v
  const m = v.match(/^#([0-9a-fA-F]{3})$/)
  if (m) return `#${m[1].split('').map(c => c + c).join('')}`
  return null
}

/** Número decimal positivo de un string ('3.7' → 3.7); null si no. */
function positiveNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n > 0 ? n : null
}

export default function ZonesEditor({ row, onClose, onBindingsSaved }: ZonesEditorProps) {
  const previewUrls = (row.preview_urls ?? []).filter(Boolean)
  const dataset: Record<string, string> = row.dataset ?? {}
  const fields = Object.entries(dataset)
    .filter(([, type]) => type === 'text' || type === 'image')
    .sort((a, b) => a[0].localeCompare(b[0], 'es', { numeric: true }))

  const pageCount = Math.max(1, row.page_count)
  /** source.bg_paths posicional (índice i = página i+1, '' = sin fondo). */
  function bgPathsOf(): string[] {
    const raw = row.source?.bg_paths
    const out = Array.isArray(raw)
      ? raw.map(p => (typeof p === 'string' && (p === '' || isTemplateAssetPath(p)) ? p : ''))
      : []
    while (out.length < pageCount) out.push('')
    return out.slice(0, pageCount)
  }
  const [pageIndex, setPageIndex] = useState(0)
  const [zoneBindings, setZoneBindings] = useState<ZoneBindingMap>({ ...(row.bindings ?? {}) })
  const [bgPaths, setBgPaths] = useState<string[]>(bgPathsOf())
  const [selectedField, setFieldSelected] = useState<string | null>(null)
  const [live, setLive] = useState<ZoneRect | null>(null)
  const [assigning, setAssigning] = useState<ZoneRect | null>(null)
  const [assignField, setAssignField] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [assetBusy, setAssetBusy] = useState<string | null>(null) // 'bg' | field de foto

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const dragStart = useRef<{ px: number; py: number } | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Último mapa de bindings válido (los saves con debounce leen de aquí).
  const zoneBindingsRef = useRef<ZoneBindingMap>({ ...(row.bindings ?? {}) })

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current) }, [])

  // Al cerrar el editor con guardado a medias (debounce), se flushea el último
  // mapa — el fetch sobrevive al desmonte, sin setState del componente.
  useEffect(() => () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      const next = zoneBindingsRef.current
      void fetch('/api/canva/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, bindings: next }),
      })
    }
  }, [row.id])

  const pageNo = pageIndex + 1
  const pageUrl = previewUrls[pageIndex] ?? null
  const pageZones = Object.entries(zoneBindings).filter(([, b]) => b.zone?.page === pageNo)

  function resetTransient() {
    setFieldSelected(null)
    setAssigning(null)
    setAssignField(null)
    setLive(null)
  }

  function changePage(index: number) {
    setPageIndex(index)
    resetTransient()
  }

  async function flashSaved() {
    setSavedFlash(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1600)
  }

  async function persistBindings(next: ZoneBindingMap): Promise<boolean> {
    setSaving(true)
    setNote(null)
    // Guardado en marcha ⇒ el guardado pendiente con debounce ya no existe.
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    try {
      const res = await fetch('/api/canva/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, bindings: next }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        setNote(j?.error ?? 'No se pudieron guardar las zonas')
        return false
      }
      setZoneBindings(next)
      onBindingsSaved(row.id, next)
      await flashSaved()
      return true
    } finally {
      setSaving(false)
    }
  }

  /** bg_paths (source) → PATCH con merge de source server-side. */
  async function persistBg(next: string[]): Promise<boolean> {
    setSaving(true)
    setNote(null)
    try {
      const res = await fetch('/api/canva/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, bg_paths: next }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        setNote(j?.error ?? 'No se pudieron guardar los fondos')
        return false
      }
      setBgPaths(next)
      await flashSaved()
      return true
    } finally {
      setSaving(false)
    }
  }

  /**
   * Toque de UN binding conservando TODO lo demás (label/purpose/zoneStyle/
   * defaultText/photoPath...). Sin `immediate` → PATCH con debounce.
   */
  function editZoneBinding(field: string, mutate: (b: ZoneBinding) => ZoneBinding, immediate = false): void {
    const current = zoneBindingsRef.current[field]
      ?? { behavior: defaultBehavior(field, dataset[field] ?? 'text') }
    const next: ZoneBindingMap = { ...zoneBindingsRef.current, [field]: mutate(current) }
    commitBindings(next, immediate)
  }

  function commitBindings(next: ZoneBindingMap, immediate: boolean): void {
    zoneBindingsRef.current = next
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    if (immediate) {
      void persistBindings(next)
    } else {
      // Debounce: los inputs de estilo disparan por tecla; se agrupan.
      saveTimer.current = setTimeout(() => { void persistBindings(zoneBindingsRef.current) }, 700)
    }
  }

  /** Edita el zoneStyle del binding seleccionado (patch parcial o null = quitar). */
  function editZoneStyle(patch: Record<string, unknown> | null, immediate = false): void {
    if (!selectedField) return
    editZoneBinding(selectedField, b => {
      if (patch === null) {
        const copy = { ...b }
        delete copy.zoneStyle
        return copy
      }
      const style: Record<string, unknown> = { ...(b.zoneStyle ?? {}), ...patch }
      for (const [k, v] of Object.entries(style)) {
        if (v === undefined) delete style[k]
      }
      return Object.keys(style).length > 0 ? { ...b, zoneStyle: style } : b
    }, immediate)
  }

  // ── Dibujo (px → %) ──────────────────────────────────────────────────────────

  function pointerPct(e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } | null {
    const box = canvasRef.current?.getBoundingClientRect()
    if (!box || box.width === 0 || box.height === 0) return null
    const clamp = (v: number) => Math.max(0, Math.min(100, v))
    return {
      x: clamp(((e.clientX - box.left) / box.width) * 100),
      y: clamp(((e.clientY - box.top) / box.height) * 100),
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const p = pointerPct(e)
    if (!p) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { px: p.x, py: p.y }
    setLive({ page: pageNo, x: p.x, y: p.y, w: 0, h: 0 })
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = dragStart.current
    const p = pointerPct(e)
    if (!start || !p) return
    setLive({
      page: pageNo,
      x: Math.min(start.px, p.x),
      y: Math.min(start.py, p.y),
      w: Math.abs(p.x - start.px),
      h: Math.abs(p.y - start.py),
    })
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const start = dragStart.current
    const p = pointerPct(e)
    dragStart.current = null
    setLive(null)
    if (!start || !p) return
    const w = Math.abs(p.x - start.px)
    const h = Math.abs(p.y - start.py)
    if (w < 2 || h < 2) {
      // Tap: seleccionar la zona bajo el punto (si dibujo pendiente, se cancela).
      setAssigning(null)
      setAssignField(null)
      const hit = Object.entries(zoneBindings)
        .reverse()
        .find(([, b]) => {
          const z = b.zone
          if (!z || z.page !== pageNo) return false
          return p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h
        })
      setFieldSelected(hit ? hit[0] : null)
      return
    }
    setFieldSelected(null)
    setAssigning({ page: pageNo, x: Math.min(start.px, p.x), y: Math.min(start.py, p.y), w, h })
  }

  // ── Asignar / cambiar / quitar ───────────────────────────────────────────────

  function defaultBehavior(field: string, type: string): ZoneBehavior {
    if (type === 'image') return 'user_image'
    if (/brand/.test(field)) return 'brand_text'
    return type === 'text' ? 'user_text' : 'keep_default'
  }

  function behaviorForType(field: string, behavior: ZoneBehavior | undefined, type: string): ZoneBehavior {
    const valid: ZoneBehavior[] = type === 'image'
      ? ['user_image', 'keep_default']
      : type === 'text'
        ? ['user_text', 'ai_text', 'brand_text', 'keep_default']
        : ['keep_default']
    return behavior && valid.includes(behavior) ? behavior : defaultBehavior(field, type)
  }

  const availableFields = fields.filter(([field]) => !zoneBindings[field]?.zone)
  const selectedBinding = selectedField ? zoneBindings[selectedField] : undefined
  const selectedType = selectedField ? dataset[selectedField] ?? 'text' : 'text'
  const reassignFields = fields
    .filter(([field, type]) => field !== selectedField && type === selectedType && !zoneBindings[field]?.zone)
  // Valores derivados del zoneStyle para los inputs del panel.
  const selectedStyle = (selectedBinding?.zoneStyle ?? {}) as Record<string, unknown>
  const selectedColorHex = hexPicker(selectedStyle.color) ?? COLOR_PICKER_FALLBACK
  const selectedFontSize = typeof selectedStyle.fontSize === 'string'
    ? selectedStyle.fontSize.replace(/cqw$/, '')
    : ''
  const hasStyleBg = typeof selectedStyle.bg === 'string' && selectedStyle.bg.trim() !== ''
  const bgHexValue = hexPicker(selectedStyle.bg) ?? selectedColorHex

  async function assignZone() {
    if (!assigning || !assignField) return
    const type = dataset[assignField] ?? 'text'
    const current = zoneBindingsRef.current[assignField]
    const next: ZoneBindingMap = {
      ...zoneBindingsRef.current,
      [assignField]: {
        // Spread entero (no copy-lista): conserva también zoneStyle/defaultText/photoPath.
        ...(current ?? { behavior: defaultBehavior(assignField, type) }),
        behavior: current?.behavior ?? defaultBehavior(assignField, type),
        zone: { page: assigning.page, x: assigning.x, y: assigning.y, w: assigning.w, h: assigning.h },
      },
    }
    const ok = await persistBindings(next)
    if (ok) {
      zoneBindingsRef.current = next
      setAssigning(null)
      setAssignField(null)
    }
  }

  async function changeField(nextField: string) {
    if (!selectedField || !selectedBinding) return
    const zoneRect = selectedBinding.zone
    if (!zoneRect) return
    const type = dataset[nextField] ?? 'text'
    // El campo viejo conserva label/purpose/estilo/texto — solo pierde la zona.
    const stripped = { ...zoneBindingsRef.current[selectedField] ?? selectedBinding }
    delete stripped.zone
    const target = zoneBindingsRef.current[nextField]
    const next: ZoneBindingMap = {
      ...zoneBindingsRef.current,
      [selectedField]: stripped,
      [nextField]: {
        ...(target ?? {}),
        behavior: behaviorForType(nextField, target?.behavior, type),
        zone: zoneRect,
      },
    }
    const ok = await persistBindings(next)
    if (ok) {
      zoneBindingsRef.current = next
      setFieldSelected(nextField)
    }
  }

  async function removeZone() {
    if (!selectedField || !zoneBindingsRef.current[selectedField]) return
    const stripped = { ...zoneBindingsRef.current[selectedField] }
    delete stripped.zone
    const next = { ...zoneBindingsRef.current, [selectedField]: stripped }
    const ok = await persistBindings(next)
    if (ok) {
      zoneBindingsRef.current = next
      setFieldSelected(null)
    }
  }

  // ── Assets de plantilla (subida manual, vía V1) ─────────────────────────────

  /** POST multipart → /api/canva/upload-asset → path en design-exports. */
  async function uploadAsset(kind: 'bg' | 'photo', page: number, file: File): Promise<string | null> {
    setNote(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('designId', row.provider_design_id)
      form.append('kind', kind)
      form.append('page', String(page))
      const res = await fetch('/api/canva/upload-asset', { method: 'POST', body: form })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; path?: string; error?: string } | null
      if (!res.ok || !json?.ok || typeof json.path !== 'string') {
        setNote(json?.error ?? 'No se pudo subir el archivo')
        return null
      }
      return json.path
    } catch {
      setNote('No se pudo subir el archivo')
      return null
    }
  }

  /** Foto default del campo seleccionado → binding.defaultPhotoPath. */
  async function uploadDefaultPhoto(field: string, file: File) {
    const page = zoneBindings[field]?.zone?.page ?? pageNo
    setAssetBusy(field)
    try {
      const path = await uploadAsset('photo', page, file)
      if (!path) return
      const next: ZoneBindingMap = {
        ...zoneBindingsRef.current,
        [field]: { ...(zoneBindingsRef.current[field] ?? { behavior: defaultBehavior(field, dataset[field] ?? 'text') }), defaultPhotoPath: path },
      }
      zoneBindingsRef.current = next
      await persistBindings(next)
    } finally {
      setAssetBusy(null)
    }
  }

  async function removeDefaultPhoto(field: string) {
    const current = zoneBindingsRef.current[field]
    if (!current) return
    const next: ZoneBindingMap = { ...zoneBindingsRef.current, [field]: { ...current } }
    delete next[field].defaultPhotoPath
    zoneBindingsRef.current = next
    await persistBindings(next)
  }

  /** Fondo "bare" de la página actual → source.bg_paths (array posicional). */
  async function uploadBg(file: File) {
    setAssetBusy('bg')
    try {
      const path = await uploadAsset('bg', pageNo, file)
      if (!path) return
      const next = [...bgPaths]
      while (next.length < pageCount) next.push('')
      next[pageIndex] = path
      await persistBg(next)
    } finally {
      setAssetBusy(null)
    }
  }

  async function removeBg() {
    const next = [...bgPaths]
    while (next.length < pageCount) next.push('')
    next[pageIndex] = ''
    await persistBg(next)
  }

  const zonesCount = Object.values(zoneBindings).filter(b => b.zone).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-bold">{row.name}</p>
          {savedFlash && <Badge tone="green">Guardado ✓</Badge>}
          {saving && <Badge tone="buttermilk">Guardando…</Badge>}
        </div>
        <Button size="sm" variant="secondary" onClick={onClose}>Cerrar</Button>
      </div>
      <p className="text-xs" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>
        Dibuja una caja sobre el preview y asígnala a un campo; toca una caja existente para cambiarla o quitarla.
        {zonesCount > 0 && <strong>{` ${zonesCount} ${zonesCount === 1 ? 'zona' : 'zonas'} asignada${zonesCount === 1 ? '' : 's'}`}</strong>}
      </p>

      {/* Selector de página */}
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>Página:</span>
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => changePage(i)}
              className="rounded-[var(--radius-sm)] border px-2 py-1 text-xs font-bold"
              style={{
                borderColor: i === pageIndex ? 'var(--color-cherry)' : 'rgba(59,16,26,0.25)',
                background: i === pageIndex ? 'var(--color-cherry)' : 'white',
                color: i === pageIndex ? 'white' : 'var(--color-cherry-dark)',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Fondo "bare" de la página actual (subida manual sin texto) */}
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2" style={{ background: 'rgba(59, 16, 26, 0.04)' }}>
        <code className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-cherry-dark)' }}>bg p{pageNo}</code>
        <span className="text-xs" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>
          Fondo sin texto:{' '}
          <strong>{bgPaths[pageIndex] ? 'subido ✓' : 'faltante'}</strong>
          {bgPaths[pageIndex] && <span>{` (${bgPaths[pageIndex].split('/').pop() ?? ''})`}</span>}
        </span>
        <label
          className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-semibold"
          style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
        >
          <Upload size={12} />
          <span>Subir fondo sin texto</span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) uploadBg(file) }}
          />
        </label>
        {bgPaths[pageIndex] && (
          <Button size="sm" variant="ghost" disabled={assetBusy === 'bg'} onClick={removeBg}>Quitar fondo</Button>
        )}
        {assetBusy === 'bg' && <Badge tone="buttermilk">Subiendo…</Badge>}
      </div>

      {/* Canvas: preview de la página + overlays de zonas */}
      <div
        ref={canvasRef}
        className="relative select-none overflow-hidden rounded-[var(--radius-sm)]"
        style={{ touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {pageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pageUrl} alt={`Página ${pageNo}`} className="block w-full" draggable={false} />
        ) : (
          <div
            className="flex w-full items-center justify-center p-6 text-center text-xs"
            style={{
              border: '1px dashed rgba(59,16,26,0.25)',
              color: 'var(--color-cherry-dark)',
              opacity: 0.7,
              minHeight: 160,
            }}
          >
            Preview de la página {pageNo} no disponible — re-guarda la plantilla (Guardar plantilla la vuelve a exportar).
          </div>
        )}

        {live && (
          <div
            className="pointer-events-none absolute"
            style={{ left: `${live.x}%`, top: `${live.y}%`, width: `${live.w}%`, height: `${live.h}%`, border: `2px dashed ${TEXT_COLOR}` }}
          />
        )}

        {/* Rect pendiente de asignar (visible mientras el panel está abierto) */}
        {assigning && assigning.page === pageNo && (
          <div
            className="pointer-events-none absolute"
            style={{
              left: `${assigning.x}%`,
              top: `${assigning.y}%`,
              width: `${assigning.w}%`,
              height: `${assigning.h}%`,
              border: `2px dashed ${TEXT_COLOR}`,
              background: 'rgba(89,20,39,0.06)',
            }}
          />
        )}

        {pageZones.map(([field, b]) => {
          const z = b.zone as ZoneRect
          const isImage = (dataset[field] ?? 'text') === 'image'
          const color = isImage ? IMAGE_COLOR : TEXT_COLOR
          return (
            <div
              key={field}
              className="pointer-events-none absolute"
              style={{
                left: `${z.x}%`,
                top: `${z.y}%`,
                width: `${z.w}%`,
                height: `${z.h}%`,
                border: `2px solid ${color}`,
                boxShadow: field === selectedField ? `inset 0 0 0 2px ${color}` : undefined,
              }}
            >
              <span
                className="block max-w-full truncate"
                style={{
                  background: color,
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: '16px',
                  padding: '0 4px',
                }}
              >
                {field}
              </span>
            </div>
          )
        })}
      </div>

      {note && (
        <p className="text-xs" style={{ color: 'var(--color-cherry)' }}>{note}</p>
      )}

      {/* Zona nueva → panel de asignación */}
      {assigning && (
        <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'var(--color-buttermilk)' }}>
          <p className="mb-2 text-xs font-bold" style={{ color: 'var(--color-cherry-dark)' }}>
            Nueva zona en página {assigning.page} ({Math.round(assigning.w)}% × {Math.round(assigning.h)}%)
          </p>
          {availableFields.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-cherry-dark)' }}>
              Todos los campos de texto e imagen ya tienen zona — quita una zona para reutilizar su campo.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs"
                style={SELECT_STYLE}
                value={assignField ?? ''}
                onChange={e => setAssignField(e.target.value || null)}
              >
                <option value="" disabled>Elige el campo…</option>
                {availableFields.map(([field, type]) => (
                  <option key={field} value={field}>{field} — {type}</option>
                ))}
              </select>
              <Button size="sm" loading={saving} disabled={!assignField} onClick={assignZone}>Asignar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAssigning(null); setAssignField(null) }}>Cancelar</Button>
            </div>
          )}
        </div>
      )}

      {/* Zona existente → calibración completa para la clienta */}
      {selectedField && selectedBinding && (
        <div className="space-y-2 rounded-[var(--radius-sm)] p-3" style={{ background: 'rgba(59, 16, 26, 0.04)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-[120px] text-xs font-bold" style={{ color: 'var(--color-cherry-dark)' }}>{selectedField}</code>
            <Badge tone={selectedType === 'image' ? 'blue' : 'cherry'}>{selectedType}</Badge>
            <span className="text-xs" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>Cambiar campo:</span>
            {reassignFields.length === 0 ? (
              <span className="text-xs" style={{ color: 'var(--color-cherry-dark)', opacity: 0.5 }}>sin otros campos de {selectedType}</span>
            ) : (
              <select
                className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs"
                style={SELECT_STYLE}
                value=""
                onChange={e => { const v = e.target.value; if (v) changeField(v) }}
              >
                <option value="">—</option>
                {reassignFields.map(([field, type]) => (
                  <option key={field} value={field}>{field} — {type}</option>
                ))}
              </select>
            )}
            <Button size="sm" variant="secondary" loading={saving} onClick={removeZone}>Quitar zona</Button>
          </div>

          {/* ── Campo TEXT: estilo de la zona + texto original ── */}
          {selectedType === 'text' && (
            <div className="space-y-2 rounded-[var(--radius-sm)] p-3" style={{ background: 'var(--color-buttermilk)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--color-cherry-dark)' }}>
                Estilo de la zona — así se ve el texto real en el editor de la clienta
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>Color</label>
                  <input
                    type="color"
                    className="h-8 w-10 cursor-pointer rounded-[var(--radius-sm)] border"
                    style={INPUT_STYLE}
                    value={selectedColorHex}
                    onChange={e => editZoneStyle({ color: e.target.value })}
                    disabled={saving}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>Tamaño (cqw)</label>
                  <span className="flex items-center gap-1">
                    <input
                      type="number" step={0.1} min={0}
                      className="w-16 rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs"
                      style={INPUT_STYLE}
                      value={selectedFontSize}
                      placeholder="p. ej. 3.7"
                      onChange={e => {
                        const n = positiveNumber(e.target.value)
                        editZoneStyle({ fontSize: n ? `${n}cqw` : undefined })
                      }}
                      disabled={saving}
                    />
                    <span className="text-xs" style={{ color: 'var(--color-cherry-dark)', opacity: 0.5 }}>cqw</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>Peso</label>
                  <select
                    className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs"
                    style={SELECT_STYLE}
                    value={typeof selectedStyle.fontWeight === 'string' && selectedStyle.fontWeight !== '' ? selectedStyle.fontWeight : ''}
                    onChange={e => editZoneStyle({ fontWeight: e.target.value || undefined })}
                    disabled={saving}
                  >
                    <option value="">—</option>
                    {['400', '600', '700', '800'].map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>Alineación</label>
                  <select
                    className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs"
                    style={SELECT_STYLE}
                    value={typeof selectedStyle.textAlign === 'string' && selectedStyle.textAlign !== '' ? selectedStyle.textAlign : ''}
                    onChange={e => editZoneStyle({ textAlign: e.target.value || undefined })}
                    disabled={saving}
                  >
                    <option value="">—</option>
                    <option value="start">start (izq)</option>
                    <option value="center">center</option>
                    <option value="end">end (der)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>Fondo del texto</label>
                  <select
                    className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs"
                    style={SELECT_STYLE}
                    value={hasStyleBg ? 'on' : ''}
                    onChange={e => editZoneStyle(
                      e.target.value === 'on' ? { bg: bgHexValue } : { bg: undefined },
                    )}
                    disabled={saving}
                  >
                    <option value="">Sin fondo</option>
                    <option value="on">Color…</option>
                  </select>
                </div>
                {hasStyleBg && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>Color de fondo</label>
                    <input
                      type="color"
                      className="h-8 w-10 cursor-pointer rounded-[var(--radius-sm)] border"
                      style={INPUT_STYLE}
                      value={bgHexValue}
                      onChange={e => editZoneStyle({ bg: e.target.value })}
                      disabled={saving}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>Interlineado</label>
                  <input
                    type="number" step={0.1} min={1} max={3}
                    className="w-16 rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs"
                    style={INPUT_STYLE}
                    value={typeof selectedStyle.lineHeight === 'number' ? String(selectedStyle.lineHeight) : ''}
                    placeholder="—"
                    onChange={e => {
                      const n = positiveNumber(e.target.value)
                      editZoneStyle({ lineHeight: n && n >= 1 && n <= 3 ? n : undefined })
                    }}
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>
                  Texto original del diseño (prefill)
                </label>
                <textarea
                  rows={2}
                  maxLength={300}
                  className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs"
                  style={INPUT_STYLE}
                  value={selectedBinding.defaultText ?? ''}
                  placeholder="El texto tal y como aparece en el diseño de Canva"
                  onChange={e => editZoneBinding(selectedField, b => {
                    const copy = { ...b }
                    if (e.target.value === '') delete copy.defaultText
                    else copy.defaultText = e.target.value
                    return copy
                  })}
                  disabled={saving}
                />
              </div>
              {typeof selectedBinding.zoneStyle === 'object' && selectedBinding.zoneStyle !== null && (
                <Button size="sm" variant="ghost" disabled={saving} onClick={() => editZoneStyle(null, true)}>
                  Quitar estilo
                </Button>
              )}
            </div>
          )}

          {/* ── Campo IMAGE: foto default (subida manual PNG, vía V1) ── */}
          {selectedType === 'image' && selectedBinding.behavior === 'user_image' && (
            <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] p-3" style={{ background: 'var(--color-buttermilk)' }}>
              <code className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-cherry-dark)' }}>foto default</code>
              <label
                className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-semibold"
                style={{ background: 'white', color: 'var(--color-cherry-dark)' }}
              >
                <Upload size={12} />
                <span>{selectedBinding.defaultPhotoPath ? 'Cambiar foto default' : 'Subir foto default'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) uploadDefaultPhoto(selectedField, file) }}
                />
              </label>
              {assetBusy === selectedField && <Badge tone="buttermilk">Subiendo…</Badge>}
              {selectedBinding.defaultPhotoPath && (
                <>
                  {row.photo_urls?.[selectedField] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.photo_urls[selectedField]} alt={selectedField} className="h-9 w-9 rounded object-cover" />
                  )}
                  <code className="max-w-[200px] truncate text-[10px]" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>
                    {selectedBinding.defaultPhotoPath}
                  </code>
                  <Button size="sm" variant="ghost" disabled={saving} onClick={() => removeDefaultPhoto(selectedField)}>
                    Quitar foto
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}