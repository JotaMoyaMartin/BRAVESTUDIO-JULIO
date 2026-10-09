'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Sparkles, Unlink, Upload } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import SectionTitle from '@/components/ui/SectionTitle'

/**
 * SPIKE CANVA — página de prueba end-to-end (solo admin, /admin/*).
 *
 * 1) Conectar Canva (OAuth en pestaña propia, vuelta al callback).
 * 2) Importar un diseño (Design ID / URL) → dataset de campos Autofill.
 * 3) Mapper mínimo: comportamiento por campo (editable/IA/Mi Marca/keep).
 * 4) Generación de prueba: textos + foto → Canva → PNG → Storage BRÄVE.
 *
 * No es la UI final de usuaria (esa NO mostrará nada de Canva).
 */

interface ConnectionInfo {
  configured: boolean
  connected: boolean
  connection?: {
    status: string
    scopes: string[]
    expiresAt: string
    expired: boolean
    lastRefreshedAt: string | null
    lastError: string | null
    account: Record<string, unknown> | null
  } | null
  error?: string
}

interface DesignInfo {
  id: string
  title: string
  pageCount: number
  canvaEditUrl: string | null
}

type Behavior = 'user_text' | 'ai_text' | 'brand_text' | 'user_image' | 'keep_default'

const BEHAVIOR_OPTIONS: { value: Behavior; label: string; types: string[] }[] = [
  { value: 'user_text', label: 'Texto editable', types: ['text'] },
  { value: 'ai_text', label: 'Texto + IA', types: ['text'] },
  { value: 'brand_text', label: 'Mi Marca', types: ['text'] },
  { value: 'user_image', label: 'Foto reemplazable', types: ['image'] },
  { value: 'keep_default', label: 'Mantener original', types: ['text', 'image', 'chart', 'sheet'] },
]

const PURPOSES = ['gancho', 'desarrollo', 'cta', 'objeción', 'deseo'] as const

type CanvaFieldRow = { name: string; type: string }

