'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

/**
 * Editor de zonas (calibración para la clienta) — subsistema del spike
 * canva-test. El admin dibuja cajas sobre el preview de cada página y las
 * asigna a campos del dataset; queda guardado en el binding como `zone`:
 *   zone: { page: 1-based, x, y, w, h } — x/y/w/h en % de la página.
 * Cada cambio = PATCH COMPLETO de bindings (la columna se reemplaza entera).
 * La UI clienta que consume estas zonas la hace otro agente.
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

export default function ZonesEditor({ row, onClose, onBindingsSaved }: ZonesEditorProps) {
  const previewUrls = (row.preview_urls ?? []).filter(Boolean)
  const dataset: Record<string, string> = row.dataset ?? {}
  const fields = Object.entries(dataset)
    .filter(([, type]) => type === 'text' || type === 'image')
    .sort((a, b) => a[0].localeCompare(b[0], 'es', { numeric: true }))

  const pageCount = Math.max(1, row.page_count)
  const [pageIndex, setPageIndex] = useState(0)
  const [zoneBindings, setZoneBindings] = useState<ZoneBindingMap>({ ...(row.bindings ?? {}) })
  const [selectedField, setFieldSelected] = useState<string | null>(null)
  const [live, setLive] = useState<ZoneRect | null>(null)
  const [assigning, setAssigning] = useState<ZoneRect | null>(null)
  const [assignField, setAssignField] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const dragStart = useRef<{ px: number; py: number } | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current) }, [])

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

  async function assignZone() {
    if (!assigning || !assignField) return
    const type = dataset[assignField] ?? 'text'
    const current = zoneBindings[assignField]
    const next: ZoneBindingMap = {
      ...zoneBindings,
      [assignField]: {
        behavior: current?.behavior ?? defaultBehavior(assignField, type),
        ...(current?.label ? { label: current.label } : {}),
        ...(current?.purpose ? { purpose: current.purpose } : {}),
        ...(current?.maxLength ? { maxLength: current.maxLength } : {}),
        ...(current?.instructions ? { instructions: current.instructions } : {}),
        zone: { page: assigning.page, x: assigning.x, y: assigning.y, w: assigning.w, h: assigning.h },
      },
    }
    const ok = await persistBindings(next)
    if (ok) {
      setAssigning(null)
      setAssignField(null)
    }
  }

  async function changeField(nextField: string) {
    if (!selectedField || !selectedBinding) return
    const zoneRect = selectedBinding.zone
    if (!zoneRect) return
    const type = dataset[nextField] ?? 'text'
    const stripped = { ...selectedBinding }
    delete stripped.zone
    const target = zoneBindings[nextField]
    const next: ZoneBindingMap = {
      ...zoneBindings,
      [selectedField]: stripped,
      [nextField]: {
        behavior: behaviorForType(nextField, target?.behavior, type),
        ...(target?.label ? { label: target.label } : {}),
        ...(target?.purpose ? { purpose: target.purpose } : {}),
        ...(target?.maxLength ? { maxLength: target.maxLength } : {}),
        ...(target?.instructions ? { instructions: target.instructions } : {}),
        zone: zoneRect,
      },
    }
    const ok = await persistBindings(next)
    if (ok) setFieldSelected(nextField)
  }

  async function removeZone() {
    if (!selectedField || !selectedBinding) return
    const stripped = { ...selectedBinding }
    delete stripped.zone
    const ok = await persistBindings({ ...zoneBindings, [selectedField]: stripped })
    if (ok) setFieldSelected(null)
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

      {/* Zona existente → barrita de opciones */}
      {selectedField && selectedBinding && (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] p-3" style={{ background: 'rgba(59, 16, 26, 0.04)' }}>
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
      )}
    </div>
  )
}