export default function CanvaTestPage() {
  const [conn, setConn] = useState<ConnectionInfo | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [ref, setRef] = useState('')
  const [importing, setImporting] = useState(false)
  const [design, setDesign] = useState<DesignInfo | null>(null)
  const [dataset, setDataset] = useState<CanvaFieldRow[]>([])
  const [bindings, setBindings] = useState<Record<string, Behavior>>({})
  const [aiConfig, setAiConfig] = useState<Record<string, { purpose: string; maxLength: string }>>({})
  const [textValues, setTextValues] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<Record<string, { fileName: string; signedUrl: string }>>({})
  const [photoUploading, setPhotoUploading] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [result, setResult] = useState<{ generatedDesignId: string; pages: { page: number; url: string; path: string }[]; usesRemaining: number | null; durationMs: number } | null>(null)
  const [tplName, setTplName] = useState('')
  const [tplCategory, setTplCategory] = useState('')
  const [tplStatus, setTplStatus] = useState<'draft' | 'published'>('draft')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [tplSaved, setTplSaved] = useState<string | null>(null)
  const [tplPreview, setTplPreview] = useState<{ url: string | null; note: string | null } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) setUrlError(params.get('error'))
    if (params.get('error') || params.get('connected')) window.history.replaceState({}, '', '/admin/canva-test')
    loadConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadConnection() {
    const res = await fetch('/api/canva/connection')
    setConn(await res.json())
  }

  function defaultBehavior(field: string, type: string): Behavior {
    if (type === 'image') return 'user_image'
    if (/brand/.test(field)) return 'brand_text'
    return type === 'text' ? 'user_text' : 'keep_default'
  }

  async function importDesign() {
    setImporting(true)
    setGenError(null)
    setDesign(null)
    setDataset([])
    setBindings({})
    setTextValues({})
    setPhotos({})
    setResult(null)
    setTplSaved(null)
    setTplPreview(null)
    setTplCategory('')
    setTplStatus('draft')
    try {
      const res = await fetch(`/api/canva/design?ref=${encodeURIComponent(ref)}`)
      const json = await res.json()
      if (!res.ok) {
        setGenError(json.error || 'No se pudo importar el diseño')
        return
      }
      setDesign(json.design)
      const rows: CanvaFieldRow[] = Object.entries(json.dataset as Record<string, string>)
        .map(([name, type]) => ({ name, type }))
      rows.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }))
      setDataset(rows)
      setBindings(Object.fromEntries(rows.map(r => [r.name, defaultBehavior(r.name, r.type)])))
      setTplName(json.design.title)
    } finally {
      setImporting(false)
    }
  }

  async function uploadPhoto(field: string, file: File) {
    setPhotoUploading(field)
    setGenError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/photo-pro/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok || !json.url) {
        setGenError(`No se pudo subir la foto: ${json.error || res.status}`)
        return
      }
      setPhotos(prev => ({ ...prev, [field]: { fileName: file.name, signedUrl: json.url } }))
    } finally {
      setPhotoUploading(null)
    }
  }

  function templatePayload(publish?: boolean): string {
    const bindingsPayload = Object.fromEntries(
      dataset.map(row => {
        const behavior = bindings[row.name]
        const base: Record<string, unknown> = { behavior }
        if (behavior === 'ai_text') {
          const extra = aiConfig[row.name]
          if (extra?.maxLength) base.maxLength = Number(extra.maxLength)
          base.purpose = extra?.purpose || 'desarrollo'
        }
        return [row.name, base]
      }),
    )
    // publish solo se envía desde el toggle; el "Guardar" simple no lo toca
    // (el servidor conserva el status actual y las plantillas publicadas no
    // se despublican al re-guardarse).
    return JSON.stringify({
      designRef: design?.id ?? ref,
      name: tplName || design?.title,
      category: tplCategory.trim() || undefined,
      bindings: bindingsPayload,
      ...(publish === undefined ? {} : { publish }),
    })
  }

  async function saveTemplate() {
    setSaving(true)
    setTplSaved(null)
    try {
      const res = await fetch('/api/canva/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: templatePayload(),
      })
      const json = await res.json()
      setTplSaved(res.ok ? (json.updated ? 'Plantilla actualizada ✓' : 'Plantilla guardada ✓') : `Error: ${json.error}`)
      setTplPreview(res.ok ? { url: json.previewUrl ?? null, note: json.previewNote ?? null } : null)
    } finally {
      setSaving(false)
    }
  }

  async function togglePublish() {
    const next: 'draft' | 'published' = tplStatus === 'published' ? 'draft' : 'published'
    setPublishing(true)
    setTplSaved(null)
    try {
      const res = await fetch('/api/canva/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: templatePayload(next === 'published'),
      })
      const json = await res.json()
      if (res.ok) {
        setTplStatus(next)
        setTplSaved(next === 'published' ? 'Plantilla publicada ✓' : 'Plantilla despublicada ✓')
        setTplPreview({ url: json.previewUrl ?? null, note: json.previewNote ?? null })
      } else {
        setTplSaved(`Error: ${json.error}`)
      }
    } finally {
      setPublishing(false)
    }
  }

  async function generate() {
    setGenerating(true)
    setGenError(null)
    setResult(null)
    try {
      const res = await fetch('/api/canva/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designRef: design?.id ?? ref,
          texts: textValues,
          photos: Object.entries(photos).map(([field, photo]) => ({ field, url: photo.signedUrl, name: photo.fileName })),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setGenError(json.error || `Error ${res.status}`)
        return
      }
      setResult(json)
    } finally {
      setGenerating(false)
    }
  }

  function setBehavior(field: string, behavior: Behavior) {
    setBindings(prev => ({ ...prev, [field]: behavior }))
  }

  const textFields = dataset.filter(f => f.type === 'text')
  const imageFields = dataset.filter(f => f.type === 'image')
  const statusColor = conn?.connected && conn.connection?.status === 'active' && !conn.connection?.expired
    ? 'var(--color-success, #2e7d32)'
    : 'var(--color-cherry)'

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-16">
      <SectionTitle
        title="Canva — spike de plantillas"
        subtitle="Validación end-to-end: import → dataset → generación con Autofill → export PNG a Storage. La clienta jamás ve Canva."
        icon={<Sparkles size={18} />}
        action={
          <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} loading={conn === null} onClick={loadConnection}>
            Recargar
          </Button>
        }
      />

      {urlError && (
        <div className="rounded-[var(--radius-md)] p-3 text-xs" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>
          Vuelta de OAuth con problema: <strong>{urlError}</strong>. Revisa el estado de conexión abajo.
        </div>
      )}

      {/* ── 1) Conexión ── */}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: statusColor }} />
              <p className="text-sm font-bold">
                {!conn ? 'Comprobando…' : !conn.configured ? 'Canva sin configurar' : conn.connected ? 'Canva — Conectado' : 'Canva — Desconectado'}
              </p>
            </div>
            {conn?.connected && conn.connection && (
              <p className="text-xs" style={{ color: 'var(--color-cherry-dark)', opacity: 0.8 }}>
                {JSON.stringify(conn.connection.account ?? {}, ['name', 'display_name', 'given_name'], 1).replace(/[{}"]/g, '') || 'cuenta BRÄVE · '}
                Scopes: {conn.connection.scopes.join(' ')}
                {' · '}Última renovación: {conn.connection.lastRefreshedAt ? new Date(conn.connection.lastRefreshedAt).toLocaleTimeString('es') : '—'}
              </p>
            )}
          </div>
          {conn?.connected ? (
            <Button size="sm" variant="secondary" icon={<Unlink size={14} />} onClick={async () => { await fetch('/api/canva/connection', { method: 'POST' }); loadConnection() }}>
              Desconectar
            </Button>
          ) : conn?.configured ? (
            <Button size="sm" onClick={() => { window.location.href = '/api/canva/oauth/authorize' }}>Conectar Canva</Button>
          ) : (
            <Badge tone="buttermilk">Falta CANVA_CLIENT_ID/SECRET</Badge>
          )}
        </div>
      </Card>

      {/* ── 2) Importar diseño ── */}
      <Card>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              label="Diseño Canva"
              placeholder="DAF... (Design ID) o https://www.canva.com/design/..."
              value={ref}
              onChange={e => setRef(e.target.value)}
            />
          </div>
          <Button size="sm" loading={importing} disabled={!ref.trim()} onClick={importDesign}>Importar</Button>
        </div>

        {design && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold">{design.title}</p>
              <Badge tone="neutral">{design.pageCount} {design.pageCount === 1 ? 'página' : 'páginas'}</Badge>
              <Badge tone="blue">DA {design.id}</Badge>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-cherry-dark)', opacity: 0.6 }}>
              Campos de Data Autofill detectados: {dataset.length}
            </p>

            {/* Mapa de comportamiento */}
            {dataset.length > 0 && (
              <div className="space-y-2">
                {dataset.map(row => (
                  <div key={row.name} className="flex items-center gap-3 rounded-[var(--radius-sm)] p-2.5" style={{ background: 'rgba(59, 16, 26, 0.04)' }}>
                    <code className="text-xs font-bold min-w-[120px]" style={{ color: 'var(--color-cherry-dark)' }}>{row.name}</code>
                    <Badge tone={row.type === 'image' ? 'blue' : row.type === 'text' ? 'buttermilk' : 'neutral'}>{row.type}</Badge>
                    <select
                      className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs"
                      style={{ borderColor: 'rgba(59,16,26,0.25)', background: 'white', color: 'var(--color-cherry-dark)' }}
                      value={bindings[row.name] ?? 'keep_default'}
                      onChange={e => setBehavior(row.name, e.target.value as Behavior)}
                    >
                      {BEHAVIOR_OPTIONS.filter(o => o.types.includes(row.type)).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {bindings[row.name] === 'ai_text' && (
                      <span className="flex items-center gap-1">
                        <select
                          className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs"
                          style={{ borderColor: 'rgba(59,16,26,0.25)', background: 'white', color: 'var(--color-cherry-dark)' }}
                          value={aiConfig[row.name]?.purpose ?? 'desarrollo'}
                          onChange={e => setAiConfig(prev => ({ ...prev, [row.name]: { purpose: e.target.value, maxLength: prev[row.name]?.maxLength ?? '' } }))}
                        >
                          {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input
                          className="w-16 rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs"
                          placeholder="máx"
                          style={{ borderColor: 'rgba(59,16,26,0.25)', color: 'var(--color-cherry-dark)' }}
                          value={aiConfig[row.name]?.maxLength ?? ''}
                          onChange={e => setAiConfig(prev => ({ ...prev, [row.name]: { purpose: prev[row.name]?.purpose ?? 'desarrollo', maxLength: e.target.value } }))}
                        />
                      </span>
                    )}
                  </div>
                ))}
                <div className="max-w-xs">
                  <Input
                    label="Categoría"
                    placeholder="balayage, cuidado-capilar, cortes…"
                    value={tplCategory}
                    onChange={e => setTplCategory(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" loading={saving} onClick={saveTemplate}>Guardar plantilla</Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={publishing}
                    onClick={togglePublish}
                    disabled={!design && !ref.trim()}
                  >
                    {tplStatus === 'published' ? 'Despublicar' : 'Publicar'}
                  </Button>
                  {tplStatus === 'published' && <Badge tone="green">Publicada</Badge>}
                  {tplSaved && <Badge tone={tplSaved.startsWith('Error') ? 'danger' : 'green'}>{tplSaved}</Badge>}
                </div>
                {tplPreview && (tplPreview.url || tplPreview.note) && (
                  <div className="flex items-center gap-3">
                    {tplPreview.url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={tplPreview.url} alt="Preview original de la plantilla" className="h-28 rounded-[var(--radius-sm)] border" style={{ borderColor: 'rgba(59,16,26,0.15)' }} />
                        <p className="text-xs" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>
                          Preview original (página 1) guardado en Storage BRÄVE.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>{tplPreview.note}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── 3) Generación de prueba ── */}
      <Card>
        <p className="mb-3 text-sm font-bold">Generación de prueba</p>
        {imageFields.length > 0 && (
          <div className="mb-4 space-y-2">
            {imageFields.map(f => (
              <div key={f.name} className="flex items-center gap-3 text-xs">
                <code className="font-bold min-w-[120px]" style={{ color: 'var(--color-cherry-dark)' }}>{f.name}</code>
                <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>
                  <Upload size={12} />
                  <span>{photos[f.name] ? photos[f.name].fileName : 'Elegir foto'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => { const file = e.target.files?.[0]; if (file) uploadPhoto(f.name, file) }}
                  />
                </label>
                {photoUploading === f.name && <span>Subiendo…</span>}
                {photos[f.name] && <img src={photos[f.name].signedUrl} alt="" className="h-9 w-9 rounded object-cover" />}
              </div>
            ))}
          </div>
        )}
        {textFields.map(f => (
          <div key={f.name} className="mb-3">
            <Input
              label={f.name}
              value={textValues[f.name] ?? ''}
              onChange={e => setTextValues(prev => ({ ...prev, [f.name]: e.target.value }))}
            />
          </div>
        ))}
        <Button
          loading={generating}
          disabled={!design && !ref.trim()}
          onClick={generate}
        >
          Generar prueba con Canva
        </Button>
        {genError && (
          <p className="mt-3 text-xs" style={{ color: 'var(--color-cherry)' }}>
            {genError}
          </p>
        )}
      </Card>

      {/* ── 4) Resultado ── */}
      {result && (
        <Card>
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold">Resultado</p>
            <Badge tone="green">{`${result.durationMs} ms`}</Badge>
            <Badge tone="neutral">design {result.generatedDesignId}</Badge>
            {result.usesRemaining !== null && <Badge tone="buttermilk">{`Usos de prueba restantes: ${result.usesRemaining}`}</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {result.pages.map(p => (
              <a key={p.page} href={p.url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Página ${p.page}`} className="w-full rounded-[var(--radius-sm)]" />
              </a>
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--color-cherry-dark)', opacity: 0.6 }}>
            Guardado en Storage BRÄVE (bucket design-exports) — urls firmadas 24h.
          </p>
        </Card>
      )}
    </div>
  )
}